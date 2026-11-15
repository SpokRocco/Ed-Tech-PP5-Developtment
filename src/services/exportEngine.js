import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  HeadingLevel,
  PageBreak,
} from 'docx';
import {
  ATTENDANCE_STATUS,
  LEVEL_LABELS,
  CLASSROOM_ACTIVITY_KEYS,
  getFullStudentName,
} from '../lib/thaiFormatting';
import {
  CAPABILITIES_2568,
  DEFAULT_LEVELS_2568,
  TRAITS_5_2568,
  computePrimary2568Summary,
} from '../data/primary2568Curriculum';
import { DESIRABLE_TRAITS_8, READING_THINKING_WRITING_CRITERIA } from './scoringConfigAdapter';
import { buildCoverSummaryStats, mergeReportLayout } from './reportLayoutAdapter';

/**
 * ============================================================================
 * Export Engine สำหรับเอกสาร ปพ.5 โรงเรียนบ้านหาดเค็ด
 * รองรับ 3 รูปแบบมาตรฐาน:
 * 1. Excel (.xlsx) แยก Sheet ตามโครงสร้าง ปพ.5
 * 2. Word / Google Docs (.docx) ตารางมาตรฐาน ฟอนต์ Sarabun เปิดแก้ไขใน Google Docs ไม่เพี้ยน
 * 3. PDF พร้อมปริ้นขนาด A4 (Portrait / Landscape / Auto แยกตามประเภทหน้า)
 * ============================================================================
 */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1) Export Excel (.xlsx) แยก 5 Sheets
 */
export function exportPp5ToExcel({
  course,
  teacher,
  settings,
  students,
  indicators,
  attendanceRecords,
  scoreStructure,
  computedScoresMap,
  attendanceStatsMap,
  characteristicsMap,
}) {
  const layout = mergeReportLayout(settings?.cover_config, course?.cover_settings);
  const summary = buildCoverSummaryStats(students, computedScoresMap, characteristicsMap);
  const wb = XLSX.utils.book_new();

  // Sheet 1: ปกและสรุปผล
  const coverRows = [
    [layout.documentCode, layout.documentTitle],
    ['สถานศึกษา', settings.school_name],
    ['สังกัด', `${settings.affiliation} (${settings.affiliation_short})`],
    ['ปีการศึกษา / ภาคเรียน', `${course.academic_year} ภาคเรียนที่ ${course.semester}`],
    ['รหัสวิชา / รายวิชา', `${course.subject_code} ${course.subject_name}`],
    ['กลุ่มสาระการเรียนรู้', course.learning_area],
    ['ระดับชั้น / ห้อง', `${course.grade_level}/${course.classroom}`],
    ['หน่วยกิต / เวลาเรียน', `${course.credits} หน่วยกิต (${course.total_hours} ชั่วโมง)`],
    ['ครูผู้สอน', teacher?.full_name || '-'],
    ['ผู้อำนวยการโรงเรียน', settings.director_name],
    [],
    ['ตารางสรุปผลสัมฤทธิ์ทางการเรียน'],
    ['จำนวนนักเรียนทั้งหมด', summary.totalStudents],
    ['ระดับ 4', summary.gradeBuckets['4'], 'ระดับ 3.5', summary.gradeBuckets['3.5'], 'ระดับ 3', summary.gradeBuckets['3'], 'ระดับ 2.5', summary.gradeBuckets['2.5']],
    ['ระดับ 2', summary.gradeBuckets['2'], 'ระดับ 1.5', summary.gradeBuckets['1.5'], 'ระดับ 1', summary.gradeBuckets['1'], 'ระดับ 0', summary.gradeBuckets['0']],
    ['ร (รอการตัดสิน)', summary.gradeBuckets['ร'], 'มส (ไม่มีสิทธิ์สอบ)', summary.gradeBuckets['มส'], 'ร้อยละระดับ 3 ขึ้นไป', `${summary.goodAndAbovePct}%`],
    [],
    [layout.footerCredit],
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(coverRows);
  wsCover['!cols'] = [{ wch: 26 }, { wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsCover, '1_ปกและสรุปผล');

  // Sheet 2: เวลาเรียน
  const uniqueSessions = Array.from(
    new Map(
      attendanceRecords.map((r) => [`${r.session_date}#${r.period_number}`, { date: r.session_date, period: r.period_number }])
    ).values()
  ).sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);

  const attLookup = new Map(
    attendanceRecords.map((r) => [`${r.student_id}|${r.session_date}#${r.period_number}`, r.status])
  );

  const attData = students.map((stu, idx) => {
    const row = {
      เลขที่: stu.student_number || idx + 1,
      รหัสนักเรียน: stu.student_code,
      'ชื่อ-สกุล': getFullStudentName(stu),
    };
    uniqueSessions.forEach((s) => {
      const st = attLookup.get(`${stu.id}|${s.date}#${s.period}`) || 'present';
      row[`${s.date} (ค.${s.period})`] = ATTENDANCE_STATUS[st]?.code || '/';
    });
    const stat = attendanceStatsMap[stu.id] || { totalRecorded: 0, attendedPeriods: 0, attendancePct: 100, statusLabel: 'มีสิทธิ์สอบ' };
    row['มาเรียน(คาบ)'] = stat.attendedPeriods;
    row['คาบทั้งหมด'] = stat.totalRecorded;
    row['ร้อยละเวลาเรียน'] = `${stat.attendancePct}%`;
    row['สิทธิ์สอบ'] = stat.statusLabel;
    return row;
  });
  const wsAtt = XLSX.utils.json_to_sheet(attData);
  XLSX.utils.book_append_sheet(wb, wsAtt, '2_เวลาเรียน');

  // Sheet 3: คะแนนเก็บและตัวชี้วัด
  const units = scoreStructure?.units || [];
  const scoreRows = students.map((stu, idx) => {
    const computed = computedScoresMap[stu.id] || {};
    const row = {
      เลขที่: stu.student_number || idx + 1,
      รหัสนักเรียน: stu.student_code,
      'ชื่อ-สกุล': getFullStudentName(stu),
    };
    units.forEach((u) => {
      row[`${u.name} (${u.maxScore})`] = computed.unitScores?.[u.id] ?? 0;
    });
    row[`รวมระหว่างภาค (${scoreStructure?.formative_ratio ?? 60})`] = computed.formativeTotal ?? 0;
    row[`กลางภาค (${scoreStructure?.midterm_ratio ?? 20})`] = computed.midtermTotal ?? 0;
    row[`ปลายภาค (${scoreStructure?.final_ratio ?? 20})`] = computed.finalTotal ?? 0;
    row['รวมสุทธิ (100)'] = computed.totalScore ?? 0;
    row['ผลการเรียน'] = computed.grade ?? '0';
    return row;
  });
  const wsScores = XLSX.utils.json_to_sheet(scoreRows);
  XLSX.utils.book_append_sheet(wb, wsScores, '3_คะแนนและตัดเกรด');

  // Sheet 4: คุณลักษณะฯ และ อ่าน คิดวิเคราะห์ เขียน
  const charRows = students.map((stu, idx) => {
    const ch = characteristicsMap[stu.id] || {};
    const row = {
      เลขที่: stu.student_number || idx + 1,
      รหัสนักเรียน: stu.student_code,
      'ชื่อ-สกุล': getFullStudentName(stu),
    };
    DESIRABLE_TRAITS_8.forEach((t) => {
      row[`คุณลักษณะ ${t.code}.${t.name}`] = ch.traits?.[t.key] ?? 3;
    });
    row['สรุปคุณลักษณะฯ'] = LEVEL_LABELS[ch.traits_level ?? 3]?.label || 'ดีเยี่ยม';
    READING_THINKING_WRITING_CRITERIA.forEach((r) => {
      row[`อ่านคิดเขียน ${r.code}.${r.name}`] = ch.reading_thinking_writing?.[r.key] ?? 3;
    });
    row['สรุปอ่านคิดเขียน'] = LEVEL_LABELS[ch.rtw_level ?? 3]?.label || 'ดีเยี่ยม';
    return row;
  });
  const wsChar = XLSX.utils.json_to_sheet(charRows);
  XLSX.utils.book_append_sheet(wb, wsChar, '4_คุณลักษณะและอ่านคิดเขียน');

  // Sheet 5: โครงสร้างมาตรฐานตัวชี้วัด (รองรับข้อความบรรทัดละ 1 ตัวชี้วัดจากเล่ม ปพ.5)
  const customLines = (course?.custom_indicators_text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const indRows =
    customLines.length > 0
      ? customLines.map((line, i) => ({
          ลำดับ: i + 1,
          สถานะชุดตัวชี้วัด: course.indicators_status === 'confirmed' ? 'ยืนยันแล้ว' : 'ตัวอย่าง',
          รายการตัวชี้วัด_ผลการเรียนรู้: line,
        }))
      : indicators.map((ind) => ({
          รหัสตัวชี้วัด: ind.indicator_code,
          กลุ่มสาระฯ: ind.learning_area,
          มาตรฐาน: `${ind.standard_code} ${ind.standard_text}`,
          ประเภทตัวชี้วัด: ind.indicator_type,
          คำอธิบายตัวชี้วัด: ind.indicator_text,
        }));
  const wsInd = XLSX.utils.json_to_sheet(indRows.length ? indRows : [{ หมายเหตุ: 'ยังไม่มีข้อมูลตัวชี้วัด' }]);
  XLSX.utils.book_append_sheet(wb, wsInd, '5_มาตรฐานตัวชี้วัด');

  const safeCode = `${course.subject_code}_${course.grade_level}-${course.classroom}`.replace(/[^\wก-๙.-]/g, '_');
  XLSX.writeFile(wb, `ปพ5_${safeCode}_ปี${course.academic_year}.xlsx`);
}

/**
 * 2) Export Word / Google Docs (.docx)
 */
const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '475569' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '475569' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '475569' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '475569' },
};

