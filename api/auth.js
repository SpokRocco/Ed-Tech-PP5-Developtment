import { ensureSchema, getDb, isTursoConfigured } from '../server/db.js';
import {
  createUserSession,
  getSessionUser,
  hashPassword,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireSession,
  revokeCurrentSession,
  verifyPassword,
} from '../server/auth.js';
import { makeUuid, mapUserRow } from '../server/mappers.js';

export async function GET(request) {
  if (!isTursoConfigured()) {
    return jsonOk({ configured: false, schemaReady: false, user: null, userCount: 0 });
  }
  try {
    const db = getDb();
    await ensureSchema(db);
    const [user, countRes] = await Promise.all([
      getSessionUser(request, db),
      db.execute('SELECT COUNT(*) AS cnt FROM users'),
    ]);
    return jsonOk({
      configured: true,
      schemaReady: true,
      user,
      userCount: Number(countRes.rows?.[0]?.cnt || 0),
    });
  } catch (err) {
    console.error('[api/auth GET] failed:', err);
    return jsonError('ไม่สามารถตรวจสอบสถานะผู้ใช้ได้', 500);
  }
}

export async function POST(request) {
  if (!isTursoConfigured()) {
    return jsonError('ยังไม่ได้ตั้งค่าฐานข้อมูล Turso', 503);
  }

  try {
    const db = getDb();
    await ensureSchema(db);
    const body = await parseJsonBody(request);
    const action = String(body.action || 'login');

    if (action === 'logout') {
      const clearCookie = await revokeCurrentSession(db, request);
      return jsonOk({ ok: true }, 200, { 'Set-Cookie': clearCookie });
    }

    if (action === 'change_password') {
      const { user, errorResponse } = await requireSession(request, db);
      if (errorResponse) return errorResponse;
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 6) {
        return jsonError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 400);
      }
      const existing = await db.execute({
        sql: 'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
        args: [user.id],
      });
      const existingHash = existing.rows?.[0]?.password_hash;
      if (existingHash && !verifyPassword(currentPassword, existingHash)) {
        return jsonError('รหัสผ่านเดิมไม่ถูกต้อง', 400);
      }
      const newHash = hashPassword(newPassword);
      await db.execute({
        sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        args: [newHash, new Date().toISOString(), user.id],
      });
      return jsonOk({ ok: true });
    }

    const emailLower = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!emailLower || !emailLower.includes('@')) {
      return jsonError('รูปแบบอีเมลไม่ถูกต้อง', 400);
    }

    if (action === 'setup_first_admin') {
      const countRes = await db.execute('SELECT COUNT(*) AS cnt FROM users');
      if (Number(countRes.rows?.[0]?.cnt || 0) > 0) {
        return jsonError('ระบบมีผู้ใช้งานอยู่แล้ว กรุณาเข้าสู่ระบบหรือติดต่อผู้ดูแลระบบ', 403);
      }
      if (password.length < 6) {
        return jsonError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 400);
      }
      const fullName = String(body.fullName || '').trim() || 'ผู้ดูแลระบบหลัก';
      const nowIso = new Date().toISOString();
      const userId = makeUuid();
      const pwHash = hashPassword(password);
      await db.execute({
        sql: `INSERT INTO users (
                id, email, password_hash, full_name, position, academic_standing,
                role, learning_area, homeroom_grade, phone, is_active, created_at, updated_at
              ) VALUES (?, ?, ?, ?, 'ผู้ดูแลระบบ', '', 'admin', 'งานวัดผลและประเมินผล', '', '', 1, ?, ?)`,
        args: [userId, emailLower, pwHash, fullName, nowIso, nowIso],
      });
      const createdRes = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
        args: [userId],
      });
      const createdUser = mapUserRow(createdRes.rows?.[0], true);
      const { setCookieHeader } = await createUserSession(db, userId, request);
      return jsonOk({ user: createdUser }, 201, { 'Set-Cookie': setCookieHeader });
    }

    const foundRes = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      args: [emailLower],
    });
    const row = foundRes.rows?.[0];

    if (!row) {
      return jsonError(
        'ไม่พบอีเมลนี้ในทะเบียนผู้ใช้งานระบบ ปพ.5 (กรุณาให้ผู้ดูแลระบบเพิ่มอีเมลใน /admin ก่อน)',
        401
      );
    }
    if (row.is_active === 0 || row.is_active === false) {
      return jsonError('บัญชีผู้ใช้นี้ถูกปิดการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ', 403);
    }

    if (action === 'activate') {
      if (row.password_hash) {
        return jsonError(
          'บัญชีนี้ตั้งรหัสผ่านไว้แล้ว กรุณาใช้แท็บ "เข้าสู่ระบบ"',
          409
        );
      }
      if (password.length < 6) {
        return jsonError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 400);
      }
      const nowIso = new Date().toISOString();
      const fullName = String(body.fullName || '').trim() || row.full_name;
      const pwHash = hashPassword(password);
      await db.execute({
        sql: 'UPDATE users SET password_hash = ?, full_name = ?, updated_at = ? WHERE id = ?',
        args: [pwHash, fullName, nowIso, row.id],
      });
      const refreshedRes = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
        args: [row.id],
      });
      const activatedUser = mapUserRow(refreshedRes.rows?.[0], true);
      const { setCookieHeader } = await createUserSession(db, row.id, request);
      return jsonOk({ user: activatedUser }, 200, { 'Set-Cookie': setCookieHeader });
    }

    // Default: action === 'login'
    if (!row.password_hash) {
      return jsonError(
        'บัญชีนี้ได้รับสิทธิ์เข้าใช้งานแล้ว แต่ยังไม่ได้ตั้งรหัสผ่าน กรุณากดแท็บ "เปิดใช้งานบัญชีครั้งแรก" เพื่อกำหนดรหัสผ่าน',
        401
      );
    }
    if (!verifyPassword(password, row.password_hash)) {
      return jsonError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);
    }

    const userObj = mapUserRow(row, true);
    const { setCookieHeader } = await createUserSession(db, row.id, request);
    return jsonOk({ user: userObj }, 200, { 'Set-Cookie': setCookieHeader });
  } catch (err) {
    console.error('[api/auth POST] failed:', err);
    return jsonError(err?.message || 'เกิดข้อผิดพลาดในระบบยืนยันตัวตน', 500);
  }
}
