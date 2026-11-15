import { createClient } from '@libsql/client';
import { SCHEMA_STATEMENTS } from './schema.js';

let cachedKey = '';
let cachedClient = null;
const schemaEnsuredKeys = new Set();

export function getTursoConfig() {
  const url = String(process.env.TURSO_DATABASE_URL || '').trim();
  const authToken = String(process.env.TURSO_AUTH_TOKEN || '').trim();
  return { url, authToken };
}

export function isTursoConfigured() {
  const { url, authToken } = getTursoConfig();
  if (!url || url.includes('your-db-name') || url.includes('your-org')) return false;
  if (url.startsWith('file:')) return true;
  return Boolean(authToken) && !authToken.includes('your-turso-auth-token');
}

export function getDb() {
  if (!isTursoConfigured()) return null;
  const { url, authToken } = getTursoConfig();
  const key = `${url}::${authToken}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  cachedClient = createClient(url.startsWith('file:') ? { url } : { url, authToken });
  cachedKey = key;
  return cachedClient;
}

export async function ensureSchema(db = getDb()) {
  if (!db) throw new Error('Turso database is not configured');
  const { url } = getTursoConfig();
  if (schemaEnsuredKeys.has(url)) return;

  await db.batch(['PRAGMA foreign_keys = ON', ...SCHEMA_STATEMENTS], 'write');
  schemaEnsuredKeys.add(url);
}

export function resetSchemaCache() {
  schemaEnsuredKeys.clear();
  cachedKey = '';
  cachedClient = null;
}

export async function runBatchChunked(db, statements, chunkSize = 80) {
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await db.batch(['PRAGMA foreign_keys = ON', ...chunk], 'write');
    }
  }
}