export function makeDocxCell(text, { bold = false, align = AlignmentType.CENTER, shading = undefined, size = 24, widthPct = undefined } = {}) {
  return new TableCell({
    borders: thinBorder,
    shading: shading ? { fill: shading } : undefined,
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: String(text ?? ''),
            bold,
            size, // half-points (24 = 12pt)
            font: 'Sarabun',
          }),
        ],
      }),
    ],
  });
}

export function makeDocxParagraph(text, { bold = false, size = 28, align = AlignmentType.LEFT, spaceAfter = 100 } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after: spaceAfter },
    children: [
      new TextRun({
        text: String(text ?? ''),
        bold,
        size,
        font: 'Sarabun',
      }),
    ],
  });
}

export async function exportPp5ToDocx({
  course,
  teacher,
  settings,
  students,
  indicators,
  scoreStructure,
  computedScoresMap,
  attendanceStatsMap,
  characteristicsMap,
}) {
  const layout = mergeReportLayout(settings?.cover_config, course?.cover_settings);
  const summary = buildCoverSummaryStats(students, computedScoresMap, characteristicsMap);

  // Portrait Section: Cover + Summary + Indicators
  const coverChildren = [
    makeDocxParagraph(layout.documentCode, { bold: true, size: 44, align: AlignmentType.CENTER, spaceAfter: 60 }),
    makeDocxParagraph(layout.documentTitle, { bold: true, size: 34, align: AlignmentType.CENTER, spaceAfter: 60 }),
    makeDocxParagraph(layout.subtitle, { size: 24, align: AlignmentType.CENTER, spaceAfter: 160 }),
    makeDocxParagraph(`${settings.school_name} • ${settings.affiliation}`, { bold: true, size: 28, align: AlignmentType.CENTER, spaceAfter: 200 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeDocxCell('รหัสวิชา / รายวิชา', { bold: true, align: AlignmentType.LEFT, shading: 'EEF2F9', widthPct: 35 }),
            makeDocxCell(`${course.subject_code} ${course.subject_name}`, { align: AlignmentType.LEFT, widthPct: 65 }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('กลุ่มสาระการเรียนรู้', { bold: true, align: AlignmentType.LEFT, shading: 'EEF2F9' }),
            makeDocxCell(course.learning_area, { align: AlignmentType.LEFT }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('ระดับชั้น / ปีการศึกษา', { bold: true, align: AlignmentType.LEFT, shading: 'EEF2F9' }),
            makeDocxCell(`${course.grade_level}/${course.classroom} • ปีการศึกษา ${course.academic_year} ภาคเรียนที่ ${course.semester}`, { align: AlignmentType.LEFT }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('หน่วยกิต / เวลาเรียน', { bold: true, align: AlignmentType.LEFT, shading: 'EEF2F9' }),
            makeDocxCell(`${course.credits} หน่วยกิต (${course.total_hours} ชั่วโมง)`, { align: AlignmentType.LEFT }),
          ],
        }),
        new TableRow({
          children: [
            makeDocxCell('ครูผู้สอน', { bold: true, align: AlignmentType.LEFT, shading: 'EEF2F9' }),
            makeDocxCell(`${teacher?.full_name || '-'} (${teacher?.academic_standing || teacher?.position || 'ครู'})`, { align: AlignmentType.LEFT }),
          ],
        }),
      ],
    }),

    makeDocxParagraph('', { spaceAfter: 160 }),
    makeDocxParagraph('ตารางสรุปผลสัมฤทธิ์ทางการเรียน', { bold: true, size: 28, spaceAfter: 80 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ['ทั้งหมด', '4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].map((h) =>
            makeDocxCell(h, { bold: true, shading: '0F2557', size: 22 })
          ),
        }),
        new TableRow({
          children: [
            summary.totalStudents,
            summary.gradeBuckets['4'],
            summary.gradeBuckets['3.5'],
            summary.gradeBuckets['3'],
            summary.gradeBuckets['2.5'],
            summary.gradeBuckets['2'],
            summary.gradeBuckets['1.5'],
            summary.gradeBuckets['1'],
            summary.gradeBuckets['0'],
            summary.gradeBuckets['ร'],
            summary.gradeBuckets['มส'],
          ].map((val) => makeDocxCell(val, { size: 22 })),
        }),
      ],
    }),

    makeDocxParagraph('', { spaceAfter: 200 }),
    makeDocxParagraph(layout.signatures.approvalStatement, { bold: true, size: 24, spaceAfter: 220 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeDocxCell(`ลงชื่อ........................................\n(${teacher?.full_name || 'ครูผู้สอน'})\n${layout.signatures.teacherLabel}`, { size: 22 }),
            makeDocxCell(`ลงชื่อ........................................\n(${settings.academic_head_name || 'หัวหน้าวิชาการ'})\n${layout.signatures.academicHeadLabel}`, { size: 22 }),
            makeDocxCell(`ลงชื่อ........................................\n(${settings.director_name})\n${settings.director_title}`, { size: 22 }),
          ],
        }),
      ],
    }),

    new Paragraph({ children: [new PageBreak()] }),
    makeDocxParagraph(
      `ตัวชี้วัดและผลการเรียนรู้ประจำรายวิชา: ${course.subject_code} ${course.subject_name} (${course.indicators_status === 'confirmed' ? 'ยืนยันแล้ว' : 'ตัวอย่าง'})`,
      { bold: true, size: 28, spaceAfter: 100 }
    ),
    ...(() => {
      const customLines = (course?.custom_indicators_text || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const rows =
        customLines.length > 0
          ? [
              new TableRow({
                children: [
                  makeDocxCell('ข้อที่', { bold: true, shading: 'EEF2F9', widthPct: 12 }),
                  makeDocxCell('รายละเอียดตัวชี้วัด / ผลการเรียนรู้ (บรรทัดละ 1 ข้อ)', {
                    bold: true,
                    shading: 'EEF2F9',
                    align: AlignmentType.LEFT,
                    widthPct: 88,
                  }),
                ],
              }),
              ...customLines.map(
                (line, idx) =>
                  new TableRow({
                    children: [
                      makeDocxCell(idx + 1, { bold: true, size: 22 }),
                      makeDocxCell(line, { align: AlignmentType.LEFT, size: 22 }),
                    ],
                  })
              ),
            ]
          : [
              new TableRow({
                children: [
                  makeDocxCell('รหัสตัวชี้วัด', { bold: true, shading: 'EEF2F9', widthPct: 18 }),
                  makeDocxCell('ประเภท', { bold: true, shading: 'EEF2F9', widthPct: 22 }),
                  makeDocxCell('รายละเอียดมาตรฐานและตัวชี้วัด', { bold: true, shading: 'EEF2F9', widthPct: 60 }),
                ],
              }),
              ...(indicators.length > 0
                ? indicators.map(
                    (ind) =>
                      new TableRow({
                        children: [
                          makeDocxCell(ind.indicator_code, { bold: true, size: 22 }),
                          makeDocxCell(ind.indicator_type, { size: 22 }),
                          makeDocxCell(ind.indicator_text, { align: AlignmentType.LEFT, size: 22 }),
                        ],
                      })
                  )
                : [
                    new TableRow({
                      children: [
                        makeDocxCell('-', { size: 22 }),
                        makeDocxCell('-', { size: 22 }),
                        makeDocxCell('ยังไม่ได้ระบุตัวชี้วัดรายวิชา', { align: AlignmentType.LEFT, size: 22 }),
                      ],
                    }),
                  ]),
            ];
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }),
      ];
    })(),
  ];

  // Landscape Section: Score & Attendance & Characteristics Table
  const units = scoreStructure?.units || [];
  const scoreHeaderCells = [
    makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 20 }),
    makeDocxCell('รหัส', { bold: true, shading: 'EEF2F9', size: 20 }),
    makeDocxCell('ชื่อ - สกุล', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 20 }),
    makeDocxCell('เวลาเรียน(%)', { bold: true, shading: 'EEF2F9', size: 20 }),
    ...units.map((u) => makeDocxCell(`${u.name}\n(${u.maxScore})`, { bold: true, shading: 'EEF2F9', size: 18 })),
    makeDocxCell('รวม\n(100)', { bold: true, shading: 'EEF2F9', size: 20 }),
    makeDocxCell('เกรด', { bold: true, shading: 'EEF2F9', size: 20 }),
    makeDocxCell('คุณลักษณะฯ', { bold: true, shading: 'EEF2F9', size: 20 }),
    makeDocxCell('อ่านคิดเขียน', { bold: true, shading: 'EEF2F9', size: 20 }),
  ];

  const scoreBodyRows = students.map((stu, idx) => {
    const computed = computedScoresMap[stu.id] || {};
    const att = attendanceStatsMap[stu.id] || { attendancePct: 100 };
    const ch = characteristicsMap[stu.id] || {};
    return new TableRow({
      children: [
        makeDocxCell(stu.student_number || idx + 1, { size: 20 }),
        makeDocxCell(stu.student_code, { size: 20 }),
        makeDocxCell(getFullStudentName(stu), { align: AlignmentType.LEFT, size: 20 }),
        makeDocxCell(`${att.attendancePct}%`, { size: 20 }),
        ...units.map((u) => makeDocxCell(computed.unitScores?.[u.id] ?? 0, { size: 20 })),
        makeDocxCell(computed.totalScore ?? 0, { bold: true, size: 20 }),
        makeDocxCell(computed.grade ?? '0', { bold: true, size: 20 }),
        makeDocxCell(LEVEL_LABELS[ch.traits_level ?? 3]?.label || 'ดีเยี่ยม', { size: 20 }),
        makeDocxCell(LEVEL_LABELS[ch.rtw_level ?? 3]?.label || 'ดีเยี่ยม', { size: 20 }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: coverChildren,
      },
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 560, bottom: 560, left: 560, right: 560 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: `ตารางบันทึกเวลาเรียน คะแนน และผลการประเมิน — ${course.subject_code} ${course.subject_name} (${course.grade_level}/${course.classroom})`,
                bold: true,
                size: 26,
                font: 'Sarabun',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: scoreHeaderCells }),
              ...scoreBodyRows,
            ],
          }),
          makeDocxParagraph('', { spaceAfter: 120 }),
          makeDocxParagraph(layout.footerCredit, { size: 20, align: AlignmentType.CENTER }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeCode = `${course.subject_code}_${course.grade_level}-${course.classroom}`.replace(/[^\wก-๙.-]/g, '_');
  downloadBlob(blob, `ปพ5_${safeCode}_GoogleDocs.docx`);
}

