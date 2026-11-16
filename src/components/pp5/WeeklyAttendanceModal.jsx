import React, { useMemo, useState } from 'react';
import { ATTENDANCE_STATUS, getFullStudentName } from '../../lib/thaiFormatting';

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const WEEKDAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์'];

const PEN_OPTIONS = [
  { id: 'absent', label: 'ขาด', activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm', idleClass: 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50' },
  { id: 'personal_leave', label: 'ลากิจ', activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm', idleClass: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50' },
  { id: 'sick_leave', label: 'ป่วย', activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm', idleClass: 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50' },
  { id: 'late', label: 'สาย', activeClass: 'bg-yellow-500 text-navy-950 border-yellow-500 shadow-sm', idleClass: 'bg-white text-amber-800 border-yellow-300 hover:bg-yellow-50' },
  { id: 'present', label: '✓ มา (ยางลบ)', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm', idleClass: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50' },
];

function getMondayOfDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return getMondayOfDate(new Date());
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortThaiDay(d) {
  return `${d.getDate()} ${THAI_SHORT_MONTHS[d.getMonth()]}`;
}

function formatThaiWeekRange(monDate, friDate) {
  const beYear = friDate.getFullYear() + 543;
  return `${formatShortThaiDay(monDate)} - ${formatShortThaiDay(friDate)} ${beYear}`;
}

