import {
  DEMO_ACADEMIC_DOCUMENTS,
  DEMO_ATTENDANCE,
  DEMO_CHARACTERISTICS_SCORES,
  DEMO_CLASSROOM_SUMMARIES,
  DEMO_COURSES,
  DEMO_INDICATORS,
  DEMO_PRIMARY_2568_ASSESSMENTS,
  DEMO_SCORE_STRUCTURES,
  DEMO_STUDENTS,
  DEMO_STUDENT_SCORES,
  DEMO_SUBJECTS,
  DEMO_SYSTEM_SETTINGS,
  DEMO_USERS,
} from '../data/demoSeedData';
import { isBackendReadyForLive, setBackendStatus } from '../lib/mediaUtils';
import { GRADE_LEVELS } from '../lib/thaiFormatting';

const DEMO_DB_KEY = 'banhatkhet_pp5_demo_db_v3';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now();
}

function toNullableNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function gradeRank(grade) {
  const idx = GRADE_LEVELS.indexOf(grade);
  return idx >= 0 ? idx : 999;
}

function sortUsers(list) {
  return [...list].sort((a, b) => {
    const r = String(a.role || '').localeCompare(String(b.role || ''));
    if (r !== 0) return r;
    return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'th');
  });
}

function sortStudents(list) {
  return [...list].sort((a, b) => {
    const g = gradeRank(a.grade_level) - gradeRank(b.grade_level);
    if (g !== 0) return g;
    const c = String(a.classroom || '').localeCompare(String(b.classroom || ''), 'th');
    if (c !== 0) return c;
    return Number(a.student_number || 999) - Number(b.student_number || 999);
  });
}

function sortSubjects(list) {
  return [...list].sort((a, b) => {
    const g = gradeRank(a.grade_level) - gradeRank(b.grade_level);
    if (g !== 0) return g;
    const s = Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999);
    if (s !== 0) return s;
    return String(a.subject_code || '').localeCompare(String(b.subject_code || ''), 'th');
  });
}

function sortIndicators(list) {
  return [...list].sort((a, b) => {
    const l = String(a.learning_area || '').localeCompare(String(b.learning_area || ''), 'th');
    if (l !== 0) return l;
    return String(a.indicator_code || '').localeCompare(String(b.indicator_code || ''), 'th');
  });
}

function sortAcademicDocuments(list) {
  return [...(list || [])].sort((a, b) =>
    String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
  );
}

function defaultScoreStructure(courseId) {
  return {
    course_id: courseId,
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

function toFlatArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val).flat().filter(Boolean);
  return [];
}

function toObjectValuesArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val).filter(Boolean);
  return [];
}

function initialDemoDb() {
  return {
    settings: clone(DEMO_SYSTEM_SETTINGS),
    users: clone(DEMO_USERS),
    students: clone(DEMO_STUDENTS),
    subjects: clone(DEMO_SUBJECTS),
    indicators: clone(DEMO_INDICATORS),
    courses: clone(DEMO_COURSES),
    scoreStructures: toObjectValuesArray(clone(DEMO_SCORE_STRUCTURES)),
    attendance: toFlatArray(clone(DEMO_ATTENDANCE)),
    studentScores: toFlatArray(clone(DEMO_STUDENT_SCORES)),
    characteristicsScores: toFlatArray(clone(DEMO_CHARACTERISTICS_SCORES)),
    classroomSummaries: clone(DEMO_CLASSROOM_SUMMARIES),
    primary2568Assessments: clone(DEMO_PRIMARY_2568_ASSESSMENTS),
    academicDocuments: clone(DEMO_ACADEMIC_DOCUMENTS),
  };
}

