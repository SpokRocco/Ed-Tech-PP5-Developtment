import * as XLSXModule from 'xlsx';
import {
  inferCurriculumMetaFromCode,
  inferSubjectType,
  GRADE_LEVELS,
  LEARNING_AREAS,
} from '../lib/thaiFormatting.js';
import { normalizeSubjectCode } from '../data/schoolCurriculumCatalog.js';

const defaultKey = 'default';
const XLSX = XLSXModule.utils ? XLSXModule : XLSXModule[defaultKey];

/**
 * ============================================================================
 * [INTEGRATION HOOK 1] Subject & Curriculum Excel Import Adapter
 * รองรับไฟล์ Excel ทุกรูปแบบของโรงเรียนบ้านหาดเค็ด:
 *  1) รายงานผลการเรียน HK @ 1 ปีกศ 69 (ประถม).xlsx (ชีท ป.1 - ป.6)
 *  2) ประกาศผลสอบ ม.1-69 เทอม1.xls (ชีท แม่แบบ / ชีทรายงานนักเรียน)
 *  3) ตารางรหัสวิชาและโครงสร้างหลักสูตรมาตรฐาน (.xlsx / .xls / .csv)
 * ============================================================================
 */

export const DEFAULT_SUBJECT_COLUMN_ALIASES = {
  subject_code: ['รหัสวิชา', 'รหัส', 'รหัสรายวิชา', 'subject_code', 'code', 'course_code'],
  subject_name: ['ชื่อวิชา', 'ชื่อรายวิชา', 'รายชื่อวิชา', 'รายวิชา', 'กลุ่มสาระการเรียนรู้', 'subject_name', 'name', 'course_name'],
  learning_area: ['กลุ่มสาระ', 'กลุ่มสาระการเรียนรู้', 'สาระการเรียนรู้', 'learning_area', 'department'],
  grade_level: ['ชั้น', 'ระดับชั้น', 'ชั้นปี', 'grade', 'grade_level', 'level'],
  subject_type: ['ประเภท', 'ประเภทวิชา', 'ลักษณะวิชา', 'subject_type', 'type'],
  credits: ['หน่วยกิต', 'น้ำหนัก', 'นน.', 'นก.', 'credits', 'weight'],
  hours_per_semester: ['ชั่วโมง', 'ชั่วโมงเรียน', 'เวลาเรียน', 'ชั่วโมง/ภาค', 'ชม./ภาค', 'hours', 'hours_per_semester'],
  hours_per_year: ['ชั่วโมง/ปี', 'ชม./ปี', 'hours_per_year'],
  hours_per_week: ['ชั่วโมง/สัปดาห์', 'ชม./สัปดาห์', 'คาบ/สัปดาห์', 'hours_per_week'],
  semester: ['ภาคเรียน', 'เทอม', 'semester', 'term'],
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function findMatchingKey(row, aliases) {
  const keys = Object.keys(row || {});
  const normalizedAliases = aliases.map(normalizeHeader);
  for (const key of keys) {
    const norm = normalizeHeader(key);
    if (normalizedAliases.includes(norm) || normalizedAliases.some((a) => norm.includes(a))) {
      return row[key];
    }
  }
  return undefined;
}

export function normalizeGradeLevel(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (GRADE_LEVELS.includes(text)) return text;

  const cleaned = text.replace(/\s+/g, '').replace(/\./g, '').replace('ชั้น', '');
  const map = {
    'อนุบาล3': 'อ.3',
    'อ3': 'อ.3',
    'ป1': 'ป.1',
    'ป2': 'ป.2',
    'ป3': 'ป.3',
    'ป4': 'ป.4',
    'ป5': 'ป.5',
    'ป6': 'ป.6',
    'ม1': 'ม.1',
    'ม2': 'ม.2',
    'ม3': 'ม.3',
    'ประถมศึกษาปีที่1': 'ป.1',
    'ประถมศึกษาปีที่2': 'ป.2',
    'ประถมศึกษาปีที่3': 'ป.3',
    'ประถมศึกษาปีที่4': 'ป.4',
    'ประถมศึกษาปีที่5': 'ป.5',
    'ประถมศึกษาปีที่6': 'ป.6',
    'มัธยมศึกษาปีที่1': 'ม.1',
    'มัธยมศึกษาปีที่2': 'ม.2',
    'มัธยมศึกษาปีที่3': 'ม.3',
  };
  if (map[cleaned]) return map[cleaned];

  const regexMatch = cleaned.match(/(อ|ป|ม)([1-6])/);
  if (regexMatch) {
    const candidate = `${regexMatch[1]}.${regexMatch[2]}`;
    if (GRADE_LEVELS.includes(candidate)) return candidate;
  }
  return text;
}

export function normalizeLearningArea(raw, inferred) {
  const text = String(raw || '').trim();
  if (!text) return inferred || 'อื่นๆ';
  if (/ประวัติ/.test(text) || /สังคม/.test(text) || /พลเมือง/.test(text) || /รักษ์ป่า/.test(text)) {
    return 'สังคมศึกษา ศาสนา และวัฒนธรรม';
  }
  if (/เทคโน/.test(text) || /วิทย์/.test(text)) {
    return 'วิทยาศาสตร์และเทคโนโลยี';
  }
  if (/อังกฤษ/.test(text) || /ต่างประเทศ/.test(text)) {
    return 'ภาษาต่างประเทศ';
  }
  if (/สุข/.test(text) || /พละ/.test(text)) {
    return 'สุขศึกษาและพลศึกษา';
  }
  if (/งานอาชีพ/.test(text) || /สารพัดช่าง/.test(text)) {
    return 'การงานอาชีพ';
  }
  const matched = LEARNING_AREAS.find(
    (area) => area === text || area.includes(text) || text.includes(area.split(' ')[0])
  );
  return matched || inferred || text;
}

function extractTitleMeta(rows = []) {
  const textBlob = rows
    .slice(0, 6)
    .flat()
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');

  let gradeLevel = '';
  const gradeMatch = textBlob.match(/(ชั้น(?:ประถมศึกษา|มัธยมศึกษา|อนุบาล)ปีที่\s*[0-9]+|[ปมอ]\.?\s*[0-9])/);
  if (gradeMatch) {
    gradeLevel = normalizeGradeLevel(gradeMatch[1]);
  }

  let semester = '1';
  const semMatch = textBlob.match(/ภาคเรียนที่\s*([12])/);
  if (semMatch) semester = semMatch[1];

  return { gradeLevel, semester };
}

function looksLikeSubjectCode(code = '') {
  const clean = normalizeSubjectCode(code);
  if (!clean || clean.length < 4) return false;
  if (/^\d+$/.test(clean)) return false;
  return /^[ก-ฮA-Za-z].*\d{3,}/.test(clean) || /^ปฐม\d+/.test(clean);
}

function parsePrimaryPrototypeSheet(rows, sheetName) {
  const sheetGrade = normalizeGradeLevel(sheetName);
  const titleMeta = extractTitleMeta(rows);
  const gradeLevel = GRADE_LEVELS.includes(sheetGrade) ? sheetGrade : titleMeta.gradeLevel || 'ป.1';

  const headerR6 = rows[5] || [];
  const hasHourCol = String(headerR6[15] || '').includes('ชั่วโมง');
  const parsed = [];

  for (let r = 6; r < rows.length; r++) {
    const row = rows[r] || [];
    const rawCode = normalizeSubjectCode(row[0]);
    const rawName = String(row[1] || '').trim();

    if (/เกรดเฉลี่ย|เวลาเรียน|กิจกรรมพัฒนา|ผู้รายงาน/.test(rawName)) break;
    if (!looksLikeSubjectCode(rawCode) || !rawName) continue;

    const inferred = inferCurriculumMetaFromCode(rawCode);
    const colPHours = Number(row[15]);
    const colSHours = Number(row[18]);
    const colLCredit = Number(row[11]);

    const hoursPerSemester =
      !Number.isNaN(colPHours) && colPHours > 0
        ? Math.round(colPHours)
        : !Number.isNaN(colLCredit) && colLCredit > 0
        ? Math.round(colLCredit * 20)
        : 40;
    const hoursPerYear =
      !Number.isNaN(colSHours) && colSHours > 0 ? Math.round(colSHours) : hoursPerSemester * 2;

    const credits = hasHourCol
      ? Number((hoursPerSemester / 20).toFixed(1))
      : Number((hoursPerSemester / 20).toFixed(1));
    const subjectType = inferSubjectType(rawCode, rawName);

    parsed.push({
      subject_code: rawCode,
      subject_name: rawName,
      learning_area: normalizeLearningArea(rawName, inferred.learningArea),
      grade_level: gradeLevel,
      subject_type: subjectType,
      credits,
      hours_per_semester: hoursPerSemester,
      hours_per_year: hoursPerYear,
      hours_per_week: Number((hoursPerSemester / 20).toFixed(1)),
      semester: '1-2',
      sort_order: parsed.length + 1,
      curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (ประถมศึกษา)',
      is_active: true,
    });
  }

  return parsed;
}

function parseSecondaryTemplateSheet(rows, headerRowIdx, sheetName) {
  const titleMeta = extractTitleMeta(rows);
  const sheetGrade = normalizeGradeLevel(sheetName);
  const gradeLevel =
    (GRADE_LEVELS.includes(sheetGrade) && sheetGrade) ||
    titleMeta.gradeLevel ||
    'ม.1';
  const semester = titleMeta.semester || '1';

  const parsed = [];
  let currentType = 'พื้นฐาน';

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const colA = normalizeSubjectCode(row[0]);
    const colB = String(row[1] || '').trim();
    const colC = Number(row[2]);

    if (/เกรดเฉลี่ย|ได้ลำดับ|เวลาเรียน|ผู้รายงาน/.test(`${colA} ${colB} ${String(row[3] || '')}`)) {
      break;
    }
    if (/รายวิชาพื้นฐาน|รายวิขาพื้นฐาน/.test(colB) && !colA) {
      currentType = 'พื้นฐาน';
      continue;
    }
    if (/รายวิชาเพิ่มเติม|รายวิขาเพิ่มเติม/.test(colB) && !colA) {
      currentType = 'เพิ่มเติม';
      continue;
    }
    if (!looksLikeSubjectCode(colA) || !colB) continue;

    const inferred = inferCurriculumMetaFromCode(colA);
    const credits = !Number.isNaN(colC) && colC > 0 ? colC : 1.0;
    const hoursPerSemester = Math.round(credits * 40);
    const subjectType = currentType || inferSubjectType(colA, colB);

    parsed.push({
      subject_code: colA,
      subject_name: colB,
      learning_area: normalizeLearningArea(colB, inferred.learningArea),
      grade_level: gradeLevel,
      subject_type: subjectType,
      credits,
      hours_per_semester: hoursPerSemester,
      hours_per_year: hoursPerSemester,
      hours_per_week: Number((credits * 2).toFixed(1)),
      semester,
      sort_order: parsed.length + 1,
      curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (มัธยมศึกษาตอนต้น)',
      is_active: true,
    });
  }

  return parsed;
}