const CELL_RENDER_MAP = {
  present: { text: '✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  late: { text: 'สาย', cls: 'bg-yellow-100 text-amber-900 border-yellow-300 hover:bg-yellow-200' },
  sick_leave: { text: 'ป่วย', cls: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200' },
  personal_leave: { text: 'ลา', cls: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' },
  absent: { text: 'ขาด', cls: 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-bold' },
};

/**
 * โหมดปากกาจิ้มเร็วรายสัปดาห์ (Mon-Fri Weekly Pen Attendance Modal)
 */
export function WeeklyAttendanceModal({
  open,
  onClose,
  students = [],
  attendanceRecords = [],
  onSaveBatch,
}) {
  const latestDate = useMemo(() => {
    if (!attendanceRecords.length) return null;
    const sorted = [...attendanceRecords].sort((a, b) =>
      String(b.session_date || '').localeCompare(String(a.session_date || ''))
    );
    return sorted[0]?.session_date || null;
  }, [attendanceRecords]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [activePen, setActivePen] = useState('absent');
  const [savingCell, setSavingCell] = useState('');

  const weekDays = useMemo(() => {
    const baseMonday = getMondayOfDate(latestDate || undefined);
    baseMonday.setDate(baseMonday.getDate() + weekOffset * 7);
    return WEEKDAY_NAMES.map((dayName, idx) => {
      const dateObj = new Date(baseMonday);
      dateObj.setDate(baseMonday.getDate() + idx);
      return {
        idx,
        dayName,
        dateObj,
        iso: toIsoDate(dateObj),
        shortDate: formatShortThaiDay(dateObj),
      };
    });
  }, [latestDate, weekOffset]);

  const rangeLabel = useMemo(() => {
    if (weekDays.length < 5) return '';
    return formatThaiWeekRange(weekDays[0].dateObj, weekDays[4].dateObj);
  }, [weekDays]);

  const recordsByDate = useMemo(() => {
    const dateSet = new Set();
    const lookup = new Map();
    attendanceRecords.forEach((r) => {
      if (Number(r.period_number || 1) === 1 || !lookup.has(`${r.student_id}|${r.session_date}`)) {
        lookup.set(`${r.student_id}|${r.session_date}`, r);
      }
      dateSet.add(r.session_date);
    });
    return { dateSet, lookup };
  }, [attendanceRecords]);

  if (!open) return null;

  const handleMarkDayAllPresent = async (dayIso) => {
    if (!students.length) return;
    setSavingCell(`all-${dayIso}`);
    try {
      const payload = students.map((stu) => ({
        student_id: stu.id,
        session_date: dayIso,
        period_number: 1,
        status: 'present',
        remark: recordsByDate.lookup.get(`${stu.id}|${dayIso}`)?.remark || '',
      }));
      await onSaveBatch(payload);
    } finally {
      setSavingCell('');
    }
  };

  const handlePaintCell = async (studentId, dayIso) => {
    setSavingCell(`${studentId}|${dayIso}`);
    try {
      const isDateOpen = recordsByDate.dateSet.has(dayIso);
      if (!isDateOpen) {
        // เปิดวันให้ครบทุกคนเป็น "มาเรียน" และกำหนดสถานะปากกาให้คนที่คลิก
        const payload = students.map((stu) => ({
          student_id: stu.id,
          session_date: dayIso,
          period_number: 1,
          status: stu.id === studentId ? activePen : 'present',
          remark: '',
        }));
        await onSaveBatch(payload);
      } else {
        await onSaveBatch([
          {
            student_id: studentId,
            session_date: dayIso,
            period_number: 1,
            status: activePen,
            remark: recordsByDate.lookup.get(`${studentId}|${dayIso}`)?.remark || '',
          },
        ]);
      }
    } finally {
      setSavingCell('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-ivory-50 via-white to-ivory-50 border-b border-ivory-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="font-bold text-navy-900 text-sm sm:text-base flex items-center gap-2">
              <span>📅 ตารางเช็คชื่อรายสัปดาห์</span>
            </h3>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="px-3 py-1 rounded-full border border-royal-300 bg-royal-50 hover:bg-royal-100 text-royal-800 text-xs font-semibold transition-colors"
            >
              ◀ สัปดาห์ก่อน
            </button>
            <span className="text-xs sm:text-sm font-bold text-navy-900 px-2">{rangeLabel}</span>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="px-3 py-1 rounded-full border border-royal-300 bg-royal-50 hover:bg-royal-100 text-royal-800 text-xs font-semibold transition-colors"
            >
              สัปดาห์ถัดไป ▶
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
          >
            ✓ เสร็จสิ้น
          </button>
        </div>

        {/* Pen Palette Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-ivory-50 border-b border-ivory-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 mr-1">
            ✏️ เลือกปากกา แล้วจิ้มช่อง:
          </span>
          {PEN_OPTIONS.map((pen) => {
            const isActive = activePen === pen.id;
            return (
              <button
                key={pen.id}
                type="button"
                onClick={() => setActivePen(pen.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  isActive ? pen.activeClass : pen.idleClass
                }`}
              >
                {pen.label}
              </button>
            );
          })}
          <span className="text-[11px] text-slate-500 ml-auto">
            บันทึกอัตโนมัติทุกจิ้ม · จิ้มช่องของวันที่ยังไม่เปิด ระบบเปิดวันให้เอง (ทุกคนมา)
          </span>
        </div>

        {/* Mon-Fri Matrix Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-white border-b border-ivory-300 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr>
                <th className="py-3 px-4 text-left min-w-[210px] font-bold text-navy-900 bg-ivory-50 border-r border-ivory-200">
                  ชื่อ - สกุล
                </th>
                {weekDays.map((day) => {
                  const isOpen = recordsByDate.dateSet.has(day.iso);
                  return (
                    <th key={day.iso} className="py-2 px-2 text-center min-w-[110px] border-r border-ivory-200 last:border-r-0">
                      <div className="font-bold text-navy-900 text-xs sm:text-sm">{day.dayName}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{day.shortDate}</div>
                      <button
                        type="button"
                        disabled={savingCell === `all-${day.iso}`}
                        onClick={() => handleMarkDayAllPresent(day.iso)}
                        className={`mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                          isOpen
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-white border-emerald-400 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {savingCell === `all-${day.iso}` ? '...' : '✓ มาครบ'}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {students.map((stu, idx) => (
                <tr key={stu.id} className="hover:bg-ivory-50/70">
                  <td className="py-2.5 px-4 font-medium text-navy-900 border-r border-ivory-200 bg-white">
                    <span className="text-slate-400 text-xs mr-2">{stu.student_number || idx + 1}.</span>
                    {getFullStudentName(stu)}
                  </td>
                  {weekDays.map((day) => {
                    const isOpen = recordsByDate.dateSet.has(day.iso);
                    const rec = recordsByDate.lookup.get(`${stu.id}|${day.iso}`);
                    const status = rec?.status || (isOpen ? 'present' : null);
                    const visual = status ? CELL_RENDER_MAP[status] || CELL_RENDER_MAP.present : null;
                    const busy = savingCell === `${stu.id}|${day.iso}`;

                    return (
                      <td
                        key={day.iso}
                        className="p-1.5 text-center border-r border-ivory-200 last:border-r-0"
                      >
                        <button
                          type="button"
                          disabled={Boolean(savingCell)}
                          onClick={() => handlePaintCell(stu.id, day.iso)}
                          title={`${day.dayName} ${day.shortDate} (${ATTENDANCE_STATUS[activePen]?.short || activePen})`}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            visual
                              ? visual.cls
                              : 'border-transparent text-slate-300 hover:border-navy-200 hover:bg-navy-50/40'
                          }`}
                        >
                          {busy ? '...' : visual ? visual.text : '·'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    ยังไม่มีรายชื่อนักเรียนในรายวิชานี้
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
