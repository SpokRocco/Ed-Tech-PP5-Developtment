/**
 * ============================================================================
 * [INTEGRATION HOOK 3] Pp.5 Book Layout & Cover Customizer Adapter
 * จุดเชื่อมต่อสำหรับรับโครงสร้างรูปเล่มรายงานและหน้าปกจากไฟล์ Google Docs ตัวอย่าง
 * รองรับการกำหนดส่วนประกอบหน้าปก ลายเซ็น ตารางสรุป และแนวกระดาษ A4 รายหน้า
 * ============================================================================
 */

export const DEFAULT_REPORT_LAYOUT = {
  documentCode: 'ปพ.5',
  documentTitle: 'แบบบันทึกผลการพัฒนาคุณภาพผู้เรียนรายวิชา',
  subtitle: 'ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)',
  themeStyle: 'academic-navy-gold', // 'academic-navy-gold' | 'official-monochrome'
  showLogo: true,
  showGaruda: false,
  showSummaryTable: true,
  showCharacteristicsSummary: true,
  showApprovalBlock: true,
  coverNote: '',
  signatures: {
    teacherLabel: 'ครูผู้สอน',
    academicHeadLabel: 'หัวหน้ากลุ่มบริหารงานวิชาการ',
    registrarLabel: 'นายทะเบียน / งานวัดและประเมินผล',
    directorLabel: 'ผู้อำนวยการสถานศึกษา',
    approvalStatement: 'ความเห็นผู้บริหารสถานศึกษา: [ ] อนุมัติผลการเรียน  [ ] ส่งคืนแก้ไข',
  },
  orientations: {
    cover: 'portrait',
    indicators: 'portrait',
    attendance: 'landscape',
    scores: 'landscape',
    characteristics: 'landscape',
  },
  footerCredit:
    'พัฒนาระบบโดย นายปิยะพันธุ์ ขันไร่ ตำแหน่ง ครู วิทยฐานะครูชำนาญการ โรงเรียนบ้านหาดเค็ด สพป.น่าน เขต 1',
};

export function mergeReportLayout(systemCoverConfig = {}, courseCoverConfig = {}) {
  return {
    ...DEFAULT_REPORT_LAYOUT,
    ...systemCoverConfig,
    ...courseCoverConfig,
    signatures: {
      ...DEFAULT_REPORT_LAYOUT.signatures,
      ...(systemCoverConfig?.signatures || {}),
      ...(courseCoverConfig?.signatures || {}),
    },
    orientations: {
      ...DEFAULT_REPORT_LAYOUT.orientations,
      ...(systemCoverConfig?.orientations || {}),
      ...(courseCoverConfig?.orientations || {}),
    },
  };
}

/**
 * คำนวณตารางสรุปผลสัมฤทธิ์ทางการเรียนสำหรับหน้าปก ปพ.5
 */
export function buildCoverSummaryStats(students = [], computedScoresMap = {}, characteristicsMap = {}) {
  const gradeBuckets = {
    '4': 0,
    '3.5': 0,
    '3': 0,
    '2.5': 0,
    '2': 0,
    '1.5': 0,
    '1': 0,
    '0': 0,
    'ร': 0,
    'มส': 0,
  };

  const traitsCounts = { 3: 0, 2: 0, 1: 0, 0: 0 };
  const rtwCounts = { 3: 0, 2: 0, 1: 0, 0: 0 };

  for (const stu of students) {
    const score = computedScoresMap[stu.id];
    const grade = score?.grade ?? '0';
    if (gradeBuckets[grade] !== undefined) {
      gradeBuckets[grade] += 1;
    }

    const ch = characteristicsMap[stu.id];
    const tLevel = ch?.traits_level ?? 3;
    const rLevel = ch?.rtw_level ?? 3;
    if (traitsCounts[tLevel] !== undefined) traitsCounts[tLevel] += 1;
    if (rtwCounts[rLevel] !== undefined) rtwCounts[rLevel] += 1;
  }

  const total = students.length;
  const goodAndAboveCount =
    gradeBuckets['4'] + gradeBuckets['3.5'] + gradeBuckets['3'];
  const passCount =
    total - gradeBuckets['0'] - gradeBuckets['ร'] - gradeBuckets['มส'];

  return {
    totalStudents: total,
    gradeBuckets,
    traitsCounts,
    rtwCounts,
    goodAndAbovePct: total > 0 ? ((goodAndAboveCount / total) * 100).toFixed(1) : '0.0',
    passPct: total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0',
  };
}
