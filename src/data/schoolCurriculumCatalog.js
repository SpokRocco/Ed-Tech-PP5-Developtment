/**
 * โครงสร้างหลักสูตรและรหัสวิชาอย่างเป็นทางการ โรงเรียนบ้านหาดเค็ด (สพป.น่าน เขต 1)
 * สังเคราะห์จากไฟล์ต้นแบบในโฟลเดอร์ ref/:
 * 1) รายงานผลการเรียน HK @ 1 ปีกศ 69 (ประถม).xlsx  (ชีท ป.1 - ป.6)
 * 2) ประกาศผลสอบ ม.1-69 เทอม1.xls              (ชีท แม่แบบ & ชีท เกรด)
 */

export function normalizeSubjectCode(code = '') {
  return String(code || '').trim().replace(/\s+/g, '');
}

const PRIMARY_LOWER_AREAS = [
  { prefix: 'ท', offset: '101', name: 'ภาษาไทย', area: 'ภาษาไทย', hours: 100, credits: 5.0, type: 'พื้นฐาน' },
  { prefix: 'ค', offset: '101', name: 'คณิตศาสตร์', area: 'คณิตศาสตร์', hours: 100, credits: 5.0, type: 'พื้นฐาน' },
  { prefix: 'ว', offset: '101', name: 'วิทยาศาสตร์และเทคโนโลยี', area: 'วิทยาศาสตร์และเทคโนโลยี', hours: 40, credits: 2.0, type: 'พื้นฐาน' },
  { prefix: 'ส', offset: '101', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hours: 40, credits: 2.0, type: 'พื้นฐาน' },
  { prefix: 'ส', offset: '102', name: 'ประวัติศาสตร์', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'พ', offset: '101', name: 'สุขศึกษาและพลศึกษา', area: 'สุขศึกษาและพลศึกษา', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'ศ', offset: '101', name: 'ศิลปะ', area: 'ศิลปะ', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'ง', offset: '101', name: 'การงานอาชีพ', area: 'การงานอาชีพ', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'อ', offset: '101', name: 'ภาษาอังกฤษ', area: 'ภาษาต่างประเทศ', hours: 60, credits: 3.0, type: 'พื้นฐาน' },
  { prefix: 'อ', offset: '201', name: 'ภาษาอังกฤษเพื่อการสื่อสาร', area: 'ภาษาต่างประเทศ', hours: 40, credits: 2.0, type: 'เพิ่มเติม' },
];

const PRIMARY_UPPER_BASE = [
  { prefix: 'ท', offset: '101', name: 'ภาษาไทย', area: 'ภาษาไทย', hours: 80, credits: 4.0, type: 'พื้นฐาน' },
  { prefix: 'ค', offset: '101', name: 'คณิตศาสตร์', area: 'คณิตศาสตร์', hours: 80, credits: 4.0, type: 'พื้นฐาน' },
  { prefix: 'ว', offset: '101', name: 'วิทยาศาสตร์', area: 'วิทยาศาสตร์และเทคโนโลยี', hours: 60, credits: 3.0, type: 'พื้นฐาน' },
  { prefix: 'ส', offset: '101', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hours: 40, credits: 2.0, type: 'พื้นฐาน' },
  { prefix: 'ส', offset: '102', name: 'ประวัติศาสตร์', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'พ', offset: '101', name: 'สุขศึกษาและพลศึกษา', area: 'สุขศึกษาและพลศึกษา', hours: 40, credits: 2.0, type: 'พื้นฐาน' },
  { prefix: 'ศ', offset: '101', name: 'ศิลปะ', area: 'ศิลปะ', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'ง', offset: '101', name: 'การงานอาชีพ', area: 'การงานอาชีพ', hours: 20, credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'อ', offset: '101', name: 'ภาษาต่างประเทศ', area: 'ภาษาต่างประเทศ', hours: 60, credits: 3.0, type: 'พื้นฐาน' },
];

