/**
 * ฟังก์ชันคำนวณผลการเรียน มาตรฐาน ปพ.5 และรูปแบบภาษาไทย
 * โรงเรียนบ้านหาดเค็ด สพป.น่าน เขต 1
 */

export const GRADE_LEVELS = [
  'อ.3',
  'ป.1',
  'ป.2',
  'ป.3',
  'ป.4',
  'ป.5',
  'ป.6',
  'ม.1',
  'ม.2',
  'ม.3',
];

export const LEARNING_AREAS = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์และเทคโนโลยี',
  'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'ภาษาต่างประเทศ',
  'กิจกรรมพัฒนาผู้เรียน',
  'การศึกษาปฐมวัย',
];

export const ATTENDANCE_STATUS = {
  present: { code: '/', label: 'มาเรียน', short: 'มา', color: 'emerald', countsAsPresent: true },
  late: { code: 'ส', label: 'มาสาย', short: 'สาย', color: 'amber', countsAsPresent: true },
  sick_leave: { code: 'ป', label: 'ลาป่วย', short: 'ป่วย', color: 'sky', countsAsPresent: false },
  personal_leave: { code: 'ก', label: 'ลากิจ', short: 'กิจ', color: 'violet', countsAsPresent: false },
  absent: { code: 'ข', label: 'ขาดเรียน', short: 'ขาด', color: 'rose', countsAsPresent: false },
};

