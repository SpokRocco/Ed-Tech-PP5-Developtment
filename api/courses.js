import { ensureSchema, getDb, runBatchChunked } from '../server/db.js';
import { jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import {
  makeUuid,
  mapAttendanceRow,
  mapCharacteristicsRow,
  mapCourseRow,
  mapScoreStructureRow,
  mapStudentScoreRow,
  toNullableNumber,
} from '../server/mappers.js';

function defaultStructure(courseId) {
  return {
    course_id: courseId,
    formative_ratio: 60,
    midterm_ratio: 20,
    final_ratio: 20,
    grading_policy: { minAttendancePct: 80, requireFinalExam: true },
    units: [],
  };
}

async function assertCourseWritePermission(db, courseId, user) {
  const res = await db.execute({
    sql: 'SELECT id, teacher_id FROM teacher_courses WHERE id = ? LIMIT 1',
    args: [courseId],
  });
  const course = res.rows?.[0];
  if (!course) {
    return { errorResponse: jsonError('ไม่พบรายวิชาที่ระบุ', 404) };
  }
  if (user.role !== 'admin' && course.teacher_id !== user.id) {
    return { errorResponse: jsonError('เฉพาะครูผู้สอนเจ้าของรายวิชาหรือ Admin เท่านั้นที่แก้ไขได้', 403) };
  }
  return { course };
}

export async function GET(request) {
  try {
    const db = getDb();
    const { errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');
    const courseId = url.searchParams.get('courseId');

    if (scope === 'all_attendance') {
      const res = await db.execute('SELECT * FROM attendance ORDER BY session_date ASC, period_number ASC');
      return jsonOk({ rows: (res.rows || []).map(mapAttendanceRow) });
    }
    if (scope === 'all_scores') {
      const res = await db.execute('SELECT * FROM student_scores');
      return jsonOk({ rows: (res.rows || []).map(mapStudentScoreRow) });
    }
    if (scope === 'all_characteristics') {
      const res = await db.execute('SELECT * FROM characteristics_scores');
      return jsonOk({ rows: (res.rows || []).map(mapCharacteristicsRow) });
    }
    if (scope === 'all_structures') {
      const res = await db.execute('SELECT * FROM score_structures');
      return jsonOk({ rows: (res.rows || []).map(mapScoreStructureRow) });
    }

    if (!courseId) {
      return jsonError('กรุณาระบุ courseId หรือ scope', 400);
    }

    const [structRes, attRes, scoresRes, charRes] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM score_structures WHERE course_id = ? LIMIT 1', args: [courseId] }),
      db.execute({
        sql: 'SELECT * FROM attendance WHERE course_id = ? ORDER BY session_date ASC, period_number ASC',
        args: [courseId],
      }),
      db.execute({ sql: 'SELECT * FROM student_scores WHERE course_id = ?', args: [courseId] }),
      db.execute({ sql: 'SELECT * FROM characteristics_scores WHERE course_id = ?', args: [courseId] }),
    ]);

    return jsonOk({
      scoreStructure: structRes.rows?.[0]
        ? mapScoreStructureRow(structRes.rows[0])
        : defaultStructure(courseId),
      attendance: (attRes.rows || []).map(mapAttendanceRow),
      studentScores: (scoresRes.rows || []).map(mapStudentScoreRow),
      characteristicsScores: (charRes.rows || []).map(mapCharacteristicsRow),
    });
  } catch (err) {
    console.error('[api/courses GET] failed:', err);
    return jsonError('ไม่สามารถดึงข้อมูลรายวิชาได้', 500);
  }
}

