/**
 * ============================================================================
 * [INTEGRATION HOOK 2] Scoring & Characteristics Configuration Adapter
 * จุดเชื่อมต่อสำหรับปรับแต่ง UI สัดส่วนคะแนนเก็บ / คุณลักษณะอันพึงประสงค์ / อ่านคิดเขียน
 * เตรียมพร้อมสำหรับรับรูปภาพตัวอย่างสัดส่วนคะแนนจากผู้ใช้ในขั้นตอนถัดไป
 * ============================================================================
 */

export const DESIRABLE_TRAITS_8 = [
  { key: 't1', code: '1', name: 'รักชาติ ศาสน์ กษัตริย์', defaultWeight: 12.5 },
  { key: 't2', code: '2', name: 'ซื่อสัตย์สุจริต', defaultWeight: 12.5 },
  { key: 't3', code: '3', name: 'มีวินัย', defaultWeight: 12.5 },
  { key: 't4', code: '4', name: 'ใฝ่เรียนรู้', defaultWeight: 12.5 },
  { key: 't5', code: '5', name: 'อยู่อย่างพอเพียง', defaultWeight: 12.5 },
  { key: 't6', code: '6', name: 'มุ่งมั่นในการทำงาน', defaultWeight: 12.5 },
  { key: 't7', code: '7', name: 'รักความเป็นไทย', defaultWeight: 12.5 },
  { key: 't8', code: '8', name: 'มีจิตสาธารณะ', defaultWeight: 12.5 },
];

export const READING_THINKING_WRITING_CRITERIA = [
  { key: 'r1', code: '1', name: 'การอ่านจับใจความและตีความ', defaultWeight: 33.3 },
  { key: 'r2', code: '2', name: 'การคิดวิเคราะห์ สังเคราะห์ และวิจารณญาณ', defaultWeight: 33.4 },
  { key: 'r3', code: '3', name: 'การเขียนถ่ายทอดความคิดอย่างสร้างสรรค์', defaultWeight: 33.3 },
];

export const RATIO_PRESETS = [
  { id: '60-20-20', label: '60 : 20 : 20 (มาตรฐาน)', formative: 60, midterm: 20, final: 20 },
  { id: '70-10-20', label: '70 : 10 : 20 (เน้นระหว่างภาค)', formative: 70, midterm: 10, final: 20 },
  { id: '70-0-30', label: '70 : 0 : 30 (ไม่มีสอบกลางภาค)', formative: 70, midterm: 0, final: 30 },
  { id: '80-0-20', label: '80 : 0 : 20 (เน้นปฏิบัติ/ปฐมวัย/เพิ่มเติม)', formative: 80, midterm: 0, final: 20 },
];

export const DEFAULT_CHARACTERISTICS_MODEL = {
  scoringMode: 'scale-0-3', // 'scale-0-3' | 'raw-weighted' | 'percentage'
  maxItemScore: 3,
  useCustomWeights: false,
  traitItems: DESIRABLE_TRAITS_8.map((t) => ({ ...t, maxScore: 3, weight: t.defaultWeight, enabled: true })),
  rtwItems: READING_THINKING_WRITING_CRITERIA.map((r) => ({ ...r, maxScore: 3, weight: r.defaultWeight, enabled: true })),
  levelThresholds: {
    excellent: 2.5, // ดีเยี่ยม (3)
    good: 1.5,      // ดี (2)
    pass: 1.0,      // ผ่าน (1)
  },
};

/**
 * คำนวณค่าเฉลี่ยถ่วงน้ำหนัก (หรือเฉลี่ยปกติ) และแปลงเป็นระดับคุณภาพ 0-3
 */
export function evaluateCriteriaSummary(valuesMap = {}, items = [], config = DEFAULT_CHARACTERISTICS_MODEL) {
  const activeItems = items.filter((item) => item.enabled !== false);
  if (activeItems.length === 0) return { average: 3, level: 3 };

  let totalScore = 0;
  let totalWeight = 0;

  for (const item of activeItems) {
    const raw = valuesMap[item.key];
    const score = raw === undefined || raw === null || raw === '' ? 3 : Number(raw);
    const maxItem = Number(item.maxScore || config.maxItemScore || 3);
    const normalizedTo3 = maxItem > 0 ? (score / maxItem) * 3 : 0;
    const weight = config.useCustomWeights ? Number(item.weight || 1) : 1;

    totalScore += normalizedTo3 * weight;
    totalWeight += weight;
  }

  const avg = totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(2)) : 0;
  const thresholds = config.levelThresholds || DEFAULT_CHARACTERISTICS_MODEL.levelThresholds;

  let level = 0;
  if (avg >= thresholds.excellent) level = 3;
  else if (avg >= thresholds.good) level = 2;
  else if (avg >= thresholds.pass) level = 1;
  else level = 0;

  return { average: avg, level };
}
