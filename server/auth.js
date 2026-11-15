import crypto from 'node:crypto';
import { ensureSchema } from './db.js';
import { makeUuid, mapUserRow } from './mappers.js';

export const SESSION_COOKIE_NAME = 'pp5_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function jsonOk(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function jsonError(message, status = 400, extra = {}) {
  return jsonOk({ error: message, ...extra }, status);
}

export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function hashPassword(password) {
  const plain = String(password || '');
  if (plain.length < 6) {
    throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  const plain = String(password || '');
  if (!plain || !storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(plain, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function getSessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '').trim();
  if (!secret || secret.includes('replace-with-') || secret.length < 16) return '';
  return secret;
}

function signRawToken(rawToken) {
  const secret = getSessionSecret();
  if (!secret) return rawToken;
  const sig = crypto.createHmac('sha256', secret).update(rawToken).digest('base64url');
  return `${rawToken}.${sig}`;
}

function extractVerifiedRawToken(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const trimmed = cookieValue.trim();
  const secret = getSessionSecret();
  if (trimmed.includes('.')) {
    const [rawToken, sig] = trimmed.split('.', 2);
    if (!rawToken || !sig) return null;
    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(rawToken).digest('base64url');
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    }
    return rawToken;
  }
  return secret ? null : trimmed;
}

export function hashSessionToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

export function readCookies(request) {
  const header = request.headers.get('cookie') || '';
  const map = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      map[key] = decodeURIComponent(val);
    } catch {
      map[key] = val;
    }
  }
  return map;
}

function isHttpsRequest(request) {
  const proto = request.headers.get('x-forwarded-proto') || '';
  if (proto.toLowerCase().includes('https')) return true;
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildSessionCookieHeader(cookieValue, request, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (isHttpsRequest(request)) parts.push('Secure');
  return parts.join('; ');
}

export async function createUserSession(db, userId, request) {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const sessionId = makeUuid();

  await db.batch(
    [
      {
        sql: 'DELETE FROM sessions WHERE expires_at <= ?',
        args: [nowIso],
      },
      {
        sql: `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [sessionId, userId, tokenHash, expiresIso, nowIso],
      },
    ],
    'write'
  );

  const cookieVal = signRawToken(rawToken);
  return {
    setCookieHeader: buildSessionCookieHeader(cookieVal, request, SESSION_TTL_SECONDS),
    expiresAt: expiresIso,
  };
}

export async function revokeCurrentSession(db, request) {
  const cookies = readCookies(request);
  const rawToken = extractVerifiedRawToken(cookies[SESSION_COOKIE_NAME]);
  if (db && rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await db
      .execute({
        sql: 'DELETE FROM sessions WHERE token_hash = ?',
        args: [tokenHash],
      })
      .catch(() => {});
  }
  return buildSessionCookieHeader('', request, 0);
}

export async function getSessionUser(request, db) {
  if (!db) return null;
  await ensureSchema(db);
  const cookies = readCookies(request);
  const rawToken = extractVerifiedRawToken(cookies[SESSION_COOKIE_NAME]);
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const nowIso = new Date().toISOString();
  const res = await db.execute({
    sql: `SELECT u.*
          FROM sessions s
          INNER JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1
          LIMIT 1`,
    args: [tokenHash, nowIso],
  });

  const row = res.rows?.[0];
  return row ? mapUserRow(row, true) : null;
}

export async function requireSession(request, db, allowedRoles = null) {
  if (!db) {
    return { errorResponse: jsonError('ยังไม่ได้ตั้งค่าฐานข้อมูล Turso', 503) };
  }
  const user = await getSessionUser(request, db);
  if (!user) {
    return { errorResponse: jsonError('กรุณาเข้าสู่ระบบก่อนดำเนินการ', 401) };
  }
  if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    return { errorResponse: jsonError('คุณไม่มีสิทธิ์ดำเนินการในส่วนนี้', 403) };
  }
  return { user };
}
