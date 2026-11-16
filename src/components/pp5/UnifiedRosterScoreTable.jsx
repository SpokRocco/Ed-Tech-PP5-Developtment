import React, { useMemo, useState } from 'react';
import {
  Save,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import {
  expandThaiStudentPrefix,
  getFullStudentName,
} from '../../lib/thaiFormatting';

export function UnifiedRosterScoreTable({
  course,
  students = [],
  allCourses = [],
  allStudents = [],
  scoreStructure,
  scoreDrafts = {},
  computedStudents = [],
  attendanceStatsMap = {},
  gradeSummary = {},
  onChangeDirectField,
  onChangeSpecialStatus,
  onBulkAddStudents,
  onImportRosterFromCourse,
  onAddBlankStudentRow,
  onUpdateStudentRowMeta,
  onRemoveCourseStudent,
  onRenumberStudents,
  onFillEmptyAttendanceFull,
  onCreatePp6Draft,
  onOpenSemesterMerge,
  onSaveAll,
  saving = false,
}) {
  const [pasteText, setPasteText] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Quick fill inputs for "ตั้งทั้งคอลัมน์ (เติมเฉพาะช่องที่ยังว่าง)"
  const [colFill, setColFill] = useState({
    attendance: '',
    formative: '',
    midterm: '',
    final: '',
  });

  const formativeRatio = Number(scoreStructure?.formative_ratio ?? 60);
  const midtermRatio = Number(scoreStructure?.midterm_ratio ?? 20);
  const finalRatio = Number(scoreStructure?.final_ratio ?? 20);
  const planHours = Number(course?.total_hours || 40);

  const importableSources = useMemo(() => {
    const courseOptions = (allCourses || [])
      .filter((c) => c.id !== course.id)
      .map((c) => ({
        id: `course:${c.id}`,
        courseObj: c,
        label: `${c.subject_code} ${c.subject_name} (${c.grade_level}/${c.classroom} ภาค ${c.semester}/${c.academic_year})`,
        count: c.student_ids?.length || c.cover_settings?.customStudents?.length || 0,
      }));

    // Central room presets grouped by grade_level + classroom
    const roomMap = new Map();
    (allStudents || [])
      .filter((s) => s.status === 'active')
      .forEach((s) => {
        const key = `${s.grade_level}/${s.classroom || '1'}`;
        if (!roomMap.has(key)) roomMap.set(key, []);
        roomMap.get(key).push(s);
      });

    const roomOptions = Array.from(roomMap.entries()).map(([roomKey, list]) => ({
      id: `room:${roomKey}`,
      roomList: list,
      label: `รายชื่อนักเรียนฐานข้อมูลกลาง ห้อง ${roomKey}`,
      count: list.length,
    }));

    return { courseOptions, roomOptions };
  }, [allCourses, allStudents, course.id]);

  const handleBulkPasteSubmit = async () => {
    if (!pasteText.trim()) return;
    await onBulkAddStudents(pasteText);
    setPasteText('');
  };

  const handleApplyColumnFill = (fieldKey) => {
    const valStr = String(colFill[fieldKey] ?? '').trim();
    if (valStr === '') return;
    const numVal = Number(valStr);
    if (Number.isNaN(numVal)) return;

    const maxByField = {
      attendance: planHours,
      formative: formativeRatio,
      midterm: midtermRatio,
      final: finalRatio,
    };
    const clamped = Math.max(0, Math.min(maxByField[fieldKey] ?? 100, numVal));

    computedStudents.forEach(({ student, draft, att }) => {
      const unitScores = draft.unit_scores || {};
      if (fieldKey === 'attendance') {
        const currentHours =
          unitScores.__manualAttendanceHours ?? (att?.totalRecorded > 0 ? att.attendedPeriods : '');
        if (currentHours === '' || currentHours === null || currentHours === undefined) {
          onChangeDirectField(student.id, '__manualAttendanceHours', clamped);
        }
      } else if (fieldKey === 'formative') {
        if (
          unitScores.__directFormative === undefined ||
          unitScores.__directFormative === '' ||
          unitScores.__directFormative === null
        ) {
          onChangeDirectField(student.id, '__directFormative', clamped);
        }
      } else if (fieldKey === 'midterm') {
        if (
          unitScores.__directMidterm === undefined ||
          unitScores.__directMidterm === '' ||
          unitScores.__directMidterm === null
        ) {
          onChangeDirectField(student.id, '__directMidterm', clamped);
        }
      } else if (fieldKey === 'final') {
        if (
          unitScores.__directFinal === undefined ||
          unitScores.__directFinal === '' ||
          unitScores.__directFinal === null
        ) {
          onChangeDirectField(student.id, '__directFinal', clamped);
        }
      }
    });
    setColFill((prev) => ({ ...prev, [fieldKey]: '' }));
  };

  return (
    <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
      {/* Header Strip */}
      <div className="px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
            <span>⌛ รายชื่อนักเรียน · เวลาเรียน · คะแนน (เกรดคำนวณสด)</span>
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px]">
            {Object.entries(gradeSummary).map(([g, cnt]) => (
              <span key={g} className="px-2 py-0.5 rounded bg-white/10 text-gold-200">
                เกรด {g}: <b>{cnt}</b>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onSaveAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกคะแนนและรายชื่อทั้งหมด'}
        </button>
      </div>

      {/* Bulk Paste Bar */}
      <div className="p-4 sm:p-5 bg-ivory-50/70 border-b border-ivory-200 space-y-2">
        <div className="text-xs font-semibold text-navy-900">
          📋 วางรายชื่อทั้งห้องทีเดียว (บรรทัดละ 1 คน: ชื่อ หรือ เลขประจำตัว[เว้นวรรค]ชื่อ) —{' '}
          <span className="text-royal-700 font-normal">
            ด.ช./ด.ญ./น.ส. แปลงเป็นคำเต็มให้อัตโนมัติ
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <textarea
            rows={2}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'เด็กชายสมชาย ใจดี\nเด็กหญิงสมหญิง มีสุข\n2790 ด.ช.อาทิตย์ ภูมิใจ'}
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
          <div className="flex flex-col gap-2 sm:w-52 shrink-0 justify-center">
            <button
              type="button"
              onClick={handleBulkPasteSubmit}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-navy-50 text-navy-900 border border-royal-300 text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4 text-royal-600" />
              + เพิ่มรายชื่อ
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-royal-50 text-navy-900 border border-royal-300 text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <Users className="w-4 h-4 text-royal-600" />
              ดึงรายชื่อจากเอกสารเดิม
            </button>
          </div>
        </div>
      </div>

      {/* Unified Live Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
            <tr>
              <th className="py-2.5 px-2 text-center w-14">เลขที่</th>
              <th className="py-2.5 px-2 text-center w-24">เลขประจำตัว</th>
              <th className="py-2.5 px-3 text-left min-w-[190px]">ชื่อ - สกุล</th>
              <th className="py-2.5 px-2 text-center w-24">
                <div>เวลาเรียน</div>
                <div className="text-[10px] font-normal text-slate-500">(เต็ม {planHours})</div>
              </th>
              <th className="py-2.5 px-2 text-center w-14 text-royal-800">%</th>
              <th className="py-2.5 px-2 text-center w-20 bg-navy-50/70">
                <div>เก็บ</div>
                <div className="text-[10px] font-normal text-slate-500">({formativeRatio})</div>
              </th>
              <th className="py-2.5 px-2 text-center w-20 bg-royal-50/60">
                <div>กลางภาค</div>
                <div className="text-[10px] font-normal text-slate-500">({midtermRatio})</div>
              </th>
              <th className="py-2.5 px-2 text-center w-20 bg-gold-50/60">
                <div>ปลายภาค</div>
                <div className="text-[10px] font-normal text-slate-500">({finalRatio})</div>
              </th>
              <th className="py-2.5 px-2 text-center w-16 bg-navy-100/70 font-bold">รวม</th>
              <th className="py-2.5 px-2 text-center w-24 bg-navy-100/70 font-bold">เกรด</th>
              <th className="py-2.5 px-2 text-center w-24">จัดการ</th>
            </tr>

            {/* Bulk Column Fill Helper Row */}
            <tr className="bg-ivory-50/90 border-b border-ivory-200 text-[11px]">
              <td colSpan={3} className="py-1.5 px-3 text-right text-slate-500 font-medium">
                ⚡ ตั้งทั้งคอลัมน์ (เติมเฉพาะช่องที่ยังว่าง):
              </td>
              <td className="py-1.5 px-1.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={planHours}
                    value={colFill.attendance}
                    onChange={(e) => setColFill((p) => ({ ...p, attendance: e.target.value }))}
                    placeholder={String(planHours)}
                    className="w-12 py-0.5 px-1 text-center rounded border border-slate-300 bg-white text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyColumnFill('attendance')}
                    className="px-1.5 py-0.5 rounded bg-navy-800 text-gold-300 text-[10px] font-bold hover:bg-navy-900"
                    title="เติมเวลาเรียนลงช่องว่าง"
                  >
                    ใส่
                  </button>
                </div>
              </td>
              <td className="py-1.5 px-1 text-center text-slate-400">—</td>
              <td className="py-1.5 px-1.5 text-center bg-navy-50/30">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={formativeRatio}
                    value={colFill.formative}
                    onChange={(e) => setColFill((p) => ({ ...p, formative: e.target.value }))}
                    placeholder={String(formativeRatio)}
                    className="w-12 py-0.5 px-1 text-center rounded border border-slate-300 bg-white text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyColumnFill('formative')}
                    className="px-1.5 py-0.5 rounded bg-navy-800 text-gold-300 text-[10px] font-bold hover:bg-navy-900"
                    title="เติมคะแนนเก็บลงช่องว่าง"
                  >
                    ใส่
                  </button>
                </div>
              </td>
              <td className="py-1.5 px-1.5 text-center bg-royal-50/30">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={midtermRatio}
                    value={colFill.midterm}
                    onChange={(e) => setColFill((p) => ({ ...p, midterm: e.target.value }))}
                    placeholder={String(midtermRatio)}
                    className="w-12 py-0.5 px-1 text-center rounded border border-slate-300 bg-white text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyColumnFill('midterm')}
                    className="px-1.5 py-0.5 rounded bg-navy-800 text-gold-300 text-[10px] font-bold hover:bg-navy-900"
                    title="เติมคะแนนกลางภาคลงช่องว่าง"
                  >
                    ใส่
                  </button>
                </div>
              </td>
              <td className="py-1.5 px-1.5 text-center bg-gold-50/30">
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={finalRatio}
                    value={colFill.final}
                    onChange={(e) => setColFill((p) => ({ ...p, final: e.target.value }))}
                    placeholder={String(finalRatio)}
                    className="w-12 py-0.5 px-1 text-center rounded border border-slate-300 bg-white text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyColumnFill('final')}
                    className="px-1.5 py-0.5 rounded bg-navy-800 text-gold-300 text-[10px] font-bold hover:bg-navy-900"
                    title="เติมคะแนนปลายภาคลงช่องว่าง"
                  >
                    ใส่
                  </button>
                </div>
              </td>
              <td colSpan={3} />
            </tr>
          </thead>

          <tbody className="divide-y divide-ivory-200">
            {computedStudents.map(({ student, draft, att, computed }, idx) => {
              const unitScores = draft.unit_scores || {};
              const displayedAttHours =
                unitScores.__manualAttendanceHours !== undefined &&
                unitScores.__manualAttendanceHours !== null
                  ? unitScores.__manualAttendanceHours
                  : att?.totalRecorded > 0
                  ? att.attendedPeriods
                  : '';

              const displayedFormative =
                unitScores.__directFormative !== undefined && unitScores.__directFormative !== null
                  ? unitScores.__directFormative
                  : computed.formativeTotal > 0
                  ? computed.formativeTotal
                  : '';
              const displayedMidterm =
                unitScores.__directMidterm !== undefined && unitScores.__directMidterm !== null
                  ? unitScores.__directMidterm
                  : computed.midtermTotal > 0
                  ? computed.midtermTotal
                  : '';
              const displayedFinal =
                unitScores.__directFinal !== undefined && unitScores.__directFinal !== null
                  ? unitScores.__directFinal
                  : computed.finalTotal > 0
                  ? computed.finalTotal
                  : '';

              const attPct = computed.effectiveAttendancePct ?? att?.attendancePct ?? 100;
              const isFailOrSpecial = ['0', 'ร', 'มส'].includes(computed.grade);

              return (
                <tr key={student.id} className="hover:bg-ivory-50/70">
                  <td className="py-1.5 px-1.5 text-center">
                    <input
                      type="number"
                      min={1}
                      value={student.student_number ?? idx + 1}
                      onChange={(e) =>
                        onUpdateStudentRowMeta(student.id, {
                          student_number: Number(e.target.value) || idx + 1,
                        })
                      }
                      className="w-11 text-center py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-navy-600 focus:bg-white bg-transparent text-xs font-medium text-slate-700"
                    />
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <input
                      type="text"
                      value={student.student_code || ''}
                      onChange={(e) =>
                        onUpdateStudentRowMeta(student.id, { student_code: e.target.value })
                      }
                      placeholder="รหัส"
                      className="w-20 text-center py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-navy-600 focus:bg-white bg-transparent text-xs font-mono text-slate-700"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      defaultValue={getFullStudentName(student)}
                      key={`${student.id}|${getFullStudentName(student)}`}
                      onBlur={(e) => {
                        const expanded = expandThaiStudentPrefix(e.target.value);
                        if (expanded !== getFullStudentName(student)) {
                          onUpdateStudentRowMeta(student.id, { fullName: expanded });
                        }
                      }}
                      className="w-full py-1 px-2 rounded-lg border border-transparent hover:border-slate-300 focus:border-navy-600 focus:bg-white bg-transparent text-xs sm:text-sm font-medium text-navy-900"
                    />
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      max={planHours}
                      step="0.5"
                      value={displayedAttHours}
                      placeholder={att?.totalRecorded > 0 ? String(att.attendedPeriods) : '-'}
                      onChange={(e) =>
                        onChangeDirectField(
                          student.id,
                          '__manualAttendanceHours',
                          e.target.value === '' ? '' : Math.max(0, Math.min(planHours, Number(e.target.value) || 0))
                        )
                      }
                      className="w-16 text-center py-1 px-1 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:border-navy-600"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center font-bold text-royal-800 text-xs">
                    {attPct}
                  </td>
                  <td className="py-1.5 px-1.5 text-center bg-navy-50/30">
                    <input
                      type="number"
                      min={0}
                      max={formativeRatio}
                      step="0.5"
                      value={displayedFormative}
                      onChange={(e) =>
                        onChangeDirectField(
                          student.id,
                          '__directFormative',
                          e.target.value === ''
                            ? ''
                            : Math.max(0, Math.min(formativeRatio, Number(e.target.value) || 0))
                        )
                      }
                      className="w-16 text-center py-1 px-1 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:border-navy-600"
                    />
                  </td>
                  <td className="py-1.5 px-1.5 text-center bg-royal-50/25">
                    <input
                      type="number"
                      min={0}
                      max={midtermRatio}
                      step="0.5"
                      value={displayedMidterm}
                      onChange={(e) =>
                        onChangeDirectField(
                          student.id,
                          '__directMidterm',
                          e.target.value === ''
                            ? ''
                            : Math.max(0, Math.min(midtermRatio, Number(e.target.value) || 0))
                        )
                      }
                      className="w-16 text-center py-1 px-1 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:border-royal-600"
                    />
                  </td>
                  <td className="py-1.5 px-1.5 text-center bg-gold-50/25">
                    <input
                      type="number"
                      min={0}
                      max={finalRatio}
                      step="0.5"
                      value={displayedFinal}
                      onChange={(e) =>
                        onChangeDirectField(
                          student.id,
                          '__directFinal',
                          e.target.value === ''
                            ? ''
                            : Math.max(0, Math.min(finalRatio, Number(e.target.value) || 0))
                        )
                      }
                      className="w-16 text-center py-1 px-1 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:border-gold-600"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center bg-navy-100/40 font-bold text-royal-900">
                    {computed.totalScore}
                  </td>
                  <td className="py-1.5 px-2 text-center bg-navy-100/40">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`inline-block min-w-[30px] px-1.5 py-0.5 rounded-md font-bold text-xs ${
                          isFailOrSpecial
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {computed.grade}
                      </span>
                      <select
                        value={draft.special_status || ''}
                        onChange={(e) => onChangeSpecialStatus(student.id, e.target.value)}
                        title="ปรับสถานะพิเศษ"
                        className="text-[10px] border border-slate-200 rounded py-0.5 px-1 bg-white"
                      >
                        <option value="">อัตฯ</option>
                        <option value="ร">ร</option>
                        <option value="มส">มส</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveCourseStudent(student.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                      title="นำนักเรียนออกจากเล่มนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {computedStudents.length === 0 && (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-500">
                  ยังไม่มีนักเรียนในรายวิชานี้ — วางรายชื่อในช่องด้านบน หรือกด &quot;+ เพิ่มนักเรียน 1 แถว&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom 5 Action Utility Strip (matches Image 5) */}
      <div className="p-4 bg-ivory-50 border-t border-ivory-200 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onAddBlankStudentRow}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-royal-50 text-royal-800 border border-royal-300 text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <span>+ เพิ่มนักเรียน 1 แถว</span>
        </button>

        <button
          type="button"
          onClick={onFillEmptyAttendanceFull}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          เติมเวลาเรียนเต็มให้ช่องที่ยังว่าง
        </button>

        <button
          type="button"
          onClick={onCreatePp6Draft}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <span>🏭 สร้างร่าง ปพ.6 รายคนทั้งห้อง</span>
        </button>

        <button
          type="button"
          onClick={onOpenSemesterMerge}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-400 text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <span>🧩 รวม ปพ.5 ภาค 1 + ภาค 2 → เล่มรายปี</span>
        </button>

        <button
          type="button"
          onClick={onRenumberStudents}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-sky-50 text-navy-900 border border-sky-300 text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <span>🔢 รันเลขที่ใหม่</span>
        </button>
      </div>

      {/* Modal: Import Roster from Existing Course or School Room */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-navy-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm sm:text-base">🧑‍🏫 ดึงรายชื่อนักเรียนจากเอกสารเดิม / ห้องเรียน</h4>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
              >
                ปิด
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {importableSources.roomOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-navy-900">รายชื่อตามห้องเรียนในฐานข้อมูลโรงเรียน:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importableSources.roomOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={async () => {
                          await onImportRosterFromCourse({ type: 'room', students: opt.roomList });
                          setImportModalOpen(false);
                        }}
                        className="text-left p-3 rounded-xl border border-ivory-300 hover:border-navy-600 hover:bg-navy-50/40 transition-colors"
                      >
                        <div className="text-xs font-bold text-navy-900">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{opt.count} คน</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {importableSources.courseOptions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-ivory-200">
                  <p className="text-xs font-bold text-navy-900">คัดลอกรายชื่อจากเล่ม ปพ.5 อื่น:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importableSources.courseOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={async () => {
                          await onImportRosterFromCourse({ type: 'course', sourceCourse: opt.courseObj });
                          setImportModalOpen(false);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-ivory-300 hover:border-navy-600 hover:bg-navy-50/40 flex items-center justify-between transition-colors"
                      >
                        <span className="text-xs font-medium text-navy-900">{opt.label}</span>
                        <span className="text-[11px] font-bold text-royal-700 shrink-0 ml-2">
                          {opt.count} คน → ดึงรายชื่อ
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