const PRIMARY_UPPER_CIVIC_CODES = {
  'ป.4': 'ส14234',
  'ป.5': 'ส15235',
  'ป.6': 'ส16236',
};

function buildPrimaryCurriculum() {
  const list = [];
  ['ป.1', 'ป.2', 'ป.3'].forEach((grade, gIdx) => {
    const gDigit = `1${gIdx + 1}`;
    PRIMARY_LOWER_AREAS.forEach((item, idx) => {
      list.push({
        id: `cat-${grade}-${item.prefix}${gDigit}${item.offset}`,
        subject_code: `${item.prefix}${gDigit}${item.offset}`,
        subject_name: `${item.name}`,
        learning_area: item.area,
        grade_level: grade,
        subject_type: item.type,
        credits: item.credits,
        hours_per_semester: item.hours,
        hours_per_year: item.hours * 2,
        hours_per_week: Number((item.hours / 20).toFixed(1)),
        semester: '1-2',
        sort_order: idx + 1,
        curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (ประถมศึกษา 460 ชม./ภาค • 920 ชม./ปี)',
        is_active: true,
      });
    });
  });

  ['ป.4', 'ป.5', 'ป.6'].forEach((grade, gIdx) => {
    const gNum = gIdx + 4;
    const gDigit = `1${gNum}`;
    PRIMARY_UPPER_BASE.forEach((item, idx) => {
      list.push({
        id: `cat-${grade}-${item.prefix}${gDigit}${item.offset}`,
        subject_code: `${item.prefix}${gDigit}${item.offset}`,
        subject_name: `${item.name}`,
        learning_area: item.area,
        grade_level: grade,
        subject_type: item.type,
        credits: item.credits,
        hours_per_semester: item.hours,
        hours_per_year: item.hours * 2,
        hours_per_week: Number((item.hours / 20).toFixed(1)),
        semester: '1-2',
        sort_order: idx + 1,
        curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (ประถมศึกษา 460 ชม./ภาค • 920 ชม./ปี)',
        is_active: true,
      });
    });

    // รายวิชาเพิ่มเติมประจำชั้น ป.4-ป.6 จากไฟล์ต้นแบบ
    list.push({
      id: `cat-${grade}-${PRIMARY_UPPER_CIVIC_CODES[grade]}`,
      subject_code: PRIMARY_UPPER_CIVIC_CODES[grade],
      subject_name: 'หน้าที่พลเมือง',
      learning_area: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      grade_level: grade,
      subject_type: 'เพิ่มเติม',
      credits: 1.0,
      hours_per_semester: 20,
      hours_per_year: 40,
      hours_per_week: 1.0,
      semester: '1-2',
      sort_order: 10,
      curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (ประถมศึกษา)',
      is_active: true,
    });
    list.push({
      id: `cat-${grade}-ส${gDigit}201`,
      subject_code: `ส${gDigit}201`,
      subject_name: 'รักษ์ป่าน่าน',
      learning_area: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      grade_level: grade,
      subject_type: 'เพิ่มเติม',
      credits: 1.0,
      hours_per_semester: 20,
      hours_per_year: 40,
      hours_per_week: 1.0,
      semester: '1-2',
      sort_order: 11,
      curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (รายวิชาเพิ่มเติมท้องถิ่น)',
      is_active: true,
    });
  });

  return list;
}

