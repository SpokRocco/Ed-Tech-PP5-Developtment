import * as XLSX from 'xlsx';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  buildClassroomMatrix,
  formatThaiDate,
  getFullStudentName,
  GRADE_LEVELS,
  LEVEL_LABELS,
} from '../lib/thaiFormatting';
import { DESIRABLE_TRAITS_8, evaluateCriteriaSummary } from './scoringConfigAdapter';
import {
  buildPp1TransferStudentRow,
  computeEarlyChildhoodSummary,
  EARLY_CHILDHOOD_12_STANDARDS,
  EARLY_CHILDHOOD_2569_COMPONENTS,
  EARLY_CHILDHOOD_LEVELS,
  OB12_DOMAINS,
  OB2569_DOMAINS,
  PP1_TRANSFER_MAPPING_TABLE_4,
} from '../data/earlyChildhoodStandards';
import {
  downloadBlob,
  exportClassroomPp5ToDocx,
  exportClassroomPp5ToExcel,
  exportPp5ToDocx,
  exportPp5ToExcel,
  makeDocxCell,
  makeDocxParagraph,
} from './exportEngine';

function ecLevelLabel(lv) {
  return EARLY_CHILDHOOD_LEVELS[Number(lv)]?.short || EARLY_CHILDHOOD_LEVELS[3].short;
}

function traitLevelLabel(lv) {
  return LEVEL_LABELS[Number(lv)]?.label || 'ดีเยี่ยม';
}

function buildSectionPage(children, orientation = PageOrientation.PORTRAIT, margin = 640) {
  return {
    properties: {
      page: {
        size: { orientation },
        margin: { top: margin, bottom: margin, left: margin, right: margin },
      },
    },
    children,
  };
}

function buildSignatureTable(leftName, leftRole, centerName, centerRole, rightName, rightRole) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeDocxCell(`ลงชื่อ........................................\n(${leftName || '................................'})\n${leftRole}`, {
            size: 20,
            widthPct: 33,
          }),
          makeDocxCell(`ลงชื่อ........................................\n(${centerName || '................................'})\n${centerRole}`, {
            size: 20,
            widthPct: 34,
          }),
          makeDocxCell(`ลงชื่อ........................................\n(${rightName || '................................'})\n${rightRole}`, {
            size: 20,
            widthPct: 33,
          }),
        ],
      }),
    ],
  });
}

