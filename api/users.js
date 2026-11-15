import { ensureSchema, getDb } from '../server/db.js';
import { hashPassword, jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import { makeUuid, mapUserRow, sortUsers } from '../server/mappers.js';

export async function GET(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);
    const res = await db.execute('SELECT * FROM users');
    return jsonOk({ users: sortUsers((res.rows || []).map((r) => mapUserRow(r, true))) });
  } catch (err) {
    console.error('[api/users GET] failed:', err);
    return jsonError('ไม่สามารถดึงข้อมูลผู้ใช้งานได้', 500);
  }
}

export async function POST(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const body = await parseJsonBody(request);
    const emailLower = String(body.email || '').trim().toLowerCase();
    if (!emailLower || !emailLower.includes('@')) {
      return jsonError('กรุณาระบุอีเมลผู้ใช้งานให้ถูกต้อง', 400);
    }

    const fullName = String(body.full_name || '').trim();
    if (!fullName) {
      return jsonError('กรุณาระบุชื่อ - นามสกุล', 400);
    }

    const role = ['executive', 'admin', 'teacher'].includes(body.role) ? body.role : 'teacher';
    const initialPassword = String(body.initial_password || '').trim();
    if (initialPassword && initialPassword.length < 6) {
      return jsonError('รหัสผ่านเริ่มต้นต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 400);
    }

    const existingRes = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR id = ? LIMIT 1',
      args: [emailLower, body.id || ''],
    });
    const existing = existingRes.rows?.[0] || null;
    const nowIso = new Date().toISOString();
    const id = existing?.id || body.id || makeUuid();
    const passwordHash = initialPassword
      ? hashPassword(initialPassword)
      : existing?.password_hash || null;

    await db.execute({
      sql: `INSERT INTO users (
              id, email, password_hash, full_name, position, academic_standing,
              role, learning_area, homeroom_grade, phone, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              email = excluded.email,
              password_hash = excluded.password_hash,
              full_name = excluded.full_name,
              position = excluded.position,
              academic_standing = excluded.academic_standing,
              role = excluded.role,
              learning_area = excluded.learning_area,
              homeroom_grade = excluded.homeroom_grade,
              phone = excluded.phone,
              is_active = excluded.is_active,
              updated_at = excluded.updated_at`,
      args: [
        id,
        emailLower,
        passwordHash,
        fullName,
        String(body.position || existing?.position || 'ครู'),
        String(body.academic_standing ?? existing?.academic_standing ?? ''),
        role,
        String(body.learning_area ?? existing?.learning_area ?? ''),
        String(body.homeroom_grade ?? existing?.homeroom_grade ?? ''),
        String(body.phone ?? existing?.phone ?? ''),
        body.is_active === false ? 0 : 1,
        existing?.created_at || nowIso,
        nowIso,
      ],
    });

    const savedRes = await db.execute({ sql: 'SELECT * FROM users WHERE id = ? LIMIT 1', args: [id] });
    return jsonOk({ user: mapUserRow(savedRes.rows?.[0], true) });
  } catch (err) {
    console.error('[api/users POST] failed:', err);
    return jsonError(err?.message || 'บันทึกบัญชีผู้ใช้งานไม่สำเร็จ', 500);
  }
}

export async function DELETE(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const body = idFromQuery ? {} : await parseJsonBody(request);
    const targetId = String(idFromQuery || body.id || '').trim();
    if (!targetId) return jsonError('ไม่พบรหัสผู้ใช้ที่ต้องการลบ', 400);
    if (targetId === user.id) {
      return jsonError('ไม่สามารถลบบัญชีผู้ดูแลระบบที่กำลังล็อกอินอยู่ได้', 400);
    }

    await db.batch(
      [
        'PRAGMA foreign_keys = ON',
        { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [targetId] },
        { sql: 'DELETE FROM users WHERE id = ? OR LOWER(email) = LOWER(?)', args: [targetId, targetId] },
      ],
      'write'
    );
    return jsonOk({ ok: true });
  } catch (err) {
    console.error('[api/users DELETE] failed:', err);
    return jsonError('ลบผู้ใช้งานไม่สำเร็จ', 500);
  }
}