const SECONDARY_SEM1_TEMPLATE = [
  { prefix: 'ท', basicCode: '101', name: 'ภาษาไทย', area: 'ภาษาไทย', credits: 2.0, type: 'พื้นฐาน' },
  { prefix: 'ค', basicCode: '101', name: 'คณิตศาสตร์', area: 'คณิตศาสตร์', credits: 1.5, type: 'พื้นฐาน' },
  { prefix: 'ว', basicCode: '101', name: 'วิทยาศาสตร์', area: 'วิทยาศาสตร์และเทคโนโลยี', credits: 1.5, type: 'พื้นฐาน' },
  { prefix: 'ว', basicCode: '103', name: 'เทคโนโลยี', area: 'วิทยาศาสตร์และเทคโนโลยี', credits: 0.5, type: 'พื้นฐาน' },
  { prefix: 'ส', basicCode: '101', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', credits: 1.5, type: 'พื้นฐาน' },
  { prefix: 'ส', basicCode: '102', name: 'ประวัติศาสตร์', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', credits: 0.5, type: 'พื้นฐาน' },
  { prefix: 'พ', basicCode: '101', name: 'สุขศึกษาและพลศึกษา', area: 'สุขศึกษาและพลศึกษา', credits: 1.0, type: 'พื้นฐาน' },
  { prefix: 'ศ', basicCode: '101', name: 'ศิลปะ', area: 'ศิลปะ', credits: 0.5, type: 'พื้นฐาน' },
  { prefix: 'ง', basicCode: '101', name: 'การงานอาชีพ', area: 'การงานอาชีพ', credits: 0.5, type: 'พื้นฐาน' },
  { prefix: 'อ', basicCode: '101', name: 'ภาษาอังกฤษ', area: 'ภาษาต่างประเทศ', credits: 1.5, type: 'พื้นฐาน' },
  { prefix: 'ค', basicCode: '201', name: 'คณิตศาสตร์เพิ่มเติม', area: 'คณิตศาสตร์', credits: 0.5, type: 'เพิ่มเติม' },
  { prefix: 'อ', basicCode: '201', name: 'อังกฤษเพิ่มเติม', area: 'ภาษาต่างประเทศ', credits: 0.5, type: 'เพิ่มเติม' },
];

function buildSecondaryCurriculum() {
  const list = [];
  ['ม.1', 'ม.2', 'ม.3'].forEach((grade, gIdx) => {
    const yearNum = gIdx + 1;
    const gDigit = `2${yearNum}`;
    // Semester 1 (รวม 13.5 หน่วยกิต ตามต้นแบบ ม.1-69 เทอม 1)
    SECONDARY_SEM1_TEMPLATE.forEach((item, idx) => {
      const code = `${item.prefix}${gDigit}${item.basicCode}`;
      const hrs = Math.round(item.credits * 40);
      list.push({
        id: `cat-${grade}-s1-${code}`,
        subject_code: code,
        subject_name: item.name,
        learning_area: item.area,
        grade_level: grade,
        subject_type: item.type,
        credits: item.credits,
        hours_per_semester: hrs,
        hours_per_year: hrs,
        hours_per_week: Number((item.credits * 2).toFixed(1)),
        semester: '1',
        sort_order: idx + 1,
        curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (มัธยมศึกษาตอนต้น)',
        is_active: true,
      });
    });

    // หน้าที่พลเมือง + งานอาชีพสารพัดช่าง (รหัสเฉพาะจากไฟล์ต้นแบบ ม.1 เทอม 1)
    const civicCode = yearNum === 1 ? 'ส21335' : yearNum === 2 ? 'ส22336' : 'ส23337';
    list.push({
      id: `cat-${grade}-s1-${civicCode}`,
      subject_code: civicCode,
      subject_name: 'หน้าที่พลเมือง',
      learning_area: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      grade_level: grade,
      subject_type: 'เพิ่มเติม',
      credits: 0.5,
      hours_per_semester: 20,
      hours_per_year: 20,
      hours_per_week: 1.0,
      semester: '1',
      sort_order: 13,
      curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (เพิ่มเติม)',
      is_active: true,
    });
    const craftCode = yearNum === 1 ? 'ง20201' : yearNum === 2 ? 'ง20202' : 'ง20203';
    list.push({
      id: `cat-${grade}-s1-${craftCode}`,
      subject_code: craftCode,
      subject_name: 'งานอาชีพสารพัดช่าง',
      learning_area: 'การงานอาชีพ',
      grade_level: grade,
      subject_type: 'เพิ่มเติม',
      credits: 1.0,
      hours_per_semester: 40,
      hours_per_year: 40,
      hours_per_week: 2.0,
      semester: '1',
      sort_order: 14,
      curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (เพิ่มเติม)',
      is_active: true,
    });

    // Semester 2 (รายวิชาภาคเรียนที่ 2 ม.1-ม.3)
    const sem2Basic = [
      { prefix: 'ท', codeEnd: '102', name: 'ภาษาไทย', area: 'ภาษาไทย', credits: 1.5, type: 'พื้นฐาน' },
      { prefix: 'ค', codeEnd: '102', name: 'คณิตศาสตร์', area: 'คณิตศาสตร์', credits: 1.5, type: 'พื้นฐาน' },
      { prefix: 'ว', codeEnd: '102', name: 'วิทยาศาสตร์', area: 'วิทยาศาสตร์และเทคโนโลยี', credits: 1.5, type: 'พื้นฐาน' },
      { prefix: 'ว', codeEnd: '104', name: 'การออกแบบและเทคโนโลยี', area: 'วิทยาศาสตร์และเทคโนโลยี', credits: 0.5, type: 'พื้นฐาน' },
      { prefix: 'ส', codeEnd: '103', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', credits: 1.5, type: 'พื้นฐาน' },
      { prefix: 'ส', codeEnd: '104', name: 'ประวัติศาสตร์', area: 'สังคมศึกษา ศาสนา และวัฒนธรรม', credits: 0.5, type: 'พื้นฐาน' },
      { prefix: 'พ', codeEnd: '102', name: 'สุขศึกษาและพลศึกษา', area: 'สุขศึกษาและพลศึกษา', credits: 1.0, type: 'พื้นฐาน' },
      { prefix: 'ศ', codeEnd: '102', name: 'ศิลปะ', area: 'ศิลปะ', credits: 0.5, type: 'พื้นฐาน' },
      { prefix: 'ง', codeEnd: '102', name: 'การงานอาชีพ', area: 'การงานอาชีพ', credits: 0.5, type: 'พื้นฐาน' },
      { prefix: 'อ', codeEnd: '102', name: 'ภาษาอังกฤษ', area: 'ภาษาต่างประเทศ', credits: 1.5, type: 'พื้นฐาน' },
    ];
    sem2Basic.forEach((item, idx) => {
      const code = `${item.prefix}${gDigit}${item.codeEnd}`;
      const hrs = Math.round(item.credits * 40);
      list.push({
        id: `cat-${grade}-s2-${code}`,
        subject_code: code,
        subject_name: item.name,
        learning_area: item.area,
        grade_level: grade,
        subject_type: item.type,
        credits: item.credits,
        hours_per_semester: hrs,
        hours_per_year: hrs,
        hours_per_week: Number((item.credits * 2).toFixed(1)),
        semester: '2',
        sort_order: idx + 15,
        curriculum_year: 'หลักสูตรสถานศึกษาโรงเรียนบ้านหาดเค็ด (มัธยมศึกษาตอนต้น ภาคเรียนที่ 2)',
        is_active: true,
      });
    });
  });
  return list;
}

export function getOfficialSchoolCurriculumCatalog() {
  const preschool = [
    {
      id: 'sub-kg-o3',
      subject_code: 'ปฐม03',
      subject_name: 'กิจกรรมเสริมประสบการณ์ อ.3',
      learning_area: 'การศึกษาปฐมวัย',
      grade_level: 'อ.3',
      subject_type: 'พื้นฐาน',
      credits: 1.0,
      hours_per_semester: 40,
      hours_per_year: 80,
      hours_per_week: 2.0,
      semester: '1-2',
      sort_order: 1,
      curriculum_year: 'หลักสูตรการศึกษาปฐมวัย 2560',
      is_active: true,
    },
  ];
  return [...preschool, ...buildPrimaryCurriculum(), ...buildSecondaryCurriculum()];
}
