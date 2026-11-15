import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getFullStudentName, GRADE_LEVELS } from '../../lib/thaiFormatting';

export function Pp8CumulativePanel({ docState, onChangeDoc, students = [] }) {
  const payload = docState.payload || {};
  const activeStudents = useMemo(
    () =>
      students
        .filter((s) => s.status === 'active')
        .sort((a, b) => GRADE_LEVELS.indexOf(a.grade_level) - GRADE_LEVELS.indexOf(b.grade_level)),
    [students]
  );
  const selectedStudent =
    activeStudents.find((s) => s.id === (docState.student_id || payload.studentId)) || activeStudents[0] || {};

  const [newBehavior, setNewBehavior] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'ความดีเด่น',
    detail: '',
  });
  const [newYearRow, setNewYearRow] = useState({
    year: docState.academic_year || '2569',
    gradeLevel: selectedStudent.grade_level || 'ป.4',
    gpa: '3.75',
    remark: 'เลื่อนชั้นตามเกณฑ์',
  });

  const updatePayload = (patch, docPatch = {}) => {
    const next = { ...payload, ...patch };
    const filledFields = [
      next.birthDate,
      next.address,
      next.guardian?.name,
      next.health?.weightKg,
      next.talent,
    ].filter(Boolean).length;
    const pct = Math.min(100, Math.max(30, Math.round((filledFields / 5) * 100)));
    onChangeDoc({
      ...docState,
      ...docPatch,
      completion_pct: pct,
      status: pct >= 80 ? 'completed' : 'draft',
      payload: next,
    });
  };

  const yearlyGrades = Array.isArray(payload.yearlyGrades) ? payload.yearlyGrades : [];
  const behaviorLogs = Array.isArray(payload.behaviorLogs) ? payload.behaviorLogs : [];

  return (
    <div className="space-y-5">
      {/* ตัวเลือกนักเรียน */}
      <div className="bg-white rounded-2xl border border-navy-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[11px] font-semibold text-slate-600">เลือกนักเรียน (1 เล่มระเบียนสะสมต่อคน)</label>
          <select
            value={selectedStudent.id || ''}
            onChange={(e) => {
              const found = activeStudents.find((s) => s.id === e.target.value) || {};
              updatePayload(
                { studentId: found.id },
                {
                  student_id: found.id,
                  grade_level: found.grade_level || docState.grade_level,
                  classroom: String(found.classroom || '1'),
                  title: `ปพ.8 ระเบียนสะสม ${getFullStudentName(found)} (${found.grade_level || ''})`,
                }
              );
            }}
            className="mt-1 w-full max-w-md px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          >
            {activeStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade_level}/{s.classroom} • {s.student_code} {getFullStudentName(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-600 bg-ivory-100 px-3 py-2 rounded-xl border border-ivory-300">
          รหัสประจำตัว: <strong className="text-navy-900">{selectedStudent.student_code || '-'}</strong> • ชั้นปัจจุบัน:{' '}
          <strong className="text-navy-900">{selectedStudent.grade_level}/{selectedStudent.classroom || '1'}</strong>
        </div>
      </div>

      {/* ประวัติส่วนตัว ครอบครัว สุขภาพ ความถนัด */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-ivory-300 p-5 space-y-3">
          <h4 className="font-bold text-navy-900 text-sm border-b border-ivory-200 pb-2">
            1. ประวัติส่วนตัว ความถนัด และผู้ปกครอง
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">วัน/เดือน/ปีเกิด</label>
              <input
                type="date"
                value={payload.birthDate || ''}
                onChange={(e) => updatePayload({ birthDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ชื่อผู้ปกครอง</label>
              <input
                type="text"
                value={payload.guardian?.name || ''}
                placeholder="ชื่อ-สกุล บิดา/มารดา/ผู้ปกครอง"
                onChange={(e) =>
                  updatePayload({ guardian: { ...(payload.guardian || {}), name: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ความเกี่ยวข้อง</label>
              <input
                type="text"
                value={payload.guardian?.relation || 'บิดา/มารดา'}
                onChange={(e) =>
                  updatePayload({ guardian: { ...(payload.guardian || {}), relation: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">โทรศัพท์ติดต่อผู้ปกครอง</label>
              <input
                type="text"
                value={payload.guardian?.phone || ''}
                placeholder="08x-xxx-xxxx"
                onChange={(e) =>
                  updatePayload({ guardian: { ...(payload.guardian || {}), phone: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">ที่อยู่ปัจจุบัน</label>
              <input
                type="text"
                value={payload.address || ''}
                placeholder="บ้านเลขที่ หมู่ ตำบล อำเภอ จังหวัด"
                onChange={(e) => updatePayload({ address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">ความถนัด / ความสนใจ / ความสามารถพิเศษ</label>
              <textarea
                rows={2}
                value={payload.talent || ''}
                placeholder="เช่น ดนตรีพื้นบ้าน กีฬาฟุตบอล คณิตศาสตร์ ศิลปะ"
                onChange={(e) => updatePayload({ talent: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ivory-300 p-5 space-y-3">
          <h4 className="font-bold text-navy-900 text-sm border-b border-ivory-200 pb-2">
            2. ข้อมูลสุขภาพและการเจริญเติบโต
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">หมู่เลือด</label>
              <select
                value={payload.health?.bloodGroup || 'O'}
                onChange={(e) => updatePayload({ health: { ...(payload.health || {}), bloodGroup: e.target.value } })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              >
                {['A', 'B', 'AB', 'O', 'ไม่ระบุ'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">โรคประจำตัว / การแพ้</label>
              <input
                type="text"
                value={payload.health?.chronicDisease || 'ไม่มี'}
                onChange={(e) =>
                  updatePayload({ health: { ...(payload.health || {}), chronicDisease: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">น้ำหนัก (กิโลกรัม)</label>
              <input
                type="number"
                step="0.1"
                value={payload.health?.weightKg || ''}
                onChange={(e) =>
                  updatePayload({ health: { ...(payload.health || {}), weightKg: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ส่วนสูง (เซนติเมตร)</label>
              <input
                type="number"
                step="0.5"
                value={payload.health?.heightCm || ''}
                onChange={(e) =>
                  updatePayload({ health: { ...(payload.health || {}), heightCm: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ผลการเรียนรายปี + พฤติกรรมความดี */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-ivory-300 p-5 space-y-3">
          <h4 className="font-bold text-navy-900 text-sm">3. สรุปผลการเรียนรายปี</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <input
              type="text"
              placeholder="ปี 2569"
              value={newYearRow.year}
              onChange={(e) => setNewYearRow({ ...newYearRow, year: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-slate-300"
            />
            <input
              type="text"
              placeholder="ป.4"
              value={newYearRow.gradeLevel}
              onChange={(e) => setNewYearRow({ ...newYearRow, gradeLevel: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-slate-300"
            />
            <input
              type="text"
              placeholder="GPA"
              value={newYearRow.gpa}
              onChange={(e) => setNewYearRow({ ...newYearRow, gpa: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-slate-300"
            />
            <button
              type="button"
              onClick={() => {
                updatePayload({ yearlyGrades: [...yearlyGrades, newYearRow] });
              }}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-navy-800 text-gold-300 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มปี
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            {yearlyGrades.map((y, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-ivory-100 border border-ivory-300">
                <span>
                  ปี <b>{y.year}</b> • ชั้น <b>{y.gradeLevel}</b> • GPA <b>{y.gpa}</b> ({y.remark})
                </span>
                <button
                  type="button"
                  onClick={() => updatePayload({ yearlyGrades: yearlyGrades.filter((_, i) => i !== idx) })}
                  className="text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ivory-300 p-5 space-y-3">
          <h4 className="font-bold text-navy-900 text-sm">4. บันทึกพฤติกรรม ความดี และผลงานเด่น</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            <input
              type="date"
              value={newBehavior.date}
              onChange={(e) => setNewBehavior({ ...newBehavior, date: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-slate-300"
            />
            <select
              value={newBehavior.type}
              onChange={(e) => setNewBehavior({ ...newBehavior, type: e.target.value })}
              className="px-2 py-1.5 rounded-lg border border-slate-300"
            >
              <option value="ความดีเด่น">ความดีเด่น</option>
              <option value="จิตสาธารณะ">จิตสาธารณะ</option>
              <option value="รางวัลแข่งขัน">รางวัลแข่งขัน</option>
              <option value="พฤติกรรมที่ควรดูแล">พฤติกรรมที่ควรดูแล</option>
            </select>
            <input
              type="text"
              placeholder="รายละเอียด..."
              value={newBehavior.detail}
              onChange={(e) => setNewBehavior({ ...newBehavior, detail: e.target.value })}
              className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border border-slate-300"
            />
            <button
              type="button"
              onClick={() => {
                if (!newBehavior.detail.trim()) return;
                updatePayload({ behaviorLogs: [...behaviorLogs, newBehavior] });
                setNewBehavior({ ...newBehavior, detail: '' });
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> บันทึก
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            {behaviorLogs.map((b, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-ivory-100 border border-ivory-300">
                <span>
                  <b>[{b.type}]</b> {b.date} — {b.detail}
                </span>
                <button
                  type="button"
                  onClick={() => updatePayload({ behaviorLogs: behaviorLogs.filter((_, i) => i !== idx) })}
                  className="text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
