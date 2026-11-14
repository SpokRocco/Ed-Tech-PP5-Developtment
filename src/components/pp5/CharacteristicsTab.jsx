import React, { useState, useMemo } from 'react';
import { Sliders, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { useScoringModel } from '../../hooks/useScoringModel';
import { LEVEL_LABELS, getFullStudentName } from '../../lib/thaiFormatting';

/**
 * [INTEGRATION HOOK 2 UI]
 * ตารางกรอกคะแนนคุณลักษณะอันพึงประสงค์ 8 ประการ และการอ่าน คิดวิเคราะห์ และเขียน
 * ออกแบบให้ปรับเปลี่ยนเกณฑ์และสัดส่วนคะแนนได้ทันทีตามรูปภาพตัวอย่าง UI ที่ผู้ใช้จะแนบในขั้นตอนถัดไป
 */
export function CharacteristicsTab({
  courseId,
  students,
  characteristicsRows,
  onSaveCharacteristics,
}) {
  const {
    model,
    updateModel,
    updateTraitWeight,
    updateRtwWeight,
    evaluateStudentTraits,
    evaluateStudentRtw,
  } = useScoringModel(characteristicsRows?.[0]?.characteristics_config || {});

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [savedBanner, setSavedBanner] = useState('');

  const [drafts, setDrafts] = useState(() => {
    const map = {};
    students.forEach((stu) => {
      const existing = (characteristicsRows || []).find((r) => r.student_id === stu.id);
      map[stu.id] = {
        traits: existing?.traits || { t1: 3, t2: 3, t3: 3, t4: 3, t5: 3, t6: 3, t7: 3, t8: 3 },
        reading_thinking_writing: existing?.reading_thinking_writing || { r1: 3, r2: 3, r3: 3 },
      };
    });
    return map;
  });

  const evaluatedRows = useMemo(() => {
    return students.map((stu) => {
      const row = drafts[stu.id] || {
        traits: { t1: 3, t2: 3, t3: 3, t4: 3, t5: 3, t6: 3, t7: 3, t8: 3 },
        reading_thinking_writing: { r1: 3, r2: 3, r3: 3 },
      };
      const tEval = evaluateStudentTraits(row.traits);
      const rEval = evaluateStudentRtw(row.reading_thinking_writing);
      return {
        student: stu,
        row,
        tEval,
        rEval,
      };
    });
  }, [students, drafts, evaluateStudentTraits, evaluateStudentRtw]);

  const setTraitVal = (studentId, key, val) => {
    const clamped = Math.max(0, Math.min(model.maxItemScore || 3, Number(val) || 0));
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        traits: { ...(prev[studentId]?.traits || {}), [key]: clamped },
      },
    }));
  };

  const setRtwVal = (studentId, key, val) => {
    const clamped = Math.max(0, Math.min(model.maxItemScore || 3, Number(val) || 0));
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reading_thinking_writing: {
          ...(prev[studentId]?.reading_thinking_writing || {}),
          [key]: clamped,
        },
      },
    }));
  };

  const fillAllStudentsLevel = (levelVal) => {
    const next = {};
    students.forEach((stu) => {
      const traits = {};
      model.traitItems.forEach((t) => {
        traits[t.key] = levelVal;
      });
      const rtw = {};
      model.rtwItems.forEach((r) => {
        rtw[r.key] = levelVal;
      });
      next[stu.id] = { traits, reading_thinking_writing: rtw };
    });
    setDrafts(next);
    setSavedBanner(`กำหนดคะแนนประเมินระดับ ${levelVal} ให้ทั้งห้องเรียบร้อย (กดบันทึกเพื่อยืนยัน)`);
  };

  const handleSave = async () => {
    const payload = evaluatedRows.map(({ student, row, tEval, rEval }) => ({
      course_id: courseId,
      student_id: student.id,
      characteristics_config: model,
      traits: row.traits,
      traits_avg: tEval.average,
      traits_level: tEval.level,
      reading_thinking_writing: row.reading_thinking_writing,
      rtw_avg: rEval.average,
      rtw_level: rEval.level,
    }));
    await onSaveCharacteristics(payload);
    setSavedBanner('บันทึกคะแนนคุณลักษณะอันพึงประสงค์ และ การอ่าน คิดวิเคราะห์ เขียน เรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-ivory-300 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-navy-900">
            ประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ และ การอ่าน คิดวิเคราะห์ และเขียน
          </h3>
          <p className="text-xs text-slate-500">
            เกณฑ์สรุป: 3 = ดีเยี่ยม, 2 = ดี, 1 = ผ่าน, 0 = ไม่ผ่าน (ปรับสัดส่วน/น้ำหนักเกณฑ์ได้)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fillAllStudentsLevel(3)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" /> เติมดีเยี่ยม (3) ทั้งห้อง
          </button>
          <button
            type="button"
            onClick={() => fillAllStudentsLevel(2)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold"
          >
            เติมดี (2) ทั้งห้อง
          </button>
          <button
            type="button"
            onClick={() => setShowConfigPanel((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-royal-50 hover:bg-purple-100 text-royal-800 border border-purple-200 text-xs font-semibold"
          >
            <Sliders className="w-3.5 h-3.5" /> ปรับสัดส่วนคะแนน / เกณฑ์
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-sm font-semibold shadow-sm"
          >
            <Save className="w-4 h-4" /> บันทึกผลการประเมิน
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {savedBanner}
        </div>
      )}

      {/* Configurable Ratio Adapter Panel (Hook 2) */}
      {showConfigPanel && (
        <div className="bg-royal-50/70 border border-purple-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-royal-900 text-sm">
                ตั้งค่าเกณฑ์และสัดส่วนน้ำหนักคะแนน (Scoring Config Adapter)
              </h4>
              <p className="text-xs text-royal-700">
                ปรับคะแนนเต็มต่อข้อ น้ำหนักรายข้อ และจุดตัดระดับคุณภาพได้ตามแบบฟอร์มของโรงเรียน
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-royal-900 bg-white px-3 py-1.5 rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={model.useCustomWeights}
                onChange={(e) => updateModel({ useCustomWeights: e.target.checked })}
              />
              เปิดใช้การถ่วงน้ำหนัก (%) รายข้อ
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-purple-100">
              <label className="block text-xs text-slate-600">คะแนนเต็มต่อข้อ</label>
              <input
                type="number"
                min={1}
                max={100}
                value={model.maxItemScore}
                onChange={(e) => updateModel({ maxItemScore: Number(e.target.value) || 3 })}
                className="mt-1 w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div className="bg-white p-3 rounded-xl border border-purple-100">
              <label className="block text-xs text-slate-600">เกณฑ์ "ดีเยี่ยม (3)" ขั้นต่ำ</label>
              <input
                type="number"
                step="0.1"
                value={model.levelThresholds.excellent}
                onChange={(e) =>
                  updateModel({
                    levelThresholds: { ...model.levelThresholds, excellent: Number(e.target.value) },
                  })
                }
                className="mt-1 w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div className="bg-white p-3 rounded-xl border border-purple-100">
              <label className="block text-xs text-slate-600">เกณฑ์ "ดี (2)" ขั้นต่ำ</label>
              <input
                type="number"
                step="0.1"
                value={model.levelThresholds.good}
                onChange={(e) =>
                  updateModel({
                    levelThresholds: { ...model.levelThresholds, good: Number(e.target.value) },
                  })
                }
                className="mt-1 w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div className="bg-white p-3 rounded-xl border border-purple-100">
              <label className="block text-xs text-slate-600">เกณฑ์ "ผ่าน (1)" ขั้นต่ำ</label>
              <input
                type="number"
                step="0.1"
                value={model.levelThresholds.pass}
                onChange={(e) =>
                  updateModel({
                    levelThresholds: { ...model.levelThresholds, pass: Number(e.target.value) },
                  })
                }
                className="mt-1 w-full px-2.5 py-1 rounded-lg border border-slate-300 font-bold"
              />
            </div>
          </div>

          {model.useCustomWeights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-2">
                <p className="text-xs font-semibold text-navy-900">น้ำหนักคุณลักษณะฯ 8 ประการ (%)</p>
                <div className="grid grid-cols-2 gap-2">
                  {model.traitItems.map((t) => (
                    <div key={t.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{t.code}. {t.name}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={t.weight}
                        onChange={(e) => updateTraitWeight(t.key, e.target.value)}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-2">
                <p className="text-xs font-semibold text-navy-900">น้ำหนักการอ่าน คิดวิเคราะห์ เขียน (%)</p>
                <div className="space-y-2">
                  {model.rtwItems.map((r) => (
                    <div key={r.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{r.code}. {r.name}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={r.weight}
                        onChange={(e) => updateRtwWeight(r.key, e.target.value)}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Evaluation Table */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-white/15">ที่</th>
                <th rowSpan={2} className="py-2.5 px-3 text-left min-w-[160px] border-r border-white/15">
                  ชื่อ - สกุล
                </th>
                <th colSpan={model.traitItems.length + 1} className="py-2 px-2 text-center bg-navy-800 border-r border-white/20">
                  คุณลักษณะอันพึงประสงค์ 8 ประการ (คะแนนเต็มข้อละ {model.maxItemScore})
                </th>
                <th colSpan={model.rtwItems.length + 1} className="py-2 px-2 text-center bg-royal-800">
                  การอ่าน คิดวิเคราะห์ และเขียน (คะแนนเต็มข้อละ {model.maxItemScore})
                </th>
              </tr>
              <tr className="bg-navy-800/90 text-gold-200 text-[11px]">
                {model.traitItems.map((t) => (
                  <th key={t.key} className="py-1.5 px-1.5 text-center border-r border-white/10" title={t.name}>
                    ข้อ {t.code}
                  </th>
                ))}
                <th className="py-1.5 px-2 text-center bg-navy-950 border-r border-white/20">สรุปผล</th>
                {model.rtwItems.map((r) => (
                  <th key={r.key} className="py-1.5 px-2 text-center bg-royal-900 border-r border-white/10" title={r.name}>
                    {r.code === '1' ? 'อ่าน' : r.code === '2' ? 'คิด' : 'เขียน'}
                  </th>
                ))}
                <th className="py-1.5 px-2 text-center bg-royal-950">สรุปผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {evaluatedRows.map(({ student, row, tEval, rEval }, idx) => {
                const tMeta = LEVEL_LABELS[tEval.level] || LEVEL_LABELS[3];
                const rMeta = LEVEL_LABELS[rEval.level] || LEVEL_LABELS[3];
                return (
                  <tr key={student.id} className="hover:bg-ivory-50">
                    <td className="py-2 px-3 text-center text-slate-600">
                      {student.student_number || idx + 1}
                    </td>
                    <td className="py-2 px-3 font-medium text-navy-900">
                      {getFullStudentName(student)}
                    </td>

                    {model.traitItems.map((t) => (
                      <td key={t.key} className="py-1.5 px-1 text-center border-l border-ivory-200">
                        <input
                          type="number"
                          min={0}
                          max={model.maxItemScore}
                          value={row.traits?.[t.key] ?? 3}
                          onChange={(e) => setTraitVal(student.id, t.key, e.target.value)}
                          className="w-11 text-center py-1 rounded border border-slate-300 font-semibold focus:border-navy-700 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-center bg-navy-50/50 border-l border-ivory-300">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${tMeta.badge}`}>
                        {tMeta.label} ({tMeta.code})
                      </span>
                    </td>

                    {model.rtwItems.map((r) => (
                      <td key={r.key} className="py-1.5 px-1 text-center border-l border-ivory-200">
                        <input
                          type="number"
                          min={0}
                          max={model.maxItemScore}
                          value={row.reading_thinking_writing?.[r.key] ?? 3}
                          onChange={(e) => setRtwVal(student.id, r.key, e.target.value)}
                          className="w-12 text-center py-1 rounded border border-slate-300 font-semibold focus:border-royal-700 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-center bg-royal-50/50 border-l border-ivory-300">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${rMeta.badge}`}>
                        {rMeta.label} ({rMeta.code})
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
