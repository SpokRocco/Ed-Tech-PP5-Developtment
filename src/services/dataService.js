import {
  supabase,
  isSupabaseConfigured,
  isSchemaReadyForLive,
  markSchemaReady,
  getStoredRuntimeMode,
} from '../lib/supabaseClient';
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
} from '../data/demoSeedData';

const STORAGE_KEY = 'banhatkhet_pp5_demo_db_v3';

function loadDemoDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        classroomSummaries: parsed.classroomSummaries || DEMO_CLASSROOM_SUMMARIES,
        primary2568Assessments: parsed.primary2568Assessments || DEMO_PRIMARY_2568_ASSESSMENTS,
      };
    }
  } catch {
    // ignore corrupted cache
  }
  const initial = {
    settings: DEMO_SYSTEM_SETTINGS,
    users: DEMO_USERS,
    students: DEMO_STUDENTS,
    subjects: DEMO_SUBJECTS,
    indicators: DEMO_INDICATORS,
    courses: DEMO_COURSES,
    scoreStructures: DEMO_SCORE_STRUCTURES,
    attendance: DEMO_ATTENDANCE,
    studentScores: DEMO_STUDENT_SCORES,
    characteristicsScores: DEMO_CHARACTERISTICS_SCORES,
    classroomSummaries: DEMO_CLASSROOM_SUMMARIES,
    primary2568Assessments: DEMO_PRIMARY_2568_ASSESSMENTS,
  };
  saveDemoDb(initial);
  return initial;
}

function saveDemoDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

export function resetDemoDatabase() {
  localStorage.removeItem(STORAGE_KEY);
  return loadDemoDb();
}

function makeUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now();
}

