import { GRADE_LEVELS } from '../src/lib/thaiFormatting.js';

export function makeUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now();
}

export function parseJsonSafe(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

export function toNullableNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function gradeRank(grade) {
  const idx = GRADE_LEVELS.indexOf(grade);
  return idx >= 0 ? idx : 999;
}

export function sortUsers(list) {
  return [...list].sort((a, b) => {
    const r = String(a.role || '').localeCompare(String(b.role || ''));
    if (r !== 0) return r;
    return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'th');
  });
}

export function sortStudents(list) {
  return [...list].sort((a, b) => {
    const g = gradeRank(a.grade_level) - gradeRank(b.grade_level);
    if (g !== 0) return g;
    const c = String(a.classroom || '').localeCompare(String(b.classroom || ''), 'th');
    if (c !== 0) return c;
    return Number(a.student_number || 999) - Number(b.student_number || 999);
  });
}

export function sortSubjects(list) {
  return [...list].sort((a, b) => {
    const g = gradeRank(a.grade_level) - gradeRank(b.grade_level);
    if (g !== 0) return g;
    const s = Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999);
    if (s !== 0) return s;
    return String(a.subject_code || '').localeCompare(String(b.subject_code || ''), 'th');
  });
}

export function sortIndicators(list) {
  return [...list].sort((a, b) => {
    const l = String(a.learning_area || '').localeCompare(String(b.learning_area || ''), 'th');
    if (l !== 0) return l;
    return String(a.indicator_code || '').localeCompare(String(b.indicator_code || ''), 'th');
  });
}

export function sortCourses(list) {
  return [...list].sort((a, b) =>
    String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
  );
}

export function mapSystemSettingsRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id || 1),
    school_name: row.school_name,
    affiliation: row.affiliation,
    affiliation_short: row.affiliation_short || '',
    school_code: row.school_code || '',
    address: row.address || '',
    academic_year: row.academic_year || '2569',
    semester: row.semester || '1',
    director_name: row.director_name || '',
    director_title: row.director_title || '',
    academic_head_name: row.academic_head_name || '',
    registrar_name: row.registrar_name || '',
    logo_url: row.logo_url || '/school-logo.webp',
    emblem_url: row.emblem_url || '',
    director_signature_url: row.director_signature_url || '',
    cover_config: parseJsonSafe(row.cover_config, {}),
    scoring_preset: parseJsonSafe(row.scoring_preset, {}),
    updated_at: row.updated_at || '',
  };
}

export function mapPublicSettingsHeader(row) {
  const full = mapSystemSettingsRow(row);
  if (!full) return null;
  return {
    school_name: full.school_name,
    affiliation: full.affiliation,
    affiliation_short: full.affiliation_short,
    school_code: full.school_code,
    academic_year: full.academic_year,
    semester: full.semester,
    logo_url: full.logo_url,
    emblem_url: full.emblem_url,
  };
}

export function mapUserRow(row, includePrivate = false) {
  if (!row) return null;
  const base = {
    id: row.id,
    full_name: row.full_name,
    position: row.position || 'ครู',
    academic_standing: row.academic_standing || '',
    role: row.role,
    learning_area: row.learning_area || '',
    homeroom_grade: row.homeroom_grade || '',
    is_active: row.is_active === 1 || row.is_active === true,
  };
  if (includePrivate) {
    base.email = row.email;
    base.phone = row.phone || '';
    base.has_password = Boolean(row.password_hash);
    base.created_at = row.created_at || '';
    base.updated_at = row.updated_at || '';
  }
  return base;
}

export function mapStudentRow(row) {
  return {
    id: row.id,
    student_code: row.student_code,
    prefix: row.prefix || '',
    first_name: row.first_name,
    last_name: row.last_name || '',
    gender: row.gender || '',
    grade_level: row.grade_level,
    classroom: String(row.classroom || '1'),
    student_number: Number(row.student_number || 1),
    academic_year: row.academic_year || '2569',
    status: row.status || 'active',
    updated_at: row.updated_at || '',
  };
}

export function mapSubjectRow(row) {
  return {
    id: row.id,
    subject_code: row.subject_code,
    subject_name: row.subject_name,
    learning_area: row.learning_area,
    grade_level: row.grade_level,
    subject_type: row.subject_type || 'พื้นฐาน',
    credits: toNullableNumber(row.credits),
    hours_per_semester: toNullableNumber(row.hours_per_semester),
    hours_per_week: toNullableNumber(row.hours_per_week),
    hours_per_year: toNullableNumber(row.hours_per_year),
    semester: row.semester || '',
    sort_order: Number(row.sort_order ?? 1),
    curriculum_year: row.curriculum_year || '2551/2560',
    is_active: row.is_active === 1 || row.is_active === true,
    updated_at: row.updated_at || '',
  };
}

