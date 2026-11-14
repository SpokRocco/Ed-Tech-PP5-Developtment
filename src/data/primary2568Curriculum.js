/**
 * โครงสร้างหลักสูตรการศึกษาประถมศึกษาตอนต้น (ป.1 - ป.3) พุทธศักราช 2568
 * สำหรับโรงเรียนที่สมัครใจใช้หลักสูตรฐานความสามารถ (ไม่มีคะแนนตัวเลขและไม่มีเกรด 0-4)
 * รองรับ ปพ.5 ป.1-3 (2568) และแบบรายงานรายบุคคล (ปพ.6)
 */

export const CAPABILITIES_2568 = [
  {
    key: 'c1',
    no: 1,
    shortName: 'ภาษาและการสื่อสาร',
    title: 'ความสามารถด้านการสื่อสารและการใช้ภาษา',
    description: 'การฟัง การพูด การอ่าน และการเขียนภาษาไทย รวมถึงภาษาต่างประเทศเพื่อสื่อสารในชีวิตประจำวัน',
  },
  {
    key: 'c2',
    no: 2,
    shortName: 'คณิตศาสตร์และการคำนวณ',
    title: 'ความสามารถด้านคณิตศาสตร์และการคิดคำนวณ',
    description: 'เข้าใจจำนวน การดำเนินการ การวัด เรขาคณิต แบบรูป และการแก้ปัญหาเชิงคณิตศาสตร์',
  },
  {
    key: 'c3',
    no: 3,
    shortName: 'วิทย์ฯ และเทคโนโลยี',
    title: 'ความสามารถด้านวิทยาศาสตร์ เทคโนโลยี และนวัตกรรม',
    description: 'การสังเกต สืบเสาะหาความรู้ ธรรมชาติรอบตัว และการใช้เทคโนโลยีดิจิทัลอย่างปลอดภัย',
  },
  {
    key: 'c4',
    no: 4,
    shortName: 'การคิดและแก้ปัญหา',
    title: 'ความสามารถด้านการคิดวิเคราะห์ แก้ปัญหา และการเรียนรู้',
    description: 'คิดอย่างมีเหตุผล เชื่อมโยงข้อมูล สร้างชิ้นงาน และเรียนรู้ด้วยตนเองอย่างต่อเนื่อง',
  },
  {
    key: 'c5',
    no: 5,
    shortName: 'สังคมและพลเมืองดี',
    title: 'ความสามารถด้านสังคม คุณธรรม จริยธรรม และความเป็นพลเมือง',
    description: 'อยู่ร่วมกับผู้อื่นอย่างสันติ รู้สิทธิหน้าที่ มีจิตสาธารณะ และตระหนักในคุณค่าท้องถิ่น',
  },
  {
    key: 'c6',
    no: 6,
    shortName: 'สุขภาวะกายและจิต',
    title: 'ความสามารถด้านสุขภาวะทางกาย จิตใจ และการเคลื่อนไหว',
    description: 'ดูแลสุขอนามัย ออกกำลังกาย การเคลื่อนไหวอย่างคล่องแคล่ว และควบคุมอารมณ์ได้เหมาะสม',
  },
  {
    key: 'c7',
    no: 7,
    shortName: 'ศิลปะและสุนทรียภาพ',
    title: 'ความสามารถด้านศิลปะ ดนตรี สุนทรียภาพ และความคิดสร้างสรรค์',
    description: 'ชื่นชมและสร้างสรรค์งานทัศนศิลป์ ดนตรี นาฏศิลป์ และวัฒนธรรมอันงดงาม',
  },
  {
    key: 'c8',
    no: 8,
    shortName: 'ทักษะชีวิตและการงาน',
    title: 'ความสามารถด้านทักษะชีวิต การงานอาชีพ และการพึ่งพาตนเอง',
    description: 'ช่วยเหลือตนเองในกิจวัตรประจำวัน ทำงานร่วมกับผู้อื่น รู้คุณค่าสิ่งของ และอยู่อย่างพอเพียง',
  },
];

export const DEFAULT_LEVELS_2568 = {
  4: {
    level: 4,
    label: 'ดีเยี่ยม (เชี่ยวชาญ)',
    short: 'ระดับ 4 (ดีเยี่ยม)',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  3: {
    level: 3,
    label: 'ดี (คล่องแคล่ว)',
    short: 'ระดับ 3 (ดี)',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  2: {
    level: 2,
    label: 'พอใช้ (กำลังพัฒนา)',
    short: 'ระดับ 2 (พอใช้)',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  1: {
    level: 1,
    label: 'ควรเสริม (เริ่มต้น)',
    short: 'ระดับ 1 (ควรเสริม)',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

export const TRAITS_5_2568 = [
  { key: 't1', no: 1, label: 'รักชาติ ศาสน์ กษัตริย์ และความเป็นไทย' },
  { key: 't2', no: 2, label: 'ซื่อสัตย์สุจริตและมีจิตสาธารณะ' },
  { key: 't3', no: 3, label: 'มีวินัยและรับผิดชอบต่อตนเองและส่วนรวม' },
  { key: 't4', no: 4, label: 'ใฝ่เรียนรู้และมุ่งมั่นในการทำงาน' },
  { key: 't5', no: 5, label: 'อยู่อย่างพอเพียง รักษ์สิ่งแวดล้อม และภูมิปัญญาท้องถิ่น' },
];

export const GRADE3_CENTRAL_RESULTS = [
  '',
  'บรรลุเกณฑ์ส่วนกลาง (ระดับดีมาก)',
  'ผ่านเกณฑ์ส่วนกลาง',
  'ควรพัฒนาเพิ่มเติมตามเกณฑ์ส่วนกลาง',
  'รอประเมินตามเกณฑ์ส่วนกลาง',
];

export function computePrimary2568Summary(assessment = {}) {
  const caps = assessment.capabilities || {};
  const traits = assessment.traits_5 || {};
  const levelValues = CAPABILITIES_2568.map((c) => Number(caps[c.key] ?? 3));
  const avgLevel = Number(
    (levelValues.reduce((acc, v) => acc + v, 0) / CAPABILITIES_2568.length).toFixed(2)
  );
  const roundedLevel = Math.min(4, Math.max(1, Math.round(avgLevel)));
  const traitsPassedCount = TRAITS_5_2568.filter((t) => traits[t.key] !== false).length;
  const allTraitsPass = traitsPassedCount === TRAITS_5_2568.length;
  const activitiesPass = assessment.activities_pass !== false;
  const minCap = Math.min(...levelValues);
  const overallPass = minCap >= 1 && allTraitsPass && activitiesPass;

  return {
    avgLevel,
    roundedLevel,
    traitsPassedCount,
    allTraitsPass,
    activitiesPass,
    overallPass,
  };
}
