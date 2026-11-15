import { ensureSchema, getDb, isTursoConfigured } from '../server/db.js';
import { getSessionUser, jsonOk } from '../server/auth.js';

export async function GET(request) {
  if (!isTursoConfigured()) {
    return jsonOk({
      configured: false,
      schemaReady: false,
      isSeeded: false,
      userCount: 0,
      authenticated: false,
      reason: 'unconfigured',
    });
  }

  try {
    const db = getDb();
    await ensureSchema(db);
    const [settingsRes, usersRes, sessionUser] = await Promise.all([
      db.execute('SELECT COUNT(*) AS cnt FROM system_settings'),
      db.execute('SELECT COUNT(*) AS cnt FROM users'),
      getSessionUser(request, db),
    ]);
    const isSeeded = Number(settingsRes.rows?.[0]?.cnt || 0) > 0;
    const userCount = Number(usersRes.rows?.[0]?.cnt || 0);
    return jsonOk({
      configured: true,
      schemaReady: true,
      isSeeded,
      userCount,
      authenticated: Boolean(sessionUser),
      reason: isSeeded ? '' : 'unseeded',
    });
  } catch (err) {
    console.error('[api/health] Turso probe failed:', err);
    return jsonOk({
      configured: true,
      schemaReady: false,
      isSeeded: false,
      userCount: 0,
      authenticated: false,
      reason: err?.message || 'db_error',
    });
  }
}