export function mapIndicatorRow(row) {
  return {
    id: row.id,
    indicator_code: row.indicator_code,
    learning_area: row.learning_area,
    strand: row.strand || '',
    standard_code: row.standard_code || '',
    standard_text: row.standard_text || '',
    grade_level: row.grade_level || '',
    indicator_type: row.indicator_type || '',
    indicator_text: row.indicator_text,
    updated_at: row.updated_at || '',
  };
}

export function mapCourseRow(row) {
  return {
    id: row.id,
    subject_id: row.subject_id || null,
    subject_code: row.subject_code,
    subject_name: row.subject_name,
    learning_area: row.learning_area || '',
    subject_type: row.subject_type || 'พื้นฐาน',
    teacher_id: row.teacher_id,
    grade_level: row.grade_level,
    classroom: String(row.classroom || '1'),
    academic_year: row.academic_year,
    semester: String(row.semester || '1'),
    credits: toNullableNumber(row.credits),
    total_hours: toNullableNumber(row.total_hours),
    student_ids: parseJsonSafe(row.student_ids, []),
    selected_indicator_ids: parseJsonSafe(row.selected_indicator_ids, []),
    custom_indicators_text: row.custom_indicators_text || '',
    indicators_status: row.indicators_status || 'sample',
    cover_settings: parseJsonSafe(row.cover_settings, {}),
    status: row.status || 'in_progress',
    submitted_at: row.submitted_at || null,
    approved_by: row.approved_by || null,
    approved_at: row.approved_at || null,
    executive_comment: row.executive_comment || '',
    updated_at: row.updated_at || '',
  };
}

export function mapScoreStructureRow(row) {
  return {
    course_id: row.course_id,
    formative_ratio: Number(row.formative_ratio ?? 60),
    midterm_ratio: Number(row.midterm_ratio ?? 20),
    final_ratio: Number(row.final_ratio ?? 20),
    grading_policy: parseJsonSafe(row.grading_policy, {
      minAttendancePct: 80,
      requireFinalExam: true,
    }),
    units: parseJsonSafe(row.units, []),
    updated_at: row.updated_at || '',
  };
}

export function mapAttendanceRow(row) {
  return {
    id: row.id,
    course_id: row.course_id,
    student_id: row.student_id,
    session_date: row.session_date,
    period_number: Number(row.period_number || 1),
    status: row.status,
    remark: row.remark || '',
    updated_at: row.updated_at || '',
  };
}

export function mapStudentScoreRow(row) {
  return {
    id: row.id,
    course_id: row.course_id,
    student_id: row.student_id,
    unit_scores: parseJsonSafe(row.unit_scores, {}),
    formative_total: toNullableNumber(row.formative_total),
    midterm_score: toNullableNumber(row.midterm_score),
    final_score: toNullableNumber(row.final_score),
    total_score: toNullableNumber(row.total_score),
    grade: row.grade || '',
    special_status: row.special_status || null,
    updated_at: row.updated_at || '',
  };
}

export function mapCharacteristicsRow(row) {
  return {
    id: row.id,
    course_id: row.course_id,
    student_id: row.student_id,
    characteristics_config: parseJsonSafe(row.characteristics_config, {}),
    traits: parseJsonSafe(row.traits, {}),
    traits_avg: toNullableNumber(row.traits_avg),
    traits_level: toNullableNumber(row.traits_level),
    reading_thinking_writing: parseJsonSafe(row.reading_thinking_writing, {}),
    rtw_avg: toNullableNumber(row.rtw_avg),
    rtw_level: toNullableNumber(row.rtw_level),
    updated_at: row.updated_at || '',
  };
}

export function mapClassroomSummaryRow(row) {
  return {
    id: row.id,
    grade_level: row.grade_level,
    classroom: String(row.classroom || '1'),
    academic_year: row.academic_year,
    semester: String(row.semester || '1'),
    homeroom_teacher_id: row.homeroom_teacher_id || null,
    student_decisions: parseJsonSafe(row.student_decisions, {}),
    activities_summary: parseJsonSafe(row.activities_summary, {}),
    class_notes: row.class_notes || '',
    status: row.status || 'in_progress',
    executive_comment: row.executive_comment || '',
    updated_at: row.updated_at || '',
  };
}

export function mapPrimary2568Row(row) {
  return {
    id: row.id,
    student_id: row.student_id,
    grade_level: row.grade_level,
    classroom: String(row.classroom || '1'),
    academic_year: row.academic_year,
    semester: String(row.semester || '1'),
    capabilities: parseJsonSafe(row.capabilities, {}),
    traits_5: parseJsonSafe(row.traits_5, {}),
    activities_pass: row.activities_pass === 1 || row.activities_pass === true,
    grade3_central_result: row.grade3_central_result || '',
    teacher_comment: row.teacher_comment || '',
    school_level_labels: parseJsonSafe(row.school_level_labels, {}),
    recorded_by: row.recorded_by || null,
    updated_at: row.updated_at || '',
  };
}
