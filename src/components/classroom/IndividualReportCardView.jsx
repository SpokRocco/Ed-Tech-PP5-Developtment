import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import { LEVEL_LABELS, getFullStudentName } from '../../lib/thaiFormatting';
import { SchoolLogo } from '../layout/SchoolEmblem';

/**
 * แบบแสดงใบรายงานผลการเรียนรายบุคคลตรงตามต้นแบบ Excel ในโฟลเดอร์ ref/
 * - ระดับประถมศึกษา (ป.1–ป.6): เทียบเคียง ภาคเรียนที่ 1 | ภาคเรียนที่ 2 | สรุปผลทั้งปี (ชม.รวม 460/920)
 * - ระดับมัธยมศึกษา (ม.1–ม.3): เทียบเคียงชีท "แม่แบบ" แยก รายวิชาพื้นฐาน / รายวิชาเพิ่มเติม + คะแนนเต็ม/ได้ + กิจกรรม 3 รายการ
 */
export function IndividualReportCardView({
  settings,
  gradeLevel,
  classroom,
  semester = '1',
  homeroomTeacher,
  matrix,
  termOverview,
  onExportIndividualExcel,
}) {
  const rows = matrix?.studentRows || [];
  const [selectedIdx, setSelectedIdx] = useState(0);

  const safeIdx = Math.min(selectedIdx, Math.max(0, rows.length - 1));
  const row = rows[safeIdx] || null;
  const isPrimary = /^ป\./.test(gradeLevel || '');

  const annualCard = row
    ? termOverview?.annualStudentCards?.find((c) => c.student.id === row.student.id)
    : null;

  if (!row) {
    return (
      <div className="bg-white rounded-2xl border border-ivory-300 p-8 text-center text-sm text-slate-500">
        ยังไม่มีรายชื่อนักเรียนในชั้น {gradeLevel}/{classroom} สำหรับสร้างใบรายงานผลการเรียนรายบุคคล
      </div>
    );
  }

  const roomCourses = matrix?.roomCourses || [];
  const basicCourses = roomCourses.filter((c) => (c.subject_type || 'พื้นฐาน') === 'พื้นฐาน');
  const additionalCourses = roomCourses.filter((c) => c.subject_type === 'เพิ่มเติม');
  const totalAttendanceDays = Math.round((row.totalHours || 460) / 5) || 100;
  const presentDays = Math.round((totalAttendanceDays * row.attendancePct) / 100);

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="no-print bg-white rounded-2xl border border-ivory-300 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={safeIdx <= 0}
            onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
            className="p-2 rounded-lg border border-slate-300 hover:bg-ivory-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={safeIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-navy-900 bg-ivory-50"
          >
            {rows.map((r, i) => (
              <option key={r.student.id} value={i}>
                เลขที่ {r.no} — {getFullStudentName(r.student)} (GPA {r.gpa.toFixed(2)})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={safeIdx >= rows.length - 1}
            onClick={() => setSelectedIdx((i) => Math.min(rows.length - 1, i + 1))}
            className="p-2 rounded-lg border border-slate-300 hover:bg-ivory-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onExportIndividualExcel && (
            <button
              type="button"
              onClick={() => onExportIndividualExcel({ studentRow: row, annualCard })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              <FileSpreadsheet className="w-4 h-4" /> ส่งออก Excel รายบุคคล (.xlsx)
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-bold"
          >
            <Printer className="w-4 h-4" /> พิมพ์ใบรายงานผล (A4)
          </button>
        </div>
      </div>

      {/* Printable Official Prototype Sheet */}
      <div className="font-official bg-white shadow-academic border border-slate-300 p-6 sm:p-8 max-w-4xl mx-auto space-y-4">
        {/* School Header */}
        <div className="flex items-center justify-between border-b-2 border-navy-900 pb-3">
          <div className="flex items-center gap-3">
            <SchoolLogo logoUrl={settings?.logo_url} className="w-14 h-14" />
            <div>
              <h3 className="text-lg font-bold text-navy-900">
                รายงานผลการเรียน{settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'}
              </h3>
              <p className="text-xs text-slate-600">
                {settings?.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1'}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-navy-900">
              ชั้น {gradeLevel}/{classroom} • ปีการศึกษา {settings?.academic_year || '2569'}
            </div>
            <div>
              {semester === 'all' ? 'สรุปผลตลอดปีการศึกษา' : `ภาคเรียนที่ ${semester}`}
            </div>
          </div>
        </div>

        {/* Student Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-ivory-50 border border-slate-300 text-xs">
          <div>
            <span className="text-slate-500">เลขที่:</span>{' '}
            <strong className="text-navy-900">{row.no}</strong>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">ชื่อ - สกุล:</span>{' '}
            <strong className="text-navy-900">{getFullStudentName(row.student)}</strong>
          </div>
          <div>
            <span className="text-slate-500">รหัส:</span>{' '}
            <strong className="text-navy-900">{row.student.student_code}</strong>
          </div>
        </div>

        {/* Academic Table Matching Either Primary or Secondary Template */}
        {isPrimary && annualCard ? (
          <table className="w-full text-xs border-collapse border border-slate-700">
            <thead>
              <tr className="bg-slate-100">
                <th rowSpan={2} className="border border-slate-700 py-1.5 px-2 text-center w-20">รหัส</th>
                <th rowSpan={2} className="border border-slate-700 py-1.5 px-2 text-left">กลุ่มสาระการเรียนรู้ / รายวิชา</th>
                <th rowSpan={2} className="border border-slate-700 py-1.5 px-1.5 text-center w-14">ชั่วโมง/ภาค</th>
                <th colSpan={2} className="border border-slate-700 py-1 px-2 text-center">ภาคเรียนที่ 1</th>
                <th colSpan={2} className="border border-slate-700 py-1 px-2 text-center">ภาคเรียนที่ 2</th>
                <th colSpan={2} className="border border-slate-700 py-1 px-2 text-center">สรุปผลทั้งปี</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 py-1 px-1.5 text-center">คะแนน</th>
                <th className="border border-slate-700 py-1 px-1.5 text-center">ระดับ</th>
                <th className="border border-slate-700 py-1 px-1.5 text-center">คะแนน</th>
                <th className="border border-slate-700 py-1 px-1.5 text-center">ระดับ</th>
                <th className="border border-slate-700 py-1 px-1.5 text-center">เฉลี่ย</th>
                <th className="border border-slate-700 py-1 px-1.5 text-center">ระดับ</th>
              </tr>
            </thead>
            <tbody>
              {annualCard.rows.map((r) => (
                <tr key={r.subject_code}>
                  <td className="border border-slate-700 py-1.5 px-2 text-center font-semibold">{r.subject_code}</td>
                  <td className="border border-slate-700 py-1.5 px-2">
                    {r.subject_name}
                    {r.subject_type === 'เพิ่มเติม' && (
                      <span className="text-[10px] text-slate-500 ml-1">(เพิ่มเติม)</span>
                    )}
                  </td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center">{r.hours_per_semester}</td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center">{r.term1Score ?? '-'}</td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center font-bold">{r.term1Grade}</td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center">{r.term2Score ?? '-'}</td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center font-bold">{r.term2Grade}</td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center">{r.yearAvgScore ?? '-'}</td>
                  <td className="border border-slate-700 py-1.5 px-1.5 text-center font-bold text-royal-900">{r.yearGrade}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={2} className="border border-slate-700 py-1.5 px-2 text-right">
                  รวมชั่วโมงเรียนและผลการเรียนเฉลี่ย (GPA)
                </td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center">
                  {annualCard.rows.reduce((s, r) => s + Number(r.hours_per_semester || 0), 0)} ชม.
                </td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center text-slate-500">GPA</td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center">
                  {annualCard.term1Gpa > 0 ? annualCard.term1Gpa.toFixed(2) : '-'}
                </td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center text-slate-500">GPA</td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center">
                  {annualCard.term2Gpa > 0 ? annualCard.term2Gpa.toFixed(2) : '-'}
                </td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center text-slate-500">ทั้งปี</td>
                <td className="border border-slate-700 py-1.5 px-1.5 text-center text-royal-900">
                  {annualCard.yearGpa > 0 ? annualCard.yearGpa.toFixed(2) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs border-collapse border border-slate-700">
            <thead>
              <tr className="bg-slate-100">
                <th rowSpan={2} className="border border-slate-700 py-1.5 px-2 text-center w-24">รหัสวิชา</th>
                <th rowSpan={2} className="border border-slate-700 py-1.5 px-2 text-left">รายชื่อวิชา</th>
                <th rowSpan={2} className="border border-slate-700 py-1.5 px-2 text-center w-16">น้ำหนัก (นก.)</th>
                <th colSpan={4} className="border border-slate-700 py-1 px-2 text-center">รายการประเมิน</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 py-1 px-2 text-center w-20">คะแนนเต็ม</th>
                <th className="border border-slate-700 py-1 px-2 text-center w-20">คะแนนที่ได้</th>
                <th className="border border-slate-700 py-1 px-2 text-center w-24">ระดับผลการเรียน</th>
                <th className="border border-slate-700 py-1 px-2 text-center w-20">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={7} className="border border-slate-700 py-1 px-2">รายวิชาพื้นฐาน</td>
              </tr>
              {basicCourses.map((c) => {
                const sg = row.subjectGrades[c.id] || {};
                return (
                  <tr key={c.id}>
                    <td className="border border-slate-700 py-1.5 px-2 text-center font-semibold">{c.subject_code}</td>
                    <td className="border border-slate-700 py-1.5 px-2">{c.subject_name}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center">{Number(c.credits || 1).toFixed(1)}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center">100</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center">{sg.totalScore ?? '-'}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center font-bold">{sg.grade ?? '-'}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center text-[10px]">
                      {sg.grade === 'ร' || sg.grade === 'มส' ? 'รอแก้ไข' : ''}
                    </td>
                  </tr>
                );
              })}
              {additionalCourses.length > 0 && (
                <>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={7} className="border border-slate-700 py-1 px-2">รายวิชาเพิ่มเติม</td>
                  </tr>
                  {additionalCourses.map((c) => {
                    const sg = row.subjectGrades[c.id] || {};
                    return (
                      <tr key={c.id}>
                        <td className="border border-slate-700 py-1.5 px-2 text-center font-semibold">{c.subject_code}</td>
                        <td className="border border-slate-700 py-1.5 px-2">{c.subject_name}</td>
                        <td className="border border-slate-700 py-1.5 px-2 text-center">{Number(c.credits || 1).toFixed(1)}</td>
                        <td className="border border-slate-700 py-1.5 px-2 text-center">100</td>
                        <td className="border border-slate-700 py-1.5 px-2 text-center">{sg.totalScore ?? '-'}</td>
                        <td className="border border-slate-700 py-1.5 px-2 text-center font-bold">{sg.grade ?? '-'}</td>
                        <td className="border border-slate-700 py-1.5 px-2 text-center text-[10px]">
                          {sg.grade === 'ร' || sg.grade === 'มส' ? 'รอแก้ไข' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={2} className="border border-slate-700 py-1.5 px-2 text-right">
                  หน่วยกิตรวม / คะแนนรวม ({row.scorePercentage}%) / เกรดเฉลี่ย / ลำดับที่
                </td>
                <td className="border border-slate-700 py-1.5 px-2 text-center">{row.totalCredits.toFixed(1)}</td>
                <td className="border border-slate-700 py-1.5 px-2 text-center">{row.totalMaxScore || '-'}</td>
                <td className="border border-slate-700 py-1.5 px-2 text-center">{row.totalRawScore || '-'}</td>
                <td className="border border-slate-700 py-1.5 px-2 text-center text-royal-900">{row.gpa.toFixed(2)}</td>
                <td className="border border-slate-700 py-1.5 px-2 text-center">ที่ {row.rank}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Attendance, Desirable Traits, RTW, Activities Block matching ref/ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="border border-slate-700 p-3 space-y-1">
            <div className="font-bold text-navy-900 border-b border-slate-300 pb-1">เวลาเรียนและประเมินสมรรถนะ/คุณลักษณะ</div>
            <div>เวลาเรียนทั้งหมด: <strong>{totalAttendanceDays}</strong> วัน • มาเรียนรวม: <strong>{presentDays}</strong> วัน (<strong>{row.attendancePct}%</strong>)</div>
            <div>อ่าน คิดวิเคราะห์ เขียนสื่อความ: <strong>ผ่านเกณฑ์ ({LEVEL_LABELS[row.rtwLevel]?.label || 'ดีเยี่ยม'})</strong></div>
            <div>คุณลักษณะอันพึงประสงค์: <strong>ผ่านเกณฑ์ ({LEVEL_LABELS[row.traitsLevel]?.label || 'ดีเยี่ยม'})</strong></div>
            <div>ผลการตัดสินประจำชั้น: <strong>{row.confirmedDecision}</strong></div>
          </div>
          <div className="border border-slate-700 p-3 space-y-1">
            <div className="font-bold text-navy-900 border-b border-slate-300 pb-1">กิจกรรมพัฒนาผู้เรียน</div>
            <div>1. กิจกรรมแนะแนว (40 ชม./ปี): <strong>{row.activities?.guidance === 'มผ' ? 'ไม่ผ่าน' : 'ผ่านเกณฑ์ (ผ)'}</strong></div>
            <div>2. กิจกรรมลูกเสือ/เนตรนารี (40 ชม./ปี): <strong>{row.activities?.scout === 'มผ' ? 'ไม่ผ่าน' : 'ผ่านเกณฑ์ (ผ)'}</strong></div>
            <div>3. กิจกรรมชุมนุม (40 ชม./ปี): <strong>{row.activities?.club === 'มผ' ? 'ไม่ผ่าน' : 'ผ่านเกณฑ์ (ผ)'}</strong></div>
            <div>4. กิจกรรมเพื่อสังคมและสาธารณประโยชน์: <strong>{row.activities?.public_service === 'มผ' ? 'ไม่ผ่าน' : 'ผ่านเกณฑ์ (ผ)'}</strong></div>
          </div>
        </div>

        {/* Dual Official Signatures matching ref/ */}
        <div className="grid grid-cols-2 gap-6 text-center text-xs pt-6">
          <div className="space-y-4">
            <p>ลงชื่อ......................................................</p>
            <p className="font-bold">({homeroomTeacher?.full_name || 'ครูประจำชั้น'})</p>
            <p>ครูประจำชั้น {gradeLevel}/{classroom}</p>
          </div>
          <div className="space-y-4">
            <p>ลงชื่อ......................................................</p>
            <p className="font-bold">({settings?.director_name || 'นายเอกชัย สุภา'})</p>
            <p>{settings?.director_title || 'ผู้อำนวยการโรงเรียนบ้านหาดเค็ด'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
