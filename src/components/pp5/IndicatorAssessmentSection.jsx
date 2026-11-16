import React, { useMemo } from 'react';
import { getFullStudentName } from '../../lib/thaiFormatting';

/**
 * ดึงรหัสตัวชี้วัดย่อ + ข้อความสั้นสำหรับหัวตาราง หัวข้อ ๑.๑
 */
function parseIndicatorItems(customIndicatorsText = '', selectedIndicatorObjects = []) {
  const lines = String(customIndicatorsText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.map((line, idx) => {
      const codeMatch = line.match(/^([ก-ฮ]\s*\d+(?:\.\d+)?\s*[ปม]\.\d+\/\d+)/);
      const code = codeMatch ? codeMatch[1].replace(/\s+/g, ' ').trim() : `ตชว.${idx + 1}`;
      return {
        key: `ind_${idx + 1}`,
        index: idx + 1,
        code,
        fullLine: line,
      };
    });
  }

  return (selectedIndicatorObjects || []).map((ind, idx) => ({
    key: `ind_${idx + 1}`,
    index: idx + 1,
    code: ind.indicator_code || `ตชว.${idx + 1}`,
    fullLine: `${ind.indicator_code} (${ind.indicator_type}): ${ind.indicator_text}`,
  }));
}

export function IndicatorAssessmentSection({
  students = [],
  customIndicatorsText = '',
  selectedIndicatorObjects = [],
  formativeRatio = 60,
  indicatorMode = 'score',
  indicatorPassPct = 50,
  indicatorMaxScores = {},
  scoreDrafts = {},
  onChangeMode,
  onChangePassPct,
  onChangeMaxScore,
  onChangeStudentIndicatorScore,
  onTransferSumToFormative,
  onClearAllIndicatorScores,
}) {
  const indicatorItems = useMemo(
    () => parseIndicatorItems(customIndicatorsText, selectedIndicatorObjects),
    [customIndicatorsText, selectedIndicatorObjects]
  );

  // คะแนนเต็มเริ่มต้นต่อตัวชี้วัด: กระจายจากสัดส่วนระหว่างเรียนให้ลงตัว (เช่น 60 / 4 = 15)
  const effectiveMaxByKey = useMemo(() => {
    const count = indicatorItems.length;
    const baseEach = count > 0 ? Math.floor((Number(formativeRatio) || 60) / count) : 15;
    let remainder = count > 0 ? Math.max(0, (Number(formativeRatio) || 60) - baseEach * count) : 0;
    const map = {};
    indicatorItems.forEach((item) => {
      const saved = indicatorMaxScores?.[item.key];
      if (saved !== undefined && saved !== null && saved !== '') {
        map[item.key] = Math.max(1, Number(saved) || 1);
      } else {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        map[item.key] = Math.max(1, baseEach + extra);
      }
    });
    return map;
  }, [indicatorItems, indicatorMaxScores, formativeRatio]);

  const totalIndicatorMax = useMemo(
    () => indicatorItems.reduce((sum, item) => sum + (effectiveMaxByKey[item.key] || 0), 0),
    [indicatorItems, effectiveMaxByKey]
  );

  const handleTransferClick = () => {
    const map = {};
    students.forEach((stu) => {
      const indMap = scoreDrafts[stu.id]?.unit_scores?.indicatorScores || {};
      if (indicatorMode === 'pass_fail') {
        const passCount = indicatorItems.filter((it) => indMap[it.key] === 'ผ').length;
        const scaled =
          indicatorItems.length > 0
            ? Number(((passCount / indicatorItems.length) * (Number(formativeRatio) || 60)).toFixed(1))
            : 0;
        map[stu.id] = scaled;
      } else {
        const hasAny = indicatorItems.some(
          (it) => indMap[it.key] !== undefined && indMap[it.key] !== null && indMap[it.key] !== ''
        );
        if (!hasAny) return;
        const rawSum = indicatorItems.reduce((s, it) => s + (Number(indMap[it.key]) || 0), 0);
        const fRatio = Number(formativeRatio) || 60;
        const finalVal =
          totalIndicatorMax > 0 && totalIndicatorMax !== fRatio
            ? Number(((rawSum / totalIndicatorMax) * fRatio).toFixed(1))
            : Number(rawSum.toFixed(1));
        map[stu.id] = Math.min(fRatio, Math.max(0, finalVal));
      }
    });
    onTransferSumToFormative(map);
  };

  return (
    <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 to-navy-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
            <span>✅ ผลการประเมินตามตัวชี้วัดรายบุคคล (พิมพ์ลงเล่ม ปพ.5 หัวข้อ ๑.๑)</span>
          </h3>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            บันทึกคะแนนหรือผลผ่าน/ไม่ผ่านแยกตามตัวชี้วัดแต่ละข้อ แล้วส่งผลรวมเข้าช่อง &quot;เก็บ&quot; ด้านบนได้ในคลิกเดียว
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTransferClick}
            disabled={indicatorItems.length === 0 || students.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-navy-900 hover:bg-gold-100 border border-royal-300 text-xs sm:text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
          >
            <span>🧑‍🏫</span>
            นำผลรวมไปใส่ช่อง &quot;เก็บ&quot; ทุกคน
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('ต้องการล้างคะแนนตามตัวชี้วัด (หัวข้อ ๑.๑) ทั้งตารางใช่หรือไม่?')) {
                onClearAllIndicatorScores();
              }
            }}
            disabled={indicatorItems.length === 0 || students.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 text-xs sm:text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
          >
            <span>🧽</span>
            ล้างทั้งตาราง
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Mode & Pass Threshold Controls */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-navy-900">รูปแบบการบันทึก:</label>
            <select
              value={indicatorMode}
              onChange={(e) => onChangeMode(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-navy-900 font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
            >
              <option value="score">คะแนนรายตัวชี้วัด (แบบเล่ม ปพ.5 ทั่วไป — รวมคะแนนอัตโนมัติ)</option>
              <option value="pass_fail">ผ่าน / ไม่ผ่าน (ผ / มผ รายตัวชี้วัด)</option>
            </select>
          </div>

          {indicatorMode === 'pass_fail' ? null : (
            <div className="flex items-center gap-2">
              <label className="font-semibold text-royal-800">เกณฑ์ผ่านตัวชี้วัด (%):</label>
              <input
                type="number"
                min={1}
                max={100}
                value={indicatorPassPct}
                onChange={(e) => onChangePassPct(Math.max(1, Math.min(100, Number(e.target.value) || 50)))}
                placeholder="เช่น 50"
                className="w-20 px-2.5 py-1 rounded-xl border border-slate-300 bg-white text-center font-bold text-navy-900"
              />
            </div>
          )}
        </div>

        {/* Indicator Max Scores Inline Strip */}
        {indicatorItems.length > 0 ? (
          <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              ✏️ คะแนนเต็มรายตัวชี้วัด (พิมพ์ในตาราง ๑ และหัวตาราง ๑.๑ ของเล่ม) — รวมเต็ม{' '}
              <b className="text-navy-900">{totalIndicatorMax}</b> คะแนน
              {totalIndicatorMax !== Number(formativeRatio) && indicatorMode === 'score' && (
                <span className="ml-2 text-amber-700">
                  (ระบบเทียบสัดส่วนให้อัตโนมัติเข้าช่องเก็บ {formativeRatio} คะแนนเมื่อกดปุ่มนำผลรวมไปใส่)
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {indicatorItems.map((item) => (
                <div
                  key={item.key}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-ivory-300 text-xs"
                  title={item.fullLine}
                >
                  <span className="font-bold text-navy-900">{item.index}</span>
                  <span className="text-slate-600 max-w-[210px] truncate">{item.fullLine}</span>
                  {indicatorMode === 'score' && (
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={effectiveMaxByKey[item.key]}
                      onChange={(e) =>
                        onChangeMaxScore(item.key, Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                      }
                      className="w-14 px-1.5 py-0.5 rounded border border-slate-300 text-center font-bold text-navy-900"
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              พิมพ์คะแนนที่ได้ในแต่ละตัวชี้วัด · ช่อง &quot;รวม&quot; คำนวณสด (แดง = มีคะแนนเกินคะแนนเต็ม) · กด &quot;🧑‍🏫 นำผลรวมไปใส่ช่อง เก็บ&quot; เพื่อให้คะแนนระหว่างเรียนในตารางตรงกับเล่มโดยไม่ต้องพิมพ์ซ้ำ
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 text-center">
            กรุณากดเติมตัวชี้วัด หรือพิมพ์ตัวชี้วัดในส่วน &quot;ตัวชี้วัด/ผลการเรียนรู้ของรายวิชา&quot; ด้านบน เพื่อเปิดตารางประเมินรายตัวชี้วัด หัวข้อ ๑.๑
          </div>
        )}

        {/* Per-Student x Indicator Matrix */}
        {indicatorItems.length > 0 && (
          <div className="overflow-x-auto border border-ivory-300 rounded-xl">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">เลขที่</th>
                  <th className="py-2.5 px-3 text-left min-w-[180px]">ชื่อ - สกุล</th>
                  {indicatorItems.map((item) => (
                    <th
                      key={item.key}
                      className="py-2 px-2 text-center min-w-[66px] border-l border-ivory-200"
                      title={item.fullLine}
                    >
                      <div className="font-bold text-navy-900">{item.index}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {indicatorMode === 'pass_fail' ? '(ผ/มผ)' : `(${effectiveMaxByKey[item.key]})`}
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center bg-royal-50/70 border-l border-ivory-300 font-bold text-royal-900">
                    {indicatorMode === 'pass_fail' ? `ผ่าน/${indicatorItems.length}` : `รวม/${totalIndicatorMax}`}
                  </th>
                  <th className="py-2.5 px-3 text-center bg-ivory-100 border-l border-ivory-200 font-bold">
                    ผล
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {students.map((stu, idx) => {
                  const indMap = scoreDrafts[stu.id]?.unit_scores?.indicatorScores || {};
                  let rowSum = 0;
                  let hasOver = false;
                  let hasBelowThreshold = false;
                  let enteredCount = 0;
                  let passCount = 0;
                  let failCount = 0;

                  indicatorItems.forEach((it) => {
                    const raw = indMap[it.key];
                    if (indicatorMode === 'pass_fail') {
                      if (raw === 'ผ') {
                        enteredCount += 1;
                        passCount += 1;
                      } else if (raw === 'มผ') {
                        enteredCount += 1;
                        failCount += 1;
                      }
                    } else if (raw !== undefined && raw !== null && raw !== '') {
                      enteredCount += 1;
                      const n = Number(raw) || 0;
                      const maxVal = effectiveMaxByKey[it.key] || 1;
                      rowSum += n;
                      if (n > maxVal) hasOver = true;
                      if ((n / maxVal) * 100 < Number(indicatorPassPct || 50)) {
                        hasBelowThreshold = true;
                      }
                    }
                  });

                  return (
                    <tr key={stu.id} className="hover:bg-ivory-50">
                      <td className="py-2 px-3 text-center text-slate-600">{stu.student_number || idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-navy-900">{getFullStudentName(stu)}</td>
                      {indicatorItems.map((it) => {
                        const rawVal = indMap[it.key] ?? '';
                        const maxVal = effectiveMaxByKey[it.key] || 15;
                        const numVal = Number(rawVal);
                        const over = indicatorMode === 'score' && rawVal !== '' && numVal > maxVal;
                        const low =
                          indicatorMode === 'score' &&
                          rawVal !== '' &&
                          !over &&
                          (numVal / maxVal) * 100 < Number(indicatorPassPct || 50);

                        return (
                          <td key={it.key} className="py-1.5 px-1.5 text-center border-l border-ivory-200">
                            {indicatorMode === 'pass_fail' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = rawVal === 'ผ' ? 'มผ' : rawVal === 'มผ' ? '' : 'ผ';
                                  onChangeStudentIndicatorScore(stu.id, it.key, next);
                                }}
                                className={`w-12 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                  rawVal === 'ผ'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : rawVal === 'มผ'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-ivory-100'
                                }`}
                              >
                                {rawVal || '—'}
                              </button>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                step="0.5"
                                value={rawVal}
                                onChange={(e) =>
                                  onChangeStudentIndicatorScore(stu.id, it.key, e.target.value)
                                }
                                className={`w-14 text-center py-1 px-1 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 ${
                                  over
                                    ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-200'
                                    : low
                                    ? 'border-amber-400 bg-amber-50/70 text-amber-800 focus:ring-amber-200'
                                    : 'border-slate-200 bg-white text-navy-900 focus:ring-navy-200'
                                }`}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td
                        className={`py-2 px-3 text-center font-bold border-l border-ivory-200 ${
                          hasOver ? 'bg-rose-50 text-rose-700' : 'bg-royal-50/40 text-royal-800'
                        }`}
                      >
                        {indicatorMode === 'pass_fail'
                          ? enteredCount > 0
                            ? `${passCount}/${indicatorItems.length}`
                            : ''
                          : enteredCount > 0
                          ? Number(rowSum.toFixed(1))
                          : ''}
                      </td>
                      <td className="py-2 px-2 text-center border-l border-ivory-200 text-xs font-semibold">
                        {enteredCount === 0 ? (
                          ''
                        ) : indicatorMode === 'pass_fail' ? (
                          <span
                            className={
                              failCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }
                          >
                            {failCount > 0 ? 'ซ่อมเสริม' : 'ผ่าน'}
                          </span>
                        ) : hasBelowThreshold ? (
                          <span className="text-amber-700">ซ่อมเสริม</span>
                        ) : (
                          <span className="text-emerald-700">ผ่าน</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          ตัวชี้วัดที่ได้คะแนนต่ำกว่าเกณฑ์ ให้สอนซ่อมเสริมแล้วประเมินใหม่ (เกณฑ์ผ่านตัวชี้วัดสถานศึกษากำหนดเอง) · หมายเลขตัวชี้วัดตรงกับลำดับบรรทัดในช่องตัวชี้วัด (ตาราง ๑ ในเล่ม)
        </p>
      </div>
    </div>
  );
}