export const dataService = {
  async probeSupabaseSchema() {
    if (!isSchemaReadyForLive()) {
      markSchemaReady(false);
      return { configured: false, schemaReady: false, reason: 'unconfigured' };
    }
    try {
      const { data, error } = await supabase.from('system_settings').select('id').limit(1);
      if (error || !data?.length) {
        markSchemaReady(false);
        return {
          configured: true,
          schemaReady: false,
          reason: error?.message || 'tables_unseeded',
        };
      }
      markSchemaReady(true);
      return { configured: true, schemaReady: true, reason: '' };
    } catch (err) {
      markSchemaReady(false);
      return { configured: true, schemaReady: false, reason: err?.message || 'network_error' };
    }
  },

  async fetchBootstrapData() {
    const probe = await this.probeSupabaseSchema();
    if (!probe.schemaReady || getStoredRuntimeMode() === 'demo') {
      const demo = loadDemoDb();
      return { ...demo, __meta: probe };
    }

    const [
      settingsRes,
      usersRes,
      studentsRes,
      subjectsRes,
      indicatorsRes,
      coursesRes,
      classroomRes,
    ] = await Promise.all([
      supabase.from('system_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('users').select('*').order('role').order('full_name'),
      supabase.from('students').select('*').order('grade_level').order('classroom').order('student_number'),
      supabase.from('subjects').select('*').order('grade_level').order('subject_code'),
      supabase.from('curriculum_indicators').select('*').order('learning_area').order('indicator_code'),
      supabase.from('teacher_courses').select('*').order('updated_at', { ascending: false }),
      supabase.from('classroom_pp5_summaries').select('*').order('grade_level'),
    ]);

    return {
      settings: settingsRes.data || DEMO_SYSTEM_SETTINGS,
      users: usersRes.data || [],
      students: studentsRes.data || [],
      subjects: subjectsRes.data || [],
      indicators: indicatorsRes.data?.length ? indicatorsRes.data : DEMO_INDICATORS,
      courses: coursesRes.data || [],
      classroomSummaries: classroomRes.data || [],
      __meta: probe,
    };
  },

  async fetchCourseDetails(courseId) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      return {
        scoreStructure: db.scoreStructures[courseId] || {
          course_id: courseId,
          formative_ratio: 60,
          midterm_ratio: 20,
          final_ratio: 20,
          grading_policy: { minAttendancePct: 80, requireFinalExam: true },
          units: [],
        },
        attendance: db.attendance.filter((a) => a.course_id === courseId),
        studentScores: db.studentScores[courseId] || [],
        characteristicsScores: db.characteristicsScores[courseId] || [],
      };
    }

    const [structRes, attRes, scoresRes, charRes] = await Promise.all([
      supabase.from('score_structures').select('*').eq('course_id', courseId).maybeSingle(),
      supabase.from('attendance').select('*').eq('course_id', courseId).order('session_date'),
      supabase.from('student_scores').select('*').eq('course_id', courseId),
      supabase.from('characteristics_scores').select('*').eq('course_id', courseId),
    ]);

    return {
      scoreStructure: structRes.data || {
        course_id: courseId,
        formative_ratio: 60,
        midterm_ratio: 20,
        final_ratio: 20,
        grading_policy: { minAttendancePct: 80, requireFinalExam: true },
        units: [],
      },
      attendance: attRes.data || [],
      studentScores: scoresRes.data || [],
      characteristicsScores: charRes.data || [],
    };
  },

  async fetchAllSchoolAttendance() {
    if (!isSchemaReadyForLive()) {
      return loadDemoDb().attendance;
    }
    const { data } = await supabase.from('attendance').select('*');
    return data || [];
  },

  async fetchAllSchoolScores() {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      return Object.values(db.studentScores).flat();
    }
    const { data } = await supabase.from('student_scores').select('*');
    return data || [];
  },

  async fetchAllSchoolCharacteristics() {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      return Object.values(db.characteristicsScores).flat();
    }
    const { data } = await supabase.from('characteristics_scores').select('*');
    return data || [];
  },

  async fetchAllSchoolScoreStructures() {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      return Object.values(db.scoreStructures || {});
    }
    const { data } = await supabase.from('score_structures').select('*');
    return data || [];
  },

  async saveClassroomSummary(summaryObj) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const idx = db.classroomSummaries.findIndex(
        (c) =>
          (summaryObj.id && c.id === summaryObj.id) ||
          (c.grade_level === summaryObj.grade_level &&
            String(c.classroom) === String(summaryObj.classroom) &&
            c.academic_year === summaryObj.academic_year &&
            c.semester === summaryObj.semester)
      );
      const record = {
        ...summaryObj,
        id: summaryObj.id || (idx >= 0 ? db.classroomSummaries[idx].id : makeUuid()),
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) db.classroomSummaries[idx] = { ...db.classroomSummaries[idx], ...record };
      else db.classroomSummaries.push(record);
      saveDemoDb(db);
      return record;
    }
    const { data, error } = await supabase
      .from('classroom_pp5_summaries')
      .upsert(summaryObj, { onConflict: 'grade_level,classroom,academic_year,semester' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async fetchPrimary2568Assessments(gradeLevel, classroom) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      return (db.primary2568Assessments || []).filter(
        (a) =>
          (!gradeLevel || a.grade_level === gradeLevel) &&
          (!classroom || String(a.classroom) === String(classroom))
      );
    }
    let query = supabase.from('primary2568_assessments').select('*');
    if (gradeLevel) query = query.eq('grade_level', gradeLevel);
    if (classroom) query = query.eq('classroom', String(classroom));
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async savePrimary2568Batch(rows) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const map = new Map(
        (db.primary2568Assessments || []).map((r) => [
          `${r.student_id}|${r.academic_year}|${r.semester}`,
          r,
        ])
      );
      for (const row of rows) {
        const key = `${row.student_id}|${row.academic_year}|${row.semester}`;
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          ...row,
          id: existing?.id || row.id || makeUuid(),
          updated_at: new Date().toISOString(),
        });
      }
      db.primary2568Assessments = Array.from(map.values());
      saveDemoDb(db);
      return db.primary2568Assessments;
    }
    const { data, error } = await supabase
      .from('primary2568_assessments')
      .upsert(rows, { onConflict: 'student_id,academic_year,semester' })
      .select();
    if (error) throw error;
    return data || [];
  },

  async updateSystemSettings(patch) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.settings = { ...db.settings, ...patch, updated_at: new Date().toISOString() };
      saveDemoDb(db);
      return db.settings;
    }
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ id: 1, ...patch })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveUser(userObj) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const id = userObj.id || makeUuid();
      const idx = db.users.findIndex((u) => u.id === id);
      const record = { ...userObj, id };
      if (idx >= 0) db.users[idx] = { ...db.users[idx], ...record };
      else db.users.push(record);
      saveDemoDb(db);
      return record;
    }
    const { data, error } = await supabase.from('users').upsert(userObj).select().single();
    if (error) throw error;
    return data;
  },

  async deleteUser(userId) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.users = db.users.filter((u) => u.id !== userId);
      saveDemoDb(db);
      return;
    }
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
  },

  async upsertStudents(studentList) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const byCode = new Map(db.students.map((s) => [s.student_code, s]));
      for (const stu of studentList) {
        const existing = byCode.get(stu.student_code) || db.students.find((s) => s.id === stu.id);
        if (existing) {
          const updated = { ...existing, ...stu };
          const idx = db.students.findIndex((s) => s.id === existing.id);
          db.students[idx] = updated;
        } else {
          db.students.push({ ...stu, id: stu.id || makeUuid() });
        }
      }
      saveDemoDb(db);
      return db.students;
    }

    const { error } = await supabase
      .from('students')
      .upsert(studentList, { onConflict: 'student_code' });
    if (error) throw error;
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('grade_level')
      .order('classroom')
      .order('student_number');
    return data || [];
  },

  async deleteStudent(studentId) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.students = db.students.filter((s) => s.id !== studentId);
      saveDemoDb(db);
      return;
    }
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) throw error;
  },

  async upsertSubjects(subjectList) {
    const BASE_SUBJECT_COLUMNS = [
      'subject_code',
      'subject_name',
      'learning_area',
      'grade_level',
      'subject_type',
      'credits',
      'hours_per_semester',
      'hours_per_week',
      'curriculum_year',
      'is_active',
    ];
    const EXTENDED_SUBJECT_COLUMNS = ['hours_per_year', 'semester', 'sort_order'];

    const sanitizeSubject = (sub, includeExtended = true) => {
      const allowed = includeExtended
        ? [...BASE_SUBJECT_COLUMNS, ...EXTENDED_SUBJECT_COLUMNS]
        : BASE_SUBJECT_COLUMNS;
      const out = {};
      for (const key of allowed) {
        if (sub?.[key] !== undefined && sub?.[key] !== null && sub?.[key] !== '') {
          out[key] = sub[key];
        }
      }
      if (!out.subject_type) out.subject_type = 'พื้นฐาน';
      if (!out.curriculum_year) out.curriculum_year = '2551/2560';
      if (out.is_active === undefined) out.is_active = true;
      if (out.credits !== undefined) out.credits = Number(out.credits);
      if (out.hours_per_semester !== undefined) out.hours_per_semester = Number(out.hours_per_semester);
      if (out.hours_per_week !== undefined) out.hours_per_week = Number(out.hours_per_week);
      if (includeExtended) {
        if (out.hours_per_year !== undefined) out.hours_per_year = Number(out.hours_per_year);
        if (out.sort_order !== undefined) out.sort_order = Number(out.sort_order);
        if (out.semester !== undefined) out.semester = String(out.semester);
      }
      return out;
    };

    const deduplicateSubjects = (rows) => {
      const byKey = new Map();
      for (const row of rows) {
        const key = `${row.subject_code}::${row.grade_level}`;
        const prev = byKey.get(key);
        if (prev && prev.semester && row.semester && prev.semester !== row.semester) {
          byKey.set(key, { ...prev, ...row, semester: '1-2' });
        } else {
          byKey.set(key, prev ? { ...prev, ...row } : row);
        }
      }
      return Array.from(byKey.values());
    };

    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const cleaned = deduplicateSubjects((subjectList || []).map((s) => ({ ...sanitizeSubject(s, true), id: s.id })));
      for (const sub of cleaned) {
        const idx = db.subjects.findIndex(
          (s) =>
            (sub.id && s.id === sub.id) ||
            (s.subject_code === sub.subject_code && s.grade_level === sub.grade_level)
        );
        if (idx >= 0) {
          db.subjects[idx] = { ...db.subjects[idx], ...sub, id: db.subjects[idx].id || sub.id };
        } else {
          db.subjects.push({ ...sub, id: sub.id || makeUuid() });
        }
      }
      saveDemoDb(db);
      return db.subjects;
    }

    const payloadFull = deduplicateSubjects((subjectList || []).map((s) => sanitizeSubject(s, true)));
    let { error } = await supabase
      .from('subjects')
      .upsert(payloadFull, { onConflict: 'subject_code,grade_level' });

    if (error && /hours_per_year|semester|sort_order|schema cache|column/i.test(error.message || '')) {
      const payloadBase = deduplicateSubjects((subjectList || []).map((s) => sanitizeSubject(s, false)));
      const retry = await supabase
        .from('subjects')
        .upsert(payloadBase, { onConflict: 'subject_code,grade_level' });
      error = retry.error;
    }

    if (error) throw error;
    const { data } = await supabase.from('subjects').select('*').order('grade_level').order('subject_code');
    return data || [];
  },

  async deleteSubject(subjectId) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.subjects = db.subjects.filter((s) => s.id !== subjectId);
      saveDemoDb(db);
      return;
    }
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (error) throw error;
  },

  async upsertIndicator(indicatorObj) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const id = indicatorObj.id || makeUuid();
      const idx = db.indicators.findIndex((i) => i.id === id || i.indicator_code === indicatorObj.indicator_code);
      const record = { ...indicatorObj, id };
      if (idx >= 0) db.indicators[idx] = { ...db.indicators[idx], ...record };
      else db.indicators.unshift(record);
      saveDemoDb(db);
      return db.indicators;
    }
    const { error } = await supabase
      .from('curriculum_indicators')
      .upsert(indicatorObj, { onConflict: 'indicator_code' });
    if (error) throw error;
    const { data } = await supabase.from('curriculum_indicators').select('*').order('learning_area').order('indicator_code');
    return data || [];
  },

  async saveCourse(courseObj) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const id = courseObj.id || makeUuid();
      const idx = db.courses.findIndex((c) => c.id === id);
      const record = { ...courseObj, id, updated_at: new Date().toISOString() };
      if (idx >= 0) db.courses[idx] = { ...db.courses[idx], ...record };
      else db.courses.unshift(record);
      if (!db.scoreStructures[id]) {
        db.scoreStructures[id] = {
          course_id: id,
          formative_ratio: 60,
          midterm_ratio: 20,
          final_ratio: 20,
          grading_policy: { minAttendancePct: 80, requireFinalExam: true },
          units: [
            { id: 'u1', name: 'หน่วยการเรียนรู้ที่ 1', category: 'formative', maxScore: 30, indicatorCodes: [] },
            { id: 'u2', name: 'หน่วยการเรียนรู้ที่ 2', category: 'formative', maxScore: 30, indicatorCodes: [] },
            { id: 'mid', name: 'สอบกลางภาคเรียน', category: 'midterm', maxScore: 20, indicatorCodes: [] },
            { id: 'fin', name: 'สอบปลายภาคเรียน', category: 'final', maxScore: 20, indicatorCodes: [] },
          ],
        };
      }
      saveDemoDb(db);
      return record;
    }

    const { data, error } = await supabase
      .from('teacher_courses')
      .upsert(courseObj)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCourse(courseId) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.courses = db.courses.filter((c) => c.id !== courseId);
      saveDemoDb(db);
      return;
    }
    const { error } = await supabase.from('teacher_courses').delete().eq('id', courseId);
    if (error) throw error;
  },

  async saveAttendanceBatch(courseId, records) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      const map = new Map(
        db.attendance.map((a) => [`${a.course_id}|${a.student_id}|${a.session_date}|${a.period_number}`, a])
      );
      for (const rec of records) {
        const key = `${courseId}|${rec.student_id}|${rec.session_date}|${rec.period_number}`;
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          ...rec,
          course_id: courseId,
          id: existing?.id || rec.id || makeUuid(),
        });
      }
      db.attendance = Array.from(map.values());
      saveDemoDb(db);
      return db.attendance.filter((a) => a.course_id === courseId);
    }

    const payload = records.map((r) => ({ ...r, course_id: courseId }));
    const { error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'course_id,student_id,session_date,period_number' });
    if (error) throw error;
    const { data } = await supabase.from('attendance').select('*').eq('course_id', courseId).order('session_date');
    return data || [];
  },

  async deleteAttendanceSession(courseId, sessionDate, periodNumber) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.attendance = db.attendance.filter(
        (a) => !(a.course_id === courseId && a.session_date === sessionDate && Number(a.period_number) === Number(periodNumber))
      );
      saveDemoDb(db);
      return db.attendance.filter((a) => a.course_id === courseId);
    }
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('course_id', courseId)
      .eq('session_date', sessionDate)
      .eq('period_number', periodNumber);
    if (error) throw error;
    const { data } = await supabase.from('attendance').select('*').eq('course_id', courseId).order('session_date');
    return data || [];
  },

  async saveScoreStructure(courseId, structure) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.scoreStructures[courseId] = { ...structure, course_id: courseId };
      saveDemoDb(db);
      return db.scoreStructures[courseId];
    }
    const { data, error } = await supabase
      .from('score_structures')
      .upsert({ ...structure, course_id: courseId }, { onConflict: 'course_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveStudentScoresBatch(courseId, rows) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.studentScores[courseId] = rows.map((r) => ({ ...r, course_id: courseId }));
      saveDemoDb(db);
      return db.studentScores[courseId];
    }
    const payload = rows.map((r) => ({ ...r, course_id: courseId }));
    const { error } = await supabase
      .from('student_scores')
      .upsert(payload, { onConflict: 'course_id,student_id' });
    if (error) throw error;
    const { data } = await supabase.from('student_scores').select('*').eq('course_id', courseId);
    return data || [];
  },

  async saveCharacteristicsBatch(courseId, rows) {
    if (!isSchemaReadyForLive()) {
      const db = loadDemoDb();
      db.characteristicsScores[courseId] = rows.map((r) => ({ ...r, course_id: courseId }));
      saveDemoDb(db);
      return db.characteristicsScores[courseId];
    }
    const payload = rows.map((r) => ({ ...r, course_id: courseId }));
    const { error } = await supabase
      .from('characteristics_scores')
      .upsert(payload, { onConflict: 'course_id,student_id' });
    if (error) throw error;
    const { data } = await supabase.from('characteristics_scores').select('*').eq('course_id', courseId);
    return data || [];
  },
};
