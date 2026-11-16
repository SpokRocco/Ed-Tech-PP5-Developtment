import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, X } from 'lucide-react';
import {
  buildRankedCourseReport,
  getFullStudentName,
  LEVEL_LABELS,
  mergeSemesterCourseData,
} from '../../lib/thaiFormatting';
import {
  exportIndividualSlipsToDocx,
  exportRankedSummaryToDocx,
  exportRankedSummaryToExcel,
} from '../../services/exportEngine';
import { ROUNDING_OPTIONS } from '../../services/scoringConfigAdapter';
import { dataService } from '../../services/dataService';

export function Pp5ExtraReportsModal({
  mode, // null | 'ranked' | 'slips' | 'merge'
  onClose,
  course,
  allCourses = [],
  settings,
  teacher,
  students = [],
  scoreStructure,
  computedScoresMap = {},
  attendanceStatsMap = {},
  characteristicsMap = {},
  onApplyMergedAnnualScores,
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [busyExport, setBusyExport] = useState('');

  // State for Semester Merge modal
  const matchingCoursePairs = useMemo(() => {
    const sameSubject = (allCourses || []).filter(
      (c) =>
        c.grade_level === course?.grade_level &&
        String(c.classroom || '1') === String(course?.classroom || '1')
    );
    return sameSubject.length > 0 ? sameSubject : allCourses || [];
  }, [allCourses, course]);

  const [sem1CourseId, setSem1CourseId] = useState('');
  const [sem2CourseId, setSem2CourseId] = useState('');
  const [sem1Scores, setSem1Scores] = useState([]);
  const [sem2Scores, setSem2Scores] = useState([]);
  const [loadingMerge, setLoadingMerge] = useState(false);

  useEffect(() => {
    if (mode !== 'merge') return;
    const sameCode = matchingCoursePairs.filter(
      (c) => String(c.subject_code || '').trim() === String(course?.subject_code || '').trim()
    );
    const pool = sameCode.length > 0 ? sameCode : matchingCoursePairs;
    const c1 = pool.find((c) => String(c.semester) === '1') || course;
    const c2 = pool.find((c) => String(c.semester) === '2') || course;
    setSem1CourseId(c1?.id || '');
    setSem2CourseId(c2?.id || '');
  }, [mode, matchingCoursePairs, course]);

  useEffect(() => {
    if (mode !== 'merge' || (!sem1CourseId && !sem2CourseId)) return;
    let alive = true;
    setLoadingMerge(true);
    Promise.all([
      sem1CourseId ? dataService.fetchCourseDetails(sem1CourseId) : Promise.resolve({ studentScores: [] }),
      sem2CourseId ? dataService.fetchCourseDetails(sem2CourseId) : Promise.resolve({ studentScores: [] }),
    ])
      .then(([d1, d2]) => {
        if (!alive) return;
        setSem1Scores(d1?.studentScores || []);
        setSem2Scores(d2?.studentScores || []);
      })
      .finally(() => {
        if (alive) setLoadingMerge(false);
      });
    return () => {
      alive = false;
    };
  }, [mode, sem1CourseId, sem2CourseId]);

  const roundingMode = scoreStructure?.grading_policy?.roundingMode || 'none';
  const roundingMeta = ROUNDING_OPTIONS.find((r) => r.id === roundingMode) || ROUNDING_OPTIONS[0];
  const ov = course?.cover_settings?.courseMetaOverrides || {};
  const schoolName = ov.school_name || settings?.school_name || 'โรงเรียนบ้านหาดเค็ด';
  const teacherName = ov.teacher_name || teacher?.full_name || '-';

  const rankedReport = useMemo(
    () =>
      buildRankedCourseReport({
        course,
        students,
        computedScoresMap,
        attendanceStatsMap,
        characteristicsMap,
      }),
    [course, students, computedScoresMap, attendanceStatsMap, characteristicsMap]
  );

  const visibleSlipStudents = useMemo(() => {
    if (selectedStudentId === 'all') return students;
    return students.filter((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const mergedRows = useMemo(
    () =>
      mergeSemesterCourseData({
        students,
        sem1Scores,
        sem2Scores,
        roundingMode,
        minAttendancePct: scoreStructure?.grading_policy?.minAttendancePct ?? 80,
      }),
    [students, sem1Scores, sem2Scores, roundingMode, scoreStructure]
  );

  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-navy-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base">
              {mode === 'ranked' && '📈 แบบสรุปคะแนนรายชั้นเรียน (เรียงอันดับจากคะแนนสูงสุด)'}
              {mode === 'slips' && '💌 ใบแจ้งผลการเรียนรายบุคคล (สำหรับแจกผู้ปกครอง/นักเรียน)'}
              {mode === 'merge' && '🧩 รวม ปพ.5 ภาคเรียนที่ 1 + ภาคเรียนที่ 2 → เล่มรายปี'}
            </h3>
            <p className="text-[11px] text-gold-200 mt-0.5">
              {course?.subject_code} {course?.subject_name} • ชั้น {course?.grade_level}/{course?.classroom} • ปีการศึกษา {course?.academic_year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 bg-ivory-50 border-b border-ivory-200 flex flex-wrap items-center justify-between gap-2">
          {mode === 'ranked' && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-ivory-300">
                  ค่าเฉลี่ย <b>{rankedReport.stats.mean}</b>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-ivory-300">
                  S.D. <b>{rankedReport.stats.sd}</b>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-ivory-300">
                  สูงสุด <b>{rankedReport.stats.max}</b> / ต่ำสุด <b>{rankedReport.stats.min}</b>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                  ผ่านเกณฑ์ <b>{rankedReport.stats.passedCount}/{rankedReport.stats.count}</b> ({rankedReport.stats.passPct}%)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyExport === 'docx'}
                  onClick={async () => {
                    setBusyExport('docx');
                    try {
                      await exportRankedSummaryToDocx({
                        course,
                        settings,
                        teacher,
                        scoreStructure,
                        rankedReport,
                      });
                    } finally {
                      setBusyExport('');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-xs font-bold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  ไฟล์ Word (.docx)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportRankedSummaryToExcel({
                      course,
                      settings,
                      teacher,
                      scoreStructure,
                      rankedReport,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ไฟล์ Excel (.xlsx)
                </button>
              </div>
            </>
          )}

          {mode === 'slips' && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-navy-900">เลือกนักเรียน:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-medium text-navy-900"
                >
                  <option value="all">ทั้งหมด ({students.length} คน)</option>
                  {students.map((stu, idx) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.student_number || idx + 1}. {getFullStudentName(stu)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyExport === 'slips-docx' || !visibleSlipStudents.length}
                  onClick={async () => {
                    setBusyExport('slips-docx');
                    try {
                      await exportIndividualSlipsToDocx({
                        course,
                        settings,
                        teacher,
                        scoreStructure,
                        students: visibleSlipStudents,
                        computedScoresMap,
                        attendanceStatsMap,
                        characteristicsMap,
                      });
                    } finally {
                      setBusyExport('');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลด Word (.docx)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์ใบแจ้งผล
                </button>
              </div>
            </>
          )}

          {mode === 'merge' && (
            <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <label className="font-semibold text-navy-900">ภาคเรียนที่ 1:</label>
                <select
                  value={sem1CourseId}
                  onChange={(e) => setSem1CourseId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white max-w-[230px]"
                >
                  {matchingCoursePairs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject_code} (ภาค {c.semester}/{c.academic_year}) {c.subject_name}
                    </option>
                  ))}
                </select>
                <label className="font-semibold text-navy-900 ml-1">ภาคเรียนที่ 2:</label>
                <select
                  value={sem2CourseId}
                  onChange={(e) => setSem2CourseId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white max-w-[230px]"
                >
                  {matchingCoursePairs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject_code} (ภาค {c.semester}/{c.academic_year}) {c.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={loadingMerge || !mergedRows.length}
                onClick={async () => {
                  await onApplyMergedAnnualScores(mergedRows);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50"
              >
                ✓ นำผลเฉลี่ยรายปีเข้าเล่มนี้ ({mergedRows.length} คน)
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white">
          {mode === 'ranked' && (
            <>
              <div className="overflow-x-auto border border-ivory-300 rounded-xl">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                    <tr>
                      <th className="py-2.5 px-3 text-center">อันดับ</th>
                      <th className="py-2.5 px-2 text-center">เลขที่</th>
                      <th className="py-2.5 px-2 text-center">รหัส</th>
                      <th className="py-2.5 px-3 text-left">ชื่อ - สกุล</th>
                      <th className="py-2.5 px-2 text-center">เวลาเรียน</th>
                      <th className="py-2.5 px-2 text-center">เก็บ</th>
                      <th className="py-2.5 px-2 text-center">กลางภาค</th>
                      <th className="py-2.5 px-2 text-center">ปลายภาค</th>
                      <th className="py-2.5 px-3 text-center bg-navy-50 font-bold">รวม</th>
                      <th className="py-2.5 px-3 text-center bg-navy-50 font-bold">เกรด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {rankedReport.rankedRows.map((r) => (
                      <tr key={r.student.id} className="hover:bg-ivory-50">
                        <td className="py-2 px-3 text-center font-bold text-royal-800">{r.rank}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{r.no}</td>
                        <td className="py-2 px-2 text-center font-mono text-xs">{r.student_code}</td>
                        <td className="py-2 px-3 font-medium text-navy-900">{r.fullName}</td>
                        <td className="py-2 px-2 text-center">{r.attendancePct}%</td>
                        <td className="py-2 px-2 text-center">{r.formativeTotal}</td>
                        <td className="py-2 px-2 text-center">{r.midtermTotal}</td>
                        <td className="py-2 px-2 text-center">{r.finalTotal}</td>
                        <td className="py-2 px-3 text-center font-bold bg-navy-50/40">{r.totalScore}</td>
                        <td className="py-2 px-3 text-center font-bold bg-navy-50/40">
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs ${
                              ['0', 'ร', 'มส'].includes(r.grade)
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {r.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500">{roundingMeta.footnote}</p>
            </>
          )}

          {mode === 'slips' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleSlipStudents.map((stu, idx) => {
                const computed = computedScoresMap[stu.id] || {};
                const att = attendanceStatsMap[stu.id] || { attendancePct: 100 };
                const ch = characteristicsMap[stu.id] || {};
                const effectiveAtt = computed.effectiveAttendancePct ?? att.attendancePct ?? 100;
                return (
                  <div
                    key={stu.id}
                    className="font-official border-2 border-navy-200 rounded-2xl p-5 bg-white shadow-sm space-y-3"
                  >
                    <div className="text-center border-b border-ivory-200 pb-2">
                      <div className="font-bold text-navy-900 text-sm">
                        ใบแจ้งผลการเรียนประจำรายวิชา (แจ้งผู้ปกครอง)
                      </div>
                      <div className="text-xs text-slate-600">{schoolName}</div>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <b>ชื่อ-สกุล:</b> {getFullStudentName(stu)} (เลขที่ {stu.student_number || idx + 1})
                      </div>
                      <div>
                        <b>รายวิชา:</b> {course?.subject_code} {course?.subject_name} • ชั้น {course?.grade_level}/{course?.classroom}
                      </div>
                      <div>
                        <b>ภาคเรียนที่:</b> {course?.semester}/{course?.academic_year} • <b>ครูผู้สอน:</b> {teacherName}
                      </div>
                    </div>
                    <table className="w-full text-xs border-collapse border border-slate-400 text-center">
                      <thead className="bg-ivory-100">
                        <tr>
                          <th className="border border-slate-400 py-1">เวลา(%)</th>
                          <th className="border border-slate-400 py-1">เก็บ</th>
                          <th className="border border-slate-400 py-1">กลาง</th>
                          <th className="border border-slate-400 py-1">ปลาย</th>
                          <th className="border border-slate-400 py-1">รวม</th>
                          <th className="border border-slate-400 py-1">เกรด</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-400 py-1.5">{effectiveAtt}%</td>
                          <td className="border border-slate-400 py-1.5">{computed.formativeTotal ?? 0}</td>
                          <td className="border border-slate-400 py-1.5">{computed.midtermTotal ?? 0}</td>
                          <td className="border border-slate-400 py-1.5">{computed.finalTotal ?? 0}</td>
                          <td className="border border-slate-400 py-1.5 font-bold">{computed.totalScore ?? 0}</td>
                          <td className="border border-slate-400 py-1.5 font-bold text-navy-900 text-sm">
                            {computed.grade ?? '0'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="text-[11px] text-slate-600 flex justify-between">
                      <span>คุณลักษณะฯ: <b>{LEVEL_LABELS[ch.traits_level ?? 3]?.label || 'ดีเยี่ยม'}</b></span>
                      <span>อ่านคิดเขียน: <b>{LEVEL_LABELS[ch.rtw_level ?? 3]?.label || 'ดีเยี่ยม'}</b></span>
                    </div>
                    <div className="pt-2 border-t border-ivory-200 flex justify-between text-[11px] text-slate-500">
                      <span>ลงชื่อครูผู้สอน: {teacherName}</span>
                      <span>ลงชื่อผู้ปกครอง: .........................</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'merge' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                ระบบนำคะแนนรวมภาคเรียนที่ 1 และภาคเรียนที่ 2 มาหาค่าเฉลี่ยรายปี (และใช้วิธีปัดคะแนน: <b>{roundingMeta.label}</b>) เพื่อบันทึกเป็นคะแนนรายปีลงเล่มนี้
              </p>
              {loadingMerge ? (
                <div className="py-8 text-center text-xs text-slate-500">กำลังโหลดคะแนนทั้ง 2 ภาคเรียน...</div>
              ) : (
                <div className="overflow-x-auto border border-ivory-300 rounded-xl">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                      <tr>
                        <th className="py-2 px-3 text-center">เลขที่</th>
                        <th className="py-2 px-3 text-left">ชื่อ - สกุล</th>
                        <th className="py-2 px-3 text-center">ภาค 1 (100)</th>
                        <th className="py-2 px-3 text-center">ภาค 2 (100)</th>
                        <th className="py-2 px-3 text-center bg-navy-50 font-bold">เฉลี่ยรายปี</th>
                        <th className="py-2 px-3 text-center bg-navy-50 font-bold">เกรดรายปี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-200">
                      {students.map((stu, idx) => {
                        const m = mergedRows.find((r) => r.student_id === stu.id) || {};
                        return (
                          <tr key={stu.id} className="hover:bg-ivory-50">
                            <td className="py-2 px-3 text-center">{stu.student_number || idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-navy-900">{getFullStudentName(stu)}</td>
                            <td className="py-2 px-3 text-center">{m.sem1Score ?? '-'}</td>
                            <td className="py-2 px-3 text-center">{m.sem2Score ?? '-'}</td>
                            <td className="py-2 px-3 text-center font-bold bg-navy-50/40">{m.annualScore ?? 0}</td>
                            <td className="py-2 px-3 text-center font-bold bg-navy-50/40">{m.annualGrade ?? '0'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
