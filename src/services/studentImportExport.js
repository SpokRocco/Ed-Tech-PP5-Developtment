import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { normalizeGradeLevel } from './subjectImportAdapter';

/**
 * บริการ Import / Export ฐานข้อมูลนักเรียนส่วนกลาง (.xlsx และ .csv)
 * พร้อมตัวช่วยแยกคำนำหน้า ชื่อ-สกุล และตรวจสอบความถูกต้อง
 */

const STUDENT_COLUMN_ALIASES = {
  student_code: ['รหัสนักเรียน', 'เลขประจำตัว', 'เลขประจำตัวนักเรียน', 'student_code', 'id'],
  national_id: ['เลขบัตรประชาชน', 'เลขประชาชน', 'เลขประจำตัวประชาชน', 'national_id', 'cid'],
  prefix: ['คำนำหน้า', 'คำนำหน้าชื่อ', 'prefix', 'title'],
  first_name: ['ชื่อ', 'ชื่อจริง', 'first_name', 'firstname'],
  last_name: ['นามสกุล', 'สกุล', 'last_name', 'lastname'],
  full_name: ['ชื่อ-สกุล', 'ชื่อ-นามสกุล', 'ชื่อสกุล', 'full_name', 'name'],
  gender: ['เพศ', 'gender', 'sex'],
  grade_level: ['ชั้น', 'ระดับชั้น', 'grade', 'grade_level'],
  classroom: ['ห้อง', 'ห้องเรียน', 'classroom', 'room'],
  student_number: ['เลขที่', 'ลำดับ', 'student_number', 'no'],
  academic_year: ['ปีการศึกษา', 'academic_year', 'year'],
};

function getField(row, aliases) {
  const keys = Object.keys(row || {});
  for (const key of keys) {
    const normalized = key.trim().toLowerCase().replace(/\s+/g, '');
    if (aliases.some((a) => normalized === a.toLowerCase().replace(/\s+/g, '') || normalized.includes(a.toLowerCase()))) {
      return row[key];
    }
  }
  return '';
}

function splitThaiFullName(fullName = '') {
  const clean = String(fullName).trim().replace(/\s+/g, ' ');
  const prefixes = ['เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'น.ส.', 'นาง'];
  let prefix = '';
  let rest = clean;

  for (const p of prefixes) {
    if (rest.startsWith(p)) {
      prefix = p === 'ด.ช.' ? 'เด็กชาย' : p === 'ด.ญ.' ? 'เด็กหญิง' : p === 'น.ส.' ? 'นางสาว' : p;
      rest = rest.slice(p.length).trim();
      break;
    }
  }

  const parts = rest.split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { prefix: prefix || 'เด็กชาย', firstName, lastName };
}

function normalizeGender(rawGender, prefix) {
  const g = String(rawGender || '').trim().toLowerCase();
  if (['ช', 'ชาย', 'm', 'male'].includes(g)) return 'ช';
  if (['ญ', 'หญิง', 'f', 'female'].includes(g)) return 'ญ';
  if (prefix === 'เด็กหญิง' || prefix === 'นางสาว' || prefix === 'นาง') return 'ญ';
  return 'ช';
}

export async function parseStudentsFile(file, defaultAcademicYear = '2569') {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let rawRows = [];

  if (ext === 'csv') {
    const text = await file.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    rawRows = result.data || [];
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  }

  const students = [];
  const errors = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const studentCode = String(getField(row, STUDENT_COLUMN_ALIASES.student_code)).trim();
    let prefix = String(getField(row, STUDENT_COLUMN_ALIASES.prefix)).trim();
    let firstName = String(getField(row, STUDENT_COLUMN_ALIASES.first_name)).trim();
    let lastName = String(getField(row, STUDENT_COLUMN_ALIASES.last_name)).trim();

    if (!firstName) {
      const fullName = String(getField(row, STUDENT_COLUMN_ALIASES.full_name)).trim();
      if (fullName) {
        const split = splitThaiFullName(fullName);
        prefix = prefix || split.prefix;
        firstName = split.firstName;
        lastName = lastName || split.lastName;
      }
    }

    if (!studentCode && !firstName) return;
    if (!studentCode || !firstName) {
      errors.push(`แถวที่ ${rowNum}: ต้องระบุรหัสนักเรียนและชื่อนักเรียน`);
      return;
    }

    const gradeLevel = normalizeGradeLevel(getField(row, STUDENT_COLUMN_ALIASES.grade_level)) || 'ป.4';
    const classroom = String(getField(row, STUDENT_COLUMN_ALIASES.classroom) || '1').trim();
    const numVal = Number(getField(row, STUDENT_COLUMN_ALIASES.student_number));
    const studentNumber = !Number.isNaN(numVal) && numVal > 0 ? Math.round(numVal) : idx + 1;
    const gender = normalizeGender(getField(row, STUDENT_COLUMN_ALIASES.gender), prefix);

    students.push({
      student_code: studentCode,
      national_id: String(getField(row, STUDENT_COLUMN_ALIASES.national_id) || '').trim(),
      prefix: prefix || (gender === 'ญ' ? 'เด็กหญิง' : 'เด็กชาย'),
      first_name: firstName,
      last_name: lastName || '-',
      gender,
      grade_level: gradeLevel,
      classroom,
      student_number: studentNumber,
      academic_year: String(getField(row, STUDENT_COLUMN_ALIASES.academic_year) || defaultAcademicYear).trim(),
      status: 'active',
    });
  });

  return { students, errors };
}

export function downloadStudentTemplate(format = 'xlsx') {
  const sampleRows = [
    {
      รหัสนักเรียน: '6901011',
      เลขที่: 1,
      คำนำหน้า: 'เด็กชาย',
      ชื่อ: 'ภาคิน',
      นามสกุล: 'น่านภูเพียง',
      เพศ: 'ช',
      ระดับชั้น: 'ป.4',
      ห้อง: '1',
      ปีการศึกษา: '2569',
    },
    {
      รหัสนักเรียน: '6901012',
      เลขที่: 2,
      คำนำหน้า: 'เด็กหญิง',
      ชื่อ: 'ณัฐสุดา',
      นามสกุล: 'หาดเค็ด',
      เพศ: 'ญ',
      ระดับชั้น: 'ป.4',
      ห้อง: '1',
      ปีการศึกษา: '2569',
    },
  ];

  if (format === 'csv') {
    const csv = '\uFEFF' + Papa.unparse(sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_รายชื่อนักเรียน_โรงเรียนบ้านหาดเค็ด.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 8 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักเรียน');
  XLSX.writeFile(wb, 'Template_รายชื่อนักเรียน_โรงเรียนบ้านหาดเค็ด.xlsx');
}
