import React, { useRef, useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, Printer, Download } from 'lucide-react';
import {
  exportPp5ToExcel,
  exportPp5ToDocx,
  exportA4PagesToPdf,
} from '../../services/exportEngine';
import { buildCoverSummaryStats, mergeReportLayout } from '../../services/reportLayoutAdapter';
import {
  ATTENDANCE_STATUS,
  LEVEL_LABELS,
  getFullStudentName,
} from '../../lib/thaiFormatting';
import { SchoolEmblem } from '../layout/SchoolEmblem';

export function ExportReportTab({
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
  const [pdfOrientationMode, setPdfOrientationMode] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [exporting, setExporting] = useState('');
  const pagesContainerRef = useRef(null);

  const layout = useMemo(
    () => mergeReportLayout(settings?.cover_config, course?.cover_settings),
    [settings?.cover_config, course?.cover_settings]
  );

  const summary = useMemo(
    () => buildCoverSummaryStats(students, computedScoresMap, characteristicsMap),
    [students, computedScoresMap, characteristicsMap]
  );

  const resolveOrientation = (defaultOrientation) => {
    if (pdfOrientationMode === 'portrait') return 'portrait';
    if (pdfOrientationMode === 'landscape') return 'landscape';
    return defaultOrientation;
  };

  const handleExcelExport = () => {
    exportPp5ToExcel({
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
    });
  };

  const handleDocxExport = async () => {
    setExporting('docx');
    try {
      await exportPp5ToDocx({
        course,
        teacher,
        settings,
        students,
        indicators,
        scoreStructure,
        computedScoresMap,
        attendanceStatsMap,
        characteristicsMap,
      });
    } finally {
      setExporting('');
    }
  };

  const handlePdfExport = async () => {
    setExporting('pdf');
    try {
      const pageNodes = Array.from(
        pagesContainerRef.current?.querySelectorAll('[data-pdf-page="true"]') || []
      );
      const safeCode = `${course.subject_code}_${course.grade_level}-${course.classroom}`.replace(
        /[^\wก-๙.-]/g,
        '_'
      );
      await exportA4PagesToPdf(pageNodes, `ปพ5_${safeCode}_A4_${pdfOrientationMode}.pdf`);
    } finally {
      setExporting('');
    }
  };

  const uniqueSessions = useMemo(() => {
    const map = new Map();
    attendanceRecords.forEach((r) => {
      const key = `${r.session_date}#${r.period_number}`;
      if (!map.has(key)) map.set(key, { key, date: r.session_date, period: r.period_number });
    });
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period)
      .slice(0, 14);
  }, [attendanceRecords]);

  const attLookup = useMemo(() => {
    const m = new Map();
    attendanceRecords.forEach((r) => m.set(`${r.student_id}|${r.session_date}#${r.period_number}`, r.status));
    return m;
  }, [attendanceRecords]);

  const units = scoreStructure?.units || [];
  const metaOverrides = course?.cover_settings?.courseMetaOverrides || {};
  const schoolName = metaOverrides.school_name || settings?.school_name;
  const affiliationLabel =
    metaOverrides.affiliation ||
    `${settings?.affiliation || ''} (${settings?.affiliation_short || ''})`.trim();
  const teacherName = metaOverrides.teacher_name || teacher?.full_name || '-';
  const directorName = metaOverrides.director_name || settings?.director_name || 'นายเอกชัย สุภา';
  const roundingMode = scoreStructure?.grading_policy?.roundingMode || 'none';
  const roundingLabel =
    roundingMode === 'half_up'
      ? 'ปัดตามหลักคณิตศาสตร์ ≥ 0.5 ปัดขึ้น (เช่น 79.5 → 80 = 4)'
      : roundingMode === 'ceil'
      ? 'ปัดเศษขึ้นทุกกรณี (เช่น 79.1 → 80 = 4)'
      : 'ไม่ปัดเศษคะแนนรวม (เช่น 79.5 = 3.5)';
  const tableOrientation = resolveOrientation('landscape');
  const coverOrientation = resolveOrientation('portrait');

  const indicatorLines = useMemo(() => {
    const raw = (course?.custom_indicators_text || '').trim();
    if (raw) {
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
    return (indicators || []).map(
      (ind) => `${ind.indicator_code} (${ind.indicator_type}): ${ind.indicator_text}`
    );
  }, [course?.custom_indicators_text, indicators]);

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <div className="no-print bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-navy-900 text-base">
              ส่งออกเอกสาร ปพ.5 มาตรฐาน 3 รูปแบบ (Excel / Google Docs / A4 Print-Ready PDF)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกรูปแบบการจัดหน้ากระดาษ A4 แนวตั้ง (Portrait) หรือ แนวนอน (Landscape) ก่อนพิมพ์หรือดาวน์โหลด PDF
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExcelExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (.xlsx)
            </button>
            <button
              type="button"
              disabled={exporting === 'docx'}
              onClick={handleDocxExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-sm font-semibold shadow-sm disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              {exporting === 'docx' ? 'กำลังสร้าง...' : 'Google Docs / Word (.docx)'}
            </button>
            <button
              type="button"
              disabled={exporting === 'pdf'}
              onClick={handlePdfExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-sm font-semibold shadow-sm disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {exporting === 'pdf' ? 'กำลังเรนเดอร์ PDF...' : 'ดาวน์โหลด PDF (A4)'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-sm font-bold shadow-sm"
            >
              <Printer className="w-4 h-4" />
              สั่งพิมพ์ทันที
            </button>
          </div>
        </div>

        {/* Orientation Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-ivory-200 text-xs">
          <span className="font-semibold text-navy-900">รูปแบบหน้ากระดาษ A4 (PDF / Print):</span>
          {[
            { id: 'auto', label: 'อัตโนมัติ (หน้าปก/ตัวชี้วัด = แนวตั้ง, ตารางคะแนน/เวลาเรียน = แนวนอน)' },
            { id: 'portrait', label: 'แนวตั้งทั้งหมด (A4 Portrait)' },
            { id: 'landscape', label: 'แนวนอนทั้งหมด (A4 Landscape)' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPdfOrientationMode(opt.id)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                pdfOrientationMode === opt.id
                  ? 'bg-navy-800 text-gold-300 border-navy-800'
                  : 'bg-ivory-100 text-slate-700 border-ivory-300 hover:bg-navy-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Print & PDF A4 Pages Preview */}
      <div ref={pagesContainerRef} className="space-y-8 flex flex-col items-center">
        {/* Page 1: Cover & Summary (A4 Portrait default) */}
        <section
          data-pdf-page="true"
          data-orientation={coverOrientation}
          className={`font-official bg-white shadow-academic border border-slate-300 p-8 flex flex-col justify-between print-page-break ${
            coverOrientation === 'landscape'
              ? 'w-full max-w-[1050px] min-h-[720px] a4-landscape-section'
              : 'w-full max-w-[780px] min-h-[1060px]'
          }`}
        >
          <div className="text-center space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500">เลขที่เอกสาร {course.subject_code}-{course.academic_year}</span>
              <span className="px-3 py-1 border-2 border-navy-800 font-bold text-navy-900 rounded">
                {layout.documentCode}
              </span>
            </div>
            <div className="flex justify-center pt-2">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="logo" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <SchoolEmblem className="w-20 h-20" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-navy-900 pt-2">{layout.documentTitle}</h2>
            <p className="text-sm text-slate-700">{layout.subtitle}</p>
            <p className="text-lg font-bold pt-2">{schoolName}</p>
            <p className="text-sm text-slate-600">{affiliationLabel}</p>
          </div>

          <div className="border border-slate-400 rounded-lg p-4 text-sm grid grid-cols-2 gap-2 my-4">
            <div><b>รหัสวิชา:</b> {course.subject_code}</div>
            <div><b>ปีการศึกษา:</b> {course.academic_year} ภาคเรียนที่ {course.semester}</div>
            <div className="col-span-2"><b>รายวิชา:</b> {course.subject_name}</div>
            <div><b>กลุ่มสาระฯ:</b> {course.learning_area}</div>
            <div><b>ระดับชั้น/ห้อง:</b> {course.grade_level}/{course.classroom}</div>
            <div><b>หน่วยกิต:</b> {course.credits}</div>
            <div><b>เวลาเรียน:</b> {course.total_hours} ชั่วโมง</div>
            <div className="col-span-2"><b>ครูผู้สอน:</b> {teacherName}</div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-center">ตารางสรุปผลสัมฤทธิ์ทางการเรียน (จำนวน {summary.totalStudents} คน)</p>
            <table className="w-full text-xs border-collapse border border-slate-700 text-center">
              <thead>
                <tr className="bg-slate-100">
                  {['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส', 'ร้อยละ 3+'].map((h) => (
                    <th key={h} className="border border-slate-700 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].map((g) => (
                    <td key={g} className="border border-slate-700 py-1.5 font-bold">{summary.gradeBuckets[g]}</td>
                  ))}
                  <td className="border border-slate-700 py-1.5 font-bold">{summary.goodAndAbovePct}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-xs pt-6">
            <div>
              <p>ลงชื่อ......................................</p>
              <p className="mt-1">({teacherName})</p>
              <p>{layout.signatures.teacherLabel}</p>
            </div>
            <div>
              <p>ลงชื่อ......................................</p>
              <p className="mt-1">({settings?.academic_head_name || 'หัวหน้าวิชาการ'})</p>
              <p>{layout.signatures.academicHeadLabel}</p>
            </div>
            <div>
              <p>ลงชื่อ......................................</p>
              <p className="mt-1 font-bold">({directorName})</p>
              <p>{layout.signatures.directorLabel}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-0.5 text-[10px] text-slate-500">
            <p className="text-left">วิธีปัดคะแนน: {roundingLabel}</p>
            <p className="text-center">{layout.footerCredit}</p>
          </div>
        </section>

        {/* Page 1B: Course Indicators Printed Automatically */}
        <section
          data-pdf-page="true"
          data-orientation={coverOrientation}
          className={`font-official bg-white shadow-academic border border-slate-300 p-8 flex flex-col justify-between print-page-break ${
            coverOrientation === 'landscape'
              ? 'w-full max-w-[1050px] min-h-[720px] a4-landscape-section'
              : 'w-full max-w-[780px] min-h-[1060px]'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-navy-800 pb-2">
              <div>
                <h3 className="text-lg font-bold text-navy-900">
                  ตัวชี้วัด / ผลการเรียนรู้ประจำรายวิชา {course.subject_code} {course.subject_name}
                </h3>
                <p className="text-xs text-slate-600">
                  ชั้น {course.grade_level}/{course.classroom} • ปีการศึกษา {course.academic_year} ภาคเรียนที่ {course.semester} • จำนวน {indicatorLines.length} ข้อ
                </p>
              </div>
              {course.indicators_status !== 'confirmed' && indicatorLines.length > 0 && (
                <span className="px-2.5 py-1 rounded border border-amber-500 bg-amber-50 text-amber-800 text-xs font-bold">
                  ตัวอย่าง (ยังไม่ยืนยัน)
                </span>
              )}
            </div>

            {indicatorLines.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-400 rounded-lg text-center text-sm text-slate-500">
                ยังไม่มีข้อความตัวชี้วัดในรายวิชานี้ (กรุณากดปุ่มเขียวเติมตัวชี้วัดในแท็บ โครงสร้างคะแนน ตัวชี้วัด &amp; ตัดเกรด)
              </div>
            ) : (
              <table className="w-full text-xs border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-700 py-1.5 px-2 w-14 text-center">ลำดับ</th>
                    <th className="border border-slate-700 py-1.5 px-3 text-left">ตัวชี้วัด / ผลการเรียนรู้ที่จัดการเรียนรู้</th>
                  </tr>
                </thead>
                <tbody>
                  {indicatorLines.map((line, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 py-1.5 px-2 text-center font-bold">{i + 1}</td>
                      <td className="border border-slate-700 py-1.5 px-3 text-left leading-relaxed">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-0.5 text-[10px] text-slate-500">
            <p className="text-left">วิธีปัดคะแนน: {roundingLabel}</p>
            <p className="text-center">{layout.footerCredit}</p>
          </div>
        </section>

        {/* Page 2: Scores & Attendance & Characteristics Table (Landscape default) */}
        <section
          data-pdf-page="true"
          data-orientation={tableOrientation}
          className={`font-official bg-white shadow-academic border border-slate-300 p-6 flex flex-col justify-between print-page-break ${
            tableOrientation === 'landscape'
              ? 'w-full max-w-[1050px] min-h-[720px] a4-landscape-section'
              : 'w-full max-w-[780px] min-h-[1060px]'
          }`}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-300 pb-2">
              <h3 className="text-base font-bold text-navy-900">
                แบบบันทึกคะแนน เวลาเรียน และคุณลักษณะฯ — {course.subject_code} {course.subject_name} ({course.grade_level}/{course.classroom})
              </h3>
              <span className="text-xs text-slate-600">
                ปีการศึกษา {course.academic_year} ภาคเรียนที่ {course.semester}
              </span>
            </div>

            <table className="w-full text-[11px] border-collapse border border-slate-700">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-700 py-1 px-1.5">ที่</th>
                  <th className="border border-slate-700 py-1 px-2 text-left">ชื่อ - สกุล</th>
                  <th className="border border-slate-700 py-1 px-1.5">เวลาเรียน(%)</th>
                  {units.map((u) => (
                    <th key={u.id} className="border border-slate-700 py-1 px-1.5">
                      {u.name} ({u.maxScore})
                    </th>
                  ))}
                  <th className="border border-slate-700 py-1 px-1.5">รวม (100)</th>
                  <th className="border border-slate-700 py-1 px-1.5">เกรด</th>
                  <th className="border border-slate-700 py-1 px-1.5">คุณลักษณะฯ</th>
                  <th className="border border-slate-700 py-1 px-1.5">อ่านคิดเขียน</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu, idx) => {
                  const computed = computedScoresMap[stu.id] || {};
                  const att = attendanceStatsMap[stu.id] || { attendancePct: 100 };
                  const ch = characteristicsMap[stu.id] || {};
                  const effectiveAtt = computed.effectiveAttendancePct ?? att.attendancePct ?? 100;
                  return (
                    <tr key={stu.id}>
                      <td className="border border-slate-700 py-1 px-1.5 text-center">{stu.student_number || idx + 1}</td>
                      <td className="border border-slate-700 py-1 px-2">{getFullStudentName(stu)}</td>
                      <td className="border border-slate-700 py-1 px-1.5 text-center">{effectiveAtt}%</td>
                      {units.map((u) => (
                        <td key={u.id} className="border border-slate-700 py-1 px-1.5 text-center">
                          {computed.unitScores?.[u.id] ?? 0}
                        </td>
                      ))}
                      <td className="border border-slate-700 py-1 px-1.5 text-center font-bold">{computed.totalScore ?? 0}</td>
                      <td className="border border-slate-700 py-1 px-1.5 text-center font-bold">{computed.grade ?? '0'}</td>
                      <td className="border border-slate-700 py-1 px-1.5 text-center">
                        {LEVEL_LABELS[ch.traits_level ?? 3]?.label || 'ดีเยี่ยม'}
                      </td>
                      <td className="border border-slate-700 py-1 px-1.5 text-center">
                        {LEVEL_LABELS[ch.rtw_level ?? 3]?.label || 'ดีเยี่ยม'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {uniqueSessions.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-bold mb-1">สรุปการเช็คชื่อรายคาบ (ล่าสุด {uniqueSessions.length} คาบ)</p>
                <table className="w-full text-[10px] border-collapse border border-slate-600 text-center">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-600 py-1 px-2 text-left">ชื่อ - สกุล</th>
                      {uniqueSessions.map((s) => (
                        <th key={s.key} className="border border-slate-600 py-1 px-1">
                          {s.date.slice(5)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((stu) => (
                      <tr key={stu.id}>
                        <td className="border border-slate-600 py-0.5 px-2 text-left">{getFullStudentName(stu)}</td>
                        {uniqueSessions.map((s) => {
                          const st = attLookup.get(`${stu.id}|${s.key}`) || 'present';
                          return (
                            <td key={s.key} className="border border-slate-600 py-0.5 px-1">
                              {ATTENDANCE_STATUS[st]?.code || '/'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-0.5 text-[10px] text-slate-500">
            <p className="text-left">วิธีปัดคะแนน: {roundingLabel}</p>
            <p className="text-center">{layout.footerCredit}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
