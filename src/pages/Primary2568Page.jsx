import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sprout,
  Save,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  SlidersHorizontal,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSchoolData } from '../hooks/useSchoolData';
import { dataService } from '../services/dataService';
import { getFullStudentName } from '../lib/thaiFormatting';
import {
  CAPABILITIES_2568,
  DEFAULT_LEVELS_2568,
  TRAITS_5_2568,
  GRADE3_CENTRAL_RESULTS,
  computePrimary2568Summary,
} from '../data/primary2568Curriculum';
import {
  exportPrimary2568ToExcel,
  exportPrimary2568ToDocx,
  exportA4PagesToPdf,
} from '../services/exportEngine';
import { SchoolLogo } from '../components/layout/SchoolEmblem';

const PRIMARY_2568_GRADES = ['ป.1', 'ป.2', 'ป.3'];

export function Primary2568Page() {
  const { user } = useAuth();
  const { settings, users, students } = useSchoolData();

  const [gradeLevel, setGradeLevel] = useState('ป.1');
  const [classroom, setClassroom] = useState('1');
  const [assessments, setAssessments] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [levelLabels, setLevelLabels] = useState(() => ({
    4: { ...DEFAULT_LEVELS_2568[4] },
    3: { ...DEFAULT_LEVELS_2568[3] },
    2: { ...DEFAULT_LEVELS_2568[2] },
    1: { ...DEFAULT_LEVELS_2568[1] },
  }));
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false);
  const [viewMode, setViewMode] = useState('record'); // 'record' | 'pp6' | 'class_summary'
  const [selectedPp6StudentId, setSelectedPp6StudentId] = useState('all');
  const [savingMsg, setSavingMsg] = useState('');
  const [exporting, setExporting] = useState('');
  const printAreaRef = useRef(null);

  useEffect(() => {
    let active = true;
    dataService.fetchPrimary2568Assessments(gradeLevel, classroom).then((rows) => {
      if (!active) return;
      setAssessments(rows);
    });
    return () => {
      active = false;
    };
  }, [gradeLevel, classroom]);

  const roomStudents = useMemo(() => {
    return students
      .filter(
        (s) =>
          s.status === 'active' &&
          s.grade_level === gradeLevel &&
          String(s.classroom || '1') === String(classroom || '1')
      )
      .sort((a, b) => (a.student_number || 0) - (b.student_number || 0));
  }, [students, gradeLevel, classroom]);

  useEffect(() => {
    const map = {};
    roomStudents.forEach((stu) => {
      const found = assessments.find((a) => a.student_id === stu.id);
      map[stu.id] = found || {
        student_id: stu.id,
        grade_level: gradeLevel,
        classroom,
        academic_year: settings?.academic_year || '2569',
        semester: settings?.semester || '1',
        capabilities: { c1: 3, c2: 3, c3: 3, c4: 3, c5: 3, c6: 3, c7: 3, c8: 3 },
        traits_5: { t1: true, t2: true, t3: true, t4: true, t5: true },
        activities_pass: true,
        grade3_central_result: gradeLevel === 'ป.3' ? 'ผ่านเกณฑ์ส่วนกลาง' : '',
        teacher_comment: '',
      };
    });
    setDrafts(map);
    setSelectedPp6StudentId('all');
  }, [roomStudents, assessments, gradeLevel, classroom, settings]);

  const homeroomTeacher = useMemo(
    () => users.find((u) => u.homeroom_grade === gradeLevel) || user,
    [users, gradeLevel, user]
  );

  const combinedRows = useMemo(
    () =>
      roomStudents.map((stu) => ({
        student: stu,
        assessment: drafts[stu.id] || {
          capabilities: { c1: 3, c2: 3, c3: 3, c4: 3, c5: 3, c6: 3, c7: 3, c8: 3 },
          traits_5: { t1: true, t2: true, t3: true, t4: true, t5: true },
          activities_pass: true,
          grade3_central_result: '',
          teacher_comment: '',
        },
      })),
    [roomStudents, drafts]
  );

  const updateCapability = (studentId, capKey, level) => {
    setDrafts((prev) => {
      const cur = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...cur,
          capabilities: { ...(cur.capabilities || {}), [capKey]: Number(level) },
        },
      };
    });
  };

  const toggleTrait = (studentId, traitKey) => {
    setDrafts((prev) => {
      const cur = prev[studentId] || {};
      const traits = cur.traits_5 || {};
      return {
        ...prev,
        [studentId]: {
          ...cur,
          traits_5: { ...traits, [traitKey]: traits[traitKey] === false },
        },
      };
    });
  };

  const updateField = (studentId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [field]: value },
    }));
  };

  const handleSaveAll = async () => {
    const labelMap = {
      4: levelLabels[4].label,
      3: levelLabels[3].label,
      2: levelLabels[2].label,
      1: levelLabels[1].label,
    };
    const payload = roomStudents.map((stu) => ({
      ...(drafts[stu.id] || {}),
      student_id: stu.id,
      grade_level: gradeLevel,
      classroom,
      academic_year: settings?.academic_year || '2569',
      semester: settings?.semester || '1',
      school_level_labels: labelMap,
      recorded_by: user?.id || null,
    }));
    const saved = await dataService.savePrimary2568Batch(payload);
    setAssessments(saved);
    setSavingMsg(
      `บันทึกผลประเมินตามความสามารถ 8 ด้าน ปพ.5 (หลักสูตร 2568) ชั้น ${gradeLevel}/${classroom} เรียบร้อย`
    );
  };

  const handlePdfExport = async () => {
    const targetView = viewMode === 'record' ? 'pp6' : viewMode;
    if (viewMode === 'record') setViewMode('pp6');
    setExporting('pdf');
    setTimeout(async () => {
      try {
        const nodes = Array.from(
          printAreaRef.current?.querySelectorAll('[data-pdf-page="true"]') || []
        );
        const label = targetView === 'pp6' ? 'ปพ6_รายบุคคล' : 'ปพ5_2568_สรุปชั้น';
        await exportA4PagesToPdf(nodes, `${label}_${gradeLevel}-${classroom}.pdf`);
      } finally {
        setExporting('');
      }
    }, 150);
  };

  const pp6Targets =
    selectedPp6StudentId === 'all'
      ? combinedRows
      : combinedRows.filter((r) => r.student.id === selectedPp6StudentId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="no-print rounded-3xl bg-gradient-to-r from-emerald-900 via-navy-900 to-royal-900 text-white p-6 shadow-academic border border-gold-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40">
              🌱 ปพ.5 ป.1-3 (หลักสูตร 2568 — โรงเรียนที่สมัครใจ)
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400/20 text-gold-200 border border-gold-400/40">
              ไม่มีคะแนนสอบ / ไม่มีเกรด 0–4
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            แบบบันทึกผลการเรียนตามความสามารถเมื่อจบชั้นปี ({gradeLevel}/{classroom})
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
            ประเมิน 8 ความสามารถ × 4 ระดับตามเกณฑ์สถานศึกษา • คุณลักษณะ 5 ข้อ &amp; กิจกรรม (ผ่าน/ไม่ผ่าน) • ผลเกณฑ์ส่วนกลาง ป.3 • พิมพ์ ปพ.6 รายบุคคล
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCriteriaEditor((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/20"
          >
            <SlidersHorizontal className="w-4 h-4" /> ตั้งชื่อ 4 ระดับเกณฑ์สถานศึกษา
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs sm:text-sm font-bold shadow-sm"
          >
            <Save className="w-4 h-4" /> บันทึกผล ปพ.5 (2568)
          </button>
        </div>
      </div>

      {/* Optional School 4-Level Criteria Editor */}
      {showCriteriaEditor && (
        <div className="no-print bg-white rounded-2xl border border-emerald-300 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-navy-900 text-sm">
            กำหนดคำอธิบาย 4 ระดับความสามารถตามเกณฑ์ของสถานศึกษา (โรงเรียนบ้านหาดเค็ด)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[4, 3, 2, 1].map((lv) => (
              <div key={lv} className="p-3 rounded-xl bg-ivory-50 border border-ivory-300">
                <label className="block text-xs font-bold text-navy-900 mb-1">ระดับ {lv}</label>
                <input
                  type="text"
                  value={levelLabels[lv]?.label || ''}
                  onChange={(e) =>
                    setLevelLabels((prev) => ({
                      ...prev,
                      [lv]: { ...prev[lv], label: e.target.value, short: `ระดับ ${lv} (${e.target.value})` },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar: Grade Switcher, View Tabs & Exports */}
      <div className="no-print bg-white rounded-2xl border border-ivory-300 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {PRIMARY_2568_GRADES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGradeLevel(g)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                gradeLevel === g
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-ivory-50 text-navy-900 border-ivory-300 hover:bg-emerald-50'
              }`}
            >
              ชั้น {g} {g === 'ป.3' ? '(มีเกณฑ์ส่วนกลาง)' : ''}
            </button>
          ))}
          <input
            type="text"
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
            aria-label="ห้องเรียน"
            className="w-16 px-2.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-center"
          />
          <span className="text-xs text-slate-500 ml-1">นักเรียน {roomStudents.length} คน</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 rounded-xl bg-ivory-100 border border-ivory-300 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('record')}
              className={`px-3 py-1.5 rounded-lg ${
                viewMode === 'record' ? 'bg-navy-800 text-gold-300' : 'text-slate-700'
              }`}
            >
              ตารางบันทึก 8 ความสามารถ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pp6')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${
                viewMode === 'pp6' ? 'bg-navy-800 text-gold-300' : 'text-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> พิมพ์ ปพ.6 รายบุคคล
            </button>
            <button
              type="button"
              onClick={() => setViewMode('class_summary')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${
                viewMode === 'class_summary' ? 'bg-navy-800 text-gold-300' : 'text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> พิมพ์สรุปชั้น (ปพ.5)
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              exportPrimary2568ToExcel({
                settings,
                gradeLevel,
                classroom,
                rows: combinedRows,
                levelLabels,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            type="button"
            onClick={() =>
              exportPrimary2568ToDocx({
                settings,
                gradeLevel,
                classroom,
                homeroomTeacher,
                rows: combinedRows,
                mode: viewMode === 'pp6' ? 'pp6' : 'class',
                levelLabels,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-xs font-semibold"
          >
            <FileText className="w-4 h-4" /> Word (.docx)
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={exporting === 'pdf'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> {exporting === 'pdf' ? 'กำลังสร้าง...' : 'PDF (A4)'}
          </button>
        </div>
      </div>

      {savingMsg && (
        <div className="no-print px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {savingMsg}
        </div>
      )}

      {/* VIEW 1: RECORD MATRIX */}
      {viewMode === 'record' && (
        <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-navy-900 text-white flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Sprout className="w-4 h-4 text-emerald-400" />
              ตารางประเมิน 8 ความสามารถ (ระดับ 1–4) • คุณลักษณะ 5 ข้อ • กิจกรรม • ป.3 เกณฑ์ส่วนกลาง
            </h3>
            <span className="text-xs text-gold-200">
              ระดับ 4={levelLabels[4].label} • 3={levelLabels[3].label} • 2={levelLabels[2].label} • 1={levelLabels[1].label}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-2.5 px-2 text-center">ที่</th>
                  <th className="py-2.5 px-3 text-left min-w-[160px]">ชื่อ - สกุล</th>
                  {CAPABILITIES_2568.map((cap) => (
                    <th
                      key={cap.key}
                      title={cap.description}
                      className="py-2 px-1.5 text-center border-l border-ivory-200 min-w-[92px]"
                    >
                      <div className="font-bold text-navy-900">{cap.no}. {cap.shortName}</div>
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center border-l border-ivory-300 min-w-[130px] bg-royal-50">
                    คุณลักษณะ 5 ข้อ
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50 border-l border-ivory-200">
                    กิจกรรมฯ
                  </th>
                  {gradeLevel === 'ป.3' && (
                    <th className="py-2.5 px-2 text-center bg-gold-50 border-l border-ivory-300 min-w-[175px]">
                      ป.3 ผลตามเกณฑ์ส่วนกลาง
                    </th>
                  )}
                  <th className="py-2.5 px-2 text-left border-l border-ivory-200 min-w-[160px]">
                    ความเห็นครู (ปพ.6)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {combinedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-10 text-center text-slate-500">
                      ยังไม่มีรายชื่อนักเรียนชั้น {gradeLevel}/{classroom} ในฐานข้อมูล
                    </td>
                  </tr>
                ) : (
                  combinedRows.map(({ student, assessment }, idx) => (
                    <tr key={student.id} className="hover:bg-ivory-50 align-top">
                      <td className="py-2.5 px-2 text-center text-slate-600">
                        {student.student_number || idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-navy-900">
                        {getFullStudentName(student)}
                        <div className="text-[10px] text-slate-400">{student.student_code}</div>
                      </td>
                      {CAPABILITIES_2568.map((cap) => {
                        const val = Number(assessment.capabilities?.[cap.key] ?? 3);
                        return (
                          <td key={cap.key} className="py-2 px-1 text-center border-l border-ivory-200">
                            <select
                              value={val}
                              onChange={(e) => updateCapability(student.id, cap.key, e.target.value)}
                              className={`w-full px-1 py-1 rounded-lg border text-[11px] font-bold text-center ${
                                val >= 3
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                  : val === 2
                                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                                  : 'bg-rose-50 border-rose-300 text-rose-900'
                              }`}
                            >
                              {[4, 3, 2, 1].map((lv) => (
                                <option key={lv} value={lv}>
                                  {lv} ({levelLabels[lv].label.split(' ')[0]})
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 border-l border-ivory-300 bg-royal-50/30">
                        <div className="flex items-center justify-center gap-1">
                          {TRAITS_5_2568.map((t) => {
                            const pass = assessment.traits_5?.[t.key] !== false;
                            return (
                              <button
                                key={t.key}
                                type="button"
                                title={`ข้อ ${t.no}: ${t.label} (${pass ? 'ผ่าน' : 'ไม่ผ่าน'})`}
                                onClick={() => toggleTrait(student.id, t.key)}
                                className={`w-6 h-6 rounded text-[10px] font-bold border ${
                                  pass
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-rose-100 text-rose-700 border-rose-300'
                                }`}
                              >
                                {t.no}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center bg-emerald-50/30 border-l border-ivory-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              student.id,
                              'activities_pass',
                              assessment.activities_pass === false
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            assessment.activities_pass !== false
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {assessment.activities_pass !== false ? 'ผ่าน' : 'ไม่ผ่าน'}
                        </button>
                      </td>
                      {gradeLevel === 'ป.3' && (
                        <td className="py-2 px-2 border-l border-ivory-300 bg-gold-50/40">
                          <select
                            value={assessment.grade3_central_result || ''}
                            onChange={(e) =>
                              updateField(student.id, 'grade3_central_result', e.target.value)
                            }
                            className="w-full px-2 py-1 rounded-lg border border-gold-300 bg-white text-[11px] font-semibold"
                          >
                            {GRADE3_CENTRAL_RESULTS.map((opt) => (
                              <option key={opt || 'empty'} value={opt}>
                                {opt || '-- เลือกผลเกณฑ์ส่วนกลาง --'}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-2 px-2 border-l border-ivory-200">
                        <input
                          type="text"
                          value={assessment.teacher_comment || ''}
                          onChange={(e) =>
                            updateField(student.id, 'teacher_comment', e.target.value)
                          }
                          placeholder="จุดเด่น/ข้อแนะนำ..."
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2 & 3: PRINTABLE PREVIEWS (ปพ.6 รายบุคคล / ปพ.5 สรุปชั้น) */}
      {viewMode !== 'record' && (
        <div className="space-y-4">
          {viewMode === 'pp6' && (
            <div className="no-print bg-white rounded-2xl border border-ivory-300 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-bold text-navy-900">เลือกพิมพ์แบบรายงาน ปพ.6:</span>
                <select
                  value={selectedPp6StudentId}
                  onChange={(e) => setSelectedPp6StudentId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium"
                >
                  <option value="all">พิมพ์ทุกคนในห้อง ({roomStudents.length} คน)</option>
                  {roomStudents.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      เลขที่ {stu.student_number} — {getFullStudentName(stu)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs sm:text-sm"
              >
                <Printer className="w-4 h-4" /> สั่งพิมพ์หน้า A4 ทันที
              </button>
            </div>
          )}

          <div ref={printAreaRef} className="space-y-8 flex flex-col items-center">
            {viewMode === 'pp6' &&
              pp6Targets.map(({ student, assessment }, idx) => {
                const sum = computePrimary2568Summary(assessment);
                return (
                  <section
                    key={student.id}
                    data-pdf-page="true"
                    data-orientation="portrait"
                    className="font-official bg-white shadow-academic border border-slate-300 p-8 w-full max-w-[780px] min-h-[1060px] flex flex-col justify-between print-page-break"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <SchoolLogo logoUrl={settings?.logo_url} className="w-16 h-16" />
                        <div className="text-center flex-1 px-4">
                          <h3 className="text-xl font-bold text-navy-900">
                            แบบรายงานผลการพัฒนาผู้เรียนรายบุคคล (ปพ.6)
                          </h3>
                          <p className="text-xs text-slate-700">
                            ตามหลักสูตรการศึกษาประถมศึกษาตอนต้น พุทธศักราช 2568 (ไม่มีการตัดสินด้วยคะแนนหรือเกรด)
                          </p>
                          <p className="text-sm font-bold mt-1">
                            {settings?.school_name} ({settings?.affiliation_short})
                          </p>
                        </div>
                        <span className="px-3 py-1 border-2 border-emerald-700 text-emerald-800 font-bold text-sm rounded">
                          ปพ.6
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 border border-slate-400 rounded-lg text-xs">
                        <div><b>ชื่อ - สกุล:</b> {getFullStudentName(student)}</div>
                        <div><b>รหัสประจำตัวนักเรียน:</b> {student.student_code}</div>
                        <div><b>ระดับชั้น/ห้อง:</b> {gradeLevel}/{classroom} (เลขที่ {student.student_number || idx + 1})</div>
                        <div><b>ปีการศึกษา:</b> {settings?.academic_year} ภาคเรียนที่ {settings?.semester}</div>
                      </div>

                      <table className="w-full text-xs border-collapse border border-slate-700">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-slate-700 py-1.5 px-2 w-10">ข้อ</th>
                            <th className="border border-slate-700 py-1.5 px-3 text-left">ความสามารถพื้นฐาน 8 ด้าน</th>
                            <th className="border border-slate-700 py-1.5 px-2 w-48">ระดับความสามารถ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CAPABILITIES_2568.map((cap) => {
                            const lv = Number(assessment.capabilities?.[cap.key] ?? 3);
                            return (
                              <tr key={cap.key}>
                                <td className="border border-slate-700 py-1.5 px-2 text-center font-bold">
                                  {cap.no}
                                </td>
                                <td className="border border-slate-700 py-1.5 px-3">
                                  <div className="font-bold">{cap.title}</div>
                                  <div className="text-[11px] text-slate-600">{cap.description}</div>
                                </td>
                                <td className="border border-slate-700 py-1.5 px-2 text-center font-bold">
                                  ระดับ {lv} : {levelLabels[lv]?.label}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="grid grid-cols-2 gap-3 text-xs border border-slate-400 rounded-lg p-3">
                        <div>
                          <p className="font-bold mb-1">คุณลักษณะอันพึงประสงค์ 5 ประการ (ผ่าน/ไม่ผ่าน):</p>
                          <ul className="space-y-0.5 text-[11px]">
                            {TRAITS_5_2568.map((t) => (
                              <li key={t.key}>
                                {t.no}. {t.label}:{' '}
                                <b>{assessment.traits_5?.[t.key] !== false ? 'ผ่าน' : 'ไม่ผ่าน'}</b>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <b>กิจกรรมพัฒนาผู้เรียน:</b>{' '}
                            <span className="font-bold">
                              {sum.activitiesPass ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
                            </span>
                          </div>
                          {gradeLevel === 'ป.3' && (
                            <div className="p-2 rounded bg-amber-50 border border-amber-300">
                              <b>ผลการประเมินชั้น ป.3 ตามเกณฑ์ส่วนกลาง:</b>
                              <div className="font-bold mt-0.5">
                                {assessment.grade3_central_result || 'อยู่ระหว่างรอผลส่วนกลาง'}
                              </div>
                            </div>
                          )}
                          <div>
                            <b>ความเห็นและข้อเสนอแนะของครูประจำชั้น:</b>
                            <p className="mt-0.5 text-slate-700">{assessment.teacher_comment || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6 text-center text-xs pt-6">
                        <div>
                          <p>ลงชื่อ............................................</p>
                          <p>({homeroomTeacher?.full_name || 'ครูประจำชั้น'})</p>
                          <p>ครูประจำชั้น {gradeLevel}/{classroom}</p>
                        </div>
                        <div>
                          <p>ลงชื่อ............................................</p>
                          <p className="font-bold">({settings?.director_name || 'นายเอกชัย สุภา'})</p>
                          <p>{settings?.director_title}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-center text-slate-500 border-t border-slate-200 pt-2">
                        {settings?.cover_config?.footerCredit}
                      </p>
                    </div>
                  </section>
                );
              })}

            {viewMode === 'class_summary' && (
              <section
                data-pdf-page="true"
                data-orientation="landscape"
                className="font-official bg-white shadow-academic border border-slate-300 p-6 w-full max-w-[1050px] min-h-[720px] flex flex-col justify-between a4-landscape-section"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-2">
                    <div className="flex items-center gap-3">
                      <SchoolLogo logoUrl={settings?.logo_url} className="w-12 h-12" />
                      <div>
                        <h3 className="text-lg font-bold text-navy-900">
                          ปพ.5 ป.1-3 (2568) — แบบสรุปผลการประเมินตามความสามารถประจำชั้น {gradeLevel}/{classroom}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {settings?.school_name} ({settings?.affiliation_short}) • ปีการศึกษา {settings?.academic_year} • ไม่มีการให้คะแนนสอบและไม่มีเกรด 0–4
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="no-print px-3 py-1.5 rounded-lg bg-navy-800 text-gold-300 text-xs font-semibold"
                    >
                      พิมพ์สรุปชั้น A4
                    </button>
                  </div>

                  <table className="w-full text-[10px] border-collapse border border-slate-700">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-700 py-1 px-1">ที่</th>
                        <th className="border border-slate-700 py-1 px-2 text-left">ชื่อ - สกุล</th>
                        {CAPABILITIES_2568.map((c) => (
                          <th key={c.key} className="border border-slate-700 py-1 px-1">
                            {c.no}.{c.shortName}
                          </th>
                        ))}
                        <th className="border border-slate-700 py-1 px-1">คุณลักษณะ 5 ข้อ</th>
                        <th className="border border-slate-700 py-1 px-1">กิจกรรม</th>
                        {gradeLevel === 'ป.3' && (
                          <th className="border border-slate-700 py-1 px-1">ผลเกณฑ์ส่วนกลาง ป.3</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {combinedRows.map(({ student, assessment }, idx) => {
                        const sum = computePrimary2568Summary(assessment);
                        return (
                          <tr key={student.id}>
                            <td className="border border-slate-700 py-1 px-1 text-center">
                              {student.student_number || idx + 1}
                            </td>
                            <td className="border border-slate-700 py-1 px-2">
                              {getFullStudentName(student)}
                            </td>
                            {CAPABILITIES_2568.map((c) => (
                              <td key={c.key} className="border border-slate-700 py-1 px-1 text-center font-bold">
                                ระดับ {assessment.capabilities?.[c.key] ?? 3}
                              </td>
                            ))}
                            <td className="border border-slate-700 py-1 px-1 text-center">
                              {sum.allTraitsPass ? 'ผ่าน (5/5)' : `ผ่าน ${sum.traitsPassedCount}/5`}
                            </td>
                            <td className="border border-slate-700 py-1 px-1 text-center">
                              {sum.activitiesPass ? 'ผ่าน' : 'ไม่ผ่าน'}
                            </td>
                            {gradeLevel === 'ป.3' && (
                              <td className="border border-slate-700 py-1 px-1 text-center font-semibold">
                                {assessment.grade3_central_result || '-'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-6 text-center text-xs pt-6">
                  <div>
                    <p>ลงชื่อ......................................</p>
                    <p>({homeroomTeacher?.full_name || 'ครูประจำชั้น'})</p>
                    <p>ครูประจำชั้น {gradeLevel}/{classroom}</p>
                  </div>
                  <div>
                    <p>ลงชื่อ......................................</p>
                    <p className="font-bold">({settings?.director_name || 'นายเอกชัย สุภา'})</p>
                    <p>{settings?.director_title}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