async function saveDocxFile(sections, filename) {
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

function findHomeroomTeacherName(users = [], gradeLevel = '', classroom = '1', fallback = '') {
  if (fallback) return fallback;
  const target = `${gradeLevel}/${classroom}`;
  const found = users.find((u) => u.homeroom_class === target || u.homeroom_class === gradeLevel);
  return found?.full_name || 'ครูประจำชั้น';
}

/* ==========================================================================
 * 1) เทียบผล ปพ.1 (2569→2551)
 * ========================================================================== */
export async function exportPp1TransferDoc({ doc, settings, students = [], users = [], format = 'docx' }) {
  const payload = doc.payload || {};
  const gradeLevel = doc.grade_level || 'ป.1';
  const classroom = String(doc.classroom || '1');
  const rows =
    Array.isArray(payload.studentRows) && payload.studentRows.length
      ? payload.studentRows
      : students
          .filter((s) => s.status === 'active' && s.grade_level === gradeLevel && String(s.classroom || '1') === classroom)
          .map((s) => buildPp1TransferStudentRow(s, {}, {}));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const t4Rows = PP1_TRANSFER_MAPPING_TABLE_4.map((m, idx) => ({
      ลำดับ: idx + 1,
      กลุ่มสาระฯ_2551: `${m.subjectCodePrefix} - ${m.areaName}`,
      ความสามารถที่ใช้เทียบ_2569: m.capTitle,
      สัดส่วนเทียบโอน: m.ratioDesc,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t4Rows), 'ตารางที่4_ความสามารถเทียบ');

    const t6Rows = rows.map((r, idx) => {
      const stu = studentMap.get(r.student_id) || {};
      const out = {
        ที่: stu.student_number || idx + 1,
        รหัสนักเรียน: stu.student_code || r.student_id,
        'ชื่อ - สกุล': getFullStudentName(stu),
      };
      PP1_TRANSFER_MAPPING_TABLE_4.forEach((m) => {
        out[m.areaName] = r.grades?.[m.areaKey] ?? '3';
      });
      out['อ่านคิดวิเคราะห์เขียน'] = r.rtw || 'ดีเยี่ยม';
      out['คุณลักษณะอันพึงประสงค์'] = r.traits || 'ดีเยี่ยม';
      out['กิจกรรมพัฒนาผู้เรียน'] = r.activities || 'ผ';
      out['ข้อความหมายเหตุ ปพ.1'] = r.pp1_remark || '';
      return out;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t6Rows), 'ตารางที่6_ผลการเรียน2551');
    XLSX.writeFile(wb, `เทียบผล_ปพ1_2569to2551_${gradeLevel}-${classroom}.xlsx`);
    return;
  }

  const t4Table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 18, widthPct: 6 }),
          makeDocxCell('กลุ่มสาระการเรียนรู้ (2551)', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 18, widthPct: 36 }),
          makeDocxCell('ความสามารถ (2569) ที่ใช้เทียบ', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 18, widthPct: 42 }),
          makeDocxCell('น้ำหนัก/หลักเกณฑ์', { bold: true, shading: 'EEF2F9', size: 18, widthPct: 16 }),
        ],
      }),
      ...PP1_TRANSFER_MAPPING_TABLE_4.map(
        (m, i) =>
          new TableRow({
            children: [
              makeDocxCell(i + 1, { size: 18 }),
              makeDocxCell(`${m.subjectCodePrefix} • ${m.areaName}`, { align: AlignmentType.LEFT, size: 18 }),
              makeDocxCell(m.capTitle, { align: AlignmentType.LEFT, size: 18 }),
              makeDocxCell(m.ratioDesc, { size: 18 }),
            ],
          })
      ),
    ],
  });

  const t6Header = [
    makeDocxCell('ที่', { bold: true, shading: '0F2557', size: 16 }),
    makeDocxCell('ชื่อ - สกุล', { bold: true, shading: '0F2557', align: AlignmentType.LEFT, size: 16 }),
    ...PP1_TRANSFER_MAPPING_TABLE_4.map((m) => makeDocxCell(m.subjectCodePrefix, { bold: true, shading: '0F2557', size: 16 })),
    makeDocxCell('อ่านคิดฯ', { bold: true, shading: '0F2557', size: 16 }),
    makeDocxCell('คุณลักษณะ', { bold: true, shading: '0F2557', size: 16 }),
    makeDocxCell('กิจกรรม', { bold: true, shading: '0F2557', size: 16 }),
    makeDocxCell('หมายเหตุ ปพ.๑', { bold: true, shading: '0F2557', align: AlignmentType.LEFT, size: 16 }),
  ];

  const t6Body = rows.map((r, idx) => {
    const stu = studentMap.get(r.student_id) || {};
    return new TableRow({
      children: [
        makeDocxCell(stu.student_number || idx + 1, { size: 16 }),
        makeDocxCell(getFullStudentName(stu), { align: AlignmentType.LEFT, size: 16 }),
        ...PP1_TRANSFER_MAPPING_TABLE_4.map((m) => makeDocxCell(r.grades?.[m.areaKey] ?? '3', { size: 16 })),
        makeDocxCell(r.rtw || 'ดีเยี่ยม', { size: 16 }),
        makeDocxCell(r.traits || 'ดีเยี่ยม', { size: 16 }),
        makeDocxCell(r.activities || 'ผ', { size: 16 }),
        makeDocxCell(r.pp1_remark || '', { align: AlignmentType.LEFT, size: 15 }),
      ],
    });
  });

  const section = buildSectionPage(
    [
      makeDocxParagraph(`แบบบันทึกการเทียบผลการเรียนเพื่อจัดทำ ปพ.๑ ชั้น ${gradeLevel}/${classroom} (หลักสูตร 2569 → 2551)`, {
        bold: true,
        size: 30,
        align: AlignmentType.CENTER,
        spaceAfter: 60,
      }),
      makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} • ปีการศึกษา ${doc.academic_year || settings?.academic_year || '2569'} • ตามแนวปฏิบัติ สพฐ.`, {
        size: 22,
        align: AlignmentType.CENTER,
        spaceAfter: 120,
      }),
      makeDocxParagraph('ตารางที่ ๔ — ความสามารถ (2569) ที่ใช้เทียบรายวิชาตามหลักสูตรแกนกลางฯ 2551', { bold: true, size: 24, spaceAfter: 60 }),
      t4Table,
      makeDocxParagraph('', { spaceAfter: 120 }),
      makeDocxParagraph('ตารางที่ ๕–๖ — ผลการเรียนเทียบโอนรายบุคคล (เพื่อบันทึกลง ปพ.๑)', { bold: true, size: 24, spaceAfter: 60 }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: t6Header }), ...t6Body] }),
      makeDocxParagraph('', { spaceAfter: 120 }),
      buildSignatureTable(
        findHomeroomTeacherName(users, gradeLevel, classroom),
        'ครูประจำชั้น',
        settings?.academic_head_name || 'หัวหน้างานวิชาการ',
        'หัวหน้าฝ่ายวิชาการ',
        settings?.director_name || 'ผู้อำนวยการสถานศึกษา',
        settings?.director_title || 'ผู้อำนวยการโรงเรียน'
      ),
    ],
    PageOrientation.LANDSCAPE,
    540
  );
  await saveDocxFile([section], `เทียบผล_ปพ1_2569to2551_${gradeLevel}-${classroom}_GoogleDocs.docx`);
}

/* ==========================================================================
 * 2) ปพ.4 — แบบบันทึกการพัฒนาคุณลักษณะอันพึงประสงค์ 8 ข้อ
 * ========================================================================== */
export async function exportPp4TraitsDoc({ doc, settings, students = [], users = [], format = 'docx' }) {
  const payload = doc.payload || {};
  const gradeLevel = doc.grade_level || 'ป.4';
  const classroom = String(doc.classroom || '1');
  const roomStudents = students
    .filter((s) => s.status === 'active' && s.grade_level === gradeLevel && String(s.classroom || '1') === classroom)
    .sort((a, b) => (a.student_number || 0) - (b.student_number || 0));
  const scoresByStudent = payload.scoresByStudent || {};

  const rows = roomStudents.map((stu, idx) => {
    const stuScores = scoresByStudent[stu.id] || {};
    const evalRes = evaluateCriteriaSummary(stuScores, DESIRABLE_TRAITS_8);
    return { stu, idx, stuScores, evalRes };
  });

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const sheetRows = rows.map(({ stu, idx, stuScores, evalRes }) => {
      const r = {
        ที่: stu.student_number || idx + 1,
        รหัสนักเรียน: stu.student_code,
        'ชื่อ - สกุล': getFullStudentName(stu),
      };
      DESIRABLE_TRAITS_8.forEach((t) => {
        r[`${t.code}.${t.name}`] = Number(stuScores[t.key] ?? 3);
      });
      r['ค่าเฉลี่ย'] = evalRes.average;
      r['สรุประดับ'] = traitLevelLabel(evalRes.level);
      return r;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), 'แบบบันทึก_ปพ4');
    const summaryBuckets = [3, 2, 1, 0].map((lv) => ({
      ระดับคุณภาพ: traitLevelLabel(lv),
      จำนวนนักเรียน: rows.filter((x) => x.evalRes.level === lv).length,
      ร้อยละ: rows.length
        ? Number(((rows.filter((x) => x.evalRes.level === lv).length / rows.length) * 100).toFixed(1))
        : 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryBuckets), 'สรุปสถิติ_ปพ4');
    XLSX.writeFile(wb, `ปพ4_คุณลักษณะ_${gradeLevel}-${classroom}_ปี${doc.academic_year || settings?.academic_year}.xlsx`);
    return;
  }

  const headerRow = new TableRow({
    children: [
      makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 17 }),
      makeDocxCell('ชื่อ - สกุล', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 17 }),
      ...DESIRABLE_TRAITS_8.map((t) => makeDocxCell(`${t.code}.${t.name}`, { bold: true, shading: 'EEF2F9', size: 14 })),
      makeDocxCell('เฉลี่ย', { bold: true, shading: 'EEF2F9', size: 16 }),
      makeDocxCell('สรุปผล', { bold: true, shading: 'EEF2F9', size: 16 }),
    ],
  });

  const bodyRows = rows.map(({ stu, idx, stuScores, evalRes }) =>
    new TableRow({
      children: [
        makeDocxCell(stu.student_number || idx + 1, { size: 17 }),
        makeDocxCell(getFullStudentName(stu), { align: AlignmentType.LEFT, size: 17 }),
        ...DESIRABLE_TRAITS_8.map((t) => makeDocxCell(Number(stuScores[t.key] ?? 3), { size: 17 })),
        makeDocxCell(evalRes.average, { size: 17 }),
        makeDocxCell(traitLevelLabel(evalRes.level), { bold: true, size: 17 }),
      ],
    })
  );

  const section = buildSectionPage(
    [
      makeDocxParagraph(`ปพ.4 — แบบบันทึกการพัฒนาคุณลักษณะอันพึงประสงค์ 8 ประการ ชั้น ${gradeLevel}/${classroom}`, {
        bold: true,
        size: 30,
        align: AlignmentType.CENTER,
        spaceAfter: 60,
      }),
      makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} • ปีการศึกษา ${doc.academic_year || settings?.academic_year} ภาคเรียนที่ ${doc.semester || '1'}`, {
        size: 22,
        align: AlignmentType.CENTER,
        spaceAfter: 120,
      }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }),
      makeDocxParagraph('', { spaceAfter: 120 }),
      buildSignatureTable(
        findHomeroomTeacherName(users, gradeLevel, classroom),
        'ครูประจำชั้น',
        settings?.academic_head_name || 'หัวหน้างานวิชาการ',
        'หัวหน้าฝ่ายวิชาการ',
        settings?.director_name || 'ผู้อำนวยการสถานศึกษา',
        settings?.director_title || 'ผู้อำนวยการโรงเรียน'
      ),
    ],
    PageOrientation.LANDSCAPE,
    540
  );
  await saveDocxFile([section], `ปพ4_คุณลักษณะ_${gradeLevel}-${classroom}_GoogleDocs.docx`);
}