function parseStandardTableSheet(sheet, sheetName, aliases) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const sheetGrade = normalizeGradeLevel(sheetName);
  const titleMeta = extractTitleMeta(matrix);

  // Locate header row within first 10 rows
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const joined = (matrix[r] || []).map(normalizeHeader).join('|');
    if (
      (joined.includes('รหัสวิชา') || joined.includes('subject_code') || joined.includes('รหัส')) &&
      (joined.includes('ชื่อวิชา') || joined.includes('รายวิชา') || joined.includes('subject_name') || joined.includes('รายชื่อวิชา'))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx, defval: '' });
  const parsed = [];
  const errors = [];

  rawRows.forEach((row, index) => {
    const lineNum = headerRowIdx + index + 2;
    const rawCode = normalizeSubjectCode(findMatchingKey(row, aliases.subject_code));
    const rawName = String(findMatchingKey(row, aliases.subject_name) || '').trim();

    if (!rawCode && !rawName) return;
    if (!rawCode || !rawName) {
      if (!/รวม|เฉลี่ย/.test(`${rawCode} ${rawName}`)) {
        errors.push(`ชีท "${sheetName}" แถวที่ ${lineNum}: ข้อมูลไม่ครบ (ต้องมีทั้งรหัสวิชาและชื่อวิชา)`);
      }
      return;
    }

    const inferred = inferCurriculumMetaFromCode(rawCode);
    const gradeLevel =
      normalizeGradeLevel(findMatchingKey(row, aliases.grade_level)) ||
      (GRADE_LEVELS.includes(sheetGrade) ? sheetGrade : '') ||
      titleMeta.gradeLevel ||
      inferred.gradeLevel ||
      'ป.4';

    const learningArea = normalizeLearningArea(
      findMatchingKey(row, aliases.learning_area),
      normalizeLearningArea(rawName, inferred.learningArea)
    );
    const rawType = String(findMatchingKey(row, aliases.subject_type) || '').trim();
    const subjectType = ['พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน'].includes(rawType)
      ? rawType
      : rawType.includes('เพิ่ม')
      ? 'เพิ่มเติม'
      : rawType.includes('กิจกรรม')
      ? 'กิจกรรมพัฒนาผู้เรียน'
      : inferSubjectType(rawCode, rawName);

    const creditsVal = Number(findMatchingKey(row, aliases.credits));
    const hoursVal = Number(findMatchingKey(row, aliases.hours_per_semester));
    const yearHoursVal = Number(findMatchingKey(row, aliases.hours_per_year));
    const weeklyVal = Number(findMatchingKey(row, aliases.hours_per_week));
    const rawSem = String(findMatchingKey(row, aliases.semester) || titleMeta.semester || (/^ป\./.test(gradeLevel) ? '1-2' : '1')).trim();

    const isPrimary = /^ป\./.test(gradeLevel);
    const credits = !Number.isNaN(creditsVal) && creditsVal > 0 ? creditsVal : 1.0;
    const hoursPerSemester =
      !Number.isNaN(hoursVal) && hoursVal > 0
        ? Math.round(hoursVal)
        : Math.round(credits * (isPrimary ? 20 : 40));
    const hoursPerYear =
      !Number.isNaN(yearHoursVal) && yearHoursVal > 0
        ? Math.round(yearHoursVal)
        : isPrimary
        ? hoursPerSemester * 2
        : hoursPerSemester;
    const hoursPerWeek =
      !Number.isNaN(weeklyVal) && weeklyVal > 0
        ? weeklyVal
        : Number((hoursPerSemester / 20).toFixed(1));

    parsed.push({
      subject_code: rawCode,
      subject_name: rawName,
      learning_area: learningArea,
      grade_level: gradeLevel,
      subject_type: subjectType,
      credits,
      hours_per_semester: hoursPerSemester,
      hours_per_year: hoursPerYear,
      hours_per_week: hoursPerWeek,
      semester: ['1', '2', '1-2'].includes(rawSem) ? rawSem : '1',
      sort_order: parsed.length + 1,
      curriculum_year: 'หลักสูตรแกนกลาง 2551 (ปรับปรุง 2560)',
      is_active: true,
    });
  });

  return { parsed, errors };
}

