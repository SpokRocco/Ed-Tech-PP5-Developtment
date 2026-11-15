import { ensureSchema, getDb, isTursoConfigured } from '../server/db.js';
import { getSessionUser, jsonError, jsonOk, parseJsonBody, requireSession } from '../server/auth.js';
import { seedDatabaseWithClient } from '../server/seedService.js';
import {
  mapClassroomSummaryRow,
  mapCourseRow,
  mapIndicatorRow,
  mapPublicSettingsHeader,
  mapStudentRow,
  mapSubjectRow,
  mapSystemSettingsRow,
  mapUserRow,
  sortCourses,
  sortIndicators,
  sortStudents,
  sortSubjects,
  sortUsers,
} from '../server/mappers.js';
import { DEMO_INDICATORS, DEMO_SYSTEM_SETTINGS } from '../src/data/demoSeedData.js';

export async function GET(request) {
  if (!isTursoConfigured()) {
    return jsonOk({
      settings: DEMO_SYSTEM_SETTINGS,
      users: [],
      students: [],
      subjects: [],
      indicators: DEMO_INDICATORS,
      courses: [],
      classroomSummaries: [],
      __meta: { configured: false, schemaReady: false, isSeeded: false, reason: 'unconfigured' },
    });
  }

  try {
    const db = getDb();
    await ensureSchema(db);
    const [sessionUser, settingsRes, userCountRes] = await Promise.all([
      getSessionUser(request, db),
      db.execute('SELECT * FROM system_settings WHERE id = 1 LIMIT 1'),
      db.execute('SELECT COUNT(*) AS cnt FROM users'),
    ]);

    const settingsRow = settingsRes.rows?.[0] || null;
    const isSeeded = Boolean(settingsRow);
    const userCount = Number(userCountRes.rows?.[0]?.cnt || 0);

    if (!sessionUser) {
      return jsonOk({
        settings: settingsRow ? mapPublicSettingsHeader(settingsRow) : DEMO_SYSTEM_SETTINGS,
        users: [],
        students: [],
        subjects: [],
        indicators: DEMO_INDICATORS,
        courses: [],
        classroomSummaries: [],
        __meta: {
          configured: true,
          schemaReady: true,
          isSeeded,
          userCount,
          reason: isSeeded ? 'awaiting_signin' : 'unseeded',
        },
      });
    }

    const isAdmin = sessionUser.role === 'admin';
    const [usersRes, studentsRes, subjectsRes, indicatorsRes, coursesRes, summariesRes] =
      await Promise.all([
        isAdmin
          ? db.execute('SELECT * FROM users')
          : db.execute(
              'SELECT id, full_name, position, academic_standing, role, learning_area, homeroom_grade, is_active FROM users WHERE is_active = 1'
            ),
        db.execute('SELECT * FROM students'),
        db.execute('SELECT * FROM subjects'),
        db.execute('SELECT * FROM curriculum_indicators'),
        db.execute('SELECT * FROM teacher_courses'),
        db.execute('SELECT * FROM classroom_pp5_summaries'),
      ]);

    const mappedUsers = sortUsers(
      (usersRes.rows || []).map((row) => mapUserRow(row, isAdmin))
    );
    const mappedIndicators = (indicatorsRes.rows || []).map(mapIndicatorRow);

    return jsonOk({
      settings: settingsRow ? mapSystemSettingsRow(settingsRow) : DEMO_SYSTEM_SETTINGS,
      users: mappedUsers,
      students: sortStudents((studentsRes.rows || []).map(mapStudentRow)),
      subjects: sortSubjects((subjectsRes.rows || []).map(mapSubjectRow)),
      indicators: mappedIndicators.length ? sortIndicators(mappedIndicators) : DEMO_INDICATORS,
      courses: sortCourses((coursesRes.rows || []).map(mapCourseRow)),
      classroomSummaries: sortStudents(
        (summariesRes.rows || []).map(mapClassroomSummaryRow)
      ),
      __meta: {
        configured: true,
        schemaReady: true,
        isSeeded: isSeeded || (subjectsRes.rows || []).length > 0,
        userCount,
        reason: '',
      },
    });
  } catch (err) {
    console.error('[api/bootstrap GET] failed:', err);
    return jsonError('ไม่สามารถโหลดข้อมูลระบบจาก Turso ได้', 500);
  }
}

export async function POST(request) {
  try {
    const db = getDb();
    const { user, errorResponse } = await requireSession(request, db, ['admin']);
    if (errorResponse) return errorResponse;

    const body = await parseJsonBody(request);
    if (body.action !== 'seed') {
      return jsonError('ไม่รองรับคำสั่งนี้', 400);
    }

    const result = await seedDatabaseWithClient(db, {
      adminEmails: [user.email],
    });
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    console.error('[api/bootstrap POST] failed:', err);
    return jsonError(err?.message || 'ติดตั้งข้อมูลตั้งต้นเข้า Turso ไม่สำเร็จ', 500);
  }
}
