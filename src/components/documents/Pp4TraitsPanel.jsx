import React, { useMemo } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { getFullStudentName, GRADE_LEVELS, LEVEL_LABELS } from '../../lib/thaiFormatting';
import { DESIRABLE_TRAITS_8, evaluateCriteriaSummary } from '../../services/scoringConfigAdapter';
import { dataService } from '../../services/dataService';

const NON_KINDERGARTEN_GRADES = GRADE_LEVELS.filter((g) => g !== 'อ.3');

export function Pp4TraitsPanel({
  docState,
  onChangeDoc,
  students = [],
  subjects = [],
  courses = [],
  onNotice,
}) {
  const gradeLevel = NON_KINDERGARTEN_GRADES.includes(docState.grade_level) ? docState.grade_level : 'ป.4';
  const classroom = String(docState.classroom || '1');
  const semester = String(docState.semester || '1');
  const payload = docState.payload || {};
  const scoresByStudent = payload.scoresByStudent || {};

  const roomStudents = useMemo(
    () =>
      students
        .filter((s) => s.status === 'active' && s.grade_level === gradeLevel && String(s.classroom || '1') === classroom)
        .sort((a, b) => (a.student_number || 0) - (b.student_number || 0)),
    [students, gradeLevel, classroom]
  );

  const summaryStats = useMemo(() => {
    const counts = { 3: 0, 2: 0, 1: 0, 0: 0 };
    const evals = {};
    roomStudents.forEach((stu) => {
      const ev = evaluateCriteriaSummary(scoresByStudent[stu.id] || {}, DESIRABLE_TRAITS_8);
      evals[stu.id] = ev;
      counts[ev.level] = (counts[ev.level] || 0) + 1;
    });
    return { counts, evals };
  }, [roomStudents, scoresByStudent]);

  const updateScore = (studentId, traitKey, value) => {
    const nextMap = {
      ...scoresByStudent,
      [studentId]: {
        ...(scoresByStudent[studentId] || {}),
        [traitKey]: Number(value),
      },
    };
    const recordedCount = roomStudents.filter((s) => nextMap[s.id]).length;
    const pct = roomStudents.length ? Math.min(100, Math.round((recordedCount / roomStudents.length) * 100)) : 50;
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      completion_pct: Math.max(40, pct),
      status: pct >= 90 ? 'completed' : 'draft',
      payload: { ...payload, scoresByStudent: nextMap },
    });
  };

  const applyAllThree = () => {
    const nextMap = { ...scoresByStudent };
    roomStudents.forEach((stu) => {
      const base = {};
      DESIRABLE_TRAITS_8.forEach((t) => {
        base[t.key] = 3;
      });
      nextMap[stu.id] = base;
    });
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      completion_pct: 100,
      status: 'completed',
      payload: { ...payload, scoresByStudent: nextMap },
    });
    onNotice?.('ตั้งค่าระดับ 3 (ดีเยี่ยม) ทั้งห้อง 8 ข้อเรียบร้อย');
  };

  const pullFromCourses = async () => {
    const data = await dataService.fetchClassroomMatrixData(gradeLevel, classroom, {
      courses,
      students,
      subjects,
    });
    const roomChars = data.allCharacteristics || [];
    if (!roomChars.length) {
      onNotice?.(`ยังไม่พบคะแนนคุณลักษณะใน ปพ.5 รายวิชาของชั้น ${gradeLevel}/${classroom}`);
      return;
    }
    const nextMap = { ...scoresByStudent };
    roomStudents.forEach((stu) => {
      const stuRows = roomChars.filter((r) => r.student_id === stu.id);
      if (!stuRows.length) return;
      const merged = {};
      DESIRABLE_TRAITS_8.forEach((t) => {
        const vals = stuRows.map((r) => Number(r.traits?.[t.key] ?? 3));
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        merged[t.key] = Math.round(avg);
      });
      nextMap[stu.id] = merged;
    });
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      completion_pct: 100,
      status: 'completed',
      payload: { ...payload, scoresByStudent: nextMap },
    });
    onNotice?.(`ดึงผลเฉลี่ยคุณลักษณะอันพึงประสงค์ 8 ข้อจากสมุด ปพ.5 รายวิชาในห้อง ${gradeLevel}/${classroom} เรียบร้อย`);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-violet-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ระดับชั้น</label>
            <select
              value={gradeLevel}
              onChange={(e) =>
                onChangeDoc({
                  ...docState,
                  grade_level: e.target.value,
                  title: `ปพ.4 คุณลักษณะอันพึงประสงค์ ${e.target.value}/${classroom} ภาค ${semester}`,
                })
              }
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold"
            >
              {NON_KINDERGARTEN_GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ห้อง</label>
            <input
              type="text"
              value={classroom}
              onChange={(e) => onChangeDoc({ ...docState, classroom: e.target.value || '1' })}
              className="mt-0.5 w-16 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ภาคเรียน</label>
            <select
              value={semester}
              onChange={(e) => onChangeDoc({ ...docState, semester: e.target.value })}
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pullFromCourses}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> ดึงผลจาก ปพ.5 รายวิชา
          </button>
          <button
            type="button"
            onClick={applyAllThree}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" /> ประเมินระดับ 3 ทั้งห้อง
          </button>
        </div>
      </div>

      {/* สรุปผลอัตโนมัติ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[3, 2, 1, 0].map((lv) => {
          const meta = LEVEL_LABELS[lv];
          return (
            <div key={lv} className="bg-white rounded-2xl border border-ivory-300 p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">ระดับ {lv}</div>
                <div className="font-bold text-sm text-navy-900">{meta?.label}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${meta?.color || ''}`}>
                {summaryStats.counts[lv] || 0} คน
              </span>
            </div>
          );
        })}
      </div>

      {/* ตารางบันทึก 8 ข้อ */}
      <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="py-2.5 px-2 text-center w-10">ที่</th>
                <th className="py-2.5 px-3 text-left min-w-[160px]">ชื่อ - สกุล</th>
                {DESIRABLE_TRAITS_8.map((t) => (
                  <th key={t.key} className="py-2.5 px-1.5 text-center min-w-[78px]" title={t.name}>
                    <div>{t.code}.</div>
                    <div className="text-[10px] font-normal text-slate-200 truncate max-w-[85px] mx-auto">{t.name}</div>
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center">เฉลี่ย</th>
                <th className="py-2.5 px-3 text-center">สรุปผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {roomStudents.map((stu, idx) => {
                const sc = scoresByStudent[stu.id] || {};
                const ev = summaryStats.evals[stu.id] || { average: 3, level: 3 };
                const lvMeta = LEVEL_LABELS[ev.level];
                return (
                  <tr key={stu.id} className="hover:bg-ivory-50">
                    <td className="py-2 px-2 text-center font-semibold text-slate-600">{stu.student_number || idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-navy-900">{getFullStudentName(stu)}</td>
                    {DESIRABLE_TRAITS_8.map((t) => (
                      <td key={t.key} className="py-1.5 px-1 text-center">
                        <select
                          value={sc[t.key] ?? 3}
                          onChange={(e) => updateScore(stu.id, t.key, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                        >
                          <option value={3}>3</option>
                          <option value={2}>2</option>
                          <option value={1}>1</option>
                          <option value={0}>0</option>
                        </select>
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center font-bold text-navy-900">{ev.average}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${lvMeta?.color || ''}`}>
                        {lvMeta?.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {roomStudents.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    ไม่พบรายชื่อนักเรียนในชั้น {gradeLevel}/{classroom}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
