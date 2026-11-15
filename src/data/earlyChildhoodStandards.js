/**
 * มาตรฐานและตัวชี้วัดประกอบเอกสารครบเกณฑ์ สพฐ.
 * 1) ปฐมวัย (4 ด้าน 12 มาตรฐาน): อบ.1 / อบ.2 / อบ.3
 * 2) ปฐมวัย 2569 นำร่อง (4 ด้าน 33 องค์ประกอบ สำหรับ อ.3): อบ.1 (2569) / อบ.2 (2569) / อบ.3 (2569)
 * 3) เกณฑ์เทียบผล ปพ.1 (2569→2551): ตารางที่ ๔, ๕, ๖
 */

import { CAPABILITIES_2568 } from './primary2568Curriculum';

export const EARLY_CHILDHOOD_LEVELS = {
  3: { level: 3, label: 'ดีเยี่ยม / พัฒนาการสมวัยดีมาก', short: '3 (ดีเยี่ยม)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  2: { level: 2, label: 'ดี / พัฒนาการเหมาะสม', short: '2 (ดี)', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  1: { level: 1, label: 'ควรส่งเสริมเพิ่มเติม', short: '1 (ควรส่งเสริม)', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export const OB12_DOMAINS = [
  { key: 'physical', no: 1, title: 'พัฒนาการด้านร่างกาย', short: 'ด้านร่างกาย' },
  { key: 'emotional', no: 2, title: 'พัฒนาการด้านอารมณ์ จิตใจ', short: 'ด้านอารมณ์ฯ' },
  { key: 'social', no: 3, title: 'พัฒนาการด้านสังคม', short: 'ด้านสังคม' },
  { key: 'cognitive', no: 4, title: 'พัฒนาการด้านสติปัญญา', short: 'ด้านสติปัญญา' },
];

export const EARLY_CHILDHOOD_12_STANDARDS = [
  { key: 'm1', no: 1, domainKey: 'physical', title: 'มาตรฐานที่ 1 ร่างกายเจริญเติบโตตามวัยและมีสุขนิสัยที่ดี' },
  { key: 'm2', no: 2, domainKey: 'physical', title: 'มาตรฐานที่ 2 กล้ามเนื้อใหญ่และกล้ามเนื้อเล็กแข็งแรง ใช้ได้อย่างคล่องแคล่วและประสานสัมพันธ์กัน' },
  { key: 'm3', no: 3, domainKey: 'emotional', title: 'มาตรฐานที่ 3 มีสุขภาพจิตดีและมีความสุข' },
  { key: 'm4', no: 4, domainKey: 'emotional', title: 'มาตรฐานที่ 4 ชื่นชมและแสดงออกทางศิลปะ ดนตรี และการเคลื่อนไหว' },
  { key: 'm5', no: 5, domainKey: 'emotional', title: 'มาตรฐานที่ 5 มีคุณธรรม จริยธรรม และมีจิตใจที่ดีงาม' },
  { key: 'm6', no: 6, domainKey: 'social', title: 'มาตรฐานที่ 6 มีทักษะชีวิตและปฏิบัติตนตามหลักปรัชญาของเศรษฐกิจพอเพียง' },
  { key: 'm7', no: 7, domainKey: 'social', title: 'มาตรฐานที่ 7 รักธรรมชาติ สิ่งแวดล้อม วัฒนธรรม และความเป็นไทย' },
  { key: 'm8', no: 8, domainKey: 'social', title: 'มาตรฐานที่ 8 อยู่ร่วมกับผู้อื่นได้อย่างมีความสุขและปฏิบัติตนเป็นสมาชิกที่ดีของสังคมในระบอบประชาธิปไตย' },
  { key: 'm9', no: 9, domainKey: 'cognitive', title: 'มาตรฐานที่ 9 ใช้ภาษาสื่อสารได้เหมาะสมกับวัย' },
  { key: 'm10', no: 10, domainKey: 'cognitive', title: 'มาตรฐานที่ 10 มีความสามารถในการคิดที่เป็นพื้นฐานในการเรียนรู้' },
  { key: 'm11', no: 11, domainKey: 'cognitive', title: 'มาตรฐานที่ 11 มีจินตนาการและความคิดสร้างสรรค์' },
  { key: 'm12', no: 12, domainKey: 'cognitive', title: 'มาตรฐานที่ 12 มีเจตคติที่ดีต่อการเรียนรู้และมีความสามารถในการแสวงหาความรู้ได้เหมาะสมกับวัย' },
];

export const OB2569_DOMAINS = [
  { key: 'd1', no: 1, title: 'ด้านที่ 1 ความสามารถด้านสุขภาวะทางกายและการเคลื่อนไหว', short: 'ด้านกายและการเคลื่อนไหว', count: 8 },
  { key: 'd2', no: 2, title: 'ด้านที่ 2 ความสามารถด้านอารมณ์ จิตใจ สุนทรียภาพ และคุณธรรม', short: 'ด้านอารมณ์ฯ และคุณธรรม', count: 8 },
  { key: 'd3', no: 3, title: 'ด้านที่ 3 ความสามารถด้านสังคม ทักษะชีวิต และพลเมือง', short: 'ด้านสังคมและทักษะชีวิต', count: 8 },
  { key: 'd4', no: 4, title: 'ด้านที่ 4 ความสามารถด้านการคิด การสื่อสาร ภาษา และนวัตกรรม', short: 'ด้านการคิด ภาษา นวัตกรรม', count: 9 },
];

export const EARLY_CHILDHOOD_2569_COMPONENTS = [
  // ด้านที่ 1 (1-8)
  { key: 'c1', no: 1, domainKey: 'd1', name: 'การเจริญเติบโตสมวัยและสุขภาพกาย', behaviorO3: 'น้ำหนักส่วนสูงเป็นไปตามเกณฑ์ มีความแข็งแรงสดใส' },
  { key: 'c2', no: 2, domainKey: 'd1', name: 'การดูแลสุขอนามัยส่วนบุคคล', behaviorO3: 'ล้างมือ แปรงฟัน รักษาความสะอาดร่างกายได้ด้วยตนเอง' },
  { key: 'c3', no: 3, domainKey: 'd1', name: 'พฤติกรรมการบริโภคอาหารที่ปลอดภัยและมีประโยชน์', behaviorO3: 'รับประทานอาหารครบหมู่ ไม่เลือกกินอาหารที่มีประโยชน์' },
  { key: 'c4', no: 4, domainKey: 'd1', name: 'การระมัดระวังความปลอดภัยในชีวิตประจำวัน', behaviorO3: 'ปฏิบัติตามข้อตกลงความปลอดภัยและหลีกเลี่ยงจุดเสี่ยงได้' },
  { key: 'c5', no: 5, domainKey: 'd1', name: 'การเคลื่อนไหวทรงตัวและใช้กล้ามเนื้อใหญ่', behaviorO3: 'วิ่ง กระโดด ปีนป่าย รับ-โยนบอล และทรงตัวได้อย่างคล่องแคล่ว' },
  { key: 'c6', no: 6, domainKey: 'd1', name: 'การใช้กล้ามเนื้อเล็กและการประสานสัมพันธ์ตา-มือ', behaviorO3: 'ใช้กรรไกร พับกระดาษ ปั้น และจับดินสอเขียนรูปได้คล่องแคล่ว' },
  { key: 'c7', no: 7, domainKey: 'd1', name: 'การออกกำลังกายและการเล่นอย่างสม่ำเสมอ', behaviorO3: 'ร่วมกิจกรรมเคลื่อนไหวประกอบจังหวะและเล่นกลางแจ้งอย่างกระตือรือร้น' },
  { key: 'c8', no: 8, domainKey: 'd1', name: 'การพักผ่อนและกิจวัตรประจำวันสมดุล', behaviorO3: 'นอนหลับพักผ่อนและปฏิบัติกิจวัตรตามเวลาได้อย่างเหมาะสม' },
  // ด้านที่ 2 (9-16)
  { key: 'c9', no: 9, domainKey: 'd2', name: 'ความร่าเริงแจ่มใสและความภาคภูมิใจในตนเอง', behaviorO3: 'แสดงความมั่นใจ กล้าแสดงออกอย่างเหมาะสมและมีความสุข' },
  { key: 'c10', no: 10, domainKey: 'd2', name: 'การรับรู้และควบคุมอารมณ์ของตนเอง', behaviorO3: 'บอกอารมณ์ตนเองได้ รอคอยได้ และสงบอารมณ์เมื่อผิดหวัง' },
  { key: 'c11', no: 11, domainKey: 'd2', name: 'ความเห็นอกเห็นใจและใส่ใจความรู้สึกผู้อื่น', behaviorO3: 'สังเกตและปลอบโยนหรือช่วยเหลือเพื่อนเมื่อเพื่อนไม่สบายใจ' },
  { key: 'c12', no: 12, domainKey: 'd2', name: 'ความซื่อสัตย์สุจริตและพูดความจริง', behaviorO3: 'พูดความจริง ไม่หยิบฉวยสิ่งของของผู้อื่นโดยไม่ได้รับอนุญาต' },
  { key: 'c13', no: 13, domainKey: 'd2', name: 'ความมีระเบียบวินัยและเคารพข้อตกลง', behaviorO3: 'ปฏิบัติตามกติกาห้องเรียนและเก็บของเข้าที่ได้เรียบร้อย' },
  { key: 'c14', no: 14, domainKey: 'd2', name: 'ความกตัญญูกตเวทีและมารยาทไทย', behaviorO3: 'ไหว้ทำความเคารพ พูดจาไพเราะ ขอบคุณ และขอโทษได้เหมาะสม' },
  { key: 'c15', no: 15, domainKey: 'd2', name: 'สุนทรียภาพทางศิลปะและดนตรี', behaviorO3: 'ชื่นชมและสร้างสรรค์งานวาด ปั้น ร้องเพลง และเคลื่อนไหวตามจังหวะ' },
  { key: 'c16', no: 16, domainKey: 'd2', name: 'ความมุ่งมั่นพากเพียรในการทำกิจกรรม', behaviorO3: 'จดจ่อทำงานหรือชิ้นงานที่ได้รับมอบหมายจนสำเร็จเรียบร้อย' },
  // ด้านที่ 3 (17-24)
  { key: 'c17', no: 17, domainKey: 'd3', name: 'การช่วยเหลือตนเองในกิจวัตรประจำวัน', behaviorO3: 'แต่งกาย รับประทานอาหาร เก็บที่นอน และจัดการของใช้ส่วนตัวได้เอง' },
  { key: 'c18', no: 18, domainKey: 'd3', name: 'การทำงานและเล่นร่วมกับผู้อื่น', behaviorO3: 'แบ่งปัน ผลัดเปลี่ยนกันเล่น และร่วมมือทำงานกลุ่มกับเพื่อนได้' },
  { key: 'c19', no: 19, domainKey: 'd3', name: 'การสื่อสารเพื่อแก้ปัญหาความขัดแย้งอย่างสันติ', behaviorO3: 'ใช้คำพูดเจรจาตกลงกับเพื่อนแทนการใช้กำลังหรือแย่งสิ่งของ' },
  { key: 'c20', no: 20, domainKey: 'd3', name: 'การใช้ทรัพยากรอย่างประหยัดและพอเพียง', behaviorO3: 'ใช้น้ำ ไฟฟ้า อาหาร และอุปกรณ์การเรียนอย่างรู้คุณค่า ไม่สิ้นเปลือง' },
  { key: 'c21', no: 21, domainKey: 'd3', name: 'การดูแลรักษาธรรมชาติและสิ่งแวดล้อม', behaviorO3: 'ทิ้งขยะถูกที่ ช่วยดูแลต้นไม้ สัตว์ และรักษาความสะอาดห้องเรียน' },
  { key: 'c22', no: 22, domainKey: 'd3', name: 'ความรักวัฒนธรรมและภูมิปัญญาท้องถิ่น', behaviorO3: 'รู้จักประเพณี วัฒนธรรมท้องถิ่นจังหวัดน่าน และร่วมกิจกรรมอย่างภาคภูมิใจ' },
  { key: 'c23', no: 23, domainKey: 'd3', name: 'บทบาทหน้าที่และการมีส่วนร่วมแบบประชาธิปไตย', behaviorO3: 'รับฟังความคิดเห็นผู้อื่น ยอมรับมติกลุ่มและทำหน้าที่ที่ได้รับมอบหมาย' },
  { key: 'c24', no: 24, domainKey: 'd3', name: 'ความรับผิดชอบต่อตนเองและส่วนรวม', behaviorO3: 'ดูแลงานประจำวันและร่วมกิจกรรมจิตสาธารณะในห้องเรียนอย่างสม่ำเสมอ' },
  // ด้านที่ 4 (25-33)
  { key: 'c25', no: 25, domainKey: 'd4', name: 'การฟังอย่างตั้งใจและเข้าใจคำสั่งซับซ้อน', behaviorO3: 'ฟังนิทาน/บทสนทนาแล้วตอบคำถามและปฏิบัติตามคำแนะนำหลายขั้นตอนได้' },
  { key: 'c26', no: 26, domainKey: 'd4', name: 'การพูดสื่อสาร เล่าเรื่อง และแสดงความคิดเห็น', behaviorO3: 'พูดเป็นประโยคสมบูรณ์ เล่าเรื่องราวตามลำดับเหตุการณ์ได้ชัดเจน' },
  { key: 'c27', no: 27, domainKey: 'd4', name: 'การอ่านภาพ สัญลักษณ์ และความพร้อมทางการอ่าน', behaviorO3: 'สังเกตพยัญชนะ สระ สัญลักษณ์ และคาดเดาเรื่องราวจากภาพได้' },
  { key: 'c28', no: 28, domainKey: 'd4', name: 'การสื่อสารความหมายด้วยการขีดเขียนเบื้องต้น', behaviorO3: 'เขียนชื่อตนเอง ลอกแบบคำสั้นๆ หรือวาดภาพสื่อความหมายได้อย่างมั่นใจ' },
  { key: 'c29', no: 29, domainKey: 'd4', name: 'ทักษะพื้นฐานทางคณิตศาสตร์และจำนวน', behaviorO3: 'นับรู้ค่าจำนวน 1-20 เปรียบเทียบ จัดหมวดหมู่ เรียงลำดับ และบอกเวลา/รูปทรงได้' },
  { key: 'c30', no: 30, domainKey: 'd4', name: 'การสังเกต ทดลอง และสืบเสาะหาความรู้', behaviorO3: 'ตั้งคำถาม คาดคะเน ลงมือทดลองง่ายๆ และบอกผลจากการสังเกตได้' },
  { key: 'c31', no: 31, domainKey: 'd4', name: 'การคิดเชิงเหตุผลและการแก้ปัญหาอย่างสร้างสรรค์', behaviorO3: 'เชื่อมโยงเหตุและผล แก้ปัญหาเฉพาะหน้าในการเล่นและการเรียนรู้ได้' },
  { key: 'c32', no: 32, domainKey: 'd4', name: 'จินตนาการและการสร้างสรรค์ชิ้นงาน/นวัตกรรมเด็ก', behaviorO3: 'ประดิษฐ์และต่อยอดชิ้นงานจากวัสดุเหลือใช้ตามจินตนาการได้อย่างหลากหลาย' },
  { key: 'c33', no: 33, domainKey: 'd4', name: 'การใช้สื่อเทคโนโลยีและข้อมูลอย่างเหมาะสมปลอดภัย', behaviorO3: 'ใช้สื่อการเรียนรู้ดิจิทัลภายใต้การดูแลอย่างถูกวิธีและรู้จักเวลาที่เหมาะสม' },
];

export function computeEarlyChildhoodSummary(scoresMap = {}, items = [], domains = []) {
  const values = items.map((it) => Number(scoresMap[it.key] ?? 3));
  const avg = values.length
    ? Number((values.reduce((acc, v) => acc + v, 0) / values.length).toFixed(2))
    : 3;
  const domainSummaries = domains.map((d) => {
    const dItems = items.filter((it) => it.domainKey === d.key);
    const dVals = dItems.map((it) => Number(scoresMap[it.key] ?? 3));
    const dAvg = dVals.length
      ? Number((dVals.reduce((a, b) => a + b, 0) / dVals.length).toFixed(2))
      : 3;
    const rounded = dAvg >= 2.5 ? 3 : dAvg >= 1.5 ? 2 : 1;
    return { ...d, avg: dAvg, level: rounded };
  });
  const roundedOverall = avg >= 2.5 ? 3 : avg >= 1.5 ? 2 : 1;
  return { avg, level: roundedOverall, domainSummaries };
}

/**
 * ตารางที่ ๔ — ความสามารถ (2569) ที่ใช้เทียบกลุ่มสาระการเรียนรู้ หลักสูตร 2551 (เพื่อจัดทำ ปพ.๑ ชั้น ป.1-3)
 */
export const PP1_TRANSFER_MAPPING_TABLE_4 = [
  { areaKey: 'thai', subjectCodePrefix: 'ท', areaName: 'ภาษาไทย', capKey: 'c1', capTitle: CAPABILITIES_2568[0]?.shortName || 'ภาษาและการสื่อสาร', ratioDesc: '100%' },
  { areaKey: 'math', subjectCodePrefix: 'ค', areaName: 'คณิตศาสตร์', capKey: 'c2', capTitle: CAPABILITIES_2568[1]?.shortName || 'คณิตศาสตร์และการคำนวณ', ratioDesc: '100%' },
  { areaKey: 'sci', subjectCodePrefix: 'ว', areaName: 'วิทยาศาสตร์และเทคโนโลยี', capKey: 'c3', capTitle: CAPABILITIES_2568[2]?.shortName || 'วิทย์ฯ และเทคโนโลยี', ratioDesc: 'บูรณาการ c3+c4' },
  { areaKey: 'soc', subjectCodePrefix: 'ส', areaName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', capKey: 'c5', capTitle: CAPABILITIES_2568[4]?.shortName || 'สังคมและพลเมืองดี', ratioDesc: '100%' },
  { areaKey: 'hp', subjectCodePrefix: 'พ', areaName: 'สุขศึกษาและพลศึกษา', capKey: 'c6', capTitle: CAPABILITIES_2568[5]?.shortName || 'สุขภาวะกายและจิต', ratioDesc: '100%' },
  { areaKey: 'art', subjectCodePrefix: 'ศ', areaName: 'ศิลปะ', capKey: 'c7', capTitle: CAPABILITIES_2568[6]?.shortName || 'ศิลปะและสุนทรียภาพ', ratioDesc: '100%' },
  { areaKey: 'work', subjectCodePrefix: 'ง', areaName: 'การงานอาชีพ', capKey: 'c8', capTitle: CAPABILITIES_2568[7]?.shortName || 'ทักษะชีวิตและการงาน', ratioDesc: '100%' },
  { areaKey: 'eng', subjectCodePrefix: 'อ', areaName: 'ภาษาต่างประเทศ', capKey: 'c1', capTitle: CAPABILITIES_2568[0]?.shortName || 'ภาษาและการสื่อสาร', ratioDesc: 'เทียบจาก c1/c4' },
];

export function convertCompetencyLevelToGrade2551(level) {
  const lv = Number(level ?? 3);
  if (lv >= 4) return '4';
  if (lv === 3) return '3';
  if (lv === 2) return '2';
  return '1';
}

export function buildPp1TransferStudentRow(student, assessment2569 = {}, existingOverride = {}) {
  const caps = assessment2569.capabilities || {};
  const traits5 = assessment2569.traits_5 || {};
  const traitsPassCount = Object.values(traits5).filter((v) => v !== false).length;
  const c1 = Number(caps.c1 ?? 3);
  const c4 = Number(caps.c4 ?? 3);
  const rtwLevel = Math.round((c1 + c4) / 2) >= 3 ? 'ดีเยี่ยม' : Math.round((c1 + c4) / 2) === 2 ? 'ดี' : 'ผ่าน';
  const traitsLabel = traitsPassCount === 5 ? 'ดีเยี่ยม' : traitsPassCount >= 3 ? 'ดี' : 'ผ่าน';
  const activitiesLabel = assessment2569.activities_pass !== false ? 'ผ' : 'มผ';

  const grades = {};
  PP1_TRANSFER_MAPPING_TABLE_4.forEach((m) => {
    const baseLv = Number(caps[m.capKey] ?? 3);
    const altLv = m.areaKey === 'sci' ? Math.round((Number(caps.c3 ?? 3) + Number(caps.c4 ?? 3)) / 2) : baseLv;
    grades[m.areaKey] =
      existingOverride.grades?.[m.areaKey] || convertCompetencyLevelToGrade2551(altLv);
  });

  return {
    student_id: student.id,
    grades,
    rtw: existingOverride.rtw || rtwLevel,
    traits: existingOverride.traits || traitsLabel,
    activities: existingOverride.activities || activitiesLabel,
    pp1_remark:
      existingOverride.pp1_remark ||
      'เทียบโอนผลการเรียนจากหลักสูตรการศึกษาประถมศึกษาตอนต้น พ.ศ. 2569 สู่หลักสูตรแกนกลางฯ 2551 ตามแนวปฏิบัติ สพฐ.',
  };
}