function loadDemoDb() {
  try {
    const raw = localStorage.getItem(DEMO_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.settings?.logo_url && String(parsed.settings.logo_url).includes('fhfckuypfstlokashcmu')) {
        parsed.settings.logo_url = '/school-logo.webp';
        saveDemoDb(parsed);
      }
      if (parsed?.settings && Array.isArray(parsed?.subjects)) {
        return {
          ...initialDemoDb(),
          ...parsed,
          scoreStructures: toObjectValuesArray(parsed.scoreStructures ?? DEMO_SCORE_STRUCTURES),
          attendance: toFlatArray(parsed.attendance ?? DEMO_ATTENDANCE),
          studentScores: toFlatArray(parsed.studentScores ?? DEMO_STUDENT_SCORES),
          characteristicsScores: toFlatArray(parsed.characteristicsScores ?? DEMO_CHARACTERISTICS_SCORES),
          academicDocuments: Array.isArray(parsed.academicDocuments)
            ? parsed.academicDocuments
            : clone(DEMO_ACADEMIC_DOCUMENTS),
        };
      }
    }
  } catch (err) {
    console.warn('Could not load demo DB from localStorage:', err);
  }
  const fresh = initialDemoDb();
  saveDemoDb(fresh);
  return fresh;
}

function saveDemoDb(dbData) {
  try {
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(dbData));
  } catch (err) {
    console.warn('Could not save demo DB to localStorage:', err);
  }
}

export function resetDemoDatabase() {
  const fresh = initialDemoDb();
  saveDemoDb(fresh);
  return fresh;
}

async function apiRequest(url, options = {}) {
  const { method = 'GET', body } = options;
  const init = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `คำขอไม่สำเร็จ (HTTP ${res.status})`;
    const error = new Error(msg);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data || {};
}

