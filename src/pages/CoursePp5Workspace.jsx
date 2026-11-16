import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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
import { Pp5CourseHeaderPanel } from '../components/pp5/Pp5CourseHeaderPanel';
import { Pp5ExtraReportsModal } from '../components/pp5/Pp5ExtraReportsModal';
import { exportPp5ToDocx, exportPp5ToExcel } from '../services/exportEngine';
import { dataService } from '../services/dataService';
import {
  calculateStudentAttendance,
  computeStudentCourseScores,
  computeCourseCompletion,
  resolveCourseStudents,
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
  const { settings, users, students, indicators, courses, saveCourse, saveAcademicDocument } = useSchoolData();

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
  const [extraModalMode, setExtraModalMode] = useState(null);
  const [pp6DraftUrl, setPp6DraftUrl] = useState('');

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

  const courseStudents = useMemo(
    () => resolveCourseStudents(course, students),
    [course, students]
  );

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
      const computed = computeStudentCourseScores(
        row,
        scoreStructure,
        attendanceStatsMap[stu.id],
        course?.total_hours || 40
      );
      map[stu.id] = {
        ...computed,
        unitScores: row.unit_scores || {},
      };
    });
    return map;
  }, [courseStudents, studentScores, scoreStructure, attendanceStatsMap, course?.total_hours]);

  const characteristicsMap = useMemo(() => {
    const map = {};
    characteristicsRows.forEach((r) => {
      map[r.student_id] = r;
    });
    return map;
  }, [characteristicsRows]);

  const completion = useMemo(
    () =>
      computeCourseCompletion(course, {
        students: courseStudents,
        scoreStructure,
        studentScores,
        attendanceRecords,
        characteristicsRows,
      }),
    [course, courseStudents, scoreStructure, studentScores, attendanceRecords, characteristicsRows]
  );

  const handleSaveCourseConfig = async (cfg) => {
    await saveCourse({
      ...course,
      academic_year: cfg.academic_year,
      semester: cfg.semester,
      grade_level: cfg.grade_level,
      classroom: cfg.classroom,
      subject_name: cfg.subject_name,
      subject_code: cfg.subject_code,
      credits: cfg.credits,
      total_hours: cfg.total_hours,
      cover_settings: {
        ...(course.cover_settings || {}),
        courseMetaOverrides: cfg.courseMetaOverrides,
      },
    });
    const nextStruct = {
      ...(scoreStructure || { course_id: course.id, units: [], grading_policy: {} }),
      formative_ratio: cfg.ratios.formative_ratio,
      midterm_ratio: cfg.ratios.midterm_ratio,
      final_ratio: cfg.ratios.final_ratio,
    };
    const savedStruct = await dataService.saveScoreStructure(course.id, nextStruct);
    setScoreStructure(savedStruct);
    setPp6DraftUrl('');
    setBanner('บันทึกข้อมูลรายวิชา สัดส่วนคะแนน และการตั้งค่าปกเรียบร้อยแล้ว');
  };

  const handleChangeStructureImmediate = async (patch) => {
    const prevPolicy = scoreStructure?.grading_policy || {};
    const nextStruct = {
      ...(scoreStructure || { course_id: course.id, formative_ratio: 60, midterm_ratio: 20, final_ratio: 20, units: [] }),
      ...(patch.formative_ratio !== undefined ? { formative_ratio: patch.formative_ratio } : {}),
      ...(patch.midterm_ratio !== undefined ? { midterm_ratio: patch.midterm_ratio } : {}),
      ...(patch.final_ratio !== undefined ? { final_ratio: patch.final_ratio } : {}),
      grading_policy: {
        ...prevPolicy,
        ...(patch.decisionPeriod !== undefined ? { decisionPeriod: patch.decisionPeriod } : {}),
        ...(patch.roundingMode !== undefined ? { roundingMode: patch.roundingMode } : {}),
      },
    };
    const savedStruct = await dataService.saveScoreStructure(course.id, nextStruct);
    setScoreStructure(savedStruct);
    if (patch.roundingMode) {
      const updatedRows = courseStudents.map((stu) => {
        const existing = studentScores.find((r) => r.student_id === stu.id) || { unit_scores: {} };
        const computed = computeStudentCourseScores(
          existing,
          savedStruct,
          attendanceStatsMap[stu.id],
          course?.total_hours || 40
        );
        return {
          course_id: course.id,
          student_id: stu.id,
          unit_scores: existing.unit_scores || {},
          formative_total: computed.formativeTotal,
          midterm_score: computed.midtermTotal,
          final_score: computed.finalTotal,
          total_score: computed.totalScore,
          grade: computed.grade,
          special_status: existing.special_status || null,
        };
      });
      if (updatedRows.length > 0) {
        const savedRows = await dataService.saveStudentScoresBatch(course.id, updatedRows);
        setStudentScores(savedRows);
      }
    }
    setBanner('อัปเดตเกณฑ์การวัดผลและคำนวณเกรดใหม่เรียบร้อยแล้ว');
  };

  const handleLoadSampleCourseData = async ({ gradeLevel, classroom, structureMode }) => {
    const targetRoomStudents = students.filter(
      (s) =>
        s.status === 'active' &&
        s.grade_level === gradeLevel &&
        String(s.classroom || '1') === String(classroom || '1')
    );
    const activeRoster = courseStudents.length > 0 ? courseStudents : targetRoomStudents.slice(0, 10);
    if (!activeRoster.length) {
      setBanner('ไม่พบรายชื่อนักเรียนสำหรับสร้างข้อมูลตัวอย่าง กรุณาวางรายชื่อก่อน');
      return;
    }

    const nextStruct = {
      ...(scoreStructure || { course_id: course.id, units: [], grading_policy: {} }),
      formative_ratio: structureMode.formative,
      midterm_ratio: structureMode.midterm,
      final_ratio: structureMode.final,
    };
    const savedStruct = await dataService.saveScoreStructure(course.id, nextStruct);
    setScoreStructure(savedStruct);

    const planHours = Number(course.total_hours || 40);
    const sampleRows = activeRoster.map((stu, idx) => {
      const seedOffset = (idx * 3) % 14;
      const i1 = Math.max(8, Math.min(15, 11 + ((idx + 1) % 4)));
      const i2 = Math.max(8, Math.min(15, 10 + ((idx + 2) % 5)));
      const i3 = Math.max(8, Math.min(15, 11 + (idx % 4)));
      const i4 = Math.max(8, Math.min(15, 12 + ((idx + 3) % 4)));
      const fVal = Math.min(structureMode.formative, Math.round(((i1 + i2 + i3 + i4) / 60) * structureMode.formative));
      const mVal = Math.min(structureMode.midterm, Math.max(10, structureMode.midterm - (seedOffset % 7)));
      const fnVal = Math.min(structureMode.final, Math.max(10, structureMode.final - ((seedOffset + 2) % 8)));

      const draft = {
        student_id: stu.id,
        unit_scores: {
          indicatorScores: { ind_1: i1, ind_2: i2, ind_3: i3, ind_4: i4 },
          __directFormative: fVal,
          __directMidterm: mVal,
          __directFinal: fnVal,
          __manualAttendanceHours: planHours,
        },
        special_status: null,
      };
      const computed = computeStudentCourseScores(
        draft,
        savedStruct,
        attendanceStatsMap[stu.id],
        planHours
      );
      return {
        course_id: course.id,
        student_id: stu.id,
        unit_scores: draft.unit_scores,
        formative_total: computed.formativeTotal,
        midterm_score: computed.midtermTotal,
        final_score: computed.finalTotal,
        total_score: computed.totalScore,
        grade: computed.grade,
        special_status: null,
      };
    });

    if (!(course.student_ids || []).length && activeRoster.length > 0) {
      await saveCourse({
        ...course,
        student_ids: activeRoster.map((s) => s.id),
      });
    }
    const savedScores = await dataService.saveStudentScoresBatch(course.id, sampleRows);
    setStudentScores(savedScores);
    setActiveTab('scores');
    setBanner(`โหลดข้อมูลตัวอย่าง (${activeRoster.length} คน) เรียบร้อยแล้ว`);
  };

  const handleCreatePp6Draft = async () => {
    const savedDoc = await saveAcademicDocument({
      id: `pp6-${course.grade_level}-${course.classroom}-${course.academic_year}-${course.semester}`.replace(/[^\wก-๙-]/g, '_'),
      doc_type: 'pp6_report',
      title: `ปพ.6 สมุดรายงานผลรายบุคคล ${course.grade_level}/${course.classroom} ภาค ${course.semester}/${course.academic_year}`,
      grade_level: course.grade_level,
      classroom: String(course.classroom || '1'),
      academic_year: String(course.academic_year || '2569'),
      semester: String(course.semester || '1'),
      completion_pct: 60,
      status: 'draft',
      payload: { sourceCourseId: course.id },
    });
    setPp6DraftUrl(`/documents/pp6_report/${savedDoc.id}`);
    setBanner(`สร้างร่างเอกสาร ปพ.6 สำหรับชั้น ${course.grade_level}/${course.classroom} (${courseStudents.length} คน) เรียบร้อยแล้ว`);
  };

  const handleApplyMergedAnnualScores = async (mergedRows) => {
    const nextStruct = {
      ...(scoreStructure || { course_id: course.id, formative_ratio: 100, midterm_ratio: 0, final_ratio: 0, units: [] }),
      formative_ratio: 100,
      midterm_ratio: 0,
      final_ratio: 0,
      grading_policy: {
        ...(scoreStructure?.grading_policy || {}),
        decisionPeriod: 'year',
      },
    };
    const savedStruct = await dataService.saveScoreStructure(course.id, nextStruct);
    setScoreStructure(savedStruct);

    const payload = mergedRows.map((m) => {
      const prev = studentScores.find((r) => r.student_id === m.student_id) || {};
      return {
        course_id: course.id,
        student_id: m.student_id,
        unit_scores: {
          ...(prev.unit_scores || {}),
          __directFormative: m.annualScore,
          __directMidterm: 0,
          __directFinal: 0,
        },
        formative_total: m.annualScore,
        midterm_score: 0,
        final_score: 0,
        total_score: m.annualScore,
        grade: m.annualGrade,
        special_status: m.special_status || null,
      };
    });
    const savedScores = await dataService.saveStudentScoresBatch(course.id, payload);
    setStudentScores(savedScores);
    setBanner('รวมคะแนน ปพ.5 ภาคเรียนที่ 1 + ภาคเรียนที่ 2 เป็นผลรายปีเรียบร้อยแล้ว');
  };

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
        <div className="no-print px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {banner}
          </span>
          {pp6DraftUrl && (
            <Link
              to={pp6DraftUrl}
              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
            >
              เปิดดูร่าง ปพ.6 →
            </Link>
          )}
        </div>
      )}

      {/* Enhanced Header Panel: Progress, PDPA, Sample Loader, 15-Field Metadata/Ratio & Download Bar */}
      <Pp5CourseHeaderPanel
        course={course}
        settings={settings}
        teacher={teacher}
        completion={completion}
        scoreStructure={scoreStructure}
        studentCount={courseStudents.length}
        onJumpToMissingItem={(tabId) => setActiveTab(tabId)}
        onSaveCourseConfig={handleSaveCourseConfig}
        onChangeStructureImmediate={handleChangeStructureImmediate}
        onLoadSampleCourseData={handleLoadSampleCourseData}
        onExportWord={() =>
          exportPp5ToDocx({
            course,
            teacher,
            settings,
            students: courseStudents,
            indicators: courseIndicators,
            scoreStructure,
            computedScoresMap,
            attendanceStatsMap,
            characteristicsMap,
          })
        }
        onExportExcel={() =>
          exportPp5ToExcel({
            course,
            teacher,
            settings,
            students: courseStudents,
            indicators: courseIndicators,
            attendanceRecords,
            scoreStructure,
            computedScoresMap,
            attendanceStatsMap,
            characteristicsMap,
          })
        }
        onOpenRankedModal={() => setExtraModalMode('ranked')}
        onOpenSlipsModal={() => setExtraModalMode('slips')}
      />

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
              allCourses={courses}
              allStudents={students}
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
              onSaveCourseObject={saveCourse}
              onSaveStructure={async (struct) => {
                const saved = await dataService.saveScoreStructure(course.id, struct);
                setScoreStructure(saved);
              }}
              onSaveScores={async (rows) => {
                const saved = await dataService.saveStudentScoresBatch(course.id, rows);
                setStudentScores(saved);
              }}
              onCreatePp6Draft={handleCreatePp6Draft}
              onOpenSemesterMerge={() => setExtraModalMode('merge')}
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

      <Pp5ExtraReportsModal
        mode={extraModalMode}
        onClose={() => setExtraModalMode(null)}
        course={course}
        allCourses={courses}
        settings={settings}
        teacher={teacher}
        students={courseStudents}
        scoreStructure={scoreStructure}
        computedScoresMap={computedScoresMap}
        attendanceStatsMap={attendanceStatsMap}
        characteristicsMap={characteristicsMap}
        onApplyMergedAnnualScores={handleApplyMergedAnnualScores}
      />
    </div>
  );
}
