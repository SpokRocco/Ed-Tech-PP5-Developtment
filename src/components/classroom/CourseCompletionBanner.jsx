import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';

/**
 * แผงแสดงสถานะความครบถ้วน 100% ของการบันทึกผลแต่ละรายวิชาสำหรับครูประจำชั้น
 */
export function CourseCompletionBanner({
  completionSummary,
  gradeLevel,
  classroom,
  semesterLabel = 'ภาคเรียนปัจจุบัน',
  users = [],
}) {
  if (!completionSummary) return null;
  const userMap = new Map(users.map((u) => [u.id, u]));

  const {
    totalCourses = 0,
    completedCount100 = 0,
    pendingCount = 0,
    allComplete = false,
    items = [],
    unopenedSubjects = [],
    curriculumCount = 0,
  } = completionSummary;

  return (
    <div className="no-print bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
      <div
        className={`px-5 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          allComplete
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50/70 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {allComplete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <h3 className="text-sm font-bold text-navy-900">
              สถานะความครบถ้วนรายวิชา ปพ.5 ชั้น {gradeLevel}/{classroom} ({semesterLabel})
            </h3>
            <p className="text-xs text-slate-600">
              {allComplete
                ? `บันทึกผลครบ 100% ครบทุกรายวิชาแล้ว (${completedCount100}/${totalCourses} วิชา) — พร้อมดึงผลเข้าเล่ม ปพ.5 รายชั้นและเสนออนุมัติ`
                : `บันทึกผลครบ 100% แล้ว ${completedCount100} / ${totalCourses} รายวิชา${pendingCount > 0 ? ` (รอครูผู้สอนดำเนินการอีก ${pendingCount} วิชา)` : ''}${curriculumCount > 0 ? ` • ตามโครงสร้างหลักสูตร ${curriculumCount} วิชา` : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              allComplete
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-amber-800 border-amber-300'
            }`}
          >
            ครบ 100%: {completedCount100}/{totalCourses} วิชา
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-xs text-slate-500 py-3 text-center">
            ยังไม่มีรายวิชาที่เปิดสมุด ปพ.5 ในชั้น {gradeLevel}/{classroom} สำหรับ{semesterLabel}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {items.map((item) => {
              const { course, pct, isComplete, missingItems = [], counts } = item;
              return (
                <div
                  key={course.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isComplete
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : pct >= 60
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-navy-900">{course.subject_code}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            course.subject_type === 'เพิ่มเติม'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {course.subject_type || 'พื้นฐาน'}
                        </span>
                        <span className="text-[10px] text-slate-500">เทอม {course.semester || '1'}</span>
                      </div>
                      <div className="font-medium text-slate-800 truncate mt-0.5" title={course.subject_name}>
                        {course.subject_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ผู้สอน: {course.teacher_name || userMap.get(course.teacher_id)?.full_name || '-'} ({course.credits} นก. / {course.total_hours || 40} ชม.)
                      </div>
                    </div>

                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        isComplete
                          ? 'bg-emerald-600 text-white'
                          : pct >= 60
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isComplete && <Sparkles className="w-3 h-3" />}
                      {pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isComplete
                          ? 'bg-emerald-600'
                          : pct >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                    {isComplete ? (
                      <span className="font-semibold text-emerald-700">
                        ✓ บันทึกผลครบ 100% พร้อมดึงผล ({counts?.scored || 0}/{counts?.enrolled || 0} คน)
                      </span>
                    ) : (
                      <span className="text-rose-700 font-medium">
                        รอเพิ่มเติม: {missingItems.slice(0, 3).join(' • ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {unopenedSubjects.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              รายวิชาตามโครงสร้างหลักสูตรที่ยังไม่เปิดเล่ม ปพ.5 ({unopenedSubjects.length} วิชา):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unopenedSubjects.map((sub) => (
                <span
                  key={`${sub.subject_code}-${sub.grade_level}`}
                  className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 text-[11px] text-slate-700"
                >
                  {sub.subject_code} {sub.subject_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
