import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  Calculator,
  HeartHandshake,
  LayoutTemplate,
  Download,
  Send,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { dataService } from '../services/dataService';
import {
  calculateStudentAttendance,
  computeStudentCourseScores,
  getFullStudentName,
} from '../lib/thaiFormatting';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { AttendanceTab } from '../components/pp5/AttendanceTab';
import { ScoreStructureTab } from '../components/pp5/ScoreStructureTab';
import { CharacteristicsTab } from '../components/pp5/CharacteristicsTab';
import { CoverCustomizerTab } from '../components/pp5/CoverCustomizerTab';
import { ExportReportTab } from '../components/pp5/ExportReportTab';

export function CoursePp5Workspace() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { settings, users, students, indicators, courses, saveCourse } = useSchoolData();

  const course = useMemo(() => courses.find((c) => c.id === courseId) || null, [courses, courseId]);
  const teacher = useMemo(
    () => users.find((u) => u.id === course?.teacher_id) || null,
    [users, course]
  );

  const [activeTab, setActiveTab] = useState('attendance');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [scoreStructure, setScoreStructure] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentScores, setStudentScores] = useState([]);
  const [characteristicsRows, setCharacteristicsRows] = useState([]);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [banner, setBanner] = useState('');

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    setLoadingDetails(true);
    dataService
      .fetchCourseDetails(courseId)
      .then((details) => {
        if (!active) return;
        setScoreStructure(details.scoreStructure);
        setAttendanceRecords(details.attendance);
        setStudentScores(details.studentScores);
        setCharacteristicsRows(details.characteristicsScores);
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const courseStudents = useMemo(() => {
    if (!course) return [];
    const ids = new Set(course.student_ids || []);
    return students
      .filter((s) => ids.has(s.id))
      .sort((a, b) => (a.student_number || 0) - (b.student_number || 0));
  }, [course, students]);

  const courseIndicators = useMemo(() => {
    if (!course) return [];
    const ids = new Set(course.selected_indicator_ids || []);
    return indicators.filter((i) => ids.has(i.id));
  }, [course, indicators]);

  const attendanceStatsMap = useMemo(() => {
    const map = {};
    const minPct = Number(scoreStructure?.grading_policy?.minAttendancePct ?? 80);
    courseStudents.forEach((stu) => {
      const stuAtt = attendanceRecords.filter((a) => a.student_id === stu.id);
      map[stu.id] = calculateStudentAttendance(stuAtt, course?.total_hours || 40, minPct);
    });
    return map;
  }, [courseStudents, attendanceRecords, course?.total_hours, scoreStructure]);

  const computedScoresMap = useMemo(() => {
    const map = {};
    courseStudents.forEach((stu) => {
      const row = studentScores.find((r) => r.student_id === stu.id) || { unit_scores: {} };
      const computed = computeStudentCourseScores(row, scoreStructure, attendanceStatsMap[stu.id]);
      map[stu.id] = {
        ...computed,
        unitScores: row.unit_scores || {},
      };
    });
    return map;
  }, [courseStudents, studentScores, scoreStructure, attendanceStatsMap]);

  const characteristicsMap = useMemo(() => {
    const map = {};
    characteristicsRows.forEach((r) => {
      map[r.student_id] = r;
    });
    return map;
  }, [characteristicsRows]);

  if (!course) {
    return (
      <div className="bg-white rounded-2xl border border-ivory-300 p-10 text-center space-y-3">
        <p className="text-lg font-semibold text-navy-900">ไม่พบสมุดบันทึก ปพ.5 ที่ต้องการ</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl bg-navy-800 text-gold-300 text-sm font-semibold"
        >
          ย้อนกลับ
        </button>
      </div>
    );
  }

  const handleSubmitToExecutive = async () => {
    await saveCourse({
      ...course,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });
    setBanner('ส่งสมุดบันทึก ปพ.5 ให้ผู้บริหารสถานศึกษาตรวจอนุมัติเรียบร้อยแล้ว');
  };

  const toggleRosterStudent = async (stuId) => {
    const current = course.student_ids || [];
    const next = current.includes(stuId)
      ? current.filter((id) => id !== stuId)
      : [...current, stuId];
    await saveCourse({ ...course, student_ids: next });
  };

  const tabs = [
    { id: 'attendance', label: '1. เช็คชื่อ & เวลาเรียน', icon: CalendarCheck },
    { id: 'scores', label: '2. โครงสร้างคะแนน ตัวชี้วัด & ตัดเกรด', icon: Calculator },
    { id: 'characteristics', label: '3. คุณลักษณะฯ 8 ประการ & อ่านคิดเขียน', icon: HeartHandshake },
    { id: 'cover', label: '4. ตั้งค่าหน้าปก ปพ.5', icon: LayoutTemplate },
    { id: 'export', label: '5. Export รายงาน (.xlsx / .docx / PDF)', icon: Download },
  ];

  return (
    <div className="space-y-5">
      {/* Course Workspace Top Card */}
      <div className="no-print bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้ารวม
            </button>
            <span className="px-2.5 py-0.5 rounded-lg bg-navy-800 text-gold-300 text-xs font-bold">
              {course.subject_code}
            </span>
            <StatusBadge status={course.status} />
          </div>
          <h2 className="text-xl font-bold text-navy-900">
            {course.subject_name} (ชั้น {course.grade_level}/{course.classroom})
          </h2>
          <p className="text-xs text-slate-500">
            กลุ่มสาระฯ {course.learning_area} • {course.credits} หน่วยกิต ({course.total_hours} ชม.) • ครูผู้สอน: {teacher?.full_name || '-'} • นักเรียน {courseStudents.length} คน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRosterOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ivory-100 hover:bg-navy-50 text-navy-800 border border-ivory-300 text-xs font-semibold"
          >
            <Users className="w-4 h-4" /> ปรับรายชื่อนักเรียน ({courseStudents.length})
          </button>
          <button
            type="button"
            onClick={handleSubmitToExecutive}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm"
          >
            <Send className="w-4 h-4" /> ส่ง ปพ.5 ให้ผู้บริหารอนุมัติ
          </button>
        </div>
      </div>

      {banner && (
        <div className="no-print px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {banner}
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="no-print flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                activeTab === tab.id
                  ? 'bg-navy-800 text-gold-300 border-navy-800 shadow-sm'
                  : 'bg-white text-slate-700 border-ivory-300 hover:bg-navy-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loadingDetails ? (
        <div className="bg-white rounded-2xl border border-ivory-300 p-12 text-center text-sm text-slate-500">
          กำลังโหลดสมุดบันทึก ปพ.5...
        </div>
      ) : (
        <>
          {activeTab === 'attendance' && (
            <AttendanceTab
              course={course}
              students={courseStudents}
              attendanceRecords={attendanceRecords}
              minAttendancePct={scoreStructure?.grading_policy?.minAttendancePct ?? 80}
              onSaveBatch={async (records) => {
                const updated = await dataService.saveAttendanceBatch(course.id, records);
                setAttendanceRecords(updated);
              }}
              onDeleteSession={async (date, period) => {
                const updated = await dataService.deleteAttendanceSession(course.id, date, period);
                setAttendanceRecords(updated);
              }}
            />
          )}

          {activeTab === 'scores' && (
            <ScoreStructureTab
              course={course}
              students={courseStudents}
              allIndicators={indicators}
              scoreStructure={scoreStructure}
              studentScores={studentScores}
              attendanceStatsMap={attendanceStatsMap}
              onUpdateCourseIndicators={async (payload) => {
                if (Array.isArray(payload)) {
                  await saveCourse({ ...course, selected_indicator_ids: payload });
                } else {
                  await saveCourse({
                    ...course,
                    selected_indicator_ids: payload.selected_indicator_ids ?? course.selected_indicator_ids,
                    custom_indicators_text: payload.custom_indicators_text ?? course.custom_indicators_text,
                    indicators_status: payload.indicators_status ?? course.indicators_status,
                  });
                }
              }}
              onSaveStructure={async (struct) => {
                const saved = await dataService.saveScoreStructure(course.id, struct);
                setScoreStructure(saved);
              }}
              onSaveScores={async (rows) => {
                const saved = await dataService.saveStudentScoresBatch(course.id, rows);
                setStudentScores(saved);
              }}
            />
          )}

          {activeTab === 'characteristics' && (
            <CharacteristicsTab
              courseId={course.id}
              students={courseStudents}
              characteristicsRows={characteristicsRows}
              onSaveCharacteristics={async (rows) => {
                const saved = await dataService.saveCharacteristicsBatch(course.id, rows);
                setCharacteristicsRows(saved);
              }}
            />
          )}

          {activeTab === 'cover' && (
            <CoverCustomizerTab
              course={course}
              teacher={teacher}
              settings={settings}
              students={courseStudents}
              computedScoresMap={computedScoresMap}
              characteristicsMap={characteristicsMap}
              onSaveCoverSettings={async (layout) => {
                await saveCourse({ ...course, cover_settings: layout });
              }}
            />
          )}

          {activeTab === 'export' && (
            <ExportReportTab
              course={course}
              teacher={teacher}
              settings={settings}
              students={courseStudents}
              indicators={courseIndicators}
              attendanceRecords={attendanceRecords}
              scoreStructure={scoreStructure}
              computedScoresMap={computedScoresMap}
              attendanceStatsMap={attendanceStatsMap}
              characteristicsMap={characteristicsMap}
            />
          )}
        </>
      )}

      {/* Modal: Adjust Enrolled Students from Central DB */}
      <Modal
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
        title={`ปรับรายชื่อนักเรียนในรายวิชา (ฐานข้อมูลกลางชั้น ${course.grade_level})`}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            ติ๊กเลือก/นำออกรายชื่อนักเรียนจากฐานข้อมูลส่วนกลางของโรงเรียน (กรณีรับย้ายเข้า-ออกกลางภาค หรือวิชาเลือกเสรี)
          </p>
          <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
            {students
              .filter((s) => s.grade_level === course.grade_level)
              .map((stu) => (
                <label
                  key={stu.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-ivory-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={(course.student_ids || []).includes(stu.id)}
                      onChange={() => toggleRosterStudent(stu.id)}
                    />
                    <span className="font-medium text-navy-900">{getFullStudentName(stu)}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    ห้อง {stu.classroom} • เลขที่ {stu.student_number}
                  </span>
                </label>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
