import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  RefreshCw,
  Save,
  Send,
  ThumbsUp,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Award,
  Sparkles,
  CalendarDays,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSchoolData } from '../hooks/useSchoolData';
import { dataService } from '../services/dataService';
import {
  GRADE_LEVELS,
  LEVEL_LABELS,
  CLASSROOM_ACTIVITY_KEYS,
  PROMOTION_DECISION_OPTIONS,
  buildClassroomMatrix,
  buildClassroomTermOverview,
  getFullStudentName,
} from '../lib/thaiFormatting';
import {
  exportClassroomPp5ToExcel,
  exportClassroomPp5ToDocx,
  exportIndividualStudentReportToExcel,
  exportA4PagesToPdf,
} from '../services/exportEngine';
import { StatusBadge } from '../components/common/StatusBadge';
import { SchoolLogo } from '../components/layout/SchoolEmblem';
import { CourseCompletionBanner } from '../components/classroom/CourseCompletionBanner';
import { TermOverviewPanel } from '../components/classroom/TermOverviewPanel';
import { IndividualReportCardView } from '../components/classroom/IndividualReportCardView';

export function ClassroomPp5Page() {
  const { user } = useAuth();
  const { settings, users, students, subjects, courses, classroomSummaries, saveClassroomSummary } =
    useSchoolData();

  const [gradeLevel, setGradeLevel] = useState('ป.4');
  const [classroom, setClassroom] = useState('1');
  const [semesterFilter, setSemesterFilter] = useState(() => settings?.semester || '1');
  const [viewTab, setViewTab] = useState('matrix'); // 'matrix' | 'overview' | 'individual'
  const [allScores, setAllScores] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [scoreStructures, setScoreStructures] = useState([]);
  const [pulling, setPulling] = useState(false);
  const [savingMsg, setSavingMsg] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [exporting, setExporting] = useState('');
  const pagesRef = useRef(null);

  const loadSubjectBooksData = async () => {
    setPulling(true);
    try {
      const [sc, att, ch, st] = await Promise.all([
        dataService.fetchAllSchoolScores(),
        dataService.fetchAllSchoolAttendance(),
        dataService.fetchAllSchoolCharacteristics(),
        dataService.fetchAllSchoolScoreStructures(),
      ]);
      setAllScores(sc);
      setAllAttendance(att);
      setAllCharacteristics(ch);
      setScoreStructures(st);
    } finally {
      setPulling(false);
    }
  };

  useEffect(() => {
    loadSubjectBooksData();
  }, [courses]);

  const activeSemesterKey = semesterFilter === 'all' ? (settings?.semester || '1') : semesterFilter;

  const savedSummary = useMemo(() => {
    return (
      classroomSummaries.find(
        (c) =>
          c.grade_level === gradeLevel &&
          String(c.classroom || '1') === String(classroom || '1') &&
          c.academic_year === (settings?.academic_year || '2569') &&
          c.semester === activeSemesterKey
      ) || null
    );
  }, [classroomSummaries, gradeLevel, classroom, settings, activeSemesterKey]);

  const [decisionsDraft, setDecisionsDraft] = useState({});
  const [activitiesDraft, setActivitiesDraft] = useState({});
  const [classNotes, setClassNotes] = useState('');
  const [execComment, setExecComment] = useState('');

  useEffect(() => {
    setDecisionsDraft(savedSummary?.student_decisions || {});
    setActivitiesDraft(savedSummary?.activities_summary || {});
    setClassNotes(savedSummary?.class_notes || '');
    setExecComment(savedSummary?.executive_comment || '');
  }, [savedSummary, gradeLevel, classroom]);

  const effectiveSummary = useMemo(
    () => ({
      ...(savedSummary || {}),
      student_decisions: decisionsDraft,
      activities_summary: activitiesDraft,
      class_notes: classNotes,
      executive_comment: execComment,
    }),
    [savedSummary, decisionsDraft, activitiesDraft, classNotes, execComment]
  );

  const matrix = useMemo(
    () =>
      buildClassroomMatrix({
        students,
        gradeLevel,
        classroom,
        courses,
        subjects,
        semester: semesterFilter,
        allScores,
        allAttendance,
        allCharacteristics,
        scoreStructures,
        classroomSummary: effectiveSummary,
      }),
    [
      students,
      gradeLevel,
      classroom,
      courses,
      subjects,
      semesterFilter,
      allScores,
      allAttendance,
      allCharacteristics,
      scoreStructures,
      effectiveSummary,
    ]
  );

  const termOverview = useMemo(
    () =>
      buildClassroomTermOverview({
        students,
        gradeLevel,
        classroom,
        courses,
        subjects,
        allScores,
        allAttendance,
        allCharacteristics,
        scoreStructures,
      }),
    [students, gradeLevel, classroom, courses, subjects, allScores, allAttendance, allCharacteristics, scoreStructures]
  );

  const homeroomTeacher = useMemo(() => {
    if (savedSummary?.homeroom_teacher_id) {
      return users.find((u) => u.id === savedSummary.homeroom_teacher_id) || user;
    }
    return users.find((u) => u.homeroom_grade === gradeLevel) || user;
  }, [savedSummary, users, gradeLevel, user]);

  const handleDecisionChange = (studentId, value) => {
    setDecisionsDraft((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleActivityToggle = (studentId, actKey) => {
    setActivitiesDraft((prev) => {
      const cur = prev[studentId] || { guidance: 'ผ', scout: 'ผ', club: 'ผ', public_service: 'ผ' };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          [actKey]: cur[actKey] === 'มผ' ? 'ผ' : 'มผ',
        },
      };
    });
  };

  const confirmAllProposedDecisions = () => {
    const next = {};
    matrix.studentRows.forEach((row) => {
      next[row.student.id] = row.confirmedDecision || row.proposedDecision;
    });
    setDecisionsDraft(next);
    setSavingMsg('ยืนยันผลการตัดสินตามที่ระบบเสนอให้ครบทั้งห้องเรียบร้อย (กรุณากดบันทึกเพื่ออัปเดตฐานข้อมูล)');
  };

  const handleSave = async (nextStatus = savedSummary?.status || 'in_progress') => {
    await saveClassroomSummary({
      ...(savedSummary || {}),
      grade_level: gradeLevel,
      classroom,
      academic_year: settings?.academic_year || '2569',
      semester: activeSemesterKey,
      homeroom_teacher_id: homeroomTeacher?.id || user?.id || null,
      student_decisions: decisionsDraft,
      activities_summary: activitiesDraft,
      class_notes: classNotes,
      executive_comment: execComment,
      status: nextStatus,
      ...(nextStatus === 'approved'
        ? { approved_by: user?.id || null, approved_at: new Date().toISOString() }
        : {}),
    });
    setSavingMsg(
      nextStatus === 'submitted'
        ? 'บันทึกและส่ง ปพ.5 รายชั้นเรียนให้ผู้บริหารอนุมัติแล้ว'
        : nextStatus === 'approved'
        ? 'อนุมัติ ปพ.5 รายชั้นเรียนเรียบร้อยแล้ว'
        : 'บันทึก ปพ.5 รายชั้นเรียนเรียบร้อยแล้ว'
    );
  };

  const handlePdfExport = async () => {
    setShowPrintPreview(true);
    setExporting('pdf');
    setTimeout(async () => {
      try {
        const nodes = Array.from(pagesRef.current?.querySelectorAll('[data-pdf-page="true"]') || []);
        await exportA4PagesToPdf(nodes, `ปพ5_รายชั้น_${gradeLevel}-${classroom}_A4.pdf`);
      } finally {
        setExporting('');
      }
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="no-print rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-royal-800 text-white p-6 shadow-academic border border-gold-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/40">
              📘 ปพ.5 รายชั้นเรียน • แบบสรุปผลการเรียนประจำชั้นเรียน
            </span>
            <StatusBadge status={savedSummary?.status || 'in_progress'} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            สรุปผลการเรียนรวมทุกรายวิชา ชั้น {gradeLevel}/{classroom}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
            ครูประจำชั้นรวมผลจาก ปพ.5 รายวิชาอัตโนมัติ: GPA • ลำดับที่ • เวลาเรียน • อ่านคิดฯ • คุณลักษณะฯ • กิจกรรม • ระบบเสนอผลตัดสิน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadSubjectBooksData}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${pulling ? 'animate-spin' : ''}`} />
            ดึงผลจาก ปพ.5 รายวิชาล่าสุด
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs sm:text-sm font-bold shadow-sm"
          >
            <Save className="w-4 h-4" /> บันทึก ปพ.5 ชั้นเรียน
          </button>
        </div>
      </div>

      {/* Filter & Export Controls */}
      <div className="no-print bg-white rounded-2xl border border-ivory-300 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ระดับชั้น</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-navy-900 bg-ivory-50"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  ชั้น {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ห้อง</label>
            <input
              type="text"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              className="w-20 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ภาคเรียน / มุมมองเทอม</label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-navy-900 bg-ivory-50"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
              <option value="all">ภาพรวมทั้งปี (เทอม 1+2)</option>
            </select>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs">
            <div className="text-slate-500">ข้อมูลที่เชื่อมโยงอัตโนมัติ</div>
            <div className="font-bold text-navy-900">
              นักเรียน {matrix.roomStudents.length} คน • รายวิชา ปพ.5 {matrix.roomCourses.length} วิชา (ครบ 100%: {matrix.completionSummary.completedCount100}/{matrix.completionSummary.totalCourses})
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={confirmAllProposedDecisions}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-royal-50 hover:bg-purple-100 text-royal-800 border border-purple-200 text-xs font-bold"
          >
            <Sparkles className="w-4 h-4" /> ยืนยันผลตัดสินที่ระบบเสนอทั้งห้อง
          </button>
          <button
            type="button"
            onClick={() =>
              exportClassroomPp5ToExcel({
                settings,
                gradeLevel,
                classroom,
                homeroomTeacher,
                matrix,
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() =>
              exportClassroomPp5ToDocx({
                settings,
                gradeLevel,
                classroom,
                homeroomTeacher,
                matrix,
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-xs font-semibold"
          >
            <FileText className="w-4 h-4" /> Word/Google Docs (.docx)
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={exporting === 'pdf'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> {exporting === 'pdf' ? 'กำลังสร้าง PDF...' : 'PDF (A4)'}
          </button>
          <button
            type="button"
            onClick={() => setShowPrintPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ivory-100 hover:bg-navy-50 text-navy-900 border border-ivory-300 text-xs font-semibold"
          >
            <Printer className="w-4 h-4" /> {showPrintPreview ? 'ซ่อนใบพิมพ์ A4' : 'ดูแบบพิมพ์ A4'}
          </button>
        </div>
      </div>

      {savingMsg && (
        <div className="no-print px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {savingMsg}
        </div>
      )}

      {/* Homeroom Course Completion 100% Status Panel */}
      <CourseCompletionBanner
        completionSummary={matrix.completionSummary}
        gradeLevel={gradeLevel}
        classroom={classroom}
        semesterLabel={
          semesterFilter === 'all' ? 'ตลอดปีการศึกษา (เทอม 1+2)' : `ภาคเรียนที่ ${semesterFilter}`
        }
        users={users}
      />

      {/* View Sub-tabs */}
      <div className="no-print flex flex-wrap gap-2">
        {[
          { id: 'matrix', label: '1. ตารางสรุปคะแนนและเกรดรายชั้น', icon: BookOpen },
          { id: 'overview', label: '2. ภาพรวมแต่ละเทอม (เทอม 1 / 2 / ตลอดปี)', icon: CalendarDays },
          { id: 'individual', label: '3. ใบรายงานผลการเรียนรายบุคคล (ตามต้นแบบ ref/)', icon: UserCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = viewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                active
                  ? 'bg-navy-900 text-gold-300 border-navy-900 shadow-sm'
                  : 'bg-white text-slate-700 border-ivory-300 hover:bg-ivory-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {viewTab === 'overview' && (
        <TermOverviewPanel
          termOverview={termOverview}
          gradeLevel={gradeLevel}
          classroom={classroom}
          activeSemester={semesterFilter}
          onSelectSemester={(sem) => setSemesterFilter(sem)}
        />
      )}

      {viewTab === 'individual' && (
        <IndividualReportCardView
          settings={settings}
          gradeLevel={gradeLevel}
          classroom={classroom}
          semester={semesterFilter}
          homeroomTeacher={homeroomTeacher}
          matrix={matrix}
          termOverview={termOverview}
          onExportIndividualExcel={({ studentRow, annualCard }) =>
            exportIndividualStudentReportToExcel({
              settings,
              gradeLevel,
              classroom,
              semester: semesterFilter,
              homeroomTeacher,
              matrix,
              studentRow,
              annualCard,
            })
          }
        />
      )}

      {/* Main Classroom Matrix Table */}
      {viewTab === 'matrix' && (
      <div className="no-print space-y-6">
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-navy-900 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
            <BookOpen className="w-4 h-4 text-gold-400" />
            ตารางสรุปผลการเรียนประจำชั้นเรียน (รายชื่อ × ทุกรายวิชา)
          </h3>
          <span className="text-xs text-gold-200">
            คลิกช่องกิจกรรม เพื่อสลับ ผ / มผ • เลือกช่อง &quot;ครูยืนยัน&quot; เพื่ออนุมัติหรือปรับผลการตัดสิน
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
              <tr>
                <th className="py-2.5 px-2 text-center">ที่</th>
                <th className="py-2.5 px-3 text-left min-w-[165px]">ชื่อ - สกุล</th>
                {matrix.roomCourses.map((c) => {
                  const comp = matrix.courseCompletions?.[c.id];
                  return (
                    <th
                      key={c.id}
                      className="py-2 px-2 text-center border-l border-ivory-200 min-w-[88px]"
                    >
                      <div className="font-bold text-navy-900">{c.subject_code}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{c.subject_name}</div>
                      <div className="text-[10px] text-royal-700">
                        {c.credits} นก. •{' '}
                        <span className={comp?.isComplete ? 'text-emerald-700 font-bold' : 'text-amber-700 font-semibold'}>
                          {comp?.pct ?? 0}%
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-2 text-center bg-slate-100 border-l border-ivory-300">
                  รวมคะแนน (%)
                </th>
                <th className="py-2.5 px-2 text-center bg-navy-50 border-l border-ivory-300">GPA</th>
                <th className="py-2.5 px-2 text-center bg-navy-50">ลำดับ</th>
                <th className="py-2.5 px-2 text-center border-l border-ivory-200">เวลาเรียน</th>
                <th className="py-2.5 px-2 text-center">อ่านคิดฯ</th>
                <th className="py-2.5 px-2 text-center">คุณลักษณะฯ</th>
                {CLASSROOM_ACTIVITY_KEYS.map((act) => (
                  <th key={act.key} className="py-2 px-1.5 text-center border-l border-ivory-200">
                    {act.label}
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center bg-gold-50 border-l border-ivory-300 min-w-[130px]">
                  ระบบเสนอ
                </th>
                <th className="py-2.5 px-2 text-center bg-emerald-50 border-l border-ivory-300 min-w-[155px]">
                  ผลการตัดสิน (ครูยืนยัน)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {matrix.studentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11 + matrix.roomCourses.length}
                    className="py-10 text-center text-slate-500"
                  >
                    ยังไม่มีรายชื่อนักเรียนหรือสมุด ปพ.5 รายวิชาในชั้น {gradeLevel}/{classroom}
                  </td>
                </tr>
              ) : (
                matrix.studentRows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-ivory-50">
                    <td className="py-2 px-2 text-center text-slate-600">{row.no}</td>
                    <td className="py-2 px-3 font-medium text-navy-900">
                      {getFullStudentName(row.student)}
                    </td>
                    {matrix.roomCourses.map((c) => {
                      const sg = row.subjectGrades[c.id] || { grade: '-' };
                      const isBad = ['0', 'ร', 'มส'].includes(sg.grade);
                      return (
                        <td
                          key={c.id}
                          className={`py-2 px-2 text-center border-l border-ivory-200 font-bold ${
                            isBad ? 'text-rose-600 bg-rose-50/50' : 'text-navy-900'
                          }`}
                        >
                          <div>{sg.grade}</div>
                          {sg.totalScore !== null && sg.totalScore !== undefined && (
                            <div className="text-[10px] font-normal text-slate-400">({sg.totalScore})</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center bg-slate-50 border-l border-ivory-300 text-[11px]">
                      <div className="font-bold text-navy-900">
                        {row.totalRawScore || 0}/{row.totalMaxScore || 0}
                      </div>
                      <div className="text-[10px] text-slate-500">{row.scorePercentage}%</div>
                    </td>
                    <td className="py-2 px-2 text-center bg-navy-50/50 font-bold text-navy-900 border-l border-ivory-300">
                      {row.gpa.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center bg-navy-50/50 font-bold text-royal-700">
                      {row.rank}
                    </td>
                    <td className="py-2 px-2 text-center border-l border-ivory-200">
                      <span
                        className={`font-semibold ${
                          row.attendancePct < 80 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {row.attendancePct}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {LEVEL_LABELS[row.rtwLevel]?.label || 'ดีเยี่ยม'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {LEVEL_LABELS[row.traitsLevel]?.label || 'ดีเยี่ยม'}
                    </td>
                    {CLASSROOM_ACTIVITY_KEYS.map((act) => {
                      const val = row.activities[act.key] || 'ผ';
                      return (
                        <td key={act.key} className="py-1.5 px-1 text-center border-l border-ivory-200">
                          <button
                            type="button"
                            onClick={() => handleActivityToggle(row.student.id, act.key)}
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              val === 'มผ'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {val}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center bg-gold-50/50 border-l border-ivory-300 text-[11px] font-medium text-navy-900">
                      {row.proposedDecision}
                    </td>
                    <td className="py-1.5 px-2 border-l border-ivory-300 bg-emerald-50/30">
                      <select
                        value={row.confirmedDecision}
                        onChange={(e) => handleDecisionChange(row.student.id, e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-navy-900"
                      >
                        {PROMOTION_DECISION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject Summary & Approval Workflow */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-ivory-300 shadow-sm p-5">
          <h3 className="font-semibold text-navy-900 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-gold-600" />
            ตารางสรุปผลสัมฤทธิ์รายวิชาประจำชั้น {gradeLevel}/{classroom}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-2 px-2 text-left">รายวิชา</th>
                  <th className="py-2 px-2 text-center">นก.</th>
                  <th className="py-2 px-2 text-center">บันทึกผล</th>
                  <th className="py-2 px-2 text-center">เฉลี่ย</th>
                  {['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].map((g) => (
                    <th key={g} className="py-2 px-1.5 text-center">
                      {g}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center">% เกรด 3+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {matrix.subjectSummaries.map((s) => (
                  <tr key={s.course.id}>
                    <td className="py-2 px-2 font-medium text-navy-900">
                      {s.course.subject_code} {s.course.subject_name}
                    </td>
                    <td className="py-2 px-2 text-center">{s.course.credits}</td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.completion?.isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.completion?.isComplete ? 'ครบ 100%' : `${s.completion?.pct ?? 0}%`}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-navy-800">{s.avgScore}</td>
                    {['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].map((g) => (
                      <td key={g} className="py-2 px-1.5 text-center">
                        {s.buckets[g]}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center font-bold text-emerald-700">
                      {s.threePlusPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval & Notes Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-navy-900">การลงนามและเสนอขออนุมัติประจำชั้น</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุครูประจำชั้น</label>
            <textarea
              rows={2}
              value={classNotes}
              onChange={(e) => setClassNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              placeholder="สรุปข้อสังเกตผู้เรียนประจำห้อง..."
            />
          </div>
          <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 text-xs space-y-1">
            <div><b>ครูประจำชั้น:</b> {homeroomTeacher?.full_name || user?.full_name}</div>
            <div><b>หัวหน้าวิชาการ:</b> {settings?.academic_head_name || 'นายปิยะพันธุ์ ขันไร่'}</div>
            <div><b>ผู้อำนวยการ:</b> {settings?.director_name || 'นายเอกชัย สุภา'}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSave('submitted')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-bold"
            >
              <Send className="w-4 h-4" /> ส่งผู้บริหารอนุมัติ
            </button>
            {(user?.role === 'executive' || user?.role === 'admin') && (
              <>
                <button
                  type="button"
                  onClick={() => handleSave('approved')}
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <ThumbsUp className="w-4 h-4" /> อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('revision_requested')}
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  <RotateCcw className="w-4 h-4" /> ส่งแก้
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* A4 Print / PDF Sheet */}
      {showPrintPreview && (
        <div ref={pagesRef} className="space-y-6 flex flex-col items-center">
          <section
            data-pdf-page="true"
            data-orientation="landscape"
            className="font-official bg-white shadow-academic border border-slate-300 p-6 w-full max-w-[1050px] min-h-[720px] flex flex-col justify-between a4-landscape-section"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-navy-800 pb-2">
                <div className="flex items-center gap-3">
                  <SchoolLogo logoUrl={settings?.logo_url} className="w-12 h-12" />
                  <div>
                    <h3 className="text-lg font-bold text-navy-900">
                      ปพ.5 รายชั้นเรียน — แบบสรุปผลการเรียนประจำชั้น {gradeLevel}/{classroom}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {settings?.school_name} ({settings?.affiliation_short}) • ปีการศึกษา {settings?.academic_year}{' '}
                      {semesterFilter === 'all' ? 'ทั้งปีการศึกษา (เทอม 1+2)' : `ภาคเรียนที่ ${semesterFilter}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print px-3 py-1.5 rounded-lg bg-navy-800 text-gold-300 text-xs font-semibold"
                >
                  พิมพ์หน้า A4 นี้
                </button>
              </div>

              <table className="w-full text-[10px] border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-700 py-1 px-1">ที่</th>
                    <th className="border border-slate-700 py-1 px-2 text-left">ชื่อ - สกุล</th>
                    {matrix.roomCourses.map((c) => (
                      <th key={c.id} className="border border-slate-700 py-1 px-1">
                        {c.subject_code}
                      </th>
                    ))}
                    <th className="border border-slate-700 py-1 px-1">GPA</th>
                    <th className="border border-slate-700 py-1 px-1">ลำดับ</th>
                    <th className="border border-slate-700 py-1 px-1">เวลา(%)</th>
                    <th className="border border-slate-700 py-1 px-1">อ่านคิดฯ</th>
                    <th className="border border-slate-700 py-1 px-1">คุณลักษณะ</th>
                    <th className="border border-slate-700 py-1 px-1">กิจกรรม</th>
                    <th className="border border-slate-700 py-1 px-1">ผลการตัดสิน</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.studentRows.map((row) => (
                    <tr key={row.student.id}>
                      <td className="border border-slate-700 py-1 px-1 text-center">{row.no}</td>
                      <td className="border border-slate-700 py-1 px-2">{getFullStudentName(row.student)}</td>
                      {matrix.roomCourses.map((c) => (
                        <td key={c.id} className="border border-slate-700 py-1 px-1 text-center font-bold">
                          {row.subjectGrades[c.id]?.grade ?? '-'}
                        </td>
                      ))}
                      <td className="border border-slate-700 py-1 px-1 text-center font-bold">{row.gpa.toFixed(2)}</td>
                      <td className="border border-slate-700 py-1 px-1 text-center">{row.rank}</td>
                      <td className="border border-slate-700 py-1 px-1 text-center">{row.attendancePct}%</td>
                      <td className="border border-slate-700 py-1 px-1 text-center">
                        {LEVEL_LABELS[row.rtwLevel]?.label}
                      </td>
                      <td className="border border-slate-700 py-1 px-1 text-center">
                        {LEVEL_LABELS[row.traitsLevel]?.label}
                      </td>
                      <td className="border border-slate-700 py-1 px-1 text-center">
                        {row.activitiesPass ? 'ผ่าน' : 'มผ'}
                      </td>
                      <td className="border border-slate-700 py-1 px-1 text-center font-semibold">
                        {row.confirmedDecision}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-6">
              <div>
                <p>ลงชื่อ......................................</p>
                <p>({homeroomTeacher?.full_name || 'ครูประจำชั้น'})</p>
                <p>ครูประจำชั้น {gradeLevel}/{classroom}</p>
              </div>
              <div>
                <p>ลงชื่อ......................................</p>
                <p>({settings?.academic_head_name || 'หัวหน้าวิชาการ'})</p>
                <p>หัวหน้ากลุ่มบริหารงานวิชาการ</p>
              </div>
              <div>
                <p>ลงชื่อ......................................</p>
                <p className="font-bold">({settings?.director_name || 'นายเอกชัย สุภา'})</p>
                <p>{settings?.director_title}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