function detectAndParseSheet(sheet, sheetName, aliases) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) return { format: 'empty', parsed: [], errors: [] };

  // Format 1: Primary Ban Hat Khet Report Workbook (rows[3][0]='รหัส', rows[4] has ภาคเรียนที่ / rows[5] คะแนนเต็ม)
  const row4Text = (rows[3] || []).map((v) => String(v || '').trim()).join('|');
  const row6Text = (rows[5] || []).map((v) => String(v || '').trim()).join('|');
  if (
    row4Text.includes('รหัส') &&
    (row4Text.includes('กลุ่มสาระ') || row6Text.includes('คะแนนเต็ม') || row6Text.includes('ระดับผลการเรียนรู้'))
  ) {
    return {
      format: 'banhatkhet_primary_report',
      parsed: parsePrimaryPrototypeSheet(rows, sheetName),
      errors: [],
    };
  }

  // Format 2: Secondary Ban Hat Khet Report Template (headerRow has รหัสวิชา + รายชื่อวิชา + น้ำหนัก)
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const a = normalizeHeader(rows[r]?.[0]);
    const b = normalizeHeader(rows[r]?.[1]);
    const c = normalizeHeader(rows[r]?.[2]);
    if (a === 'รหัสวิชา' && (b.includes('รายชื่อวิชา') || b.includes('ชื่อวิชา')) && c.includes('น้ำหนัก')) {
      return {
        format: 'banhatkhet_secondary_template',
        parsed: parseSecondaryTemplateSheet(rows, r, sheetName),
        errors: [],
      };
    }
  }

  // Format 3: Standard Tabular Sheet
  const std = parseStandardTableSheet(sheet, sheetName, aliases);
  return {
    format: 'standard_table',
    parsed: std.parsed,
    errors: std.errors,
  };
}

