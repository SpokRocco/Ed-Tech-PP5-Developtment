import {
  DEMO_SYSTEM_SETTINGS,
  DEMO_USERS,
  DEMO_STUDENTS,
  DEMO_SUBJECTS,
  DEMO_INDICATORS,
  DEMO_COURSES,
  DEMO_SCORE_STRUCTURES,
  DEMO_ATTENDANCE,
  DEMO_STUDENT_SCORES,
  DEMO_CHARACTERISTICS_SCORES,
  DEMO_CLASSROOM_SUMMARIES,
  DEMO_PRIMARY_2568_ASSESSMENTS,
} from '../src/data/demoSeedData.js';
import { ensureSchema, runBatchChunked } from './db.js';
import { hashPassword } from './auth.js';
import { makeUuid, toNullableNumber } from './mappers.js';

export async function seedDatabaseWithClient(
  db,
  { adminEmails = [], defaultPassword = '' } = {}
) {
  if (!db) throw new Error('Turso database is not configured');
  await ensureSchema(db);

  const nowIso = new Date().toISOString();
  const defaultHash =
    defaultPassword && defaultPassword.length >= 6 ? hashPassword(defaultPassword) : null;

  const usersList = DEMO_USERS.map((u) => ({
    ...u,
    email: String(u.email || '').trim().toLowerCase(),
  }));

  for (const rawEmail of adminEmails) {
    const emailLower = String(rawEmail || '').trim().toLowerCase();
    if (!emailLower) continue;
    if (!usersList.some((u) => u.email === emailLower)) {
      usersList.unshift({
        id: makeUuid(),
        email: emailLower,
        full_name: 'ผู้ดูแลระบบหลัก (Admin)',
        position: 'ผู้ดูแลระบบ',
        academic_standing: '',
        role: 'admin',
        learning_area: 'งานวัดผลและประเมินผล',
        homeroom_grade: '',
        phone: '',
        is_active: true,
      });
    }
  }

  const statements = [];

  // 1. system_settings
  statements.push({
    sql: `INSERT INTO system_settings (
            id, school_name, affiliation, affiliation_short, school_code, address,
            academic_year, semester, director_name, director_title, academic_head_name,
            registrar_name, logo_url, emblem_url, director_signature_url,
            cover_config, scoring_preset, updated_at
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            school_name = excluded.school_name,
            affiliation = excluded.affiliation,
            affiliation_short = excluded.affiliation_short,
            school_code = excluded.school_code,
            address = excluded.address,
            academic_year = excluded.academic_year,
            semester = excluded.semester,
            director_name = excluded.director_name,
            director_title = excluded.director_title,
            academic_head_name = excluded.academic_head_name,
            registrar_name = excluded.registrar_name,
            cover_config = excluded.cover_config,
            scoring_preset = excluded.scoring_preset,
            updated_at = excluded.updated_at`,
    args: [
      DEMO_SYSTEM_SETTINGS.school_name,
      DEMO_SYSTEM_SETTINGS.affiliation,
      DEMO_SYSTEM_SETTINGS.affiliation_short || '',
      DEMO_SYSTEM_SETTINGS.school_code || '',
      DEMO_SYSTEM_SETTINGS.address || '',
      DEMO_SYSTEM_SETTINGS.academic_year || '2569',
      DEMO_SYSTEM_SETTINGS.semester || '1',
      DEMO_SYSTEM_SETTINGS.director_name || '',
      DEMO_SYSTEM_SETTINGS.director_title || '',
      DEMO_SYSTEM_SETTINGS.academic_head_name || '',
      DEMO_SYSTEM_SETTINGS.registrar_name || '',
      DEMO_SYSTEM_SETTINGS.logo_url || '/school-logo.webp',
      DEMO_SYSTEM_SETTINGS.emblem_url || '',
      DEMO_SYSTEM_SETTINGS.director_signature_url || '',
      JSON.stringify(DEMO_SYSTEM_SETTINGS.cover_config || {}),
      JSON.stringify(DEMO_SYSTEM_SETTINGS.scoring_preset || {}),
      nowIso,
    ],
  });

  // 2. users (preserve existing password_hash & custom id if email already exists)
  for (const u of usersList) {
    statements.push({
      sql: `INSERT INTO users (
              id, email, password_hash, full_name, position, academic_standing,
              role, learning_area, homeroom_grade, phone, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              full_name = excluded.full_name,
              position = excluded.position,
              academic_standing = excluded.academic_standing,
              role = excluded.role,
              learning_area = excluded.learning_area,
              homeroom_grade = excluded.homeroom_grade,
              phone = excluded.phone,
              is_active = excluded.is_active,
              password_hash = COALESCE(users.password_hash, excluded.password_hash),
              updated_at = excluded.updated_at`,
      args: [
        u.id,
        u.email,
        defaultHash,
        u.full_name,
        u.position || 'ครู',
        u.academic_standing || '',
        u.role || 'teacher',
        u.learning_area || '',
        u.homeroom_grade || '',
        u.phone || '',
        u.is_active === false ? 0 : 1,
        nowIso,
        nowIso,
      ],
    });
  }

  // 3. students
  for (const s of DEMO_STUDENTS) {
    statements.push({
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
        s.id,
        String(s.student_code),
        s.prefix || '',
        s.first_name,
        s.last_name || '',
        s.gender || '',
        s.grade_level,
        String(s.classroom || '1'),
        Number(s.student_number || 1),
        s.academic_year || '2569',
        s.status || 'active',
        nowIso,
      ],
    });
  }

  // 4. subjects
  for (const sub of DEMO_SUBJECTS) {
    statements.push({
      sql: `INSERT INTO subjects (
              id, subject_code, subject_name, learning_area, grade_level,
              subject_type, credits, hours_per_semester, hours_per_week, hours_per_year,
              semester, sort_order, curriculum_year, is_active, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(subject_code, grade_level) DO UPDATE SET
              subject_name = excluded.subject_name,
              learning_area = excluded.learning_area,
              subject_type = excluded.subject_type,
              credits = excluded.credits,
              hours_per_semester = excluded.hours_per_semester,
              hours_per_week = excluded.hours_per_week,
              hours_per_year = excluded.hours_per_year,
              semester = excluded.semester,
              sort_order = excluded.sort_order,
              curriculum_year = excluded.curriculum_year,
              is_active = excluded.is_active,
              updated_at = excluded.updated_at`,
      args: [
        sub.id || `${sub.grade_level}__${sub.subject_code}`,
        sub.subject_code,
        sub.subject_name,
        sub.learning_area,
        sub.grade_level,
        sub.subject_type || 'พื้นฐาน',
        toNullableNumber(sub.credits),
        toNullableNumber(sub.hours_per_semester),
        toNullableNumber(sub.hours_per_week),
        toNullableNumber(sub.hours_per_year),
        sub.semester ? String(sub.semester) : '',
        Number(sub.sort_order ?? 1),
        sub.curriculum_year || '2551/2560',
        sub.is_active === false ? 0 : 1,
        nowIso,
      ],
    });
  }

  // 5. curriculum_indicators
  for (const ind of DEMO_INDICATORS) {
    statements.push({
      sql: `INSERT INTO curriculum_indicators (
              id, indicator_code, learning_area, strand, standard_code,
              standard_text, grade_level, indicator_type, indicator_text, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(indicator_code) DO UPDATE SET
              learning_area = excluded.learning_area,
              strand = excluded.strand,
              standard_code = excluded.standard_code,
              standard_text = excluded.standard_text,
              grade_level = excluded.grade_level,
              indicator_type = excluded.indicator_type,
              indicator_text = excluded.indicator_text,
              updated_at = excluded.updated_at`,
      args: [
        ind.id || ind.indicator_code,
        ind.indicator_code,
        ind.learning_area,
        ind.strand || '',
        ind.standard_code || '',
        ind.standard_text || '',
        ind.grade_level || '',
        ind.indicator_type || '',
        ind.indicator_text,
        nowIso,
      ],
    });
  }

  // 6. teacher_courses (match subject_id via existing subjects or NULL-safe FK lookup)
  for (const c of DEMO_COURSES) {
    statements.push({
      sql: `INSERT INTO teacher_courses (
              id, subject_id, subject_code, subject_name, learning_area, subject_type,
              teacher_id, grade_level, classroom, academic_year, semester,
              credits, total_hours, student_ids, selected_indicator_ids,
              custom_indicators_text, indicators_status, cover_settings,
              status, submitted_at, approved_by, approved_at, executive_comment, updated_at
            ) VALUES (
              ?, (SELECT id FROM subjects WHERE id = ? OR (subject_code = ? AND grade_level = ?) LIMIT 1),
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
              subject_name = excluded.subject_name,
              learning_area = excluded.learning_area,
              subject_type = excluded.subject_type,
              grade_level = excluded.grade_level,
              classroom = excluded.classroom,
              academic_year = excluded.academic_year,
              semester = excluded.semester,
              credits = excluded.credits,
              total_hours = excluded.total_hours,
              student_ids = excluded.student_ids,
              selected_indicator_ids = excluded.selected_indicator_ids,
              custom_indicators_text = excluded.custom_indicators_text,
              indicators_status = excluded.indicators_status,
              cover_settings = excluded.cover_settings,
              status = excluded.status,
              submitted_at = excluded.submitted_at,
              approved_by = excluded.approved_by,
              approved_at = excluded.approved_at,
              executive_comment = excluded.executive_comment,
              updated_at = excluded.updated_at`,
      args: [
        c.id,
        c.subject_id || '',
        c.subject_code,
        c.grade_level,
        c.subject_code,
        c.subject_name,
        c.learning_area || '',
        c.subject_type || 'พื้นฐาน',
        c.teacher_id,
        c.grade_level,
        String(c.classroom || '1'),
        c.academic_year || '2569',
        String(c.semester || '1'),
        toNullableNumber(c.credits),
        toNullableNumber(c.total_hours),
        JSON.stringify(c.student_ids || []),
        JSON.stringify(c.selected_indicator_ids || []),
        c.custom_indicators_text || '',
        c.indicators_status || 'sample',
        JSON.stringify(c.cover_settings || {}),
        c.status || 'in_progress',
        c.submitted_at || null,
        c.approved_by || null,
        c.approved_at || null,
        c.executive_comment || '',
        nowIso,
      ],
    });
  }

  // 7. score_structures
  for (const s of Object.values(DEMO_SCORE_STRUCTURES)) {
    statements.push({
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
        s.course_id,
        Number(s.formative_ratio ?? 60),
        Number(s.midterm_ratio ?? 20),
        Number(s.final_ratio ?? 20),
        JSON.stringify(s.grading_policy || { minAttendancePct: 80, requireFinalExam: true }),
        JSON.stringify(s.units || []),
        nowIso,
      ],
    });
  }

  // 8. attendance
  for (const a of DEMO_ATTENDANCE) {
    const id = a.id || `${a.course_id}__${a.student_id}__${a.session_date}__${a.period_number}`;
    statements.push({
      sql: `INSERT INTO attendance (
              id, course_id, student_id, session_date, period_number, status, remark, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_id, student_id, session_date, period_number) DO UPDATE SET
              status = excluded.status,
              remark = excluded.remark,
              updated_at = excluded.updated_at`,
      args: [
        id,
        a.course_id,
        a.student_id,
        a.session_date,
        Number(a.period_number || 1),
        a.status,
        a.remark || '',
        nowIso,
      ],
    });
  }

  // 9. student_scores
  for (const [courseId, rows] of Object.entries(DEMO_STUDENT_SCORES)) {
    for (const r of rows) {
      const id = r.id || `${courseId}__${r.student_id}`;
      statements.push({
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
          id,
          r.course_id || courseId,
          r.student_id,
          JSON.stringify(r.unit_scores || {}),
          toNullableNumber(r.formative_total),
          toNullableNumber(r.midterm_score),
          toNullableNumber(r.final_score),
          toNullableNumber(r.total_score),
          r.grade || '',
          r.special_status || null,
          nowIso,
        ],
      });
    }
  }

  // 10. characteristics_scores
  for (const [courseId, rows] of Object.entries(DEMO_CHARACTERISTICS_SCORES)) {
    for (const r of rows) {
      const id = r.id || `${courseId}__${r.student_id}`;
      statements.push({
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
          id,
          r.course_id || courseId,
          r.student_id,
          JSON.stringify(r.characteristics_config || {}),
          JSON.stringify(r.traits || {}),
          toNullableNumber(r.traits_avg),
          toNullableNumber(r.traits_level),
          JSON.stringify(r.reading_thinking_writing || {}),
          toNullableNumber(r.rtw_avg),
          toNullableNumber(r.rtw_level),
          nowIso,
        ],
      });
    }
  }

  // 11. classroom_pp5_summaries
  for (const sum of DEMO_CLASSROOM_SUMMARIES) {
    const id = sum.id || `${sum.grade_level}__${sum.classroom}__${sum.academic_year}__${sum.semester}`;
    statements.push({
      sql: `INSERT INTO classroom_pp5_summaries (
              id, grade_level, classroom, academic_year, semester,
              homeroom_teacher_id, student_decisions, activities_summary,
              class_notes, status, executive_comment, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(grade_level, classroom, academic_year, semester) DO UPDATE SET
              homeroom_teacher_id = excluded.homeroom_teacher_id,
              student_decisions = excluded.student_decisions,
              activities_summary = excluded.activities_summary,
              class_notes = excluded.class_notes,
              status = excluded.status,
              executive_comment = excluded.executive_comment,
              updated_at = excluded.updated_at`,
      args: [
        id,
        sum.grade_level,
        String(sum.classroom || '1'),
        sum.academic_year || '2569',
        String(sum.semester || '1'),
        sum.homeroom_teacher_id || null,
        JSON.stringify(sum.student_decisions || {}),
        JSON.stringify(sum.activities_summary || {}),
        sum.class_notes || '',
        sum.status || 'in_progress',
        sum.executive_comment || '',
        nowIso,
      ],
    });
  }

  // 12. primary2568_assessments
  for (const row of DEMO_PRIMARY_2568_ASSESSMENTS) {
    const id = row.id || `${row.student_id}__${row.academic_year}__${row.semester}`;
    statements.push({
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
        id,
        row.student_id,
        row.grade_level,
        String(row.classroom || '1'),
        row.academic_year || '2569',
        String(row.semester || '1'),
        JSON.stringify(row.capabilities || {}),
        JSON.stringify(row.traits_5 || {}),
        row.activities_pass === false ? 0 : 1,
        row.grade3_central_result || '',
        row.teacher_comment || '',
        JSON.stringify(row.school_level_labels || {}),
        row.recorded_by || null,
        nowIso,
      ],
    });
  }

  // Wait: catch typo before writing (`excluded.grade_3_central_result_fix` -> `excluded.grade3_central_result`)!
  await runBatchChunked(db, statements, 70);
  return { seededStatements: statements.length };
}