export const dataService = {
  async probeBackend() {
    try {
      const res = await fetch('/api/health', { credentials: 'include' });
      if (!res.ok) {
        setBackendStatus({ configured: false, schemaReady: false });
        return { configured: false, schemaReady: false, isSeeded: false, userCount: 0, authenticated: false };
      }
      const probe = await res.json();
      setBackendStatus({
        configured: Boolean(probe?.configured),
        schemaReady: Boolean(probe?.schemaReady),
      });
      return probe;
    } catch {
      setBackendStatus({ configured: false, schemaReady: false });
      return { configured: false, schemaReady: false, isSeeded: false, userCount: 0, authenticated: false };
    }
  },

  async fetchBootstrapData(currentUser = null) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      return {
        settings: dbData.settings,
        users: sortUsers(dbData.users),
        students: sortStudents(dbData.students),
        subjects: sortSubjects(dbData.subjects),
        indicators: sortIndicators(dbData.indicators),
        courses: dbData.courses,
        classroomSummaries: dbData.classroomSummaries,
        academicDocuments: sortAcademicDocuments(dbData.academicDocuments),
        __meta: {
          configured: false,
          schemaReady: false,
          isSeeded: true,
          userCount: dbData.users.length,
          reason: 'demo_mode',
        },
      };
    }

    if (!currentUser) {
      return apiRequest('/api/bootstrap');
    }
    return apiRequest('/api/bootstrap');
  },

  async seedInitialDatabase(currentUser = null) {
    if (!isBackendReadyForLive()) {
      resetDemoDatabase();
      return { ok: true, mode: 'demo' };
    }
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ติดตั้งข้อมูลตั้งต้นเข้าฐานข้อมูลได้');
    }
    return apiRequest('/api/bootstrap', {
      method: 'POST',
      body: { action: 'seed' },
    });
  },

  async updateSystemSettings(patch) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      dbData.settings = {
        ...dbData.settings,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      saveDemoDb(dbData);
      return dbData.settings;
    }
    const res = await apiRequest('/api/settings', {
      method: 'PUT',
      body: patch,
    });
    return res.settings;
  },

  async saveUser(userObj) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const { initial_password: _ignoredPassword, ...cleanUser } = userObj;
      const emailLower = String(cleanUser.email || '').trim().toLowerCase();
      const existingIdx = dbData.users.findIndex(
        (u) => u.id === cleanUser.id || (emailLower && String(u.email || '').toLowerCase() === emailLower)
      );
      const saved = {
        ...cleanUser,
        id: existingIdx >= 0 ? dbData.users[existingIdx].id : cleanUser.id || makeUuid(),
        email: emailLower || cleanUser.email,
        is_active: cleanUser.is_active !== false,
        updated_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) dbData.users[existingIdx] = { ...dbData.users[existingIdx], ...saved };
      else dbData.users.push(saved);
      saveDemoDb(dbData);
      return existingIdx >= 0 ? dbData.users[existingIdx] : saved;
    }
    const res = await apiRequest('/api/users', {
      method: 'POST',
      body: userObj,
    });
    return res.user;
  },

  async deleteUser(userId) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      dbData.users = dbData.users.filter((u) => u.id !== userId);
      saveDemoDb(dbData);
      return { ok: true };
    }
    return apiRequest(`/api/users?id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async upsertStudents(list) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      list.forEach((stu) => {
        const idx = dbData.students.findIndex(
          (s) => s.id === stu.id || (stu.student_code && s.student_code === stu.student_code)
        );
        const row = {
          ...stu,
          id: idx >= 0 ? dbData.students[idx].id : stu.id || `stu_${stu.student_code || makeUuid()}`,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) dbData.students[idx] = row;
        else dbData.students.push(row);
      });
      saveDemoDb(dbData);
      return sortStudents(dbData.students);
    }
    const res = await apiRequest('/api/students', {
      method: 'POST',
      body: { students: list },
    });
    return res.students || [];
  },

  async deleteStudent(studentId) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      dbData.students = dbData.students.filter((s) => s.id !== studentId);
      saveDemoDb(dbData);
      return { ok: true };
    }
    return apiRequest(`/api/students?id=${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    });
  },

  async upsertSubjects(list) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      list.forEach((sub) => {
        const clean = {
          ...sub,
          credits: toNullableNumber(sub.credits),
          hours_per_semester: toNullableNumber(sub.hours_per_semester),
          hours_per_week: toNullableNumber(sub.hours_per_week),
          hours_per_year: toNullableNumber(sub.hours_per_year),
          is_active: sub.is_active !== false,
          updated_at: new Date().toISOString(),
        };
        const idx = dbData.subjects.findIndex(
          (s) =>
            s.id === clean.id ||
            (s.subject_code === clean.subject_code && s.grade_level === clean.grade_level)
        );
        if (idx >= 0) {
          const prev = dbData.subjects[idx];
          const mergedSemester =
            prev.semester && clean.semester && prev.semester !== clean.semester
              ? '1-2'
              : clean.semester || prev.semester || '';
          dbData.subjects[idx] = { ...prev, ...clean, id: prev.id, semester: mergedSemester };
        } else {
          dbData.subjects.push({
            ...clean,
            id: clean.id || `${clean.grade_level}__${clean.subject_code}`,
          });
        }
      });
      saveDemoDb(dbData);
      return sortSubjects(dbData.subjects);
    }
    const res = await apiRequest('/api/curriculum', {
      method: 'POST',
      body: { action: 'upsert_subjects', subjects: list },
    });
    return res.subjects || [];
  },

  async deleteSubject(subjectId) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      dbData.subjects = dbData.subjects.filter((s) => s.id !== subjectId);
      saveDemoDb(dbData);
      return { ok: true };
    }
    return apiRequest(`/api/curriculum?id=${encodeURIComponent(subjectId)}`, {
      method: 'DELETE',
    });
  },

  async upsertIndicator(indObj) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const idx = dbData.indicators.findIndex(
        (i) => i.id === indObj.id || i.indicator_code === indObj.indicator_code
      );
      const row = {
        ...indObj,
        id: idx >= 0 ? dbData.indicators[idx].id : indObj.id || indObj.indicator_code || makeUuid(),
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) dbData.indicators[idx] = row;
      else dbData.indicators.push(row);
      saveDemoDb(dbData);
      return sortIndicators(dbData.indicators);
    }
    const res = await apiRequest('/api/curriculum', {
      method: 'POST',
      body: { action: 'upsert_indicator', indicator: indObj },
    });
    return res.indicators || [];
  },

  async saveCourse(courseObj) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const nowIso = new Date().toISOString();
      const idx = dbData.courses.findIndex((c) => c.id === courseObj.id);
      const id = idx >= 0 ? dbData.courses[idx].id : courseObj.id || makeUuid();
      const saved = {
        ...(idx >= 0 ? dbData.courses[idx] : {}),
        ...courseObj,
        id,
        updated_at: nowIso,
      };
      if (idx >= 0) {
        dbData.courses[idx] = saved;
      } else {
        dbData.courses.unshift(saved);
        if (!dbData.scoreStructures.some((s) => s.course_id === id)) {
          dbData.scoreStructures.push({ ...defaultScoreStructure(id), updated_at: nowIso });
        }
      }
      saveDemoDb(dbData);
      return saved;
    }
    const res = await apiRequest('/api/courses', {
      method: 'POST',
      body: { action: 'save_course', course: courseObj },
    });
    return res.course;
  },

  async deleteCourse(courseId) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      dbData.courses = dbData.courses.filter((c) => c.id !== courseId);
      dbData.scoreStructures = dbData.scoreStructures.filter((s) => s.course_id !== courseId);
      dbData.attendance = dbData.attendance.filter((a) => a.course_id !== courseId);
      dbData.studentScores = dbData.studentScores.filter((s) => s.course_id !== courseId);
      dbData.characteristicsScores = dbData.characteristicsScores.filter((c) => c.course_id !== courseId);
      saveDemoDb(dbData);
      return { ok: true };
    }
    return apiRequest(`/api/courses?id=${encodeURIComponent(courseId)}`, {
      method: 'DELETE',
    });
  },

  async fetchCourseDetails(courseId) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      return {
        scoreStructure:
          dbData.scoreStructures.find((s) => s.course_id === courseId) ||
          defaultScoreStructure(courseId),
        attendance: dbData.attendance
          .filter((a) => a.course_id === courseId)
          .sort((a, b) =>
            String(a.session_date).localeCompare(String(b.session_date)) ||
            Number(a.period_number || 1) - Number(b.period_number || 1)
          ),
        studentScores: dbData.studentScores.filter((s) => s.course_id === courseId),
        characteristicsScores: dbData.characteristicsScores.filter((c) => c.course_id === courseId),
      };
    }
    return apiRequest(`/api/courses?courseId=${encodeURIComponent(courseId)}`);
  },

  async fetchAllSchoolAttendance() {
    if (!isBackendReadyForLive()) {
      return toFlatArray(loadDemoDb().attendance);
    }
    const res = await apiRequest('/api/courses?scope=all_attendance');
    return res.rows || [];
  },

  async fetchAllSchoolScores() {
    if (!isBackendReadyForLive()) {
      return toFlatArray(loadDemoDb().studentScores);
    }
    const res = await apiRequest('/api/courses?scope=all_scores');
    return res.rows || [];
  },

  async fetchAllSchoolCharacteristics() {
    if (!isBackendReadyForLive()) {
      return toFlatArray(loadDemoDb().characteristicsScores);
    }
    const res = await apiRequest('/api/courses?scope=all_characteristics');
    return res.rows || [];
  },

  async fetchAllSchoolScoreStructures() {
    if (!isBackendReadyForLive()) {
      return toObjectValuesArray(loadDemoDb().scoreStructures);
    }
    const res = await apiRequest('/api/courses?scope=all_structures');
    return res.rows || [];
  },

  async fetchClassroomMatrixData() {
    const [allScores, allAttendance, allCharacteristics, scoreStructures] = await Promise.all([
      this.fetchAllSchoolScores(),
      this.fetchAllSchoolAttendance(),
      this.fetchAllSchoolCharacteristics(),
      this.fetchAllSchoolScoreStructures(),
    ]);
    return { allScores, allAttendance, allCharacteristics, scoreStructures };
  },

  async saveScoreStructure(courseId, structure) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const idx = dbData.scoreStructures.findIndex((s) => s.course_id === courseId);
      const saved = {
        ...structure,
        course_id: courseId,
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) dbData.scoreStructures[idx] = saved;
      else dbData.scoreStructures.push(saved);
      saveDemoDb(dbData);
      return saved;
    }
    const res = await apiRequest('/api/courses', {
      method: 'POST',
      body: { action: 'save_structure', courseId, structure },
    });
    return res.scoreStructure;
  },

  async saveAttendanceBatch(courseId, records) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const nowIso = new Date().toISOString();
      records.forEach((rec) => {
        const periodNum = Number(rec.period_number || 1);
        const idx = dbData.attendance.findIndex(
          (a) =>
            a.course_id === courseId &&
            a.student_id === rec.student_id &&
            a.session_date === rec.session_date &&
            Number(a.period_number || 1) === periodNum
        );
        const row = {
          ...rec,
          course_id: courseId,
          period_number: periodNum,
          id:
            idx >= 0
              ? dbData.attendance[idx].id
              : rec.id || `${courseId}__${rec.student_id}__${rec.session_date}__${periodNum}`,
          updated_at: nowIso,
        };
        if (idx >= 0) dbData.attendance[idx] = row;
        else dbData.attendance.push(row);
      });
      saveDemoDb(dbData);
      return dbData.attendance
        .filter((a) => a.course_id === courseId)
        .sort((a, b) =>
          String(a.session_date).localeCompare(String(b.session_date)) ||
          Number(a.period_number || 1) - Number(b.period_number || 1)
        );
    }
    const res = await apiRequest('/api/courses', {
      method: 'POST',
      body: { action: 'save_attendance', courseId, records },
    });
    return res.attendance || [];
  },

  async deleteAttendanceSession(courseId, sessionDate, periodNumber) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const targetPeriod = Number(periodNumber || 1);
      dbData.attendance = dbData.attendance.filter(
        (a) =>
          !(
            a.course_id === courseId &&
            a.session_date === sessionDate &&
            Number(a.period_number || 1) === targetPeriod
          )
      );
      saveDemoDb(dbData);
      return dbData.attendance.filter((a) => a.course_id === courseId);
    }
    const res = await apiRequest('/api/courses', {
      method: 'POST',
      body: { action: 'delete_attendance', courseId, sessionDate, periodNumber },
    });
    return res.attendance || [];
  },

  async saveStudentScoresBatch(courseId, rows) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const nowIso = new Date().toISOString();
      rows.forEach((row) => {
        const idx = dbData.studentScores.findIndex(
          (r) => r.course_id === courseId && r.student_id === row.student_id
        );
        const saved = {
          ...row,
          course_id: courseId,
          id: idx >= 0 ? dbData.studentScores[idx].id : row.id || `${courseId}__${row.student_id}`,
          updated_at: nowIso,
        };
        if (idx >= 0) dbData.studentScores[idx] = saved;
        else dbData.studentScores.push(saved);
      });
      saveDemoDb(dbData);
      return dbData.studentScores.filter((r) => r.course_id === courseId);
    }
    const res = await apiRequest('/api/courses', {
      method: 'POST',
      body: { action: 'save_scores', courseId, rows },
    });
    return res.studentScores || [];
  },

  async saveCharacteristicsBatch(courseId, rows) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const nowIso = new Date().toISOString();
      rows.forEach((row) => {
        const idx = dbData.characteristicsScores.findIndex(
          (r) => r.course_id === courseId && r.student_id === row.student_id
        );
        const saved = {
          ...row,
          course_id: courseId,
          id: idx >= 0 ? dbData.characteristicsScores[idx].id : row.id || `${courseId}__${row.student_id}`,
          updated_at: nowIso,
        };
        if (idx >= 0) dbData.characteristicsScores[idx] = saved;
        else dbData.characteristicsScores.push(saved);
      });
      saveDemoDb(dbData);
      return dbData.characteristicsScores.filter((r) => r.course_id === courseId);
    }
    const res = await apiRequest('/api/courses', {
      method: 'POST',
      body: { action: 'save_characteristics', courseId, rows },
    });
    return res.characteristicsScores || [];
  },

  async fetchPrimary2568Assessments(gradeLevel, classroom) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      return (dbData.primary2568Assessments || []).filter(
        (r) =>
          (!gradeLevel || r.grade_level === gradeLevel) &&
          (!classroom || String(r.classroom || '1') === String(classroom))
      );
    }
    const params = new URLSearchParams();
    if (gradeLevel) params.set('gradeLevel', gradeLevel);
    if (classroom) params.set('classroom', String(classroom));
    const res = await apiRequest(`/api/classroom?${params.toString()}`);
    return res.rows || [];
  },

  async savePrimary2568Batch(rows) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      if (!Array.isArray(dbData.primary2568Assessments)) {
        dbData.primary2568Assessments = [];
      }
      const nowIso = new Date().toISOString();
      rows.forEach((row) => {
        const year = String(row.academic_year || '2569');
        const sem = String(row.semester || '1');
        const idx = dbData.primary2568Assessments.findIndex(
          (r) =>
            r.student_id === row.student_id &&
            String(r.academic_year || '2569') === year &&
            String(r.semester || '1') === sem
        );
        const saved = {
          ...row,
          id: idx >= 0 ? dbData.primary2568Assessments[idx].id : row.id || `${row.student_id}__${year}__${sem}`,
          updated_at: nowIso,
        };
        if (idx >= 0) dbData.primary2568Assessments[idx] = saved;
        else dbData.primary2568Assessments.push(saved);
      });
      saveDemoDb(dbData);
      const first = rows[0];
      return first
        ? dbData.primary2568Assessments.filter(
            (r) => r.grade_level === first.grade_level && String(r.classroom || '1') === String(first.classroom || '1')
          )
        : [];
    }
    const res = await apiRequest('/api/classroom', {
      method: 'POST',
      body: { action: 'save_primary2568_batch', rows },
    });
    return res.rows || [];
  },

  async saveClassroomSummary(summaryObj) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      const idx = dbData.classroomSummaries.findIndex(
        (s) =>
          s.grade_level === summaryObj.grade_level &&
          String(s.classroom || '1') === String(summaryObj.classroom || '1') &&
          String(s.academic_year || '2569') === String(summaryObj.academic_year || '2569') &&
          String(s.semester || '1') === String(summaryObj.semester || '1')
      );
      const saved = {
        ...summaryObj,
        id:
          idx >= 0
            ? dbData.classroomSummaries[idx].id
            : summaryObj.id || `${summaryObj.grade_level}_${summaryObj.classroom}_${summaryObj.semester}`,
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) dbData.classroomSummaries[idx] = saved;
      else dbData.classroomSummaries.push(saved);
      saveDemoDb(dbData);
      return saved;
    }
    const res = await apiRequest('/api/classroom', {
      method: 'POST',
      body: { action: 'save_summary', summary: summaryObj },
    });
    return res.summary;
  },

  async fetchAcademicDocuments(filters = {}) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      let list = dbData.academicDocuments || [];
      if (filters.id) list = list.filter((d) => d.id === filters.id);
      if (filters.docType) list = list.filter((d) => d.doc_type === filters.docType);
      if (filters.gradeLevel) list = list.filter((d) => d.grade_level === filters.gradeLevel);
      if (filters.classroom) list = list.filter((d) => String(d.classroom || '1') === String(filters.classroom));
      return sortAcademicDocuments(list);
    }
    const params = new URLSearchParams();
    if (filters.id) params.set('id', filters.id);
    if (filters.docType) params.set('docType', filters.docType);
    if (filters.gradeLevel) params.set('gradeLevel', filters.gradeLevel);
    if (filters.classroom) params.set('classroom', String(filters.classroom));
    const qs = params.toString();
    const res = await apiRequest(`/api/documents${qs ? `?${qs}` : ''}`);
    return sortAcademicDocuments(res.documents || []);
  },

  async saveAcademicDocument(docObj) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      if (!Array.isArray(dbData.academicDocuments)) {
        dbData.academicDocuments = clone(DEMO_ACADEMIC_DOCUMENTS);
      }
      const id = docObj.id || `${docObj.doc_type}-${makeUuid()}`;
      const idx = dbData.academicDocuments.findIndex((d) => d.id === id);
      const saved = {
        ...docObj,
        id,
        completion_pct: Math.max(0, Math.min(100, Number(docObj.completion_pct ?? 0))),
        status: docObj.status || 'draft',
        payload: docObj.payload && typeof docObj.payload === 'object' ? docObj.payload : {},
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) dbData.academicDocuments[idx] = saved;
      else dbData.academicDocuments.push(saved);
      saveDemoDb(dbData);
      return saved;
    }
    const res = await apiRequest('/api/documents', {
      method: 'POST',
      body: { document: docObj },
    });
    return res.document;
  },

  async deleteAcademicDocument(docId) {
    if (!isBackendReadyForLive()) {
      const dbData = loadDemoDb();
      dbData.academicDocuments = (dbData.academicDocuments || []).filter((d) => d.id !== docId);
      saveDemoDb(dbData);
      return true;
    }
    await apiRequest(`/api/documents?id=${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    return true;
  },
};