/**
 * แปลง Workbook (จาก SheetJS) เป็นรายการรายวิชาและโครงสร้างหลักสูตรพร้อมสรุปรายชั้น
 */
export function parseSubjectsFromWorkbook(workbook, options = {}) {
  const { sheetName = '__ALL__', customColumnAliases = {} } = options;
  const aliases = { ...DEFAULT_SUBJECT_COLUMN_ALIASES, ...customColumnAliases };
  const sheetNames = workbook.SheetNames || [];

  let targetSheets = [];
  if (sheetName && sheetName !== '__ALL__' && sheetNames.includes(sheetName)) {
    targetSheets = [sheetName];
  } else {
    const hasTemplateSheet = sheetNames.includes('แม่แบบ');
    targetSheets = sheetNames.filter((name) => {
      const clean = name.trim();
      if (clean === 'เกรด' || /^Sheet\d+$/i.test(clean)) return false;
      // ในไฟล์ประกาศผลสอบ ม.1 ที่มีทั้ง "แม่แบบ" และชีทนักเรียน "1".."10" ให้ดึงจาก "แม่แบบ" เป็นหลัก
      if (hasTemplateSheet && /^\d+$/.test(clean)) return false;
      return true;
    });
    if (!targetSheets.length && sheetNames.length) targetSheets = [sheetNames[0]];
  }

  const parsedMap = new Map();
  const errors = [];
  const formatCounts = {};

  targetSheets.forEach((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return;
    const result = detectAndParseSheet(sheet, name, aliases);
    if (result.parsed.length > 0) {
      formatCounts[result.format] = (formatCounts[result.format] || 0) + 1;
    }
    errors.push(...result.errors);
    result.parsed.forEach((item) => {
      const key = `${item.subject_code}|${item.grade_level}`;
      if (!parsedMap.has(key)) parsedMap.set(key, item);
    });
  });

  const subjects = Array.from(parsedMap.values());
  const gradeBreakdown = {};
  subjects.forEach((s) => {
    if (!gradeBreakdown[s.grade_level]) {
      gradeBreakdown[s.grade_level] = { count: 0, credits: 0, hours: 0 };
    }
    gradeBreakdown[s.grade_level].count += 1;
    gradeBreakdown[s.grade_level].credits = Number(
      (gradeBreakdown[s.grade_level].credits + (Number(s.credits) || 0)).toFixed(2)
    );
    gradeBreakdown[s.grade_level].hours += Number(s.hours_per_semester) || 0;
  });

  const dominantFormat =
    Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'standard_table';

  return {
    sheetNames,
    usedSheet: sheetName === '__ALL__' || !sheetName ? '__ALL__' : targetSheets[0],
    parsedSheets: targetSheets,
    detectedFormat: dominantFormat,
    subjects,
    gradeBreakdown,
    errors,
  };
}

