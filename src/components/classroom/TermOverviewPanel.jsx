import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, Layers, Award } from 'lucide-react';
import { getFullStudentName } from '../../lib/thaiFormatting';

/**
 * แผงแสดงภาพรวมผลการเรียนแต่ละภาคเรียน (เทอม 1 / เทอม 2 / ตลอดปีการศึกษา)
 * รองรับการเปรียบเทียบคะแนนเฉลี่ย (เทอม 1 + เทอม 2)/2 ตามแบบรายงานประถมศึกษาของโรงเรียนบ้านหาดเค็ด
 */
export function TermOverviewPanel({
  termOverview,
  gradeLevel,
  classroom,
  activeSemester,
  onSelectSemester,
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(
    termOverview?.annualStudentCards?.[0]?.student?.id || ''
  );

  if (!termOverview) return null;
  const { terms = [], annualStudentCards = [] } = termOverview;
  const currentCard =
    annualStudentCards.find((c) => c.student.id === selectedStudentId) ||
    annualStudentCards[0] ||
    null;

  return (
    <div className="space-y-5">
      {/* 3 Term Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {terms.map((t) => {
          const isSelected = String(activeSemester) === String(t.semester);
          return (
            <button
              key={t.semester}
              type="button"
              onClick={() => onSelectSemester?.(t.semester)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'bg-navy-900 text-white border-navy-900 shadow-academic'
                  : 'bg-white hover:bg-ivory-50 border-ivory-300 text-navy-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <CalendarDays className={`w-4 h-4 ${isSelected ? 'text-gold-400' : 'text-royal-600'}`} />
                  {t.label}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    t.allComplete
                      ? 'bg-emerald-500 text-white'
                      : isSelected
                      ? 'bg-gold-500 text-navy-950'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  ครบ 100%: {t.completed100}/{t.totalCourses} วิชา
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-current/10 text-xs">
                <div>
                  <div className={isSelected ? 'text-ivory-200 text-[10px]' : 'text-slate-500 text-[10px]'}>
                    รายวิชาเปิดสอน
                  </div>
                  <div className="font-bold text-base">
                    {t.totalCourses}
                    {t.curriculumCount > 0 && (
                      <span className="text-[11px] font-normal opacity-75">/{t.curriculumCount}</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className={isSelected ? 'text-ivory-200 text-[10px]' : 'text-slate-500 text-[10px]'}>
                    GPA เฉลี่ยห้อง
                  </div>
                  <div className={`font-bold text-base ${isSelected ? 'text-gold-300' : 'text-royal-700'}`}>
                    {t.avgGpa.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className={isSelected ? 'text-ivory-200 text-[10px]' : 'text-slate-500 text-[10px]'}>
                    เวลาเรียนเฉลี่ย
                  </div>
                  <div className="font-bold text-base">{t.avgAttendance}%</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Whole-Year Student Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory-100 border-b border-ivory-300 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-royal-600" />
              ตารางเปรียบเทียบผลการเรียนรายภาคเรียน (เทอม 1 • เทอม 2 • สรุปทั้งปี) ชั้น {gradeLevel}/{classroom}
            </h3>
            <p className="text-xs text-slate-500">
              คลิกแถวของนักเรียนเพื่อดูคะแนนเปรียบเทียบรายวิชา เทอม 1 และ เทอม 2 ด้านล่าง
            </p>
          </div>
          <span className="text-xs text-slate-600 font-semibold">
            จำนวน {annualStudentCards.length} คน
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">ที่</th>
                <th className="py-2.5 px-3 text-left">ชื่อ - สกุล</th>
                <th className="py-2.5 px-3 text-center">GPA ภาคเรียนที่ 1</th>
                <th className="py-2.5 px-3 text-center">GPA ภาคเรียนที่ 2</th>
                <th className="py-2.5 px-3 text-center bg-royal-50 text-royal-900">GPA เฉลี่ยทั้งปี</th>
                <th className="py-2.5 px-3 text-center">ลำดับ (เทอม 1)</th>
                <th className="py-2.5 px-3 text-center">เวลาเรียน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {annualStudentCards.map((card) => {
                const isActive = currentCard?.student?.id === card.student.id;
                return (
                  <tr
                    key={card.student.id}
                    onClick={() => setSelectedStudentId(card.student.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive ? 'bg-royal-50/70' : 'hover:bg-ivory-50'
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-semibold text-slate-600">{card.no}</td>
                    <td className="py-2 px-3 font-medium text-navy-900">
                      {getFullStudentName(card.student)}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-navy-800">
                      {card.term1Gpa > 0 ? card.term1Gpa.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-sky-700">
                      {card.term2Gpa > 0 ? card.term2Gpa.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-royal-800 bg-royal-50/50">
                      {card.yearGpa > 0 ? card.yearGpa.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">{card.term1Rank}</td>
                    <td className="py-2 px-3 text-center">{card.attendancePct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Student Consolidated Subject View (Term 1 / Term 2 / Annual Avg) */}
      {currentCard && (
        <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-navy-900 text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Award className="w-4 h-4 text-gold-400" />
              สรุปผลการเรียนตลอดปีรายวิชา: เลขที่ {currentCard.no} {getFullStudentName(currentCard.student)}
            </div>
            <div className="text-xs text-gold-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              GPA เฉลี่ยทั้งปี: {currentCard.yearGpa > 0 ? currentCard.yearGpa.toFixed(2) : '-'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th rowSpan={2} className="py-2 px-3 text-left border-r">รหัสวิชา</th>
                  <th rowSpan={2} className="py-2 px-3 text-left border-r">รายชื่อวิชา</th>
                  <th rowSpan={2} className="py-2 px-2 text-center border-r">ประเภท</th>
                  <th rowSpan={2} className="py-2 px-2 text-center border-r">นก./ชม.</th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b bg-blue-50/60">ภาคเรียนที่ 1</th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b bg-emerald-50/60">ภาคเรียนที่ 2</th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-b bg-purple-50/60">สรุปผลทั้งปี (T1+T2)/2</th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="py-1 px-2 text-center border-r">คะแนน</th>
                  <th className="py-1 px-2 text-center border-r">เกรด</th>
                  <th className="py-1 px-2 text-center border-r">คะแนน</th>
                  <th className="py-1 px-2 text-center border-r">เกรด</th>
                  <th className="py-1 px-2 text-center border-r">คะแนนเฉลี่ย</th>
                  <th className="py-1 px-2 text-center">เกรดทั้งปี</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {currentCard.rows.map((r) => (
                  <tr key={r.subject_code} className="hover:bg-ivory-50">
                    <td className="py-2 px-3 font-bold border-r">{r.subject_code}</td>
                    <td className="py-2 px-3 border-r">{r.subject_name}</td>
                    <td className="py-2 px-2 text-center border-r">{r.subject_type}</td>
                    <td className="py-2 px-2 text-center border-r">
                      {/^ป\./.test(gradeLevel || '') ? `${r.hours_per_semester} ชม.` : `${r.credits} นก.`}
                    </td>
                    <td className="py-2 px-2 text-center border-r">{r.term1Score ?? '-'}</td>
                    <td className="py-2 px-2 text-center font-bold border-r text-navy-900">{r.term1Grade}</td>
                    <td className="py-2 px-2 text-center border-r">{r.term2Score ?? '-'}</td>
                    <td className="py-2 px-2 text-center font-bold border-r text-sky-700">{r.term2Grade}</td>
                    <td className="py-2 px-2 text-center border-r font-semibold">{r.yearAvgScore ?? '-'}</td>
                    <td className="py-2 px-2 text-center font-bold text-royal-800">{r.yearGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
