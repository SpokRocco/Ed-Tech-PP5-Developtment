import { ensureSchema, getDb, runBatchChunked } from '../server/db.js';
import { jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import { mapClassroomSummaryRow, mapPrimary2568Row } from '../server/mappers.js';

export async function GET(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const gradeLevel = url.searchParams.get('gradeLevel');
    const classroom = url.searchParams.get('classroom');

    const conditions = [];
    const args = [];
    if (gradeLevel) {
      conditions.push('grade_level = ?');
      args.push(gradeLevel);
    }
    if (classroom) {
      conditions.push('classroom = ?');
      args.push(String(classroom));
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await db.execute({
      sql: `SELECT * FROM primary2568_assessments ${whereSql}`,
      args,
    });
    return jsonOk({ rows: (res.rows || []).map(mapPrimary2568Row) });
  } catch (err) {
    console.error('[api/classroom GET] failed:', err);
    return jsonError('ไม่สามารถดึงข้อมูลประเมินรายชั้นเรียนได้', 500);
  }
}

export async function POST(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const body = await parseJsonBody(request);
    const nowIso = new Date().toISOString();

    if (body.action === 'save_summary') {
      const s = body.summary || {};
      const classroom = String(s.classroom || '1');
      const academicYear = String(s.academic_year || '2569');
      const semester = String(s.semester || '1');
      const id = String(s.id || `${s.grade_level}__${classroom}__${academicYear}__${semester}`);
      await db.execute({
        sql: `INSERT INTO classroom_pp5_summaries (
                id, grade_level, classroom, academic_year, semester,
                homeroom_teacher_id, student_decisions, activities_summary,
                class_notes, status, executive_comment, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(grade_level, classroom, academic_year, semester) DO UPDATE SET
                homeroom_teacher_id = COALESCE(classroom_pp5_summaries.homeroom_teacher_id, excluded.homeroom_teacher_id),
                student_decisions = excluded.student_decisions,
                activities_summary = excluded.activities_summary,
                class_notes = excluded.class_notes,
                status = excluded.status,
                executive_comment = excluded.executive_comment,
                updated_at = excluded.updated_at`,
        args: [
          id,
          String(s.grade_level || ''),
          classroom,
          academicYear,
          semester,
          s.homeroom_teacher_id || user.id,
          JSON.stringify(s.student_decisions || {}),
          JSON.stringify(s.activities_summary || {}),
          String(s.class_notes || ''),
          String(s.status || 'in_progress'),
          String(s.executive_comment || ''),
          nowIso,
        ],
      });
      const res = await db.execute({
        sql: `SELECT * FROM classroom_pp5_summaries
              WHERE grade_level = ? AND classroom = ? AND academic_year = ? AND semester = ? LIMIT 1`,
        args: [String(s.grade_level || ''), classroom, academicYear, semester],
      });
      return jsonOk({ summary: mapClassroomSummaryRow(res.rows?.[0]) });
    }

    if (body.action === 'save_primary2568_batch') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const statements = rows.map((row) => {
        const year = String(row.academic_year || '2569');
        const sem = String(row.semester || '1');
        const id = row.id || `${row.student_id}__${year}__${sem}`;
        return {
          sql: `INSERT INTO primary2568_assessments (
                  id, student_id, grade_level, classroom, academic_year, semester,
                  capabilities, traits_5, activities_pass, grade3_central_result,
                  teacher_comment, school_level_labels, recorded_by, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(student_id, academic_year, semester) DO UPDATE SET
                  grade_level = excluded.grade_level,
                  classroom = excluded.classroom,
                  capabilities = excluded.capabilities,
                  traits_5 = excluded.traits_5,
                  activities_pass = excluded.activities_pass,
                  grade3_central_result = excluded.grade3_central_result,
                  teacher_comment = excluded.teacher_comment,
                  school_level_labels = excluded.school_level_labels,
                  recorded_by = excluded.recorded_by,
                  updated_at = excluded.updated_at`,
          args: [
            String(id),
            String(row.student_id),
            String(row.grade_level || ''),
            String(row.classroom || '1'),
            year,
            sem,
            JSON.stringify(row.capabilities || {}),
            JSON.stringify(row.traits_5 || {}),
            row.activities_pass === false ? 0 : 1,
            String(row.grade3_central_result || ''),
            String(row.teacher_comment || ''),
            JSON.stringify(row.school_level_labels || {}),
            row.recorded_by || user.id,
            nowIso,
          ],
        };
      });
      await runBatchChunked(db, statements, 80);

      const first = rows[0];
      if (!first) return jsonOk({ rows: [] });
      const refreshed = await db.execute({
        sql: 'SELECT * FROM primary2568_assessments WHERE grade_level = ? AND classroom = ?',
        args: [String(first.grade_level), String(first.classroom || '1')],
      });
      return jsonOk({ rows: (refreshed.rows || []).map(mapPrimary2568Row) });
    }

    return jsonError('ไม่รองรับ action นี้ใน /api/classroom', 400);
  } catch (err) {
    console.error('[api/classroom POST] failed:', err);
    return jsonError(err?.message || 'บันทึกข้อมูลประเมินรายชั้นเรียนไม่สำเร็จ', 500);
  }
}