export async function POST(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const body = await parseJsonBody(request);
    const action = String(body.action || 'save_course');
    const nowIso = new Date().toISOString();

    if (action === 'save_course') {
      const courseObj = body.course || {};
      const existingId = courseObj.id ? String(courseObj.id) : '';
      const existingRes = existingId
        ? await db.execute({ sql: 'SELECT * FROM teacher_courses WHERE id = ? LIMIT 1', args: [existingId] })
        : { rows: [] };
      const existing = existingRes.rows?.[0] || null;

      if (!existing) {
        if (user.role === 'teacher' || user.role === 'executive') {
          if (courseObj.teacher_id && courseObj.teacher_id !== user.id) {
            return jsonError('ไม่สามารถสร้างรายวิชาแทนครูท่านอื่นได้', 403);
          }
        }
        const id = existingId || makeUuid();
        const teacherId = user.role === 'admin' ? courseObj.teacher_id || user.id : user.id;
        await db.batch(
          [
            'PRAGMA foreign_keys = ON',
            {
              sql: `INSERT INTO teacher_courses (
                      id, subject_id, subject_code, subject_name, learning_area, subject_type,
                      teacher_id, grade_level, classroom, academic_year, semester,
                      credits, total_hours, student_ids, selected_indicator_ids,
                      custom_indicators_text, indicators_status, cover_settings,
                      status, submitted_at, approved_by, approved_at, executive_comment, updated_at
                    ) VALUES (
                      ?, (SELECT id FROM subjects WHERE id = ? OR (subject_code = ? AND grade_level = ?) LIMIT 1),
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )`,
              args: [
                id,
                courseObj.subject_id || '',
                String(courseObj.subject_code || ''),
                String(courseObj.grade_level || ''),
                String(courseObj.subject_code || ''),
                String(courseObj.subject_name || ''),
                String(courseObj.learning_area || ''),
                String(courseObj.subject_type || 'พื้นฐาน'),
                teacherId,
                String(courseObj.grade_level || ''),
                String(courseObj.classroom || '1'),
                String(courseObj.academic_year || '2569'),
                String(courseObj.semester || '1'),
                toNullableNumber(courseObj.credits),
                toNullableNumber(courseObj.total_hours),
                JSON.stringify(courseObj.student_ids || []),
                JSON.stringify(courseObj.selected_indicator_ids || []),
                String(courseObj.custom_indicators_text || ''),
                String(courseObj.indicators_status || 'sample'),
                JSON.stringify(courseObj.cover_settings || {}),
                courseObj.status === 'approved' && user.role === 'teacher'
                  ? 'in_progress'
                  : String(courseObj.status || 'in_progress'),
                courseObj.submitted_at || null,
                null,
                null,
                String(courseObj.executive_comment || ''),
                nowIso,
              ],
            },
            {
              sql: `INSERT INTO score_structures (
                      course_id, formative_ratio, midterm_ratio, final_ratio, grading_policy, units, updated_at
                    ) VALUES (?, 60, 20, 20, ?, ?, ?)`,
              args: [
                id,
                JSON.stringify({ minAttendancePct: 80, requireFinalExam: true }),
                JSON.stringify([
                  { id: 'u1', name: 'หน่วยการเรียนรู้ที่ 1', category: 'formative', maxScore: 30, indicatorCodes: [] },
                  { id: 'u2', name: 'หน่วยการเรียนรู้ที่ 2', category: 'formative', maxScore: 30, indicatorCodes: [] },
                  { id: 'mid', name: 'สอบกลางภาคเรียน', category: 'midterm', maxScore: 20, indicatorCodes: [] },
                  { id: 'fin', name: 'สอบปลายภาคเรียน', category: 'final', maxScore: 20, indicatorCodes: [] },
                ]),
                nowIso,
              ],
            },
          ],
          'write'
        );
        const created = await db.execute({ sql: 'SELECT * FROM teacher_courses WHERE id = ? LIMIT 1', args: [id] });
        return jsonOk({ course: mapCourseRow(created.rows?.[0]) });
      }

      // Existing course update
      const isOwner = existing.teacher_id === user.id;
      if (user.role === 'executive' && !isOwner) {
        const nextStatus = String(courseObj.status || existing.status);
        await db.execute({
          sql: `UPDATE teacher_courses
                SET status = ?, approved_by = ?, approved_at = ?, executive_comment = ?, updated_at = ?
                WHERE id = ?`,
          args: [
            nextStatus,
            nextStatus === 'approved' ? user.id : null,
            nextStatus === 'approved' ? courseObj.approved_at || nowIso : null,
            String(courseObj.executive_comment ?? existing.executive_comment ?? ''),
            nowIso,
            existing.id,
          ],
        });
        const refreshed = await db.execute({ sql: 'SELECT * FROM teacher_courses WHERE id = ? LIMIT 1', args: [existing.id] });
        return jsonOk({ course: mapCourseRow(refreshed.rows?.[0]) });
      }

      if (user.role !== 'admin' && !isOwner) {
        return jsonError('คุณไม่มีสิทธิ์แก้ไขรายวิชาของครูท่านอื่น', 403);
      }
      if (user.role === 'teacher' && courseObj.status === 'approved' && existing.status !== 'approved') {
        return jsonError('เฉพาะผู้บริหารสถานศึกษาหรือผู้ดูแลระบบเท่านั้นที่อนุมัติ ปพ.5 ได้', 403);
      }

      const mappedPrev = mapCourseRow(existing);
      const merged = { ...mappedPrev, ...courseObj, id: existing.id };
      await db.execute({
        sql: `UPDATE teacher_courses SET
                subject_code = ?,
                subject_name = ?,
                learning_area = ?,
                subject_type = ?,
                grade_level = ?,
                classroom = ?,
                academic_year = ?,
                semester = ?,
                credits = ?,
                total_hours = ?,
                student_ids = ?,
                selected_indicator_ids = ?,
                custom_indicators_text = ?,
                indicators_status = ?,
                cover_settings = ?,
                status = ?,
                submitted_at = ?,
                approved_by = ?,
                approved_at = ?,
                executive_comment = ?,
                updated_at = ?
              WHERE id = ?`,
        args: [
          String(merged.subject_code || ''),
          String(merged.subject_name || ''),
          String(merged.learning_area || ''),
          String(merged.subject_type || 'พื้นฐาน'),
          String(merged.grade_level || ''),
          String(merged.classroom || '1'),
          String(merged.academic_year || '2569'),
          String(merged.semester || '1'),
          toNullableNumber(merged.credits),
          toNullableNumber(merged.total_hours),
          JSON.stringify(merged.student_ids || []),
          JSON.stringify(merged.selected_indicator_ids || []),
          String(merged.custom_indicators_text || ''),
          String(merged.indicators_status || 'sample'),
          JSON.stringify(merged.cover_settings || {}),
          String(merged.status || 'in_progress'),
          merged.submitted_at || null,
          merged.approved_by || null,
          merged.approved_at || null,
          String(merged.executive_comment || ''),
          nowIso,
          existing.id,
        ],
      });
      const refreshed = await db.execute({ sql: 'SELECT * FROM teacher_courses WHERE id = ? LIMIT 1', args: [existing.id] });
      return jsonOk({ course: mapCourseRow(refreshed.rows?.[0]) });
    }

    const courseId = String(body.courseId || '');
    if (!courseId) return jsonError('กรุณาระบุรหัสรายวิชา (courseId)', 400);
    const perm = await assertCourseWritePermission(db, courseId, user);
    if (perm.errorResponse) return perm.errorResponse;

    if (action === 'save_structure') {
      const st = body.structure || {};
      await db.execute({
        sql: `INSERT INTO score_structures (
                course_id, formative_ratio, midterm_ratio, final_ratio, grading_policy, units, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(course_id) DO UPDATE SET
                formative_ratio = excluded.formative_ratio,
                midterm_ratio = excluded.midterm_ratio,
                final_ratio = excluded.final_ratio,
                grading_policy = excluded.grading_policy,
                units = excluded.units,
                updated_at = excluded.updated_at`,
        args: [
          courseId,
          Number(st.formative_ratio ?? 60),
          Number(st.midterm_ratio ?? 20),
          Number(st.final_ratio ?? 20),
          JSON.stringify(st.grading_policy || { minAttendancePct: 80, requireFinalExam: true }),
          JSON.stringify(st.units || []),
          nowIso,
        ],
      });
      const saved = await db.execute({ sql: 'SELECT * FROM score_structures WHERE course_id = ? LIMIT 1', args: [courseId] });
      return jsonOk({ scoreStructure: mapScoreStructureRow(saved.rows?.[0]) });
    }

    if (action === 'save_attendance') {
      const records = Array.isArray(body.records) ? body.records : [];
      const statements = records.map((rec) => {
        const periodNum = Number(rec.period_number || 1);
        const id = rec.id || `${courseId}__${rec.student_id}__${rec.session_date}__${periodNum}`;
        return {
          sql: `INSERT INTO attendance (
                  id, course_id, student_id, session_date, period_number, status, remark, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(course_id, student_id, session_date, period_number) DO UPDATE SET
                  status = excluded.status,
                  remark = excluded.remark,
                  updated_at = excluded.updated_at`,
          args: [
            String(id),
            courseId,
            String(rec.student_id),
            String(rec.session_date),
            periodNum,
            String(rec.status || 'present'),
            String(rec.remark || ''),
            nowIso,
          ],
        };
      });
      await runBatchChunked(db, statements, 80);
      const res = await db.execute({
        sql: 'SELECT * FROM attendance WHERE course_id = ? ORDER BY session_date ASC, period_number ASC',
        args: [courseId],
      });
      return jsonOk({ attendance: (res.rows || []).map(mapAttendanceRow) });
    }

    if (action === 'delete_attendance') {
      const sessionDate = String(body.sessionDate || '');
      const periodNumber = Number(body.periodNumber || 1);
      await db.execute({
        sql: 'DELETE FROM attendance WHERE course_id = ? AND session_date = ? AND period_number = ?',
        args: [courseId, sessionDate, periodNumber],
      });
      const res = await db.execute({
        sql: 'SELECT * FROM attendance WHERE course_id = ? ORDER BY session_date ASC, period_number ASC',
        args: [courseId],
      });
      return jsonOk({ attendance: (res.rows || []).map(mapAttendanceRow) });
    }

    if (action === 'save_scores') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const statements = rows.map((row) => {
        const id = row.id || `${courseId}__${row.student_id}`;
        return {
          sql: `INSERT INTO student_scores (
                  id, course_id, student_id, unit_scores, formative_total,
                  midterm_score, final_score, total_score, grade, special_status, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(course_id, student_id) DO UPDATE SET
                  unit_scores = excluded.unit_scores,
                  formative_total = excluded.formative_total,
                  midterm_score = excluded.midterm_score,
                  final_score = excluded.final_score,
                  total_score = excluded.total_score,
                  grade = excluded.grade,
                  special_status = excluded.special_status,
                  updated_at = excluded.updated_at`,
          args: [
            String(id),
            courseId,
            String(row.student_id),
            JSON.stringify(row.unit_scores || {}),
            toNullableNumber(row.formative_total),
            toNullableNumber(row.midterm_score),
            toNullableNumber(row.final_score),
            toNullableNumber(row.total_score),
            String(row.grade ?? ''),
            row.special_status || null,
            nowIso,
          ],
        };
      });
      await runBatchChunked(db, statements, 80);
      const res = await db.execute({ sql: 'SELECT * FROM student_scores WHERE course_id = ?', args: [courseId] });
      return jsonOk({ studentScores: (res.rows || []).map(mapStudentScoreRow) });
    }

    if (action === 'save_characteristics') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const statements = rows.map((row) => {
        const id = row.id || `${courseId}__${row.student_id}`;
        return {
          sql: `INSERT INTO characteristics_scores (
                  id, course_id, student_id, characteristics_config, traits,
                  traits_avg, traits_level, reading_thinking_writing, rtw_avg, rtw_level, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(course_id, student_id) DO UPDATE SET
                  characteristics_config = excluded.characteristics_config,
                  traits = excluded.traits,
                  traits_avg = excluded.traits_avg,
                  traits_level = excluded.traits_level,
                  reading_thinking_writing = excluded.reading_thinking_writing,
                  rtw_avg = excluded.rtw_avg,
                  rtw_level = excluded.rtw_level,
                  updated_at = excluded.updated_at`,
          args: [
            String(id),
            courseId,
            String(row.student_id),
            JSON.stringify(row.characteristics_config || {}),
            JSON.stringify(row.traits || {}),
            toNullableNumber(row.traits_avg),
            toNullableNumber(row.traits_level),
            JSON.stringify(row.reading_thinking_writing || {}),
            toNullableNumber(row.rtw_avg),
            toNullableNumber(row.rtw_level),
            nowIso,
          ],
        };
      });
      await runBatchChunked(db, statements, 80);
      const res = await db.execute({
        sql: 'SELECT * FROM characteristics_scores WHERE course_id = ?',
        args: [courseId],
      });
      return jsonOk({ characteristicsScores: (res.rows || []).map(mapCharacteristicsRow) });
    }

    return jsonError('ไม่รองรับ action นี้ใน /api/courses', 400);
  } catch (err) {
    console.error('[api/courses POST] failed:', err);
    return jsonError(err?.message || 'บันทึกรายวิชาไม่สำเร็จ', 500);
  }
}

export async function DELETE(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db);
    if (errorResponse) return errorResponse;
    await ensureSchema(db);

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const body = idFromQuery ? {} : await parseJsonBody(request);
    const courseId = String(idFromQuery || body.id || '').trim();
    if (!courseId) return jsonError('ไม่พบรหัสรายวิชาที่ต้องการลบ', 400);

    const perm = await assertCourseWritePermission(db, courseId, user);
    if (perm.errorResponse) return perm.errorResponse;

    await db.batch(
      [
        'PRAGMA foreign_keys = ON',
        { sql: 'DELETE FROM attendance WHERE course_id = ?', args: [courseId] },
        { sql: 'DELETE FROM student_scores WHERE course_id = ?', args: [courseId] },
        { sql: 'DELETE FROM characteristics_scores WHERE course_id = ?', args: [courseId] },
        { sql: 'DELETE FROM score_structures WHERE course_id = ?', args: [courseId] },
        { sql: 'DELETE FROM teacher_courses WHERE id = ?', args: [courseId] },
      ],
      'write'
    );
    return jsonOk({ ok: true });
  } catch (err) {
    console.error('[api/courses DELETE] failed:', err);
    return jsonError('ลบรายวิชาไม่สำเร็จ', 500);
  }
}
