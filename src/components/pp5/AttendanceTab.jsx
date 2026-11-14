import React, { useState, useMemo } from 'react';
import {
  CheckCheck,
  CalendarPlus,
  Table2,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  ATTENDANCE_STATUS,
  calculateStudentAttendance,
  formatThaiDate,
  getFullStudentName,
} from '../../lib/thaiFormatting';

const STATUS_BADGE_MAP = {
  present: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  late: 'bg-amber-100 text-amber-800 border-amber-300',
  sick_leave: 'bg-sky-100 text-sky-800 border-sky-300',
  personal_leave: 'bg-purple-100 text-purple-800 border-purple-300',
  absent: 'bg-rose-100 text-rose-800 border-rose-300',
};

export function AttendanceTab({
  course,
  students,
  attendanceRecords,
  minAttendancePct = 80,
  onSaveBatch,
  onDeleteSession,
}) {
  const [mode, setMode] = useState('quick'); // 'quick' | 'matrix'
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodNumber, setPeriodNumber] = useState(1);
  const [draftStatuses, setDraftStatuses] = useState({});
  const [draftRemarks, setDraftRemarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Load existing session data into quick editor if date+period already exists
  const existingForSelected = useMemo(() => {
    const map = {};
    attendanceRecords
      .filter((r) => r.session_date === sessionDate && Number(r.period_number) === Number(periodNumber))
      .forEach((r) => {
        map[r.student_id] = r;
      });
    return map;
  }, [attendanceRecords, sessionDate, periodNumber]);

  const getQuickStatus = (studentId) =>
    draftStatuses[studentId] || existingForSelected[studentId]?.status || 'present';

  const getQuickRemark = (studentId) =>
    draftRemarks[studentId] !== undefined
      ? draftRemarks[studentId]
      : existingForSelected[studentId]?.remark || '';

  const handleOneClickAllPresent = () => {
    const next = {};
    students.forEach((s) => {
      next[s.id] = 'present';
    });
    setDraftStatuses(next);
    setFeedback('ตั้งค่า "มาเรียนทั้งหมด" เรียบร้อย สามารถเลือกติ๊กเฉพาะนักเรียนที่ ขาด/ลา/สาย ได้ทันที');
  };

  const handleSaveQuickCheck = async () => {
    setSaving(true);
    setFeedback('');
    try {
      const payload = students.map((stu) => ({
        student_id: stu.id,
        session_date: sessionDate,
        period_number: Number(periodNumber) || 1,
        status: getQuickStatus(stu.id),
        remark: getQuickRemark(stu.id),
      }));
      await onSaveBatch(payload);
      setDraftStatuses({});
      setDraftRemarks({});
      setFeedback(`บันทึกเวลาเรียนวันที่ ${formatThaiDate(sessionDate)} คาบที่ ${periodNumber} สำเร็จ`);
    } finally {
      setSaving(false);
    }
  };

  // Unique sessions sorted chronologically for Matrix View
  const uniqueSessions = useMemo(() => {
    const map = new Map();
    attendanceRecords.forEach((r) => {
      const key = `${r.session_date}#${r.period_number}`;
      if (!map.has(key)) {
        map.set(key, { key, date: r.session_date, period: Number(r.period_number) });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.period - b.period
    );
  }, [attendanceRecords]);

  const recordLookup = useMemo(() => {
    const map = new Map();
    attendanceRecords.forEach((r) => {
      map.set(`${r.student_id}|${r.session_date}#${r.period_number}`, r);
    });
    return map;
  }, [attendanceRecords]);

  const studentSummaries = useMemo(() => {
    const map = {};
    students.forEach((stu) => {
      const stuRecords = attendanceRecords.filter((r) => r.student_id === stu.id);
      map[stu.id] = calculateStudentAttendance(stuRecords, course.total_hours, minAttendancePct);
    });
    return map;
  }, [students, attendanceRecords, course.total_hours, minAttendancePct]);

  const riskCount = Object.values(studentSummaries).filter((s) => s.isBelowThreshold).length;

  const handleMatrixCellChange = async (studentId, session, nextStatus) => {
    await onSaveBatch([
      {
        student_id: studentId,
        session_date: session.date,
        period_number: session.period,
        status: nextStatus,
        remark: recordLookup.get(`${studentId}|${session.key}`)?.remark || '',
      },
    ]);
  };

  return (
    <div className="space-y-5">
      {/* Top Bar: Mode Switcher + Threshold Warning */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-ivory-300 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === 'quick'
                ? 'bg-navy-800 text-gold-300 shadow-sm'
                : 'bg-ivory-100 text-slate-700 hover:bg-navy-50'
            }`}
          >
            <CalendarPlus className="w-4 h-4" />
            เช็คชื่ออย่างง่าย (Quick Check)
          </button>
          <button
            type="button"
            onClick={() => setMode('matrix')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === 'matrix'
                ? 'bg-navy-800 text-gold-300 shadow-sm'
                : 'bg-ivory-100 text-slate-700 hover:bg-navy-50'
            }`}
          >
            <Table2 className="w-4 h-4" />
            ตารางเช็คชื่อรายคาบ (Manual / แก้ไขย้อนหลัง)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-50 text-navy-800 border border-navy-200 font-medium">
            <Clock className="w-4 h-4" />
            บันทึกแล้ว {uniqueSessions.length} คาบ / แผน {course.total_hours} ชม.
          </span>
          {riskCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              เวลาเรียน &lt; {minAttendancePct}% (เสี่ยง มส.): {riskCount} คน
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              นักเรียนทุกคนเวลาเรียนผ่านเกณฑ์ {minAttendancePct}%
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Mode 1: Quick Check */}
      {mode === 'quick' && (
        <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-navy-900 to-royal-800 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] text-gold-200 mb-1">วันที่สอน</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => {
                    setSessionDate(e.target.value);
                    setDraftStatuses({});
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gold-200 mb-1">คาบที่</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={periodNumber}
                  onChange={(e) => {
                    setPeriodNumber(Number(e.target.value) || 1);
                    setDraftStatuses({});
                  }}
                  className="w-20 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOneClickAllPresent}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                เช็คมาเรียนทั้งหมด (1 คลิก)
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveQuickCheck}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-sm font-bold shadow-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกคาบเรียนนี้'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4 text-center w-14">เลขที่</th>
                  <th className="py-3 px-4 text-left w-28">รหัส</th>
                  <th className="py-3 px-4 text-left">ชื่อ - สกุล</th>
                  <th className="py-3 px-4 text-center">สถานะคาบนี้ (คลิกเลือกเฉพาะผู้ไม่มาเรียน)</th>
                  <th className="py-3 px-4 text-left">หมายเหตุ</th>
                  <th className="py-3 px-4 text-center w-32">เวลาเรียนสะสม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {students.map((stu, idx) => {
                  const st = getQuickStatus(stu.id);
                  const summary = studentSummaries[stu.id];
                  return (
                    <tr key={stu.id} className="hover:bg-ivory-50">
                      <td className="py-2.5 px-4 text-center font-medium text-slate-600">
                        {stu.student_number || idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{stu.student_code}</td>
                      <td className="py-2.5 px-4 font-medium text-navy-900">
                        {getFullStudentName(stu)}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {Object.entries(ATTENDANCE_STATUS).map(([key, meta]) => {
                            const active = st === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  setDraftStatuses((prev) => ({ ...prev, [stu.id]: key }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  active
                                    ? `${STATUS_BADGE_MAP[key]} ring-2 ring-offset-1 ring-navy-600`
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {meta.code} ({meta.short})
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={getQuickRemark(stu.id)}
                          onChange={(e) =>
                            setDraftRemarks((prev) => ({ ...prev, [stu.id]: e.target.value }))
                          }
                          placeholder="ระบุเหตุผล (ถ้ามี)"
                          className="w-full min-w-[140px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-navy-600"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            summary?.isBelowThreshold
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {summary?.attendancePct ?? 100}%
                          {summary?.isBelowThreshold && ' (มส)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode 2: Manual Detailed Matrix */}
      {mode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-navy-900 text-white flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">
                ตารางเช็คชื่อรายคาบและสรุปเวลาเรียน (แก้ไขย้อนหลังได้)
              </h3>
              <p className="text-xs text-slate-300">
                สัญลักษณ์: / = มาเรียน, ส = มาสาย, ป = ลาป่วย, ก = ลากิจ, ข = ขาดเรียน
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-2.5 px-3 text-center sticky left-0 bg-ivory-100 z-10 border-r border-ivory-300">
                    ที่
                  </th>
                  <th className="py-2.5 px-3 text-left sticky left-10 bg-ivory-100 z-10 border-r border-ivory-300 min-w-[170px]">
                    ชื่อ - สกุล
                  </th>
                  {uniqueSessions.map((s) => (
                    <th key={s.key} className="py-2 px-2 text-center border-r border-ivory-200 min-w-[78px]">
                      <div className="font-semibold text-[11px]">{s.date.slice(5)}</div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                        <span>ค.{s.period}</span>
                        <button
                          type="button"
                          onClick={() => onDeleteSession(s.date, s.period)}
                          className="text-rose-500 hover:text-rose-700"
                          title="ลบคาบนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center bg-emerald-50">มา</th>
                  <th className="py-2.5 px-2 text-center bg-sky-50">ป/ก</th>
                  <th className="py-2.5 px-2 text-center bg-rose-50">ขาด</th>
                  <th className="py-2.5 px-3 text-center bg-navy-50 font-bold">ร้อยละ</th>
                  <th className="py-2.5 px-3 text-center bg-navy-50 font-bold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {students.map((stu, idx) => {
                  const sum = studentSummaries[stu.id];
                  return (
                    <tr key={stu.id} className="hover:bg-ivory-50">
                      <td className="py-2 px-3 text-center sticky left-0 bg-white z-10 border-r border-ivory-200">
                        {stu.student_number || idx + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-navy-900 sticky left-10 bg-white z-10 border-r border-ivory-200">
                        {getFullStudentName(stu)}
                      </td>
                      {uniqueSessions.map((s) => {
                        const rec = recordLookup.get(`${stu.id}|${s.key}`);
                        const status = rec?.status || 'present';
                        return (
                          <td key={s.key} className="py-1.5 px-1.5 text-center border-r border-ivory-200">
                            <select
                              value={status}
                              onChange={(e) => handleMatrixCellChange(stu.id, s, e.target.value)}
                              className={`w-full text-center text-xs font-bold rounded-lg py-1 border cursor-pointer ${STATUS_BADGE_MAP[status]}`}
                            >
                              {Object.entries(ATTENDANCE_STATUS).map(([key, meta]) => (
                                <option key={key} value={key}>
                                  {meta.code}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center font-semibold text-emerald-700 bg-emerald-50/40">
                        {sum?.attendedPeriods ?? 0}
                      </td>
                      <td className="py-2 px-2 text-center text-sky-700 bg-sky-50/40">
                        {(sum?.sick_leave ?? 0) + (sum?.personal_leave ?? 0)}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-rose-700 bg-rose-50/40">
                        {sum?.absent ?? 0}
                      </td>
                      <td className="py-2 px-3 text-center font-bold bg-navy-50/40">
                        {sum?.attendancePct ?? 100}%
                      </td>
                      <td className="py-2 px-3 text-center bg-navy-50/40">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            sum?.isBelowThreshold
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {sum?.statusLabel || 'มีสิทธิ์สอบ'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {uniqueSessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      ยังไม่มีบันทึกการเช็คชื่อ กรุณาใช้แถบ "เช็คชื่ออย่างง่าย" เพื่อเพิ่มคาบแรก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
