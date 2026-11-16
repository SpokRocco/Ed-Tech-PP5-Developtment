import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Save, Sparkles } from 'lucide-react';
import { GRADE_LEVELS } from '../../lib/thaiFormatting';
import {
  DECISION_PERIOD_OPTIONS,
  RATIO_PRESETS,
  ROUNDING_OPTIONS,
} from '../../services/scoringConfigAdapter';

const SAMPLE_STRUCTURE_MODES = [
  { id: 'annual_two_terms', label: 'แยก 2 ภาค → รวมปี', formative: 60, midterm: 20, final: 20 },
  { id: 'sem_60_20_20', label: 'รายภาค 60 : 20 : 20', formative: 60, midterm: 20, final: 20 },
  { id: 'sem_70_10_20', label: 'เน้นระหว่างภาค 70 : 10 : 20', formative: 70, midterm: 10, final: 20 },
];

export function Pp5CourseHeaderPanel({
  course,
  settings,
  teacher,
  completion,
  scoreStructure,
  studentCount = 0,
  onJumpToMissingItem,
  onSaveCourseConfig,
  onChangeStructureImmediate,
  onLoadSampleCourseData,
  onExportWord,
  onExportExcel,
  onOpenRankedModal,
  onOpenSlipsModal,
}) {
  const [showMissingList, setShowMissingList] = useState(false);
  const [sampleGrade, setSampleGrade] = useState(course?.grade_level || 'ป.5');
  const [sampleRoom, setSampleRoom] = useState(String(course?.classroom || '1'));
  const [sampleMode, setSampleMode] = useState('annual_two_terms');
  const [savingMeta, setSavingMeta] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const metaOverrides = course?.cover_settings?.courseMetaOverrides || {};
  const [form, setForm] = useState({
    school_name: metaOverrides.school_name ?? settings?.school_name ?? '',
    affiliation:
      metaOverrides.affiliation ??
      `${settings?.affiliation || ''}${settings?.affiliation_short ? ` (${settings.affiliation_short})` : ''}`.trim(),
    academic_year: course?.academic_year || settings?.academic_year || '2569',
    semester: String(course?.semester || settings?.semester || '1'),
    grade_level: course?.grade_level || '',
    classroom: String(course?.classroom || '1'),
    teacher_name: metaOverrides.teacher_name ?? teacher?.full_name ?? '',
    director_name: metaOverrides.director_name ?? settings?.director_name ?? '',
    subject_name: course?.subject_name || '',
    subject_code: course?.subject_code || '',
    credits: course?.credits ?? '',
    total_hours: course?.total_hours ?? '',
    formative_ratio: scoreStructure?.formative_ratio ?? 60,
    midterm_ratio: scoreStructure?.midterm_ratio ?? 20,
    final_ratio: scoreStructure?.final_ratio ?? 20,
  });

  useEffect(() => {
    const ov = course?.cover_settings?.courseMetaOverrides || {};
    setForm({
      school_name: ov.school_name ?? settings?.school_name ?? '',
      affiliation:
        ov.affiliation ??
        `${settings?.affiliation || ''}${settings?.affiliation_short ? ` (${settings.affiliation_short})` : ''}`.trim(),
      academic_year: course?.academic_year || settings?.academic_year || '2569',
      semester: String(course?.semester || settings?.semester || '1'),
      grade_level: course?.grade_level || '',
      classroom: String(course?.classroom || '1'),
      teacher_name: ov.teacher_name ?? teacher?.full_name ?? '',
      director_name: ov.director_name ?? settings?.director_name ?? '',
      subject_name: course?.subject_name || '',
      subject_code: course?.subject_code || '',
      credits: course?.credits ?? '',
      total_hours: course?.total_hours ?? '',
      formative_ratio: scoreStructure?.formative_ratio ?? 60,
      midterm_ratio: scoreStructure?.midterm_ratio ?? 20,
      final_ratio: scoreStructure?.final_ratio ?? 20,
    });
  }, [course, settings, teacher, scoreStructure]);

  const decisionPeriod = scoreStructure?.grading_policy?.decisionPeriod || 'semester';
  const roundingMode = scoreStructure?.grading_policy?.roundingMode || 'none';
  const activePeriodMeta =
    DECISION_PERIOD_OPTIONS.find((p) => p.id === decisionPeriod) || DECISION_PERIOD_OPTIONS[0];

  const handleFieldChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'credits' && (prev.total_hours === '' || prev.total_hours === null || prev.total_hours === undefined)) {
        const numCredits = Number(value);
        if (!Number.isNaN(numCredits) && numCredits > 0) {
          next.total_hours = Math.round(numCredits * 40);
        }
      }
      return next;
    });
  };

  const handlePresetSelect = async (presetId) => {
    if (!presetId) return;
    const preset = RATIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const autoHours =
      form.total_hours === '' || form.total_hours === null || form.total_hours === undefined
        ? Math.round((Number(form.credits) || 1) * 40)
        : Number(form.total_hours);

    setForm((prev) => ({
      ...prev,
      total_hours: autoHours,
      formative_ratio: preset.formative,
      midterm_ratio: preset.midterm,
      final_ratio: preset.final,
    }));

    await onChangeStructureImmediate({
      formative_ratio: preset.formative,
      midterm_ratio: preset.midterm,
      final_ratio: preset.final,
    });
  };

  const handleSaveConfig = async () => {
    setSavingMeta(true);
    try {
      await onSaveCourseConfig({
        academic_year: String(form.academic_year || '2569'),
        semester: String(form.semester || '1'),
        grade_level: form.grade_level,
        classroom: String(form.classroom || '1'),
        subject_name: form.subject_name,
        subject_code: form.subject_code,
        credits: form.credits === '' ? null : Number(form.credits),
        total_hours: form.total_hours === '' ? null : Number(form.total_hours),
        courseMetaOverrides: {
          school_name: form.school_name,
          affiliation: form.affiliation,
          teacher_name: form.teacher_name,
          director_name: form.director_name,
        },
        ratios: {
          formative_ratio: Number(form.formative_ratio) || 0,
          midterm_ratio: Number(form.midterm_ratio) || 0,
          final_ratio: Number(form.final_ratio) || 0,
        },
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const missingCount = completion?.missingItems?.length || 0;
  const pct = completion?.pct ?? 0;

  return (
    <div className="no-print space-y-4">
      {/* Card 1: Progress, PDPA Banner, Sample Loader, 15-Field Config & Grading Rules */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
        {/* Title + Completion Bar */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-navy-900 flex items-center gap-2">
              <span>📔 ปพ.5 — แบบบันทึกผลการเรียนประจำรายวิชา</span>
            </h2>
            <button
              type="button"
              disabled={savingMeta}
              onClick={handleSaveConfig}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-bold shadow-sm transition-colors disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              {savingMeta ? 'กำลังบันทึก...' : 'บันทึกข้อมูลปก & เกณฑ์คะแนน'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs sm:text-sm font-bold text-navy-900 flex items-center gap-1.5 shrink-0">
              <span>📊 ความสำเร็จ {pct}%</span>
            </span>
            <div className="flex-1 min-w-[160px] h-2.5 rounded-full bg-ivory-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct === 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-royal-600 to-navy-700'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMissingList((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                missingCount === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-royal-50 border-royal-300 text-royal-800 hover:bg-royal-100'
              }`}
            >
              <span>
                {missingCount === 0
                  ? '✓ บันทึกครบทุกส่วนแล้ว'
                  : `ยังขาด ${missingCount} ส่วน — กดทำต่อ`}
              </span>
              {showMissingList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showMissingList && completion?.items && (
            <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex flex-wrap gap-2">
              {completion.items.map((item) => {
                const targetTab =
                  item.key === 'attendance'
                    ? 'attendance'
                    : item.key === 'traits'
                    ? 'characteristics'
                    : 'scores';
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onJumpToMissingItem(targetTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      item.done
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-royal-300 text-royal-800 hover:bg-royal-50'
                    }`}
                  >
                    {item.done ? '✓' : '○'} {item.label} ({item.weight}%)
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* PDPA Privacy Notice */}
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-[11px] sm:text-xs leading-relaxed">
          <span className="font-bold">🔒 ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคล (PDPA) — </span>
          โรงเรียน/ครูผู้กรอกเป็นผู้ควบคุมข้อมูล: กรอกเท่าที่จำเป็นต่อเอกสาร · ไม่มีแบบพิมพ์ราชการฉบับใดของ ปพ.4–8 บังคับให้กรอกเลขบัตรประชาชน จะกรอกหรือเว้นว่างก็ได้ตามที่โรงเรียนกำหนด · ปพ.8 มีช่อง ศาสนา · หมู่เลือด · โรคประจำตัว · ความพิการ ซึ่งเป็นข้อมูลอ่อนไหวตาม PDPA มาตรา 26 ต้องได้รับความยินยอมจากผู้ปกครองเป็นการเฉพาะก่อนกรอก · ระบบเก็บไว้เฉพาะบัญชีของท่านและโรงเรียน ไม่มีคลังแชร์สาธารณะ
        </div>

        {/* Sample Loader Row */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs pt-0.5">
          <span className="font-semibold text-navy-900">ตัวอย่างสำหรับ</span>
          <select
            value={sampleGrade}
            onChange={(e) => setSampleGrade(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            {GRADE_LEVELS.filter((g) => g !== 'อ.3').map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={sampleRoom}
            onChange={(e) => setSampleRoom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            {['1', '2', '3', '4'].map((r) => (
              <option key={r} value={r}>
                ห้อง {r}
              </option>
            ))}
          </select>
          <span className="font-semibold text-navy-900 ml-1">โครงคะแนนตัวอย่าง</span>
          <select
            value={sampleMode}
            onChange={(e) => setSampleMode(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            {SAMPLE_STRUCTURE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              onLoadSampleCourseData({
                gradeLevel: sampleGrade,
                classroom: sampleRoom,
                structureMode:
                  SAMPLE_STRUCTURE_MODES.find((m) => m.id === sampleMode) || SAMPLE_STRUCTURE_MODES[0],
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-400 font-bold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            โหลดข้อมูลตัวอย่าง (นักเรียน {studentCount || 10} คน)
          </button>
        </div>

        {/* 15-Field Metadata + Ratios Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-navy-900 mb-1">โรงเรียน</label>
            <input
              type="text"
              value={form.school_name}
              onChange={(e) => handleFieldChange('school_name', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">สังกัด/เขตพื้นที่</label>
            <input
              type="text"
              value={form.affiliation}
              onChange={(e) => handleFieldChange('affiliation', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">ปีการศึกษา</label>
            <input
              type="text"
              value={form.academic_year}
              onChange={(e) => handleFieldChange('academic_year', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">ภาคเรียนที่</label>
            <input
              type="text"
              value={form.semester}
              onChange={(e) => handleFieldChange('semester', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">ระดับชั้น</label>
            <input
              type="text"
              value={form.grade_level}
              onChange={(e) => handleFieldChange('grade_level', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-navy-900 mb-1">ห้อง</label>
            <input
              type="text"
              value={form.classroom}
              onChange={(e) => handleFieldChange('classroom', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">ครูผู้สอน/ประจำชั้น</label>
            <input
              type="text"
              value={form.teacher_name}
              onChange={(e) => handleFieldChange('teacher_name', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">ผู้อำนวยการ</label>
            <input
              type="text"
              value={form.director_name}
              onChange={(e) => handleFieldChange('director_name', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">รายวิชา</label>
            <input
              type="text"
              value={form.subject_name}
              onChange={(e) => handleFieldChange('subject_name', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">รหัสวิชา</label>
            <input
              type="text"
              value={form.subject_code}
              onChange={(e) => handleFieldChange('subject_code', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-navy-900 mb-1">หน่วยกิต</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={form.credits}
              onChange={(e) => handleFieldChange('credits', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">เวลาเรียนเต็ม (ชม.)</label>
            <input
              type="number"
              min="1"
              value={form.total_hours}
              onChange={(e) => handleFieldChange('total_hours', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">สัดส่วนระหว่างเรียน</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.formative_ratio}
              onChange={(e) => handleFieldChange('formative_ratio', Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-bold focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">สัดส่วนกลางภาค</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.midterm_ratio}
              onChange={(e) => handleFieldChange('midterm_ratio', Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-bold focus:outline-none focus:border-navy-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-navy-900 mb-1">สัดส่วนปลายภาค</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.final_ratio}
              onChange={(e) => handleFieldChange('final_ratio', Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-bold focus:outline-none focus:border-navy-600"
            />
          </div>
        </div>

        {/* Decision Period, Popular Ratio Presets & Rounding Rules */}
        <div className="space-y-2.5 pt-2 border-t border-ivory-200 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-royal-800 w-44 sm:w-auto">📅 ช่วงการตัดสินผล:</span>
            <select
              value={decisionPeriod}
              onChange={(e) => onChangeStructureImmediate({ decisionPeriod: e.target.value })}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-medium"
            >
              {DECISION_PERIOD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">{activePeriodMeta.helper}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-amber-700 w-44 sm:w-auto">⚡ สัดส่วนคะแนนยอดนิยม:</span>
            <select
              value=""
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-medium"
            >
              <option value="">— เลือกเพื่อเติม 3 ช่อง —</option>
              {RATIO_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">
              เลือกแล้วแก้เองได้ · เวลาเรียนเต็มเติมให้จากหน่วยกิต (1 นก. = 40 ชม./ภาค) เมื่อเว้นว่าง
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-navy-900 w-44 sm:w-auto">
              🔢 ปัดคะแนนรวมก่อนตัดสินระดับผล (ตามที่สถานศึกษากำหนด):
            </span>
            <select
              value={roundingMode}
              onChange={(e) => onChangeStructureImmediate({ roundingMode: e.target.value })}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-medium"
            >
              {ROUNDING_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">เล่ม Word/Excel พิมพ์วิธีปัดนี้ไว้ในเชิงอรรถ</span>
          </div>
        </div>
      </div>

      {/* Card 2: Download & Quick Report Strip (Image 2) */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-4 sm:p-5 space-y-2.5">
        <div className="font-bold text-navy-900 text-sm flex items-center gap-2">
          <span>📥 ดาวน์โหลด</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={exportingDocx}
            onClick={async () => {
              setExportingDocx(true);
              try {
                await onExportWord();
              } finally {
                setExportingDocx(false);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-royal-700 hover:from-indigo-700 hover:to-royal-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-60"
          >
            <span>📄</span>
            {exportingDocx ? 'กำลังสร้างไฟล์ Word...' : 'ไฟล์ Word (.docx)'}
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <span>📊</span>
            ไฟล์ Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={onOpenRankedModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-royal-50 text-royal-800 border-2 border-royal-300 text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <span>📈</span>
            แบบสรุปคะแนนรายชั้น (เรียงอันดับ)
          </button>

          <button
            type="button"
            onClick={onOpenSlipsModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-royal-50 text-royal-800 border-2 border-royal-300 text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <span>💌</span>
            ใบแจ้งผลรายบุคคล (แจกผู้ปกครอง/นักเรียน)
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          เกรด · ร้อยละเวลาเรียน · สรุปสถิติ คำนวณให้อัตโนมัติจากข้อมูลที่กรอก — ช่องที่เว้นว่าง เอกสารจะเว้นให้เติมมือ · โปรดตรวจทานกับระเบียบวัดผลของสถานศึกษาก่อนใช้จริง
        </p>
      </div>
    </div>
  );
}