/* ==========================================================================
 * 3) ปพ.6 — สมุดรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล
 * ========================================================================== */
export async function exportPp6ReportDoc({
  doc,
  settings,
  students = [],
  subjects = [],
  courses = [],
  allScores = [],
  allAttendance = [],
  allCharacteristics = [],
  scoreStructures = [],
  users = [],
  format = 'docx',
}) {
  const payload = doc.payload || {};
  const gradeLevel = doc.grade_level || 'ป.4';
  const classroom = String(doc.classroom || '1');
  const semester = doc.semester || '1';
  const matrix = buildClassroomMatrix({
    students,
    gradeLevel,
    classroom,
    courses,
    subjects,
    semester,
    allScores,
    allAttendance,
    allCharacteristics,
    scoreStructures,
  });

  const targetRows = doc.student_id
    ? matrix.studentRows.filter((r) => r.student.id === doc.student_id)
    : matrix.studentRows;
  const rowsToExport = targetRows.length ? targetRows : matrix.studentRows.slice(0, 1);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const outRows = [];
    rowsToExport.forEach((row) => {
      matrix.roomCourses.forEach((c) => {
        const sg = row.subjectGrades[c.id] || {};
        outRows.push({
          รหัสนักเรียน: row.student.student_code,
          'ชื่อ - สกุล': getFullStudentName(row.student),
          รหัสวิชา: c.subject_code,
          ชื่อวิชา: c.subject_name,
          หน่วยกิต: c.credits || 1,
          คะแนนรวม: sg.totalScore ?? '-',
          ระดับผลการเรียน: sg.grade ?? '-',
          'GPA รวม': row.gpa,
          'คุณลักษณะฯ': traitLevelLabel(row.traitsLevel),
          'อ่านคิดฯ': traitLevelLabel(row.rtwLevel),
        });
      });
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(outRows.length ? outRows : [{ หมายเหตุ: 'ยังไม่มีข้อมูลรายวิชาในห้องเรียนนี้' }]),
      'สมุดรายงาน_ปพ6'
    );
    XLSX.writeFile(wb, `ปพ6_รายงานผล_${gradeLevel}-${classroom}.xlsx`);
    return;
  }

  const remarksByStudent = payload.teacherRemarksByStudent || {};
  const homeroomName = findHomeroomTeacherName(users, gradeLevel, classroom);

  const sections = rowsToExport.map((row) => {
    const courseRows = matrix.roomCourses.map((c, idx) => {
      const sg = row.subjectGrades[c.id] || {};
      return new TableRow({
        children: [
          makeDocxCell(idx + 1, { size: 19 }),
          makeDocxCell(c.subject_code, { size: 19 }),
          makeDocxCell(c.subject_name, { align: AlignmentType.LEFT, size: 19 }),
          makeDocxCell(c.credits || 1, { size: 19 }),
          makeDocxCell(sg.totalScore ?? '-', { size: 19 }),
          makeDocxCell(sg.grade ?? '-', { bold: true, size: 19 }),
        ],
      });
    });

    const remark =
      remarksByStudent[row.student.id] ||
      payload.teacherRemark ||
      'นักเรียนมีความตั้งใจในการเรียนรู้ ปฏิบัติกิจกรรมได้เหมาะสมตามเกณฑ์';

    return buildSectionPage([
      makeDocxParagraph('ปพ.6 — สมุดรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล', {
        bold: true,
        size: 32,
        align: AlignmentType.CENTER,
        spaceAfter: 60,
      }),
      makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} (${settings?.affiliation_short || 'สพป.น่าน เขต 1'}) • ปีการศึกษา ${doc.academic_year || settings?.academic_year} ภาคเรียนที่ ${semester}`, {
        size: 22,
        align: AlignmentType.CENTER,
        spaceAfter: 120,
      }),
      makeDocxParagraph(
        `ชื่อ - สกุล: ${getFullStudentName(row.student)}   |   รหัส: ${row.student.student_code}   |   ชั้น ${gradeLevel}/${classroom} เลขที่ ${row.no}`,
        { bold: true, size: 22, spaceAfter: 100 }
      ),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 19 }),
              makeDocxCell('รหัสวิชา', { bold: true, shading: 'EEF2F9', size: 19 }),
              makeDocxCell('รายวิชา / กิจกรรม', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 19 }),
              makeDocxCell('นก./ชม.', { bold: true, shading: 'EEF2F9', size: 19 }),
              makeDocxCell('คะแนน', { bold: true, shading: 'EEF2F9', size: 19 }),
              makeDocxCell('เกรด', { bold: true, shading: 'EEF2F9', size: 19 }),
            ],
          }),
          ...(courseRows.length
            ? courseRows
            : [new TableRow({ children: [makeDocxCell('-', { size: 19 }), makeDocxCell('-', { size: 19 }), makeDocxCell('ยังไม่มีรายวิชา', { align: AlignmentType.LEFT, size: 19 }), makeDocxCell('-', { size: 19 }), makeDocxCell('-', { size: 19 }), makeDocxCell('-', { size: 19 })] })]),
        ],
      }),
      makeDocxParagraph('', { spaceAfter: 80 }),
      makeDocxParagraph(
        `ผลการเรียนเฉลี่ย (GPA): ${row.gpa?.toFixed ? row.gpa.toFixed(2) : row.gpa}   •   เวลาเรียน: ${row.attendancePct}%   •   คุณลักษณะฯ: ${traitLevelLabel(row.traitsLevel)}   •   อ่านคิดวิเคราะห์เขียน: ${traitLevelLabel(row.rtwLevel)}   •   กิจกรรม: ${row.activitiesPass ? 'ผ่าน' : 'ไม่ผ่าน'}`,
        { bold: true, size: 21, spaceAfter: 80 }
      ),
      makeDocxParagraph(`ความเห็นครูประจำชั้น: ${remark}`, { size: 21, spaceAfter: 140 }),
      buildSignatureTable(
        '................................',
        'ผู้ปกครองลงนามรับทราบ',
        homeroomName,
        'ครูประจำชั้น',
        settings?.director_name || 'ผู้อำนวยการโรงเรียน',
        settings?.director_title || 'ผู้อำนวยการสถานศึกษา'
      ),
    ]);
  });

  await saveDocxFile(sections, `ปพ6_รายงานผล_${gradeLevel}-${classroom}_GoogleDocs.docx`);
}

/* ==========================================================================
 * 4) ปพ.7 — ใบรับรองผลการเรียน/สถานภาพนักเรียน (กรอบติดรูป ๔x๖ ซม.)
 * ========================================================================== */
export async function exportPp7CertificateDoc({ doc, settings, students = [], format = 'docx' }) {
  const payload = doc.payload || {};
  const stu = students.find((s) => s.id === (doc.student_id || payload.studentId)) || students[0] || {};
  const stuName = payload.studentName || getFullStudentName(stu) || '-';

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const row = [
      { หัวข้อ: 'เลขที่หนังสือ (ปพ.7)', รายละเอียด: payload.docNumber || 'ศธ ๐๔๐๖๙.๐๕๖/.......' },
      { หัวข้อ: 'ชื่อ - สกุลนักเรียน', รายละเอียด: stuName },
      { หัวข้อ: 'รหัสประจำตัวนักเรียน', รายละเอียด: stu.student_code || '-' },
      { หัวข้อ: 'เลขประจำตัวประชาชน', รายละเอียด: payload.nationalId || '-' },
      { หัวข้อ: 'ระดับชั้น / ปีการศึกษา', รายละเอียด: `${doc.grade_level || stu.grade_level || '-'}/${doc.classroom || '1'} ปีการศึกษา ${doc.academic_year || settings?.academic_year}` },
      { หัวข้อ: 'ผลการเรียนเฉลี่ยสะสม (GPA)', รายละเอียด: payload.gpa || '3.75' },
      { หัวข้อ: 'วัตถุประสงค์การขอรับรอง', รายละเอียด: payload.purpose || 'ใช้ประกอบการสมัครศึกษาต่อ' },
      { หัวข้อ: 'วันที่ออกหนังสือ / อายุใช้งาน', รายละเอียด: `${formatThaiDate(payload.issueDate)} (ใช้ได้ชั่วคราวประมาณ 30 วัน ตามระเบียบฯ)` },
      { หัวข้อ: 'ผู้ลงนามรับรอง', รายละเอียด: `${settings?.director_name || '-'} (${settings?.director_title || 'ผู้อำนวยการโรงเรียนบ้านหาดเค็ด'})` },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(row), 'ใบรับรอง_ปพ7');
    XLSX.writeFile(wb, `ปพ7_ใบรับรอง_${stu.student_code || 'student'}.xlsx`);
    return;
  }

  const thinBox = {
    top: { style: BorderStyle.SINGLE, size: 8, color: '1E293B' },
    bottom: { style: BorderStyle.SINGLE, size: 8, color: '1E293B' },
    left: { style: BorderStyle.SINGLE, size: 8, color: '1E293B' },
    right: { style: BorderStyle.SINGLE, size: 8, color: '1E293B' },
  };
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const section = buildSectionPage([
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorder,
              width: { size: 74, type: WidthType.PERCENTAGE },
              children: [
                makeDocxParagraph('แบบ ปพ.๗', { bold: true, size: 28, spaceAfter: 40 }),
                makeDocxParagraph(`เลขที่หนังสือ ${payload.docNumber || 'ศธ ๐๔๐๖๙.๐๕๖/...........'}`, { bold: true, size: 24, spaceAfter: 40 }),
                makeDocxParagraph('ใบรับรองผลการศึกษา / สถานภาพนักเรียน', { bold: true, size: 34, spaceAfter: 60 }),
                makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} (${settings?.affiliation || ''})`, { size: 22, spaceAfter: 60 }),
              ],
            }),
            new TableCell({
              borders: thinBox,
              width: { size: 26, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 140, after: 140 },
                  children: [
                    new TextRun({
                      text: 'ติดรูปถ่ายนักเรียน\nขนาด ๔ × ๖ ซม.\n(ตามระเบียบงานสารบรรณ\nข้อ ๒๔.๗)\nประทับตราสถานศึกษา',
                      size: 20,
                      font: 'Sarabun',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    makeDocxParagraph('', { spaceAfter: 160 }),
    makeDocxParagraph(
      `        หนังสือรับรองฉบับนี้ให้ไว้เพื่อแสดงว่า ${stuName} (รหัสประจำตัวนักเรียน ${stu.student_code || '-'}) ${payload.nationalId ? `เลขประจำตัวประชาชน ${payload.nationalId} ` : ''}เกิดวันที่ ${payload.birthDate ? formatThaiDate(payload.birthDate) : '-'} เป็นนักเรียนกำลังศึกษาอยู่จริงในระดับชั้น ${doc.grade_level || stu.grade_level || '-'}/${doc.classroom || '1'} ปีการศึกษา ${doc.academic_year || settings?.academic_year || '2569'} ณ ${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'}`,
      { size: 25, spaceAfter: 140 }
    ),
    makeDocxParagraph(
      `        ทั้งนี้ มีผลการเรียนเฉลี่ยสะสม (GPA) ${payload.gpa || '3.75'} (${payload.purpose || 'ใช้ประกอบการสมัครศึกษาต่อ / ยืนยันสถานภาพนักเรียน'})`,
      { size: 25, spaceAfter: 140 }
    ),
    makeDocxParagraph(
      `        ให้ไว้ ณ วันที่ ${formatThaiDate(payload.issueDate || new Date().toISOString().slice(0, 10))} (หนังสือรับรองฉบับนี้มีอายุใช้งานชั่วคราวประมาณ ๓๐ วัน นับแต่วันที่ออกหนังสือ)`,
      { size: 24, spaceAfter: 360 }
    ),
    makeDocxParagraph(`ลงชื่อ......................................................`, { align: AlignmentType.RIGHT, size: 24, spaceAfter: 40 }),
    makeDocxParagraph(`(${settings?.director_name || 'ผู้อำนวยการสถานศึกษา'})`, { bold: true, align: AlignmentType.RIGHT, size: 24, spaceAfter: 40 }),
    makeDocxParagraph(`${settings?.director_title || 'ผู้อำนวยการโรงเรียนบ้านหาดเค็ด'}`, { align: AlignmentType.RIGHT, size: 22 }),
  ]);

  await saveDocxFile([section], `ปพ7_ใบรับรอง_${stu.student_code || 'student'}_GoogleDocs.docx`);
}

/* ==========================================================================
 * 5) ปพ.8 — ระเบียนสะสม
 * ========================================================================== */
export async function exportPp8CumulativeDoc({ doc, settings, students = [], format = 'docx' }) {
  const payload = doc.payload || {};
  const stu = students.find((s) => s.id === (doc.student_id || payload.studentId)) || students[0] || {};
  const stuName = getFullStudentName(stu) || '-';
  const yearly = Array.isArray(payload.yearlyGrades) ? payload.yearlyGrades : [];
  const behaviors = Array.isArray(payload.behaviorLogs) ? payload.behaviorLogs : [];

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          รหัสนักเรียน: stu.student_code || '-',
          'ชื่อ - สกุล': stuName,
          ชั้นปัจจุบัน: `${doc.grade_level || stu.grade_level || '-'}/${doc.classroom || '1'}`,
          วันเกิด: payload.birthDate || '-',
          หมู่เลือด: payload.health?.bloodGroup || '-',
          น้ำหนัก_กก: payload.health?.weightKg || '-',
          ส่วนสูง_ซม: payload.health?.heightCm || '-',
          ผู้ปกครอง: payload.guardian?.name || '-',
          เบอร์ติดต่อ: payload.guardian?.phone || '-',
          ความถนัด_ความสนใจ: payload.talent || '-',
        },
      ]),
      '1_ข้อมูลส่วนตัวและสุขภาพ'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(yearly.length ? yearly : [{ ปีการศึกษา: '2569', ชั้น: doc.grade_level || '-', GPA: '-', หมายเหตุ: '-' }]),
      '2_ผลการเรียนรายปี'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(behaviors.length ? behaviors : [{ วันที่: '-', รายการ: 'ยังไม่มีบันทึก', ประเภท: '-' }]),
      '3_พฤติกรรมและความดี'
    );
    XLSX.writeFile(wb, `ปพ8_ระเบียนสะสม_${stu.student_code || 'student'}.xlsx`);
    return;
  }

  const section = buildSectionPage([
    makeDocxParagraph('ปพ.8 — แบบระเบียนสะสมนักเรียน (ประวัตินักเรียนรายบุคคล)', {
      bold: true,
      size: 32,
      align: AlignmentType.CENTER,
      spaceAfter: 60,
    }),
    makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} • ประจำตัวนักเรียน: ${stuName} (${stu.student_code || '-'})`, {
      size: 22,
      align: AlignmentType.CENTER,
      spaceAfter: 120,
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeDocxCell('ข้อมูลส่วนตัว / ที่อยู่', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 20, widthPct: 30 }),
            makeDocxCell(`วันเกิด: ${payload.birthDate || '-'} | ที่อยู่: ${payload.address || '-'}`, { align: AlignmentType.LEFT, size: 20, widthPct: 70 }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('ครอบครัว / ผู้ปกครอง', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 20 }),
            makeDocxCell(`${payload.guardian?.name || '-'} (${payload.guardian?.relation || 'ผู้ปกครอง'}) โทร: ${payload.guardian?.phone || '-'}`, { align: AlignmentType.LEFT, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('สุขภาพ (น้ำหนัก/ส่วนสูง/หมู่เลือด)', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 20 }),
            makeDocxCell(`หมู่เลือด ${payload.health?.bloodGroup || '-'} | น้ำหนัก ${payload.health?.weightKg || '-'} กก. | ส่วนสูง ${payload.health?.heightCm || '-'} ซม. | โรคประจำตัว: ${payload.health?.chronicDisease || 'ไม่มี'}`, { align: AlignmentType.LEFT, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('ความถนัดและความสนใจ', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 20 }),
            makeDocxCell(payload.talent || '-', { align: AlignmentType.LEFT, size: 20 }),
          ],
        }),
      ],
    }),
    makeDocxParagraph('', { spaceAfter: 120 }),
    makeDocxParagraph('ประวัติผลการเรียนรายปี', { bold: true, size: 24, spaceAfter: 60 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeDocxCell('ปีการศึกษา', { bold: true, shading: 'EEF2F9', size: 19 }),
            makeDocxCell('ระดับชั้น', { bold: true, shading: 'EEF2F9', size: 19 }),
            makeDocxCell('GPA เฉลี่ย', { bold: true, shading: 'EEF2F9', size: 19 }),
            makeDocxCell('หมายเหตุ/ผลประเมิน', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 19 }),
          ],
        }),
        ...(yearly.length
          ? yearly.map((y) => new TableRow({ children: [makeDocxCell(y.year, { size: 19 }), makeDocxCell(y.gradeLevel, { size: 19 }), makeDocxCell(y.gpa, { size: 19 }), makeDocxCell(y.remark || '-', { align: AlignmentType.LEFT, size: 19 })] }))
          : [new TableRow({ children: [makeDocxCell('2569', { size: 19 }), makeDocxCell(doc.grade_level || '-', { size: 19 }), makeDocxCell('-', { size: 19 }), makeDocxCell('กำลังศึกษา', { align: AlignmentType.LEFT, size: 19 })] })]),
      ],
    }),
    makeDocxParagraph('', { spaceAfter: 120 }),
    makeDocxParagraph('บันทึกพฤติกรรม ความดี และผลงานเด่น', { bold: true, size: 24, spaceAfter: 60 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeDocxCell('วันที่', { bold: true, shading: 'EEF2F9', size: 19 }),
            makeDocxCell('ประเภท', { bold: true, shading: 'EEF2F9', size: 19 }),
            makeDocxCell('รายละเอียดพฤติกรรม/ความดี', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 19 }),
          ],
        }),
        ...(behaviors.length
          ? behaviors.map((b) => new TableRow({ children: [makeDocxCell(b.date || '-', { size: 19 }), makeDocxCell(b.type || 'ความดีเด่น', { size: 19 }), makeDocxCell(b.detail || '-', { align: AlignmentType.LEFT, size: 19 })] }))
          : [new TableRow({ children: [makeDocxCell('-', { size: 19 }), makeDocxCell('-', { size: 19 }), makeDocxCell('เรียบร้อย มีวินัย ช่วยเหลือกิจกรรมโรงเรียน', { align: AlignmentType.LEFT, size: 19 })] })]),
      ],
    }),
  ]);

  await saveDocxFile([section], `ปพ8_ระเบียนสะสม_${stu.student_code || 'student'}_GoogleDocs.docx`);
}

/* ==========================================================================
 * 6) ปฐมวัย อบ.1 / อบ.2 / อบ.3 (12 มาตรฐาน) และ อบ.1/2/3 (2569 — 33 องค์ประกอบ)
 * ========================================================================== */
export async function exportEarlyChildhoodDoc({ doc, settings, students = [], users = [], format = 'docx' }) {
  const docType = doc.doc_type;
  const is2569 = docType.includes('2569');
  const isOb2 = docType.startsWith('ob2');
  const isOb3 = docType.startsWith('ob3');
  const items = is2569 ? EARLY_CHILDHOOD_2569_COMPONENTS : EARLY_CHILDHOOD_12_STANDARDS;
  const domains = is2569 ? OB2569_DOMAINS : OB12_DOMAINS;

  const gradeLevel = doc.grade_level || 'อ.3';
  const classroom = String(doc.classroom || '1');
  const payload = doc.payload || {};
  const records = payload.studentRecords || payload.records || {};
  const roomStudents = students
    .filter((s) => s.status === 'active' && s.grade_level === gradeLevel && String(s.classroom || '1') === classroom)
    .sort((a, b) => (a.student_number || 0) - (b.student_number || 0));

  const targetStudents =
    isOb2 && doc.student_id
      ? roomStudents.filter((s) => s.id === doc.student_id)
      : roomStudents;
  const effectiveStudents = targetStudents.length ? targetStudents : roomStudents;

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    if (isOb3) {
      const domainRows = domains.map((d) => {
        let l3 = 0;
        let l2 = 0;
        let l1 = 0;
        roomStudents.forEach((stu) => {
          const sum = computeEarlyChildhoodSummary(records[stu.id]?.scores || {}, items, domains);
          const dSum = sum.domainSummaries.find((x) => x.key === d.key);
          if (dSum?.level === 3) l3 += 1;
          else if (dSum?.level === 2) l2 += 1;
          else l1 += 1;
        });
        const total = Math.max(1, roomStudents.length);
        return {
          ด้านพัฒนาการ: d.title,
          จำนวนเด็กทั้งหมด: roomStudents.length,
          'ระดับ 3 (ดีเยี่ยม)': l3,
          'ร้อยละ ระดับ 3': Number(((l3 / total) * 100).toFixed(1)),
          'ระดับ 2 (ดี)': l2,
          'ร้อยละ ระดับ 2': Number(((l2 / total) * 100).toFixed(1)),
          'ระดับ 1 (ควรส่งเสริม)': l1,
          'ร้อยละ ระดับ 1': Number(((l1 / total) * 100).toFixed(1)),
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(domainRows), 'สรุป4ด้าน_อบ3');
    }

    const detailRows = effectiveStudents.map((stu, idx) => {
      const rec = records[stu.id] || {};
      const sum = computeEarlyChildhoodSummary(rec.scores || {}, items, domains);
      const out = {
        ที่: stu.student_number || idx + 1,
        รหัสนักเรียน: stu.student_code,
        'ชื่อ - สกุล': getFullStudentName(stu),
        'น้ำหนัก (กก.)': rec.weightKg || '-',
        'ส่วนสูง (ซม.)': rec.heightCm || '-',
        วันมาเรียน: rec.daysPresent || '-',
        วันเรียนทั้งหมด: rec.daysTotal || '100',
      };
      items.forEach((it) => {
        out[`${it.no}.${it.name || it.title}`] = Number(rec.scores?.[it.key] ?? 3);
      });
      sum.domainSummaries.forEach((ds) => {
        out[`สรุป ${ds.short}`] = ecLevelLabel(ds.level);
      });
      out['ความเห็นครู'] = rec.teacherComment || '-';
      return out;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), is2569 ? 'ข้อมูล_อบ_2569' : 'ข้อมูล_อบ_12มาตรฐาน');
    XLSX.writeFile(wb, `${docType}_${gradeLevel}-${classroom}_ปี${doc.academic_year || settings?.academic_year}.xlsx`);
    return;
  }

  const homeroomName = findHomeroomTeacherName(users, gradeLevel, classroom);
  let sections = [];

  if (isOb2) {
    // อบ.2 / อบ.2 (2569): 1 หน้า = เด็ก 1 คน (สร้างทั้งห้องได้ในคลิกเดียว)
    sections = effectiveStudents.map((stu, idx) => {
      const rec = records[stu.id] || {};
      const sum = computeEarlyChildhoodSummary(rec.scores || {}, items, domains);
      const itemRows = items.map((it) => {
        const lv = Number(rec.scores?.[it.key] ?? 3);
        const labelText = it.name || it.title;
        return new TableRow({
          children: [
            makeDocxCell(it.no, { size: 17 }),
            makeDocxCell(it.behaviorO3 ? `${labelText}\nพฤติกรรม อ.3: ${it.behaviorO3}` : labelText, { align: AlignmentType.LEFT, size: 17 }),
            makeDocxCell(ecLevelLabel(lv), { bold: true, size: 17 }),
          ],
        });
      });

      return buildSectionPage([
        makeDocxParagraph(is2569 ? 'อบ.2 (2569) — สมุดรายงานประจำตัวเด็กปฐมวัย (33 องค์ประกอบ)' : 'อบ.2 — สมุดรายงานประจำตัวเด็กปฐมวัย (12 มาตรฐาน)', {
          bold: true,
          size: 30,
          align: AlignmentType.CENTER,
          spaceAfter: 40,
        }),
        makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} • ชั้น ${gradeLevel}/${classroom} • ปีการศึกษา ${doc.academic_year || settings?.academic_year} ภาคเรียนที่ ${doc.semester || '1'}`, {
          size: 21,
          align: AlignmentType.CENTER,
          spaceAfter: 100,
        }),
        makeDocxParagraph(
          `ชื่อ - สกุล: ${getFullStudentName(stu)} (เลขที่ ${stu.student_number || idx + 1})   |   น้ำหนัก: ${rec.weightKg || '-'} กก.   ส่วนสูง: ${rec.heightCm || '-'} ซม.   มาเรียน: ${rec.daysPresent || '98'}/${rec.daysTotal || '100'} วัน`,
          { bold: true, size: 21, spaceAfter: 80 }
        ),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                makeDocxCell('ข้อ', { bold: true, shading: 'EEF2F9', size: 17, widthPct: 8 }),
                makeDocxCell(is2569 ? 'องค์ประกอบความสามารถ & พฤติกรรมที่สังเกตได้' : 'มาตรฐานคุณลักษณะที่พึงประสงค์', {
                  bold: true,
                  shading: 'EEF2F9',
                  align: AlignmentType.LEFT,
                  size: 17,
                  widthPct: 68,
                }),
                makeDocxCell('ระดับคุณภาพ', { bold: true, shading: 'EEF2F9', size: 17, widthPct: 24 }),
              ],
            }),
            ...itemRows,
          ],
        }),
        makeDocxParagraph('', { spaceAfter: 80 }),
        makeDocxParagraph(`จุดเด่น / ความเห็นครู: ${rec.teacherComment || 'เด็กมีพัฒนาการสมวัย ร่าเริงแจ่มใส กล้าแสดงออก และเล่นร่วมกับเพื่อนได้ดี'}`, {
          size: 20,
          spaceAfter: 60,
        }),
        ...(rec.strengthNote || rec.improveNote
          ? [makeDocxParagraph(`จุดเด่น: ${rec.strengthNote || '-'}   |   จุดควรพัฒนา: ${rec.improveNote || '-'}`, { size: 20, spaceAfter: 80 })]
          : []),
        buildSignatureTable(
          '................................',
          'ผู้ปกครองลงนามรับทราบ',
          homeroomName,
          'ครูประจำชั้นอนุบาล',
          settings?.director_name || 'ผู้อำนวยการสถานศึกษา',
          settings?.director_title || 'ผู้อำนวยการโรงเรียน'
        ),
      ]);
    });
  } else if (isOb3) {
    // อบ.3 / อบ.3 (2569): ตารางสรุปจำนวนและร้อยละ 4 ด้าน + รายข้อ
    const summaryRows = domains.map((d) => {
      let l3 = 0;
      let l2 = 0;
      let l1 = 0;
      roomStudents.forEach((stu) => {
        const sum = computeEarlyChildhoodSummary(records[stu.id]?.scores || {}, items, domains);
        const dSum = sum.domainSummaries.find((x) => x.key === d.key);
        if (dSum?.level === 3) l3 += 1;
        else if (dSum?.level === 2) l2 += 1;
        else l1 += 1;
      });
      const total = Math.max(1, roomStudents.length);
      return new TableRow({
        children: [
          makeDocxCell(d.title, { align: AlignmentType.LEFT, size: 20 }),
          makeDocxCell(roomStudents.length, { size: 20 }),
          makeDocxCell(`${l3} (${((l3 / total) * 100).toFixed(1)}%)`, { size: 20 }),
          makeDocxCell(`${l2} (${((l2 / total) * 100).toFixed(1)}%)`, { size: 20 }),
          makeDocxCell(`${l1} (${((l1 / total) * 100).toFixed(1)}%)`, { size: 20 }),
        ],
      });
    });

    sections = [
      buildSectionPage(
        [
          makeDocxParagraph(is2569 ? `อบ.3 (2569) — แบบสรุปผลการประเมินความสามารถผู้เรียนปฐมวัย ชั้น ${gradeLevel}/${classroom}` : `อบ.3 — สรุปผลการประเมินพัฒนาการระดับชั้น/โรงเรียน ชั้น ${gradeLevel}/${classroom}`, {
            bold: true,
            size: 30,
            align: AlignmentType.CENTER,
            spaceAfter: 60,
          }),
          makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} • ปีการศึกษา ${doc.academic_year || settings?.academic_year} ภาคเรียนที่ ${doc.semester || '1'}`, {
            size: 22,
            align: AlignmentType.CENTER,
            spaceAfter: 120,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeDocxCell('ด้านพัฒนาการ / ความสามารถ', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 20 }),
                  makeDocxCell('จำนวนเด็ก', { bold: true, shading: 'EEF2F9', size: 20 }),
                  makeDocxCell('ระดับ 3 (ดีเยี่ยม)', { bold: true, shading: 'EEF2F9', size: 20 }),
                  makeDocxCell('ระดับ 2 (ดี)', { bold: true, shading: 'EEF2F9', size: 20 }),
                  makeDocxCell('ระดับ 1 (ควรส่งเสริม)', { bold: true, shading: 'EEF2F9', size: 20 }),
                ],
              }),
              ...summaryRows,
            ],
          }),
          makeDocxParagraph('', { spaceAfter: 140 }),
          buildSignatureTable(
            homeroomName,
            'ครูประจำชั้นอนุบาล',
            settings?.academic_head_name || 'หัวหน้าฝ่ายวิชาการ',
            'หัวหน้างานวิชาการ',
            settings?.director_name || 'ผู้อำนวยการสถานศึกษา',
            settings?.director_title || 'ผู้อำนวยการโรงเรียน'
          ),
        ],
        PageOrientation.LANDSCAPE,
        560
      ),
    ];
  } else {
    // อบ.1 / อบ.1 (2569): ตารางประเมินรายห้อง
    const headers = is2569
      ? [
          makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 17 }),
          makeDocxCell('ชื่อ - สกุล', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 17 }),
          ...domains.map((d) => makeDocxCell(d.short, { bold: true, shading: 'EEF2F9', size: 17 })),
          makeDocxCell('เฉลี่ยรวม', { bold: true, shading: 'EEF2F9', size: 17 }),
          makeDocxCell('สรุประดับคุณภาพ', { bold: true, shading: 'EEF2F9', size: 17 }),
        ]
      : [
          makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 16 }),
          makeDocxCell('ชื่อ - สกุล', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 16 }),
          ...items.map((m) => makeDocxCell(`ม.${m.no}`, { bold: true, shading: 'EEF2F9', size: 15 })),
          makeDocxCell('สรุประดับ', { bold: true, shading: 'EEF2F9', size: 16 }),
        ];

    const bodyRows = roomStudents.map((stu, idx) => {
      const rec = records[stu.id] || {};
      const sum = computeEarlyChildhoodSummary(rec.scores || {}, items, domains);
      return new TableRow({
        children: is2569
          ? [
              makeDocxCell(stu.student_number || idx + 1, { size: 17 }),
              makeDocxCell(getFullStudentName(stu), { align: AlignmentType.LEFT, size: 17 }),
              ...sum.domainSummaries.map((ds) => makeDocxCell(`${ds.avg} (${ecLevelLabel(ds.level)})`, { size: 16 })),
              makeDocxCell(sum.avg, { size: 17 }),
              makeDocxCell(ecLevelLabel(sum.level), { bold: true, size: 17 }),
            ]
          : [
              makeDocxCell(stu.student_number || idx + 1, { size: 16 }),
              makeDocxCell(getFullStudentName(stu), { align: AlignmentType.LEFT, size: 16 }),
              ...items.map((m) => makeDocxCell(Number(rec.scores?.[m.key] ?? 3), { size: 16 })),
              makeDocxCell(ecLevelLabel(sum.level), { bold: true, size: 16 }),
            ],
      });
    });

    sections = [
      buildSectionPage(
        [
          makeDocxParagraph(is2569 ? `อบ.1 (2569) — แบบบันทึกผลการประเมินความสามารถผู้เรียนปฐมวัย 4 ด้าน 33 องค์ประกอบ ชั้น ${gradeLevel}/${classroom}` : `อบ.1 — แบบบันทึกผลการประเมินพัฒนาการ 12 มาตรฐาน ชั้น ${gradeLevel}/${classroom}`, {
            bold: true,
            size: 30,
            align: AlignmentType.CENTER,
            spaceAfter: 60,
          }),
          makeDocxParagraph(`${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} • ปีการศึกษา ${doc.academic_year || settings?.academic_year} ภาคเรียนที่ ${doc.semester || '1'}`, {
            size: 22,
            align: AlignmentType.CENTER,
            spaceAfter: 120,
          }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headers }), ...bodyRows] }),
          makeDocxParagraph('', { spaceAfter: 120 }),
          buildSignatureTable(
            homeroomName,
            'ครูประจำชั้นอนุบาล',
            settings?.academic_head_name || 'หัวหน้าฝ่ายวิชาการ',
            'หัวหน้างานวิชาการ',
            settings?.director_name || 'ผู้อำนวยการสถานศึกษา',
            settings?.director_title || 'ผู้อำนวยการโรงเรียน'
          ),
        ],
        PageOrientation.LANDSCAPE,
        540
      ),
    ];
  }

  await saveDocxFile(sections, `${docType}_${gradeLevel}-${classroom}_GoogleDocs.docx`);
}

/* ==========================================================================
 * Unified Dispatcher for Workspace + "เอกสารของฉัน" quick Word/Excel buttons
 * ========================================================================== */
export async function exportAcademicDocument({
  doc,
  typeId,
  format = 'docx',
  settings,
  users = [],
  students = [],
  subjects = [],
  courses = [],
  allScores = [],
  allAttendance = [],
  allCharacteristics = [],
  scoreStructures = [],
  indicators = [],
}) {
  const effectiveType = typeId || doc?.doc_type;
  if (effectiveType === 'pp5_subject' && doc?._courseRef) {
    const course = doc._courseRef;
    const roomStudents = students
      .filter((s) => s.status === 'active' && s.grade_level === course.grade_level && String(s.classroom || '1') === String(course.classroom || '1'))
      .sort((a, b) => (a.student_number || 0) - (b.student_number || 0));
    const teacher = users.find((u) => u.id === course.teacher_id);
    const courseScores = allScores.filter((r) => r.course_id === course.id);
    const courseAtt = allAttendance.filter((r) => r.course_id === course.id);
    const courseTraits = allCharacteristics.filter((r) => r.course_id === course.id);
    const struct = scoreStructures.find((s) => s.course_id === course.id);
    const courseIndicators = indicators.filter((ind) => course.selected_indicator_ids?.includes(ind.id));
    if (format === 'xlsx') {
      exportPp5ToExcel({ course, teacher, settings, students: roomStudents, indicators: courseIndicators, attendanceRecords: courseAtt, scoreStructure: struct, studentScores: courseScores, characteristicsRows: courseTraits });
      return;
    }
    await exportPp5ToDocx({ course, teacher, settings, students: roomStudents, indicators: courseIndicators, attendanceRecords: courseAtt, scoreStructure: struct, studentScores: courseScores, characteristicsRows: courseTraits });
    return;
  }

  if (effectiveType === 'pp5_classroom') {
    const gradeLevel = doc?.grade_level || 'ป.4';
    const classroom = String(doc?.classroom || '1');
    const matrix = buildClassroomMatrix({ students, gradeLevel, classroom, courses, subjects, semester: doc?.semester || '1', allScores, allAttendance, allCharacteristics, scoreStructures });
    const homeroomTeacher = users.find((u) => u.homeroom_class === `${gradeLevel}/${classroom}`);
    if (format === 'xlsx') {
      exportClassroomPp5ToExcel({ settings, gradeLevel, classroom, semester: doc?.semester || '1', homeroomTeacher, matrix });
      return;
    }
    await exportClassroomPp5ToDocx({ settings, gradeLevel, classroom, semester: doc?.semester || '1', homeroomTeacher, matrix });
    return;
  }

  if (effectiveType === 'pp1_transfer_2569') {
    await exportPp1TransferDoc({ doc, settings, students, users, format });
    return;
  }
  if (effectiveType === 'pp4_traits') {
    await exportPp4TraitsDoc({ doc, settings, students, users, format });
    return;
  }
  if (effectiveType === 'pp6_report') {
    await exportPp6ReportDoc({ doc, settings, students, subjects, courses, allScores, allAttendance, allCharacteristics, scoreStructures, users, format });
    return;
  }
  if (effectiveType === 'pp7_certificate') {
    await exportPp7CertificateDoc({ doc, settings, students, format });
    return;
  }
  if (effectiveType === 'pp8_cumulative') {
    await exportPp8CumulativeDoc({ doc, settings, students, format });
    return;
  }
  await exportEarlyChildhoodDoc({ doc, settings, students, users, format });
}

export { GRADE_LEVELS };
