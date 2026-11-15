import { ensureSchema, getDb, runBatchChunked } from '../server/db.js';
import { jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import { makeUuid, mapStudentRow, sortStudents } from '../server/mappers.js';

export async function POST(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const body = await parseJsonBody(request);
    const list = Array.isArray(body.students) ? body.students : [];
    if (list.length === 0) {
      const existing = await db.execute('SELECT * FROM students');
      return jsonOk({ students: sortStudents((existing.rows || []).map(mapStudentRow)) });
    }

    const nowIso = new Date().toISOString();
    const statements = list.map((stu) => {
      const code = String(stu.student_code || '').trim();
      const id = String(stu.id || (code ? `stu_${code}` : makeUuid()));
      return {
        sql: `INSERT INTO students (
                id, student_code, prefix, first_name, last_name, gender,
                grade_level, classroom, student_number, academic_year, status, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(student_code) DO UPDATE SET
                prefix = excluded.prefix,
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                gender = excluded.gender,
                grade_level = excluded.grade_level,
                classroom = excluded.classroom,
                student_number = excluded.student_number,
                academic_year = excluded.academic_year,
                status = excluded.status,
                updated_at = excluded.updated_at`,
        args: [
          id,
          code || id,
          String(stu.prefix || ''),
          String(stu.first_name || '').trim(),
          String(stu.last_name || '').trim(),
          String(stu.gender || ''),
          String(stu.grade_level || ''),
          String(stu.classroom || '1'),
          Number(stu.student_number ?? 1),
          String(stu.academic_year || '2569'),
          String(stu.status || 'active'),
          nowIso,
        ],
      };
    });

    await runBatchChunked(db, statements, 80);
    const updated = await db.execute('SELECT * FROM students');
    return jsonOk({ students: sortStudents((updated.rows || []).map(mapStudentRow)) });
  } catch (err) {
    console.error('[api/students POST] failed:', err);
    return jsonError(err?.message || 'บันทึกข้อมูลนักเรียนไม่สำเร็จ', 500);
  }
}

export async function DELETE(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const body = idFromQuery ? {} : await parseJsonBody(request);
    const targetId = String(idFromQuery || body.id || '').trim();
    if (!targetId) return jsonError('ไม่พบรหัสนักเรียน', 400);

    await db.execute({ sql: 'DELETE FROM students WHERE id = ?', args: [targetId] });
    return jsonOk({ ok: true });
  } catch (err) {
    console.error('[api/students DELETE] failed:', err);
    return jsonError('ลบข้อมูลนักเรียนไม่สำเร็จ', 500);
  }
}