/**
 * 3) Export Print-Ready PDF (A4 Portrait / Landscape / Auto per page)
 * จับภาพ DOM หน้า A4 ที่จัดด้วยฟอนต์ Sarabun เพื่อให้ภาษาไทยคมชัดสระไม่ลอย
 */
export async function exportA4PagesToPdf(pageElements = [], filename = 'ปพ5_โรงเรียนบ้านหาดเค็ด.pdf') {
  if (!pageElements.length) {
    throw new Error('ไม่พบหน้าเอกสารสำหรับสร้างไฟล์ PDF');
  }

  let pdf = null;

  for (let i = 0; i < pageElements.length; i += 1) {
    const el = pageElements[i];
    const orientation = el.dataset.orientation === 'landscape' ? 'landscape' : 'portrait';
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    if (i === 0) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    } else {
      pdf.addPage('a4', orientation);
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgRatio = canvas.width / canvas.height;
    let renderWidth = pageWidth;
    let renderHeight = pageWidth / imgRatio;

    if (renderHeight > pageHeight) {
      renderHeight = pageHeight;
      renderWidth = pageHeight * imgRatio;
    }

    const offsetX = (pageWidth - renderWidth) / 2;
    const offsetY = (pageHeight - renderHeight) / 2;
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight);
  }

  pdf.save(filename);
}