/**
 * อ่านไฟล์ Excel (.xlsx/.xls) หรือ CSV รหัสวิชา และแปลงเป็นโครงสร้างข้อมูลกลาง
 */
export async function parseSubjectsExcelFile(file, options = {}) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseSubjectsFromWorkbook(workbook, options);
}

/**
 * สร้างไฟล์ Excel Template มาตรฐานสำหรับนำเข้ารหัสวิชาและโครงสร้างหลักสูตร
 */
export function downloadSubjectImportTemplate() {
  const sampleData = [
    {
      รหัสวิชา: 'ท14101',
      ชื่อวิชา: 'ภาษาไทย',
      กลุ่มสาระการเรียนรู้: 'ภาษาไทย',
      ระดับชั้น: 'ป.4',
      ประเภทวิชา: 'พื้นฐาน',
      หน่วยกิต: 4.0,
      'ชั่วโมง/ภาค': 80,
      'ชั่วโมง/ปี': 160,
      'ชั่วโมง/สัปดาห์': 4,
      ภาคเรียน: '1-2',
    },
    {
      รหัสวิชา: 'ส14201',
      ชื่อวิชา: 'รักษ์ป่าน่าน',
      กลุ่มสาระการเรียนรู้: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      ระดับชั้น: 'ป.4',
      ประเภทวิชา: 'เพิ่มเติม',
      หน่วยกิต: 1.0,
      'ชั่วโมง/ภาค': 20,
      'ชั่วโมง/ปี': 40,
      'ชั่วโมง/สัปดาห์': 1,
      ภาคเรียน: '1-2',
    },
    {
      รหัสวิชา: 'ว21103',
      ชื่อวิชา: 'เทคโนโลยี',
      กลุ่มสาระการเรียนรู้: 'วิทยาศาสตร์และเทคโนโลยี',
      ระดับชั้น: 'ม.1',
      ประเภทวิชา: 'พื้นฐาน',
      หน่วยกิต: 0.5,
      'ชั่วโมง/ภาค': 20,
      'ชั่วโมง/ปี': 20,
      'ชั่วโมง/สัปดาห์': 1,
      ภาคเรียน: '1',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 30 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'โครงสร้างรายวิชา');
  XLSX.writeFile(wb, 'Template_โครงสร้างรายวิชา_โรงเรียนบ้านหาดเค็ด.xlsx');
}

/**
 * ส่งออกฐานข้อมูลโครงสร้างรายวิชาทุกชั้นของโรงเรียนเป็นไฟล์ Excel แยกชีทตามระดับชั้น
 */
export function exportCurriculumStructureToExcel(subjects = [], settings = {}) {
  const wb = XLSX.utils.book_new();
  const toRow = (s, idx) => ({
    ลำดับ: s.sort_order ?? idx + 1,
    ระดับชั้น: s.grade_level,
    ภาคเรียน: s.semester || '1',
    รหัสวิชา: s.subject_code,
    ชื่อรายวิชา: s.subject_name,
    กลุ่มสาระการเรียนรู้: s.learning_area,
    ประเภทวิชา: s.subject_type,
    หน่วยกิต: s.credits,
    'ชั่วโมง/ภาค': s.hours_per_semester,
    'ชั่วโมง/ปี': s.hours_per_year || s.hours_per_semester,
    'ชั่วโมง/สัปดาห์': s.hours_per_week,
  });

  const sortedAll = [...subjects].sort((a, b) => {
    const ga = GRADE_LEVELS.indexOf(a.grade_level);
    const gb = GRADE_LEVELS.indexOf(b.grade_level);
    if (ga !== gb) return ga - gb;
    return (a.sort_order || 100) - (b.sort_order || 100);
  });

  const wsAll = XLSX.utils.json_to_sheet(sortedAll.map(toRow));
  XLSX.utils.book_append_sheet(wb, wsAll, 'สรุปโครงสร้างทุกชั้น');

  GRADE_LEVELS.forEach((grade) => {
    const rows = sortedAll.filter((s) => s.grade_level === grade);
    if (rows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(toRow)), grade.replace('.', ''));
    }
  });

  XLSX.writeFile(
    wb,
    `โครงสร้างหลักสูตร_${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'}_ปี${settings?.academic_year || '2569'}.xlsx`
  );
}
