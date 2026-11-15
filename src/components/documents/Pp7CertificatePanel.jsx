import React, { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { formatThaiDate, getFullStudentName, GRADE_LEVELS } from '../../lib/thaiFormatting';
import { SchoolLogo } from '../layout/SchoolEmblem';

function addDaysIso(dateStr, days = 30) {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function Pp7CertificatePanel({
  docState,
  onChangeDoc,
  settings,
  students = [],
}) {
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
  const todayIso = payload.issueDate || new Date().toISOString().slice(0, 10);
  const expiresIso = addDaysIso(todayIso, 30);

  const updatePayload = (patch, docPatch = {}) => {
    const nextPayload = { ...payload, ...patch };
    onChangeDoc({
      ...docState,
      ...docPatch,
      completion_pct: nextPayload.docNumber && nextPayload.gpa ? 100 : 80,
      status: nextPayload.docNumber && nextPayload.gpa ? 'completed' : 'draft',
      payload: nextPayload,
    });
  };

  return (
    <div className="space-y-5">
      <div className="no-print bg-white rounded-2xl border border-amber-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600">เลือกนักเรียน</label>
          <select
            value={selectedStudent.id || ''}
            onChange={(e) => {
              const found = activeStudents.find((s) => s.id === e.target.value) || {};
              updatePayload(
                { studentId: found.id, studentName: getFullStudentName(found) },
                {
                  student_id: found.id,
                  grade_level: found.grade_level || docState.grade_level,
                  classroom: String(found.classroom || '1'),
                  title: `ปพ.7 ใบรับรอง ${getFullStudentName(found)} (${found.grade_level || ''})`,
                }
              );
            }}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          >
            {activeStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade_level}/{s.classroom} • {s.student_code} {getFullStudentName(s)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600">เลขที่หนังสือ (ปพ.7)</label>
          <input
            type="text"
            value={payload.docNumber || 'ศธ ๐๔๐๖๙.๐๕๖/ว ๐๐๑'}
            onChange={(e) => updatePayload({ docNumber: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600">ผลการเรียนเฉลี่ยสะสม (GPA)</label>
          <input
            type="text"
            value={payload.gpa || '3.78'}
            onChange={(e) => updatePayload({ gpa: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600">วันที่ออกหนังสือ (ใช้ได้ชั่วคราว ~30 วัน)</label>
          <input
            type="date"
            value={todayIso}
            onChange={(e) => updatePayload({ issueDate: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600">เลขประจำตัวประชาชน (ถ้าต้องการแสดง)</label>
          <input
            type="text"
            value={payload.nationalId || ''}
            placeholder="เช่น 1-5599-00123-45-6"
            onChange={(e) => updatePayload({ nationalId: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-600">วัตถุประสงค์</label>
            <input
              type="text"
              value={payload.purpose || 'ใช้ประกอบการสมัครศึกษาต่อ / ยืนยันสถานภาพนักเรียน'}
              onChange={(e) => updatePayload({ purpose: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold shrink-0"
          >
            <Printer className="w-4 h-4" /> พิมพ์ A4
          </button>
        </div>
      </div>

      {/* ตัวอย่างใบรับรอง ปพ.7 ตามระเบียบงานสารบรรณ ข้อ ๒๔.๗ */}
      <div className="font-official bg-white rounded-2xl border border-slate-300 shadow-academic p-8 sm:p-10 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="text-sm font-bold text-slate-700">แบบ ปพ.๗</div>
            <div className="text-sm font-semibold">เลขที่หนังสือ {payload.docNumber || 'ศธ ๐๔๐๖๙.๐๕๖/ว ๐๐๑'}</div>
            <div className="flex items-center gap-3 pt-2">
              <SchoolLogo logoUrl={settings?.logo_url} className="w-16 h-16 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-navy-900">ใบรับรองผลการเรียน / สถานภาพนักเรียน</h3>
                <p className="text-sm font-semibold text-slate-700">{settings?.school_name}</p>
                <p className="text-xs text-slate-600">{settings?.affiliation}</p>
              </div>
            </div>
          </div>

          {/* กรอบติดรูปถ่ายขนาด 4 x 6 ซม. ตามระเบียบงานสารบรรณ ข้อ 24.7 */}
          <div className="w-[120px] h-[160px] shrink-0 border-2 border-slate-800 rounded flex flex-col items-center justify-center text-center p-2 text-[11px] text-slate-700 bg-slate-50/40">
            <span className="font-bold">ติดรูปถ่าย</span>
            <span>ขนาด ๔ × ๖ ซม.</span>
            <span className="text-[10px] text-slate-500 mt-1">(ระเบียบงานสารบรรณ ข้อ ๒๔.๗)</span>
            <span className="text-[10px] text-slate-500 mt-1">ประทับตราโรงเรียน</span>
          </div>
        </div>

        <div className="text-[15px] leading-loose text-slate-800 space-y-4 indent-8 text-justify">
          <p>
            หนังสือรับรองฉบับนี้ให้ไว้เพื่อแสดงว่า{' '}
            <strong className="text-navy-900">{payload.studentName || getFullStudentName(selectedStudent) || '-'}</strong>{' '}
            เลขประจำตัวนักเรียน <strong>{selectedStudent.student_code || '-'}</strong>{' '}
            {payload.nationalId ? `เลขประจำตัวประชาชน ${payload.nationalId} ` : ''}
            กำลังศึกษาอยู่จริงในระดับชั้น{' '}
            <strong>{selectedStudent.grade_level || docState.grade_level}/{selectedStudent.classroom || docState.classroom}</strong>{' '}
            ปีการศึกษา <strong>{docState.academic_year || settings?.academic_year || '2569'}</strong>{' '}
            ณ {settings?.school_name} {settings?.affiliation_short ? `(${settings.affiliation_short})` : ''}
          </p>
          <p>
            ทั้งนี้ มีผลการเรียนเฉลี่ยสะสม (GPA) <strong>{payload.gpa || '3.78'}</strong>{' '}
            วัตถุประสงค์เพื่อ {payload.purpose || 'ใช้ประกอบการสมัครศึกษาต่อ / ยืนยันสถานภาพนักเรียน'}
          </p>
          <p>
            ให้ไว้ ณ วันที่ <strong>{formatThaiDate(todayIso)}</strong>{' '}
            <span className="text-xs text-rose-700 font-semibold">
              (อายุใช้งานชั่วคราวประมาณ 30 วัน ถึงวันที่ {formatThaiDate(expiresIso)})
            </span>
          </p>
        </div>

        <div className="pt-8 flex justify-end">
          <div className="text-center text-sm space-y-1 min-w-[260px]">
            <p>ลงชื่อ......................................................</p>
            <p className="font-bold text-navy-900">({settings?.director_name || 'ผู้อำนวยการสถานศึกษา'})</p>
            <p className="text-xs text-slate-700">{settings?.director_title || 'ผู้อำนวยการโรงเรียนบ้านหาดเค็ด'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