export const COURSE_STATUS_META = {
  draft: { label: 'ร่างเอกสาร', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  in_progress: { label: 'กำลังบันทึกข้อมูล', badge: 'bg-sky-50 text-sky-800 border-sky-300' },
  submitted: { label: 'รอผู้บริหารอนุมัติ', badge: 'bg-amber-50 text-amber-800 border-amber-300' },
  revision_requested: { label: 'ส่งกลับแก้ไข', badge: 'bg-rose-50 text-rose-800 border-rose-300' },
  approved: { label: 'อนุมัติแล้ว', badge: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
};

export const LEVEL_LABELS = {
  3: { label: 'ดีเยี่ยม', code: '3', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  2: { label: 'ดี', code: '2', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  1: { label: 'ผ่าน', code: '1', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  0: { label: 'ไม่ผ่าน', code: '0', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
};

/**
 * คำนวณสถิติเวลาเรียนของนักเรียนในรายวิชา
 */
export function calculateStudentAttendance(records = [], totalCourseHours = 40, minPct = 80) {
  const totalRecorded = records.length;
  const counts = {
    present: 0,
    late: 0,
    sick_leave: 0,
    personal_leave: 0,
    absent: 0,
  };

  for (const r of records) {
    if (counts[r.status] !== undefined) {
      counts[r.status] += 1;
    }
  }

  const attendedPeriods = counts.present + counts.late;
  const denominator = totalRecorded > 0 ? totalRecorded : totalCourseHours;
  const attendancePct =
    totalRecorded > 0 ? Number(((attendedPeriods / denominator) * 100).toFixed(1)) : 100;
  const isBelowThreshold = totalRecorded > 0 && attendancePct < minPct;

  return {
    ...counts,
    totalRecorded,
    attendedPeriods,
    attendancePct,
    isBelowThreshold,
    statusLabel: isBelowThreshold ? 'มส' : 'มีสิทธิ์สอบ',
  };
}

/**
 * แปลงคะแนนรวม 0-100 เป็นเกรดมาตรฐาน 8 ระดับ + ร / มส
 */
export function calculateGradeFromScore({
  totalScore,
  attendancePct = 100,
  minAttendancePct = 80,
  hasFinalScore = true,
  requireFinalExam = true,
  manualSpecialStatus = null,
}) {
  if (manualSpecialStatus === 'มส' || attendancePct < minAttendancePct) {
    return 'มส';
  }
  if (manualSpecialStatus === 'ร' || (requireFinalExam && !hasFinalScore)) {
    return 'ร';
  }

  const score = Math.round(Number(totalScore) || 0);
  if (score >= 80) return '4';
  if (score >= 75) return '3.5';
  if (score >= 70) return '3';
  if (score >= 65) return '2.5';
  if (score >= 60) return '2';
  if (score >= 55) return '1.5';
  if (score >= 50) return '1';
  return '0';
}

/**
 * คำนวณสรุปคะแนนเก็บ/กลางภาค/ปลายภาคตามโครงสร้างสัดส่วน
 */
export function computeStudentCourseScores(studentScoreRow, scoreStructure, attendanceSummary) {
  const units = scoreStructure?.units || [];
  const unitScores = studentScoreRow?.unit_scores || {};

  let formativeRaw = 0;
  let formativeMax = 0;
  let midtermRaw = 0;
  let midtermMax = 0;
  let finalRaw = 0;
  let finalMax = 0;
  let hasFinalEntry = false;

  for (const unit of units) {
    const val = unitScores[unit.id];
    const numericVal = val === '' || val === null || val === undefined ? 0 : Number(val) || 0;
    const maxVal = Number(unit.maxScore) || 0;

    if (unit.category === 'midterm') {
      midtermRaw += numericVal;
      midtermMax += maxVal;
    } else if (unit.category === 'final') {
      finalRaw += numericVal;
      finalMax += maxVal;
      if (val !== '' && val !== null && val !== undefined) {
        hasFinalEntry = true;
      }
    } else {
      formativeRaw += numericVal;
      formativeMax += maxVal;
    }
  }

  const fRatio = Number(scoreStructure?.formative_ratio ?? 60);
  const mRatio = Number(scoreStructure?.midterm_ratio ?? 20);
  const fnRatio = Number(scoreStructure?.final_ratio ?? 20);

  const formativeWeighted = formativeMax > 0 ? (formativeRaw / formativeMax) * fRatio : 0;
  const midtermWeighted = midtermMax > 0 ? (midtermRaw / midtermMax) * mRatio : 0;
  const finalWeighted = finalMax > 0 ? (finalRaw / finalMax) * fnRatio : 0;

  const totalScore = Number((formativeWeighted + midtermWeighted + finalWeighted).toFixed(1));
  const minAttendancePct = Number(scoreStructure?.grading_policy?.minAttendancePct ?? 80);
  const requireFinalExam = Boolean(scoreStructure?.grading_policy?.requireFinalExam ?? false);

  const grade = calculateGradeFromScore({
    totalScore,
    attendancePct: attendanceSummary?.attendancePct ?? 100,
    minAttendancePct,
    hasFinalScore: finalMax === 0 || hasFinalEntry,
    requireFinalExam,
    manualSpecialStatus: studentScoreRow?.special_status || null,
  });

  return {
    formativeTotal: Number(formativeWeighted.toFixed(1)),
    midtermTotal: Number(midtermWeighted.toFixed(1)),
    finalTotal: Number(finalWeighted.toFixed(1)),
    totalScore,
    grade,
  };
}

/**
 * เดาชื่อกลุ่มสาระฯ และระดับชั้นจากรหัสวิชาหลักสูตรแกนกลางฯ ไทย เช่น ท14101, ค21101
 */
export function inferCurriculumMetaFromCode(subjectCode = '') {
  const code = subjectCode.trim();
  const prefixMap = {
    ท: 'ภาษาไทย',
    ค: 'คณิตศาสตร์',
    ว: 'วิทยาศาสตร์และเทคโนโลยี',
    ส: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    พ: 'สุขศึกษาและพลศึกษา',
    ศ: 'ศิลปะ',
    ง: 'การงานอาชีพ',
    อ: 'ภาษาต่างประเทศ',
    จ: 'ภาษาต่างประเทศ',
    ก: 'กิจกรรมพัฒนาผู้เรียน',
  };

  const firstChar = code.charAt(0);
  const learningArea = prefixMap[firstChar] || '';

  // ตัวเลขตัวแรกหลังรหัสกลุ่มสาระ: 1=ประถม(11-16), 2=ม.ต้น(21-23)
  const digits = code.replace(/[^0-9]/g, '');
  let gradeLevel = '';
  if (digits.length >= 2) {
    const levelCode = digits.slice(0, 2);
    const gradeMap = {
      '11': 'ป.1',
      '12': 'ป.2',
      '13': 'ป.3',
      '14': 'ป.4',
      '15': 'ป.5',
      '16': 'ป.6',
      '21': 'ม.1',
      '22': 'ม.2',
      '23': 'ม.3',
    };
    gradeLevel = gradeMap[levelCode] || '';
  }

  return { learningArea, gradeLevel };
}

export function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getFullStudentName(student) {
  if (!student) return '';
  return `${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}`.trim();
}

export const CLASSROOM_ACTIVITY_KEYS = [
  { key: 'guidance', label: 'แนะแนว' },
  { key: 'scout', label: 'ลูกเสือ/เนตรนารี' },
  { key: 'club', label: 'ชุมนุม' },
  { key: 'public_service', label: 'เพื่อสังคมฯ' },
];

export const PROMOTION_DECISION_OPTIONS = [
  'ผ่านเกณฑ์ / เลื่อนชั้น',
  'จบการศึกษาช่วงชั้น',
  'รอแก้ไข ร/มส',
  'ส่งเสริมพัฒนาเพิ่มเติม',
  'เรียนซ้ำชั้น',
];

export function gradeToNumericPoint(grade) {
  const str = String(grade ?? '').trim();
  const valid = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0'];
  return valid.includes(str) ? Number(str) : null;
}

export function inferSubjectType(subjectCode = '', subjectName = '') {
  const code = String(subjectCode || '').trim().replace(/\s+/g, '');
  const name = String(subjectName || '').trim();
  if (/แนะแนว|ลูกเสือ|เนตรนารี|ชุมนุม|เพื่อสังคม|กิจกรรมพัฒนาผู้เรียน/.test(name)) {
    return 'กิจกรรมพัฒนาผู้เรียน';
  }
  if (/เพิ่มเติม|หน้าที่พลเมือง|รักษ์ป่าน่าน|สารพัดช่าง|เพื่อการสื่อสาร/.test(name)) {
    return 'เพิ่มเติม';
  }
  const typeDigit = code.replace(/^[^0-9]+/, '')[2];
  if (typeDigit === '2' || typeDigit === '3') return 'เพิ่มเติม';
  return 'พื้นฐาน';
}

/**
 * คำนวณความก้าวหน้าการบันทึกผล ปพ.5 ประจำรายวิชา (0 - 100%)
 * เพื่อให้ครูประจำชั้นในหน้า ปพ.5 รายชั้นเรียน ตรวจสอบได้ว่าวิชาใดบันทึกครบ 100% พร้อมดึงผลแล้ว
 */
export function computeCourseCompletion(
  course,
  {
    students = [],
    scoreStructure = null,
    studentScores = [],
    attendanceRecords = [],
    characteristicsRows = [],
  } = {}
) {
  if (!course) {
    return {
      pct: 0,
      isComplete: false,
      statusLabel: 'ยังไม่เปิดเล่ม',
      missingItems: ['ยังไม่ได้เปิดสมุด ปพ.5'],
      items: [],
      counts: { enrolled: 0, attendance: 0, scored: 0, traits: 0 },
    };
  }

  const enrolledIds = course.student_ids?.length
    ? course.student_ids
    : students
        .filter(
          (s) =>
            s.status === 'active' &&
            s.grade_level === course.grade_level &&
            String(s.classroom || '1') === String(course.classroom || '1')
        )
        .map((s) => s.id);
  const enrolledSet = new Set(enrolledIds);
  const enrolledCount = enrolledIds.length;

  const courseScores = studentScores.filter((sc) => sc.course_id === course.id && enrolledSet.has(sc.student_id));
  const courseAtt = attendanceRecords.filter((a) => a.course_id === course.id && enrolledSet.has(a.student_id));
  const courseTraits = characteristicsRows.filter((ch) => ch.course_id === course.id && enrolledSet.has(ch.student_id));

  const scoredSet = new Set(
    courseScores
      .filter((sc) => Boolean(sc.special_status) || (sc.grade !== undefined && sc.grade !== null && String(sc.grade).trim() !== ''))
      .map((sc) => sc.student_id)
  );
  const attSet = new Set(courseAtt.map((a) => a.student_id));
  const traitsSet = new Set(
    courseTraits
      .filter((ch) => ch.traits_level !== undefined && ch.rtw_level !== undefined)
      .map((ch) => ch.student_id)
  );

  const hasStudents = enrolledCount > 0;
  const isIndicatorsConfirmed = course.indicators_status === 'confirmed';
  const hasIndicatorDraft =
    isIndicatorsConfirmed ||
    (course.selected_indicator_ids?.length || 0) > 0 ||
    Boolean(course.custom_indicators_text?.trim());
  const hasScoreStructure = Boolean(scoreStructure) || scoredSet.size > 0;

  const rosterPts = hasStudents ? 10 : 0;
  const indicatorPts = isIndicatorsConfirmed ? 10 : hasIndicatorDraft ? 5 : 0;
  const structurePts = hasScoreStructure ? 15 : 0;
  const attPts = hasStudents ? Math.round((attSet.size / enrolledCount) * 20) : 0;
  const scorePts = hasStudents ? Math.round((scoredSet.size / enrolledCount) * 25) : 0;
  const traitPts = hasStudents ? Math.round((traitsSet.size / enrolledCount) * 20) : 0;

  const pct = Math.min(100, rosterPts + indicatorPts + structurePts + attPts + scorePts + traitPts);
  const isComplete = pct === 100 && hasStudents && isIndicatorsConfirmed && scoredSet.size === enrolledCount;

  const missingItems = [];
  if (!hasStudents) missingItems.push('ยังไม่มีรายชื่อนักเรียน');
  if (!isIndicatorsConfirmed) missingItems.push('ยังไม่ยืนยันตัวชี้วัด');
  if (!hasScoreStructure) missingItems.push('ยังไม่มีโครงสร้างคะแนน');
  if (hasStudents && attSet.size < enrolledCount) {
    missingItems.push(`เวลาเรียนขาด ${enrolledCount - attSet.size} คน`);
  }
  if (hasStudents && scoredSet.size < enrolledCount) {
    missingItems.push(`คะแนน/เกรดขาด ${enrolledCount - scoredSet.size} คน`);
  }
  if (hasStudents && traitsSet.size < enrolledCount) {
    missingItems.push(`คุณลักษณะฯ/อ่านคิดฯ ขาด ${enrolledCount - traitsSet.size} คน`);
  }

  return {
    pct,
    isComplete,
    statusLabel: isComplete ? 'บันทึกครบ 100% แล้ว' : `บันทึกแล้ว ${pct}%`,
    missingItems,
    items: [
      { key: 'roster', label: 'รายชื่อนักเรียน', done: hasStudents, weight: 10 },
      { key: 'indicators', label: 'ยืนยันตัวชี้วัด', done: isIndicatorsConfirmed, weight: 10 },
      { key: 'structure', label: 'โครงสร้างคะแนน', done: hasScoreStructure, weight: 15 },
      { key: 'attendance', label: 'เวลาเรียน', done: hasStudents && attSet.size === enrolledCount, weight: 20 },
      { key: 'scores', label: 'คะแนนและเกรด', done: hasStudents && scoredSet.size === enrolledCount, weight: 25 },
      { key: 'traits', label: 'คุณลักษณะฯ / อ่านคิดฯ', done: hasStudents && traitsSet.size === enrolledCount, weight: 20 },
    ],
    counts: {
      enrolled: enrolledCount,
      attendance: attSet.size,
      scored: scoredSet.size,
      traits: traitsSet.size,
    },
  };
}

/**
 * สร้างตารางสรุป ปพ.5 รายชั้นเรียน (Classroom Summary Matrix)
 * ดึงข้อมูลจาก ปพ.5 รายวิชาทุกวิชาของห้องเรียนนั้น:
 * - เกรดรายวิชา, หน่วยกิต, เกรดเฉลี่ย (GPA ตามเกณฑ์ประถม/มัธยมของโรงเรียน), ลำดับที่ (Rank),
 *   คะแนนรวมและร้อยละ (ตรงตามชีท "เกรด"), เวลาเรียนรวม, อ่านคิดฯ/คุณลักษณะฯ, กิจกรรม, สถานะครบ 100%
 */
export function buildClassroomMatrix({
  students = [],
  gradeLevel,
  classroom,
  courses = [],
  subjects = [],
  semester = 'all',
  allScores = [],
  allAttendance = [],
  allCharacteristics = [],
  scoreStructures = [],
  classroomSummary = null,
}) {
  const roomStudents = students
    .filter(
      (s) =>
        s.status === 'active' &&
        s.grade_level === gradeLevel &&
        String(s.classroom || '1') === String(classroom || '1')
    )
    .sort((a, b) => (a.student_number || 0) - (b.student_number || 0));

  const subjectMetaMap = new Map();
  subjects
    .filter((s) => s.grade_level === gradeLevel)
    .forEach((s) => subjectMetaMap.set(String(s.subject_code).replace(/\s+/g, ''), s));

  const roomCourses = courses
    .filter((c) => {
      if (c.grade_level !== gradeLevel) return false;
      if (String(c.classroom || '1') !== String(classroom || '1')) return false;
      const cSem = String(c.semester || '1');
      if (semester && semester !== 'all' && cSem !== String(semester) && cSem !== '1-2') return false;
      return true;
    })
    .map((c) => {
      const cleanCode = String(c.subject_code || '').replace(/\s+/g, '');
      const catalogSub = subjectMetaMap.get(cleanCode);
      const subjectType = c.subject_type || catalogSub?.subject_type || inferSubjectType(cleanCode, c.subject_name);
      return {
        ...c,
        subject_type: subjectType,
        sort_order: catalogSub?.sort_order ?? 100,
      };
    })
    .sort((a, b) => {
      const rankType = (t) => (t === 'พื้นฐาน' ? 0 : t === 'เพิ่มเติม' ? 1 : 2);
      const td = rankType(a.subject_type) - rankType(b.subject_type);
      if (td !== 0) return td;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return String(a.subject_code).localeCompare(String(b.subject_code));
    });

  const structureMap = new Map((scoreStructures || []).map((st) => [st.course_id, st]));
  const courseCompletions = {};
  roomCourses.forEach((c) => {
    courseCompletions[c.id] = computeCourseCompletion(c, {
      students: roomStudents,
      scoreStructure: structureMap.get(c.id) || null,
      studentScores: allScores,
      attendanceRecords: allAttendance,
      characteristicsRows: allCharacteristics,
    });
  });

  const scoreLookup = new Map();
  allScores.forEach((sc) => {
    scoreLookup.set(`${sc.course_id}|${sc.student_id}`, sc);
  });

  const charLookup = new Map();
  allCharacteristics.forEach((ch) => {
    charLookup.set(`${ch.course_id}|${ch.student_id}`, ch);
  });

  const attByCourseStudent = new Map();
  allAttendance.forEach((a) => {
    const k = `${a.course_id}|${a.student_id}`;
    if (!attByCourseStudent.has(k)) attByCourseStudent.set(k, []);
    attByCourseStudent.get(k).push(a);
  });

  const teacherDecisions = classroomSummary?.student_decisions || {};
  const savedActivities = classroomSummary?.activities_summary || {};

  const isPrimaryLevel = /^ป\./.test(gradeLevel || '');

  const studentRows = roomStudents.map((stu, idx) => {
    const subjectGrades = {};
    let totalWeightedPoints = 0;
    let totalWeightUnits = 0;
    let totalRawScore = 0;
    let scoredSubjectCount = 0;
    let totalAttRecords = 0;
    let totalPresentRecords = 0;
    let failedCount = 0;
    let incompleteCount = 0;

    const traitsValues = [];
    const rtwValues = [];

    roomCourses.forEach((course) => {
      const sc = scoreLookup.get(`${course.id}|${stu.id}`);
      const gradeStr = sc?.special_status || (sc?.grade !== undefined ? String(sc.grade) : '-');
      const credits = Number(course.credits) || 1.0;
      const hoursWeight = Number(course.total_hours) || credits * 20 || 40;
      const gpaWeight = isPrimaryLevel ? hoursWeight : credits;
      const rawScore = sc?.total_score !== undefined && sc?.total_score !== null ? Number(sc.total_score) : null;

      subjectGrades[course.id] = {
        grade: gradeStr,
        totalScore: rawScore,
        credits,
        totalHours: hoursWeight,
        subjectType: course.subject_type || 'พื้นฐาน',
      };

      if (rawScore !== null && !Number.isNaN(rawScore)) {
        totalRawScore += rawScore;
        scoredSubjectCount += 1;
      }

      const pts = gradeToNumericPoint(gradeStr);
      if (pts !== null) {
        totalWeightedPoints += pts * gpaWeight;
        totalWeightUnits += gpaWeight;
        if (pts === 0) failedCount += 1;
      } else if (gradeStr === 'ร' || gradeStr === 'มส') {
        incompleteCount += 1;
      }

      const attList = attByCourseStudent.get(`${course.id}|${stu.id}`) || [];
      totalAttRecords += attList.length;
      totalPresentRecords += attList.filter(
        (r) => r.status === 'present' || r.status === 'late'
      ).length;

      const ch = charLookup.get(`${course.id}|${stu.id}`);
      if (ch) {
        traitsValues.push(Number(ch.traits_level ?? 3));
        rtwValues.push(Number(ch.rtw_level ?? 3));
      }
    });

    const gpa =
      totalWeightUnits > 0 ? Number((totalWeightedPoints / totalWeightUnits).toFixed(2)) : 0;

    const totalMaxScore = scoredSubjectCount * 100;
    const scorePercentage =
      totalMaxScore > 0 ? Number(((totalRawScore / totalMaxScore) * 100).toFixed(2)) : 0;

    const attendancePct =
      totalAttRecords > 0
        ? Number(((totalPresentRecords / totalAttRecords) * 100).toFixed(1))
        : 100;

    const traitsLevel = traitsValues.length
      ? Math.round(traitsValues.reduce((a, b) => a + b, 0) / traitsValues.length)
      : 3;

    const rtwLevel = rtwValues.length
      ? Math.round(rtwValues.reduce((a, b) => a + b, 0) / rtwValues.length)
      : 3;

    const stuAct = savedActivities[stu.id] || {
      guidance: 'ผ',
      scout: 'ผ',
      club: 'ผ',
      public_service: 'ผ',
    };
    const activitiesPass = Object.values(stuAct).every((v) => v !== 'มผ');

    let proposedDecision = 'ผ่านเกณฑ์ / เลื่อนชั้น';
    if (gradeLevel === 'ป.6' || gradeLevel === 'ม.3') {
      proposedDecision =
        incompleteCount > 0 || failedCount > 0 || !activitiesPass || attendancePct < 80
          ? 'รอแก้ไข ร/มส'
          : 'จบการศึกษาช่วงชั้น';
    } else if (incompleteCount > 0 || attendancePct < 80) {
      proposedDecision = 'รอแก้ไข ร/มส';
    } else if (failedCount >= 3) {
      proposedDecision = 'ส่งเสริมพัฒนาเพิ่มเติม';
    } else if (!activitiesPass) {
      proposedDecision = 'รอแก้ไข ร/มส';
    }

    const confirmedDecision = teacherDecisions[stu.id] || proposedDecision;

    return {
      student: stu,
      no: stu.student_number || idx + 1,
      subjectGrades,
      totalCredits: Number(
        roomCourses.reduce((acc, c) => acc + (Number(c.credits) || 1), 0).toFixed(2)
      ),
      totalHours: roomCourses.reduce((acc, c) => acc + (Number(c.total_hours) || 40), 0),
      totalRawScore: Number(totalRawScore.toFixed(1)),
      totalMaxScore,
      scorePercentage,
      gpa,
      attendancePct,
      traitsLevel,
      rtwLevel,
      activities: stuAct,
      activitiesPass,
      proposedDecision,
      confirmedDecision,
      isOverridden: Boolean(teacherDecisions[stu.id] && teacherDecisions[stu.id] !== proposedDecision),
    };
  });

  // Rank calculation (ties get same rank: e.g., 1, 1, 3)
  const sortedGpas = [...studentRows]
    .map((r) => r.gpa)
    .sort((a, b) => b - a);
  studentRows.forEach((row) => {
    row.rank = row.gpa > 0 ? sortedGpas.indexOf(row.gpa) + 1 : '-';
  });

  // Per-subject summary counts (ตรงตามตารางสรุปท้ายชีท "เกรด")
  const subjectSummaries = roomCourses.map((course) => {
    const buckets = { '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0, '0': 0, 'ร': 0, 'มส': 0 };
    let gradedCount = 0;
    let sumScore = 0;
    let scoreCount = 0;
    studentRows.forEach((row) => {
      const sg = row.subjectGrades[course.id];
      const g = sg?.grade;
      if (buckets[g] !== undefined) {
        buckets[g] += 1;
        gradedCount += 1;
      }
      if (sg?.totalScore !== null && sg?.totalScore !== undefined) {
        sumScore += Number(sg.totalScore);
        scoreCount += 1;
      }
    });
    const threePlus = buckets['4'] + buckets['3.5'] + buckets['3'];
    return {
      course,
      buckets,
      gradedCount,
      sumScore: Number(sumScore.toFixed(1)),
      avgScore: scoreCount > 0 ? (sumScore / scoreCount).toFixed(1) : '-',
      threePlusPct: gradedCount > 0 ? ((threePlus / gradedCount) * 100).toFixed(1) : '0.0',
      completion: courseCompletions[course.id],
    };
  });

  const openedCodesSet = new Set(roomCourses.map((c) => String(c.subject_code || '').replace(/\s+/g, '')));
  const curriculumForGradeSem = subjects.filter((s) => {
    if (s.grade_level !== gradeLevel) return false;
    const subSem = String(s.semester || '1-2');
    if (semester === '1') return subSem === '1' || subSem === '1-2';
    if (semester === '2') return subSem === '2' || subSem === '1-2';
    return true;
  });
  const unopenedSubjects = curriculumForGradeSem.filter(
    (s) => !openedCodesSet.has(String(s.subject_code || '').replace(/\s+/g, ''))
  );

  const completionItems = roomCourses.map((c) => ({
    course: c,
    ...courseCompletions[c.id],
  }));
  const completedCount100 = completionItems.filter((item) => item.isComplete).length;

  return {
    roomStudents,
    roomCourses,
    studentRows,
    subjectSummaries,
    courseCompletions,
    completionSummary: {
      totalCourses: roomCourses.length,
      completedCount100,
      pendingCount: roomCourses.length - completedCount100,
      allComplete: roomCourses.length > 0 && completedCount100 === roomCourses.length,
      items: completionItems,
      unopenedSubjects,
      curriculumCount: curriculumForGradeSem.length,
    },
  };
}

/**
 * สร้างภาพรวมผลการเรียนรายภาคเรียน (ภาคเรียนที่ 1 / ภาคเรียนที่ 2 / สรุปผลทั้งปี)
 * ตามรูปแบบรายงานผลการเรียนโรงเรียนบ้านหาดเค็ด (ไฟล์ประถมศึกษาในโฟลเดอร์ ref/)
 */
export function buildClassroomTermOverview({
  students = [],
  gradeLevel,
  classroom,
  courses = [],
  subjects = [],
  allScores = [],
  allAttendance = [],
  allCharacteristics = [],
  scoreStructures = [],
}) {
  const shared = {
    students,
    gradeLevel,
    classroom,
    courses,
    subjects,
    allScores,
    allAttendance,
    allCharacteristics,
    scoreStructures,
  };

  const term1 = buildClassroomMatrix({ ...shared, semester: '1' });
  const term2 = buildClassroomMatrix({ ...shared, semester: '2' });
  const wholeYear = buildClassroomMatrix({ ...shared, semester: 'all' });

  const summarizeTerm = (termMatrix, termId, label) => {
    const gpas = termMatrix.studentRows.map((r) => r.gpa).filter((g) => g > 0);
    const avgGpa = gpas.length
      ? Number((gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2))
      : 0;
    const avgAtt = termMatrix.studentRows.length
      ? Number(
          (
            termMatrix.studentRows.reduce((a, r) => a + r.attendancePct, 0) /
            termMatrix.studentRows.length
          ).toFixed(1)
        )
      : 100;
    return {
      semester: termId,
      label,
      matrix: termMatrix,
      totalCourses: termMatrix.completionSummary.totalCourses,
      completed100: termMatrix.completionSummary.completedCount100,
      curriculumCount: termMatrix.completionSummary.curriculumCount,
      avgGpa,
      avgAttendance: avgAtt,
      allComplete: termMatrix.completionSummary.allComplete,
    };
  };

  // สร้างแถวเปรียบเทียบรายวิชาแบบ 2 ภาคเรียน + สรุปทั้งปี (ตามชีท ป.1-ป.6 ของโรงเรียน)
  const roomStudents = term1.roomStudents;
  const courseByCodeSem = new Map();
  [...term1.roomCourses, ...term2.roomCourses].forEach((c) => {
    const code = String(c.subject_code || '').replace(/\s+/g, '');
    courseByCodeSem.set(`${code}|${String(c.semester || '1')}`, c);
  });

  const subjectKeys = new Map();
  [...term1.roomCourses, ...term2.roomCourses].forEach((c) => {
    const code = String(c.subject_code || '').replace(/\s+/g, '');
    if (!subjectKeys.has(code)) {
      subjectKeys.set(code, {
        subject_code: code,
        subject_name: c.subject_name,
        subject_type: c.subject_type,
        credits: Number(c.credits) || 1,
        hours_per_semester: Number(c.total_hours) || 40,
      });
    }
  });
  const consolidatedSubjects = Array.from(subjectKeys.values());

  const term1StudentMap = new Map(term1.studentRows.map((r) => [r.student.id, r]));
  const term2StudentMap = new Map(term2.studentRows.map((r) => [r.student.id, r]));

  const annualStudentCards = roomStudents.map((stu, idx) => {
    const t1Row = term1StudentMap.get(stu.id);
    const t2Row = term2StudentMap.get(stu.id);
    const isPrimary = /^ป\./.test(gradeLevel || '');

    let yearWeightedPts = 0;
    let yearWeights = 0;

    const rows = consolidatedSubjects.map((sub) => {
      const c1 = courseByCodeSem.get(`${sub.subject_code}|1`);
      const c2 = courseByCodeSem.get(`${sub.subject_code}|2`);
      const g1 = c1 && t1Row ? t1Row.subjectGrades[c1.id] : null;
      const g2 = c2 && t2Row ? t2Row.subjectGrades[c2.id] : null;

      const s1 = g1?.totalScore ?? null;
      const s2 = g2?.totalScore ?? null;
      const avgYearScore =
        s1 !== null && s2 !== null
          ? Number(((s1 + s2) / 2).toFixed(1))
          : s1 !== null
          ? s1
          : s2;

      const yearGrade =
        s1 !== null && s2 !== null
          ? calculateGradeFromScore({ totalScore: avgYearScore })
          : g2?.grade || g1?.grade || '-';

      const w = isPrimary ? sub.hours_per_semester : sub.credits;
      const pts = gradeToNumericPoint(yearGrade);
      if (pts !== null) {
        yearWeightedPts += pts * w;
        yearWeights += w;
      }

      return {
        ...sub,
        term1Score: s1,
        term1Grade: g1?.grade ?? '-',
        term2Score: s2,
        term2Grade: g2?.grade ?? '-',
        yearAvgScore: avgYearScore,
        yearGrade,
      };
    });

    const yearGpa = yearWeights > 0 ? Number((yearWeightedPts / yearWeights).toFixed(2)) : 0;

    return {
      student: stu,
      no: stu.student_number || idx + 1,
      term1Gpa: t1Row?.gpa ?? 0,
      term2Gpa: t2Row?.gpa ?? 0,
      yearGpa,
      term1Rank: t1Row?.rank ?? '-',
      attendancePct: t1Row?.attendancePct ?? 100,
      rows,
    };
  });

  return {
    terms: [
      summarizeTerm(term1, '1', 'ภาคเรียนที่ 1'),
      summarizeTerm(term2, '2', 'ภาคเรียนที่ 2'),
      summarizeTerm(wholeYear, 'all', 'ภาพรวมทั้งปีการศึกษา (เทอม 1–2)'),
    ],
    consolidatedSubjects,
    annualStudentCards,
  };
}
