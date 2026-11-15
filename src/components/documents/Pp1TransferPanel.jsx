import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { getFullStudentName } from '../../lib/thaiFormatting';
import { dataService } from '../../services/dataService';
import {
  buildPp1TransferStudentRow,
  convertCompetencyLevelToGrade2551,
  PP1_TRANSFER_MAPPING_TABLE_4,
} from '../../data/earlyChildhoodStandards';

const GRADES_P1_3 = ['ป.1', 'ป.2', 'ป.3'];
const GRADE_OPTIONS_2551 = ['4', '3.5', '3', '2.5', '2', '1.5', '1'];
const LEVEL_TEXT_OPTIONS = ['ดีเยี่ยม', 'ดี', 'ผ่าน', 'ไม่ผ่าน'];

export function Pp1TransferPanel({
  docState,
  onChangeDoc,
  students = [],
  onNotice,
}) {
  const gradeLevel = GRADES_P1_3.includes(docState.grade_level) ? docState.grade_level : 'ป.1';
  const classroom = String(docState.classroom || '1');
  const payload = docState.payload || {};

  const roomStudents = useMemo(
    () =>
      students
        .filter((s) => s.status === 'active' && s.grade_level === gradeLevel && String(s.classroom || '1') === classroom)
        .sort((a, b) => (a.student_number || 0) - (b.student_number || 0)),
    [students, gradeLevel, classroom]
  );

  const studentRows = useMemo(() => {
    const existingMap = new Map((payload.studentRows || []).map((r) => [r.student_id, r]));
    return roomStudents.map((stu) => buildPp1TransferStudentRow(stu, {}, existingMap.get(stu.id) || {}));
  }, [roomStudents, payload.studentRows]);

  const computePct = (rows) => {
    if (!rows.length) return 30;
    const filled = rows.filter((r) => Object.keys(r.grades || {}).length >= PP1_TRANSFER_MAPPING_TABLE_4.length).length;
    return Math.min(100, Math.max(40, Math.round((filled / rows.length) * 100)));
  };

  const syncFromPrimary2569 = async () => {
    const rows2569 = await dataService.fetchPrimary2568Assessments(gradeLevel, classroom);
    const map2569 = new Map(rows2569.map((r) => [r.student_id, r]));
    const updated = roomStudents.map((stu) => {
      const a = map2569.get(stu.id) || {};
      const fresh = buildPp1TransferStudentRow(stu, a, {});
      // ใช้ผลประเมินจาก ปพ.5 ป.1-3 (2569) แทนค่าเดิมทันที
      return fresh;
    });
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      title: docState.title || `เทียบผล ปพ.1 (2569→2551) ${gradeLevel}/${classroom}`,
      completion_pct: computePct(updated),
      status: updated.length ? 'completed' : 'draft',
      payload: { ...payload, studentRows: updated, syncedAt: new Date().toISOString() },
    });
    onNotice?.(
      rows2569.length
        ? `ดึงข้อมูลความสามารถจาก ปพ.5 ป.1-3 (2569) จำนวน ${rows2569.length} คน มาเทียบผล ปพ.1 แล้ว`
        : `ยังไม่มีข้อมูลบันทึกใน ปพ.5 ป.1-3 (2569) ของชั้น ${gradeLevel}/${classroom} — ใช้ค่าเริ่มต้นให้แก้ไขได้ทันที`
    );
  };

  const updateRowField = (studentId, field, value, areaKey = null) => {
    const nextRows = studentRows.map((r) => {
      if (r.student_id !== studentId) return r;
      if (areaKey) {
        return { ...r, grades: { ...(r.grades || {}), [areaKey]: value } };
      }
      return { ...r, [field]: value };
    });
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      completion_pct: computePct(nextRows),
      status: nextRows.length ? 'completed' : 'draft',
      payload: { ...payload, studentRows: nextRows },
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-indigo-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ระดับชั้น (ป.1–ป.3)</label>
            <select
              value={gradeLevel}
              onChange={(e) =>
                onChangeDoc({
                  ...docState,
                  grade_level: e.target.value,
                  title: `เทียบผล ปพ.1 (2569→2551) ${e.target.value}/${classroom} ปีการศึกษา ${docState.academic_year || '2569'}`,
                })
              }
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold"
            >
              {GRADES_P1_3.map((g) => (
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
        </div>

        <button
          type="button"
          onClick={syncFromPrimary2569}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs sm:text-sm font-semibold shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> ดึงผลจาก ปพ.5 ป.1-3 (2569) อัตโนมัติ
        </button>
      </div>

      {/* ตารางที่ ๔ */}
      <div className="bg-white rounded-2xl border border-ivory-300 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-navy-900 text-sm">
            ตารางที่ ๔ — ความสามารถตามหลักสูตร 2569 ที่ใช้เทียบรายวิชาหลักสูตร 2551
          </h4>
          <span className="text-xs text-slate-500">
            เกณฑ์แปลงระดับ: ระดับ 4→{convertCompetencyLevelToGrade2551(4)} • 3→{convertCompetencyLevelToGrade2551(3)} • 2→{convertCompetencyLevelToGrade2551(2)} • 1→{convertCompetencyLevelToGrade2551(1)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {PP1_TRANSFER_MAPPING_TABLE_4.map((m) => (
            <div key={m.areaKey} className="p-2.5 rounded-xl bg-ivory-100 border border-ivory-300">
              <div className="font-bold text-navy-900">{m.subjectCodePrefix} • {m.areaName}</div>
              <div className="text-slate-600 mt-0.5">เทียบจาก: {m.capTitle} ({m.ratioDesc})</div>
            </div>
          ))}
        </div>
      </div>

      {/* ตารางที่ ๕–๖ รายคน */}
      <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-indigo-50/70 border-b border-indigo-200 flex items-center justify-between">
          <h4 className="font-bold text-navy-900 text-sm">
            ตารางที่ ๕–๖ — แบบบันทึกผลการเรียน 2551 รายคนเพื่อจัดทำ ปพ.๑ ({roomStudents.length} คน)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="py-2.5 px-2 text-center w-10">ที่</th>
                <th className="py-2.5 px-3 text-left min-w-[160px]">ชื่อ - สกุล</th>
                {PP1_TRANSFER_MAPPING_TABLE_4.map((m) => (
                  <th key={m.areaKey} className="py-2.5 px-1.5 text-center" title={m.areaName}>
                    {m.subjectCodePrefix}
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center">อ่านคิดฯ</th>
                <th className="py-2.5 px-2 text-center">คุณลักษณะ</th>
                <th className="py-2.5 px-2 text-center">กิจกรรม</th>
                <th className="py-2.5 px-3 text-left min-w-[200px]">ข้อความหมายเหตุ ปพ.๑</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {roomStudents.map((stu, idx) => {
                const row = studentRows.find((r) => r.student_id === stu.id) || {};
                return (
                  <tr key={stu.id} className="hover:bg-ivory-50">
                    <td className="py-2 px-2 text-center font-semibold text-slate-600">{stu.student_number || idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-navy-900">{getFullStudentName(stu)}</td>
                    {PP1_TRANSFER_MAPPING_TABLE_4.map((m) => (
                      <td key={m.areaKey} className="py-1.5 px-1 text-center">
                        <select
                          value={row.grades?.[m.areaKey] || '3'}
                          onChange={(e) => updateRowField(stu.id, 'grades', e.target.value, m.areaKey)}
                          className="px-1.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                        >
                          {GRADE_OPTIONS_2551.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td className="py-1.5 px-1.5 text-center">
                      <select
                        value={row.rtw || 'ดีเยี่ยม'}
                        onChange={(e) => updateRowField(stu.id, 'rtw', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        {LEVEL_TEXT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <select
                        value={row.traits || 'ดีเยี่ยม'}
                        onChange={(e) => updateRowField(stu.id, 'traits', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        {LEVEL_TEXT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <select
                        value={row.activities || 'ผ'}
                        onChange={(e) => updateRowField(stu.id, 'activities', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                      >
                        <option value="ผ">ผ</option>
                        <option value="มผ">มผ</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.pp1_remark || ''}
                        onChange={(e) => updateRowField(stu.id, 'pp1_remark', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
              {roomStudents.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-500">
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