/**
 * ============================================================================
 * 4) Export ปพ.5 รายชั้นเรียน (.xlsx & .docx Google Docs)
 * ============================================================================
 */
export function exportClassroomPp5ToExcel({
  settings,
  gradeLevel,
  classroom,
  homeroomTeacher,
  matrix,
}) {
  const wb = XLSX.utils.book_new();
  const { roomCourses, studentRows, subjectSummaries } = matrix;

  // Sheet 1: ตารางสรุปผลการเรียนรายห้อง (รายชื่อ x คะแนนและเกรดทุกรายวิชา + รวม/ร้อยละ/GPA/ลำดับ ตรงตามชีท "เกรด")
  const mainRows = studentRows.map((row) => {
    const out = {
      เลขที่: row.no,
      รหัสนักเรียน: row.student.student_code,
      'ชื่อ - สกุล': getFullStudentName(row.student),
    };
    roomCourses.forEach((c) => {
      const sg = row.subjectGrades[c.id];
      out[`${c.subject_code} คะแนน`] = sg?.totalScore ?? '-';
      out[`${c.subject_code} เกรด (${c.credits})`] = sg?.grade ?? '-';
    });
    out['คะแนนรวมทุกกลุ่มสาระ'] = row.totalRawScore ?? 0;
    out['คะแนนเต็มรวม'] = row.totalMaxScore ?? 0;
    out['ร้อยละ (%)'] = `${row.scorePercentage ?? 0}%`;
    out['หน่วยกิตรวม'] = row.totalCredits;
    out['ผลการเรียนเฉลี่ย (GPA)'] = row.gpa.toFixed(2);
    out['ลำดับที่'] = row.rank;
    out['เวลาเรียน (%)'] = `${row.attendancePct}%`;
    out['อ่านคิดวิเคราะห์'] = LEVEL_LABELS[row.rtwLevel]?.label || 'ดีเยี่ยม';
    out['คุณลักษณะฯ'] = LEVEL_LABELS[row.traitsLevel]?.label || 'ดีเยี่ยม';
    CLASSROOM_ACTIVITY_KEYS.forEach((act) => {
      out[`กิจกรรม:${act.label}`] = row.activities[act.key] || 'ผ';
    });
    out['ระบบเสนอ'] = row.proposedDecision;
    out['ครูยืนยันผลการตัดสิน'] = row.confirmedDecision;
    return out;
  });
  const wsMain = XLSX.utils.json_to_sheet(
    mainRows.length ? mainRows : [{ หมายเหตุ: 'ยังไม่มีข้อมูลนักเรียนหรือรายวิชาในชั้นนี้' }]
  );
  XLSX.utils.book_append_sheet(wb, wsMain, '1_สรุปรายชั้นเรียน');

  // Sheet 2: สถานะความครบ 100% & สรุปผลสัมฤทธิ์แยกรายวิชา
  const subRows = subjectSummaries.map((item) => ({
    รหัสวิชา: item.course.subject_code,
    รายวิชา: item.course.subject_name,
    ประเภท: item.course.subject_type || 'พื้นฐาน',
    ภาคเรียน: item.course.semester || '1',
    กลุ่มสาระฯ: item.course.learning_area,
    หน่วยกิต: item.course.credits,
    'ความคืบหน้าบันทึกผล (%)': `${item.completion?.pct ?? 0}%`,
    'สถานะ 100%': item.completion?.isComplete ? 'ครบ 100% พร้อมดึงผล' : 'ยังไม่ครบ',
    'รายการคงค้าง': (item.completion?.missingItems || []).join(', ') || '-',
    'คะแนนเฉลี่ย': item.avgScore ?? '-',
    '4': item.buckets['4'],
    '3.5': item.buckets['3.5'],
    '3': item.buckets['3'],
    '2.5': item.buckets['2.5'],
    '2': item.buckets['2'],
    '1.5': item.buckets['1.5'],
    '1': item.buckets['1'],
    '0': item.buckets['0'],
    'ร': item.buckets['ร'],
    'มส': item.buckets['มส'],
    'ร้อยละ 3 ขึ้นไป': `${item.threePlusPct}%`,
  }));
  const wsSub = XLSX.utils.json_to_sheet(subRows.length ? subRows : [{ หมายเหตุ: 'ยังไม่มีรายวิชา' }]);
  XLSX.utils.book_append_sheet(wb, wsSub, '2_สถานะ100%และสรุปวิชา');

  XLSX.writeFile(wb, `ปพ5_รายชั้น_${gradeLevel}-${classroom}_ปี${settings.academic_year}.xlsx`);
}

export async function exportClassroomPp5ToDocx({
  settings,
  gradeLevel,
  classroom,
  homeroomTeacher,
  matrix,
}) {
  const { roomCourses, studentRows, subjectSummaries } = matrix;
  const headerCells = [
    makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('ชื่อ - สกุล', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 18 }),
    ...roomCourses.map((c) => makeDocxCell(`${c.subject_code}\n(${c.credits})`, { bold: true, shading: 'EEF2F9', size: 16 })),
    makeDocxCell('GPA', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('ลำดับ', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('เวลา(%)', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('อ่านคิดฯ', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('คุณลักษณะ', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('กิจกรรม', { bold: true, shading: 'EEF2F9', size: 18 }),
    makeDocxCell('ผลการตัดสิน', { bold: true, shading: 'EEF2F9', size: 18 }),
  ];

  const bodyRows = studentRows.map(
    (row) =>
      new TableRow({
        children: [
          makeDocxCell(row.no, { size: 18 }),
          makeDocxCell(getFullStudentName(row.student), { align: AlignmentType.LEFT, size: 18 }),
          ...roomCourses.map((c) => makeDocxCell(row.subjectGrades[c.id]?.grade ?? '-', { size: 18 })),
          makeDocxCell(row.gpa.toFixed(2), { bold: true, size: 18 }),
          makeDocxCell(row.rank, { size: 18 }),
          makeDocxCell(`${row.attendancePct}%`, { size: 18 }),
          makeDocxCell(LEVEL_LABELS[row.rtwLevel]?.label || 'ดีเยี่ยม', { size: 18 }),
          makeDocxCell(LEVEL_LABELS[row.traitsLevel]?.label || 'ดีเยี่ยม', { size: 18 }),
          makeDocxCell(row.activitiesPass ? 'ผ่าน' : 'มผ', { size: 18 }),
          makeDocxCell(row.confirmedDecision, { bold: true, size: 16 }),
        ],
      })
  );

  const subHeader = ['รหัสวิชา', 'ชื่อวิชา', 'นก.', '4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส', '%3+'].map(
    (h) => makeDocxCell(h, { bold: true, shading: '0F2557', size: 18 })
  );
  const subBody = subjectSummaries.map(
    (s) =>
      new TableRow({
        children: [
          makeDocxCell(s.course.subject_code, { size: 18 }),
          makeDocxCell(s.course.subject_name, { align: AlignmentType.LEFT, size: 18 }),
          makeDocxCell(s.course.credits, { size: 18 }),
          makeDocxCell(s.buckets['4'], { size: 18 }),
          makeDocxCell(s.buckets['3.5'], { size: 18 }),
          makeDocxCell(s.buckets['3'], { size: 18 }),
          makeDocxCell(s.buckets['2.5'], { size: 18 }),
          makeDocxCell(s.buckets['2'], { size: 18 }),
          makeDocxCell(s.buckets['1.5'], { size: 18 }),
          makeDocxCell(s.buckets['1'], { size: 18 }),
          makeDocxCell(s.buckets['0'], { size: 18 }),
          makeDocxCell(s.buckets['ร'], { size: 18 }),
          makeDocxCell(s.buckets['มส'], { size: 18 }),
          makeDocxCell(`${s.threePlusPct}%`, { bold: true, size: 18 }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 560, bottom: 560, left: 560, right: 560 },
          },
        },
        children: [
          makeDocxParagraph(`ปพ.5 รายชั้นเรียน — แบบสรุปผลการเรียนประจำชั้น ${gradeLevel}/${classroom}`, {
            bold: true,
            size: 32,
            align: AlignmentType.CENTER,
            spaceAfter: 60,
          }),
          makeDocxParagraph(
            `${settings.school_name} (${settings.affiliation_short}) • ปีการศึกษา ${settings.academic_year} ภาคเรียนที่ ${settings.semester} • ครูประจำชั้น: ${homeroomTeacher?.full_name || '-'}`,
            { size: 22, align: AlignmentType.CENTER, spaceAfter: 140 }
          ),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: headerCells }), ...bodyRows],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          makeDocxParagraph(`สรุปผลการเรียนแยกรายวิชาและการลงนามอนุมัติ ชั้น ${gradeLevel}/${classroom}`, {
            bold: true,
            size: 28,
            spaceAfter: 100,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: subHeader }), ...subBody],
          }),
          makeDocxParagraph('', { spaceAfter: 180 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeDocxCell(`ลงชื่อ........................................\n(${homeroomTeacher?.full_name || 'ครูประจำชั้น'})\nครูประจำชั้น ${gradeLevel}/${classroom}`, { size: 20 }),
                  makeDocxCell(`ลงชื่อ........................................\n(${settings.academic_head_name || 'หัวหน้าวิชาการ'})\nหัวหน้ากลุ่มบริหารงานวิชาการ`, { size: 20 }),
                  makeDocxCell(`ลงชื่อ........................................\n(${settings.director_name})\n${settings.director_title}`, { size: 20 }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `ปพ5_รายชั้น_${gradeLevel}-${classroom}_GoogleDocs.docx`);
}

/**
 * ส่งออกใบรายงานผลการเรียนรายบุคคล (.xlsx) ตามต้นแบบโรงเรียนบ้านหาดเค็ดในโฟลเดอร์ ref/
 */
export function exportIndividualStudentReportToExcel({
  settings,
  gradeLevel,
  classroom,
  semester = '1',
  homeroomTeacher,
  matrix,
  studentRow,
  annualCard = null,
}) {
  if (!studentRow) return;
  const wb = XLSX.utils.book_new();
  const isPrimary = /^ป\./.test(gradeLevel || '');
  const stuName = getFullStudentName(studentRow.student);
  const aoa = [
    [`รายงานผลการเรียน ${settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'}`],
    [`${settings?.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1'}`],
    [
      `ชั้น ${gradeLevel}/${classroom}`,
      `ปีการศึกษา ${settings?.academic_year || '2569'}`,
      semester === 'all' ? 'สรุปผลตลอดปีการศึกษา' : `ภาคเรียนที่ ${semester}`,
    ],
    [`เลขที่ ${studentRow.no}`, `รหัสนักเรียน ${studentRow.student.student_code}`, `ชื่อ - สกุล: ${stuName}`],
    [],
  ];

  if (isPrimary && annualCard) {
    aoa.push([
      'รหัส',
      'กลุ่มสาระการเรียนรู้ / รายวิชา',
      'ประเภท',
      'ชั่วโมง/ภาค',
      'เทอม 1 คะแนน',
      'เทอม 1 ระดับ',
      'เทอม 2 คะแนน',
      'เทอม 2 ระดับ',
      'เฉลี่ยทั้งปี',
      'ระดับทั้งปี',
    ]);
    annualCard.rows.forEach((r) => {
      aoa.push([
        r.subject_code,
        r.subject_name,
        r.subject_type,
        r.hours_per_semester,
        r.term1Score ?? '-',
        r.term1Grade,
        r.term2Score ?? '-',
        r.term2Grade,
        r.yearAvgScore ?? '-',
        r.yearGrade,
      ]);
    });
    aoa.push([
      '',
      'รวมชั่วโมงเรียนและผลการเรียนเฉลี่ย (GPA)',
      '',
      annualCard.rows.reduce((s, r) => s + Number(r.hours_per_semester || 0), 0),
      'GPA เทอม 1',
      annualCard.term1Gpa > 0 ? annualCard.term1Gpa.toFixed(2) : '-',
      'GPA เทอม 2',
      annualCard.term2Gpa > 0 ? annualCard.term2Gpa.toFixed(2) : '-',
      'GPA ทั้งปี',
      annualCard.yearGpa > 0 ? annualCard.yearGpa.toFixed(2) : '-',
    ]);
  } else {
    const roomCourses = matrix?.roomCourses || [];
    const basicCourses = roomCourses.filter((c) => (c.subject_type || 'พื้นฐาน') === 'พื้นฐาน');
    const addCourses = roomCourses.filter((c) => c.subject_type === 'เพิ่มเติม');
    aoa.push(['รหัสวิชา', 'รายชื่อวิชา', 'น้ำหนัก (นก.)', 'คะแนนเต็ม', 'คะแนนที่ได้', 'ระดับผลการเรียน', 'หมายเหตุ']);
    aoa.push(['รายวิชาพื้นฐาน']);
    basicCourses.forEach((c) => {
      const sg = studentRow.subjectGrades[c.id] || {};
      aoa.push([
        c.subject_code,
        c.subject_name,
        Number(c.credits || 1),
        100,
        sg.totalScore ?? '-',
        sg.grade ?? '-',
        sg.grade === 'ร' || sg.grade === 'มส' ? 'รอแก้ไข' : '',
      ]);
    });
    if (addCourses.length > 0) {
      aoa.push(['รายวิชาเพิ่มเติม']);
      addCourses.forEach((c) => {
        const sg = studentRow.subjectGrades[c.id] || {};
        aoa.push([
          c.subject_code,
          c.subject_name,
          Number(c.credits || 1),
          100,
          sg.totalScore ?? '-',
          sg.grade ?? '-',
          sg.grade === 'ร' || sg.grade === 'มส' ? 'รอแก้ไข' : '',
        ]);
      });
    }
    aoa.push([
      '',
      `หน่วยกิตรวม / คะแนนรวม (${studentRow.scorePercentage}%) / เกรดเฉลี่ย / ลำดับที่`,
      studentRow.totalCredits,
      studentRow.totalMaxScore || '-',
      studentRow.totalRawScore || '-',
      studentRow.gpa.toFixed(2),
      `ลำดับที่ ${studentRow.rank}`,
    ]);
  }

  aoa.push([]);
  aoa.push([
    'เวลาเรียน (%)',
    `${studentRow.attendancePct}%`,
    'อ่าน คิดวิเคราะห์ เขียน',
    LEVEL_LABELS[studentRow.rtwLevel]?.label || 'ดีเยี่ยม',
    'คุณลักษณะอันพึงประสงค์',
    LEVEL_LABELS[studentRow.traitsLevel]?.label || 'ดีเยี่ยม',
  ]);
  aoa.push([
    '1. กิจกรรมแนะแนว (40 ชม.)',
    studentRow.activities?.guidance === 'มผ' ? 'มผ' : 'ผ',
    '2. กิจกรรมลูกเสือ (40 ชม.)',
    studentRow.activities?.scout === 'มผ' ? 'มผ' : 'ผ',
    '3. กิจกรรมชุมนุม (40 ชม.)',
    studentRow.activities?.club === 'มผ' ? 'มผ' : 'ผ',
  ]);
  aoa.push(['ผลการตัดสิน', studentRow.confirmedDecision]);
  aoa.push([]);
  aoa.push([
    `ครูประจำชั้น: ${homeroomTeacher?.full_name || '-'}`,
    '',
    '',
    `ผู้อำนวยการ: ${settings?.director_name || 'นายเอกชัย สุภา'}`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'ใบรายงานผล');
  XLSX.writeFile(wb, `รายงานผลการเรียน_${gradeLevel}-${classroom}_เลขที่${studentRow.no}.xlsx`);
}

/**
 * ============================================================================
 * 5) Export ปพ.5 ป.1-3 (2568) & ปพ.6 รายบุคคล (.xlsx & .docx)
 *    หลักสูตรประถมศึกษาตอนต้น พ.ศ. 2568 (ไม่มีคะแนนตัวเลข/เกรด 0-4)
 * ============================================================================
 */
export function exportPrimary2568ToExcel({
  settings,
  gradeLevel,
  classroom,
  rows,
  levelLabels = DEFAULT_LEVELS_2568,
}) {
  const wb = XLSX.utils.book_new();
  const data = rows.map(({ student, assessment }, idx) => {
    const sum = computePrimary2568Summary(assessment);
    const out = {
      เลขที่: student.student_number || idx + 1,
      รหัสนักเรียน: student.student_code,
      'ชื่อ - สกุล': getFullStudentName(student),
    };
    CAPABILITIES_2568.forEach((cap) => {
      const lv = Number(assessment.capabilities?.[cap.key] ?? 3);
      out[`ความสามารถ ${cap.no}.${cap.shortName}`] = `ระดับ ${lv} (${levelLabels[lv]?.label || DEFAULT_LEVELS_2568[lv]?.label})`;
    });
    TRAITS_5_2568.forEach((t) => {
      out[`คุณลักษณะ ${t.no}.${t.label}`] = assessment.traits_5?.[t.key] !== false ? 'ผ่าน' : 'ไม่ผ่าน';
    });
    out['กิจกรรมพัฒนาผู้เรียน'] = assessment.activities_pass !== false ? 'ผ่าน' : 'ไม่ผ่าน';
    if (gradeLevel === 'ป.3') {
      out['ป.3 ผลตามเกณฑ์ส่วนกลาง'] = assessment.grade3_central_result || '-';
    }
    out['ความเห็นครูประจำชั้น'] = assessment.teacher_comment || '';
    out['ผลประเมินภาพรวม'] = `ระดับ ${sum.roundedLevel} (${levelLabels[sum.roundedLevel]?.label || ''})`;
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ หมายเหตุ: 'ไม่มีข้อมูลนักเรียน' }]);
  XLSX.utils.book_append_sheet(wb, ws, `ปพ5_2569_${gradeLevel}`);
  XLSX.writeFile(wb, `ปพ5_2569_${gradeLevel}-${classroom}_ปี${settings.academic_year}.xlsx`);
}

export async function exportPrimary2568ToDocx({
  settings,
  gradeLevel,
  classroom,
  homeroomTeacher,
  rows,
  mode = 'class', // 'class' (ปพ.5 ป.1-3 2568) | 'pp6' (ปพ.6 รายบุคคลทุกคน)
  levelLabels = DEFAULT_LEVELS_2568,
}) {
  const sections = [];

  if (mode === 'class') {
    const headers = [
      makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', size: 18 }),
      makeDocxCell('ชื่อ - สกุล', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, size: 18 }),
      ...CAPABILITIES_2568.map((c) => makeDocxCell(`${c.no}.${c.shortName}`, { bold: true, shading: 'EEF2F9', size: 16 })),
      makeDocxCell('คุณลักษณะ\n5 ข้อ', { bold: true, shading: 'EEF2F9', size: 16 }),
      makeDocxCell('กิจกรรม', { bold: true, shading: 'EEF2F9', size: 16 }),
      ...(gradeLevel === 'ป.3'
        ? [makeDocxCell('ผลเกณฑ์ส่วนกลาง ป.3', { bold: true, shading: 'EEF2F9', size: 16 })]
        : []),
    ];

    const bodyRows = rows.map(({ student, assessment }, idx) => {
      const sum = computePrimary2568Summary(assessment);
      return new TableRow({
        children: [
          makeDocxCell(student.student_number || idx + 1, { size: 18 }),
          makeDocxCell(getFullStudentName(student), { align: AlignmentType.LEFT, size: 18 }),
          ...CAPABILITIES_2568.map((c) =>
            makeDocxCell(`ระดับ ${assessment.capabilities?.[c.key] ?? 3}`, { size: 18 })
          ),
          makeDocxCell(sum.allTraitsPass ? 'ผ่าน (5/5)' : `ผ่าน ${sum.traitsPassedCount}/5`, { size: 18 }),
          makeDocxCell(sum.activitiesPass ? 'ผ่าน' : 'ไม่ผ่าน', { size: 18 }),
          ...(gradeLevel === 'ป.3'
            ? [makeDocxCell(assessment.grade3_central_result || '-', { size: 16 })]
            : []),
        ],
      });
    });

    sections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 560, bottom: 560, left: 560, right: 560 },
        },
      },
      children: [
        makeDocxParagraph(
          `ปพ.5 ป.1-3 (2569) — แบบสรุปผลการประเมินตามความสามารถ ชั้น ${gradeLevel}/${classroom}`,
          { bold: true, size: 30, align: AlignmentType.CENTER, spaceAfter: 60 }
        ),
        makeDocxParagraph(
          `${settings.school_name} (${settings.affiliation_short}) • ปีการศึกษา ${settings.academic_year} • ไม่มีการให้คะแนนสอบหรือเกรด 0-4`,
          { size: 22, align: AlignmentType.CENTER, spaceAfter: 120 }
        ),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: headers }), ...bodyRows],
        }),
        makeDocxParagraph('', { spaceAfter: 140 }),
        makeDocxParagraph(
          `ลงชื่อครูประจำชั้น: ${homeroomTeacher?.full_name || '................................'}   |   ลงชื่อผู้อำนวยการ: ${settings.director_name}`,
          { size: 22, align: AlignmentType.CENTER }
        ),
      ],
    });
  } else {
    // ปพ.6 รายบุคคล (1 หน้าต่อ 1 คน)
    rows.forEach(({ student, assessment }, idx) => {
      const sum = computePrimary2568Summary(assessment);
      sections.push({
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          makeDocxParagraph('ปพ.6 — แบบรายงานผลการพัฒนาผู้เรียนรายบุคคล (ปพ.5 ป.1-3 2569)', {
            bold: true,
            size: 32,
            align: AlignmentType.CENTER,
            spaceAfter: 60,
          }),
          makeDocxParagraph(
            `${settings.school_name} (${settings.affiliation_short}) • ปีการศึกษา ${settings.academic_year}`,
            { size: 24, align: AlignmentType.CENTER, spaceAfter: 140 }
          ),
          makeDocxParagraph(
            `ชื่อ-สกุล: ${getFullStudentName(student)}   รหัสประจำตัว: ${student.student_code}   ชั้น ${gradeLevel}/${classroom} เลขที่ ${student.student_number || idx + 1}`,
            { bold: true, size: 24, spaceAfter: 120 }
          ),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeDocxCell('ที่', { bold: true, shading: 'EEF2F9', widthPct: 10 }),
                  makeDocxCell('ความสามารถพื้นฐาน 8 ด้าน (ไม่มีเกรด 0-4)', { bold: true, shading: 'EEF2F9', align: AlignmentType.LEFT, widthPct: 60 }),
                  makeDocxCell('ระดับความสามารถตามเกณฑ์สถานศึกษา', { bold: true, shading: 'EEF2F9', widthPct: 30 }),
                ],
              }),
              ...CAPABILITIES_2568.map((cap) => {
                const lv = Number(assessment.capabilities?.[cap.key] ?? 3);
                const lbl = levelLabels[lv]?.label || DEFAULT_LEVELS_2568[lv]?.label;
                return new TableRow({
                  children: [
                    makeDocxCell(cap.no, { size: 22 }),
                    makeDocxCell(cap.title, { align: AlignmentType.LEFT, size: 22 }),
                    makeDocxCell(`ระดับ ${lv} : ${lbl}`, { bold: true, size: 22 }),
                  ],
                });
              }),
            ],
          }),
          makeDocxParagraph('', { spaceAfter: 120 }),
          makeDocxParagraph(
            `คุณลักษณะอันพึงประสงค์ 5 ข้อ: ${sum.traitsPassedCount}/5 (${sum.allTraitsPass ? 'ผ่าน' : 'รอพัฒนา'})   |   กิจกรรมพัฒนาผู้เรียน: ${sum.activitiesPass ? 'ผ่าน' : 'ไม่ผ่าน'}`,
            { bold: true, size: 22, spaceAfter: 80 }
          ),
          ...(gradeLevel === 'ป.3'
            ? [
                makeDocxParagraph(
                  `ผลการประเมินชั้น ป.3 ตามเกณฑ์ส่วนกลาง: ${assessment.grade3_central_result || 'อยู่ระหว่างรอผลส่วนกลาง'}`,
                  { bold: true, size: 22, spaceAfter: 80 }
                ),
              ]
            : []),
          makeDocxParagraph(`ความเห็นเพิ่มเติมของครูประจำชั้น: ${assessment.teacher_comment || '-'}`, {
            size: 22,
            spaceAfter: 180,
          }),
          makeDocxParagraph(
            `ลงชื่อ.................................... (${homeroomTeacher?.full_name || 'ครูประจำชั้น'})     ลงชื่อ.................................... (${settings.director_name})`,
            { size: 20, align: AlignmentType.CENTER }
          ),
        ],
      });
    });
  }

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  downloadBlob(
    blob,
    mode === 'pp6'
      ? `ปพ6_รายบุคคล_${gradeLevel}-${classroom}_GoogleDocs.docx`
      : `ปพ5_2569_${gradeLevel}-${classroom}_GoogleDocs.docx`
  );
}
