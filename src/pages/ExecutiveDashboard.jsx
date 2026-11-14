import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  Eye,
  ThumbsUp,
  RotateCcw,
  CalendarDays,
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { useAuth } from '../hooks/useAuth';
import { dataService } from '../services/dataService';
import { GRADE_LEVELS, LEARNING_AREAS, computeCourseCompletion } from '../lib/thaiFormatting';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { DocumentTypesCatalog } from '../components/common/DocumentTypesCatalog';

export function ExecutiveDashboard() {
  const { settings, users, students, courses, saveCourse } = useSchoolData();
  const { user } = useAuth();

  const [allAttendance, setAllAttendance] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [scoreStructures, setScoreStructures] = useState([]);
  const [attViewMode, setAttViewMode] = useState('daily'); // 'daily' | 'monthly' | 'semester'
  const [semesterFilter, setSemesterFilter] = useState('all'); // 'all' | '1' | '2'
  const [reviewCourse, setReviewCourse] = useState(null);
  const [execComment, setExecComment] = useState('');
  const [filterGrade, setFilterGrade] = useState('ทั้งหมด');

  useEffect(() => {
    let active = true;
    Promise.all([
      dataService.fetchAllSchoolAttendance(),
      dataService.fetchAllSchoolScores(),
      dataService.fetchAllSchoolCharacteristics(),
      dataService.fetchAllSchoolScoreStructures(),
    ]).then(([att, scores, chars, structs]) => {
      if (!active) return;
      setAllAttendance(att);
      setAllScores(scores);
      setAllCharacteristics(chars);
      setScoreStructures(structs);
    });
    return () => {
      active = false;
    };
  }, [courses]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const courseCompletions = useMemo(() => {
    const structMap = new Map((scoreStructures || []).map((st) => [st.course_id, st]));
    const out = {};
    courses.forEach((c) => {
      out[c.id] = computeCourseCompletion(c, {
        students,
        scoreStructure: structMap.get(c.id) || null,
        studentScores: allScores,
        attendanceRecords: allAttendance,
        characteristicsRows: allCharacteristics,
      });
    });
    return out;
  }, [courses, students, scoreStructures, allScores, allAttendance, allCharacteristics]);

  const semesterCourses = useMemo(() => {
    if (semesterFilter === 'all') return courses;
    return courses.filter((c) => String(c.semester || '1') === String(semesterFilter));
  }, [courses, semesterFilter]);

  // Overall metrics
  const approvedCount = semesterCourses.filter((c) => c.status === 'approved').length;
  const submittedCount = semesterCourses.filter((c) => c.status === 'submitted').length;
  const completed100Count = semesterCourses.filter((c) => courseCompletions[c.id]?.isComplete).length;

  const schoolAttendanceRate = useMemo(() => {
    const scopedCourseIds = new Set(semesterCourses.map((c) => c.id));
    const attRows = allAttendance.filter((a) => scopedCourseIds.has(a.course_id));
    if (!attRows.length) return '100.0';
    const present = attRows.filter((a) => a.status === 'present' || a.status === 'late').length;
    return ((present / attRows.length) * 100).toFixed(1);
  }, [allAttendance, semesterCourses]);

  // Achievement by Grade Level (อ.3 - ม.3)
  const gradeLevelStats = useMemo(() => {
    const scopedIds = new Set(semesterCourses.map((c) => c.id));
    return GRADE_LEVELS.map((grade) => {
      const stuCount = students.filter((s) => s.grade_level === grade && s.status === 'active').length;
      const gradeCourses = semesterCourses.filter((c) => c.grade_level === grade);
      const gradeScores = allScores.filter(
        (sc) => scopedIds.has(sc.course_id) && courseMap.get(sc.course_id)?.grade_level === grade
      );
      const avgScore = gradeScores.length
        ? (gradeScores.reduce((acc, r) => acc + Number(r.total_score || 0), 0) / gradeScores.length).toFixed(1)
        : '-';
      const pass3Plus = gradeScores.length
        ? (
            (gradeScores.filter((r) => ['4', '3.5', '3'].includes(String(r.grade))).length /
              gradeScores.length) *
            100
          ).toFixed(1)
        : '-';
      return {
        grade,
        stuCount,
        courseCount: gradeCourses.length,
        avgScore,
        pass3Plus,
      };
    });
    }, [students, semesterCourses, allScores, courseMap]);

  // Achievement by Learning Area (8 กลุ่มสาระฯ)
  const areaStats = useMemo(() => {
    const scopedIds = new Set(semesterCourses.map((c) => c.id));
    return LEARNING_AREAS.slice(0, 8).map((area) => {
      const areaCourses = semesterCourses.filter((c) => c.learning_area === area);
      const areaScores = allScores.filter(
        (sc) => scopedIds.has(sc.course_id) && courseMap.get(sc.course_id)?.learning_area === area
      );
      const avgScore = areaScores.length
        ? (areaScores.reduce((acc, r) => acc + Number(r.total_score || 0), 0) / areaScores.length).toFixed(1)
        : null;
      return {
        area,
        courseCount: areaCourses.length,
        evaluatedCount: areaScores.length,
        avgScore,
      };
    });
  }, [semesterCourses, allScores, courseMap]);

  // Attendance Breakdown (Daily / Monthly / Semester)
  const attendanceReportRows = useMemo(() => {
    const scopedIds = new Set(semesterCourses.map((c) => c.id));
    const scopedAttendance = allAttendance.filter((rec) => scopedIds.has(rec.course_id));
    if (attViewMode === 'semester') {
      const byGrade = new Map();
      GRADE_LEVELS.forEach((g) => byGrade.set(g, { label: `ระดับชั้น ${g}`, total: 0, present: 0, absent: 0, leave: 0 }));
      scopedAttendance.forEach((rec) => {
        const g = courseMap.get(rec.course_id)?.grade_level;
        if (!g || !byGrade.has(g)) return;
        const bucket = byGrade.get(g);
        bucket.total += 1;
        if (rec.status === 'present' || rec.status === 'late') bucket.present += 1;
        else if (rec.status === 'absent') bucket.absent += 1;
        else bucket.leave += 1;
      });
      return Array.from(byGrade.values()).filter((r) => r.total > 0);
    }

    const buckets = new Map();
    scopedAttendance.forEach((rec) => {
      const key = attViewMode === 'monthly' ? rec.session_date.slice(0, 7) : rec.session_date;
      if (!buckets.has(key)) {
        buckets.set(key, { label: key, total: 0, present: 0, absent: 0, leave: 0 });
      }
      const b = buckets.get(key);
      b.total += 1;
      if (rec.status === 'present' || rec.status === 'late') b.present += 1;
      else if (rec.status === 'absent') b.absent += 1;
      else b.leave += 1;
    });
    return Array.from(buckets.values()).sort((a, b) => b.label.localeCompare(a.label));
  }, [allAttendance, attViewMode, courseMap, semesterCourses]);

  const filteredCourses = semesterCourses.filter(
    (c) => filterGrade === 'ทั้งหมด' || c.grade_level === filterGrade
  );

  const handleDecision = async (course, nextStatus) => {
    await saveCourse({
      ...course,
      status: nextStatus,
      approved_by: nextStatus === 'approved' ? user?.id : null,
      approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
      executive_comment: execComment,
    });
    setReviewCourse(null);
    setExecComment('');
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-royal-800 text-white p-6 shadow-academic border border-gold-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-400/40">
            Executive Dashboard • รายงานสำหรับผู้บริหารสถานศึกษา
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            ยินดีต้อนรับ {settings?.director_name || user?.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
            {settings?.director_title} • ภาพรวมผลสัมฤทธิ์ทางการเรียนและสถานะเอกสาร ปพ.5 ปีการศึกษา {settings?.academic_year}/{settings?.semester}
          </p>
        </div>
        <div className="text-right text-xs bg-white/10 px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-gold-200 font-semibold">สถานะการส่ง ปพ.5 ({semesterFilter === 'all' ? 'ทั้งปี' : `เทอม ${semesterFilter}`})</div>
          <div className="text-lg font-bold mt-0.5">
            ครบ 100%: {completed100Count} / {semesterCourses.length} วิชา • อนุมัติ {approvedCount}
          </div>
        </div>
      </div>

      {/* Semester Overview Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: 'all', label: 'ภาพรวมทั้งปีการศึกษา (เทอม 1+2)', list: courses },
          { id: '1', label: 'ภาคเรียนที่ 1', list: courses.filter((c) => String(c.semester || '1') === '1') },
          { id: '2', label: 'ภาคเรียนที่ 2', list: courses.filter((c) => String(c.semester || '1') === '2') },
        ].map((t) => {
          const active = semesterFilter === t.id;
          const comp100 = t.list.filter((c) => courseCompletions[c.id]?.isComplete).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSemesterFilter(t.id)}
              className={`text-left p-4 rounded-2xl border transition-all ${
                active
                  ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                  : 'bg-white hover:bg-ivory-50 text-navy-900 border-ivory-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <CalendarDays className={`w-4 h-4 ${active ? 'text-gold-400' : 'text-royal-600'}`} />
                  {t.label}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? 'bg-gold-500 text-navy-950' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  ครบ 100%: {comp100}/{t.list.length}
                </span>
              </div>
              <div className={`text-xs mt-1.5 ${active ? 'text-ivory-200' : 'text-slate-500'}`}>
                เปิดสอน {t.list.length} รายวิชา • อนุมัติแล้ว {t.list.filter((c) => c.status === 'approved').length} รายวิชา
              </div>
            </button>
          );
        })}
      </div>

      {/* Academic Document Hubs */}
      <DocumentTypesCatalog />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="นักเรียนทั้งหมด (อ.3 - ม.3)"
          value={students.length}
          subtitle="ข้อมูลจากฐานนักเรียนส่วนกลาง"
          icon={Users}
          tone="navy"
        />
        <StatCard
          title="อัตราการมาเรียนเฉลี่ย"
          value={`${schoolAttendanceRate}%`}
          subtitle={`จากบันทึกเช็คชื่อ ${allAttendance.length} รายการ`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          title="ปพ.5 รอการตรวจอนุมัติ"
          value={submittedCount}
          subtitle="รอผู้อำนวยการลงนาม"
          icon={Clock}
          tone="gold"
        />
        <StatCard
          title="ปพ.5 อนุมัติเสร็จสมบูรณ์"
          value={approvedCount}
          subtitle={`ครบ 100%: ${completed100Count}/${semesterCourses.length} วิชา`}
          icon={CheckCircle2}
          tone="purple"
        />
      </div>

      {/* Grade Level Summary & Learning Area Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-navy-900 text-white font-semibold text-sm flex items-center justify-between">
            <span>สรุปผลสัมฤทธิ์ทางการเรียนแยกระดับชั้น (อ.3 – ม.3)</span>
            <span className="text-xs text-gold-300">เกณฑ์ดีขึ้นไป (ระดับ 3+)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-2.5 px-4 text-left">ระดับชั้น</th>
                  <th className="py-2.5 px-3 text-center">นักเรียน</th>
                  <th className="py-2.5 px-3 text-center">รายวิชา ปพ.5</th>
                  <th className="py-2.5 px-3 text-center">คะแนนเฉลี่ย</th>
                  <th className="py-2.5 px-4 text-center">ร้อยละระดับ 3 ขึ้นไป</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {gradeLevelStats.map((g) => (
                  <tr key={g.grade} className="hover:bg-ivory-50">
                    <td className="py-2.5 px-4 font-bold text-navy-900">{g.grade}</td>
                    <td className="py-2.5 px-3 text-center">{g.stuCount} คน</td>
                    <td className="py-2.5 px-3 text-center">{g.courseCount} วิชา</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-royal-700">{g.avgScore}</td>
                    <td className="py-2.5 px-4 text-center">
                      {g.pass3Plus !== '-' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          {g.pass3Plus}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8 Learning Areas */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-navy-900 text-sm border-b border-ivory-200 pb-3">
            ผลสัมฤทธิ์แยกตาม 8 กลุ่มสาระการเรียนรู้
          </h3>
          <div className="space-y-3">
            {areaStats.map((a) => {
              const pct = a.avgScore ? Math.min(100, Number(a.avgScore)) : 0;
              return (
                <div key={a.area} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate pr-2">{a.area}</span>
                    <span className="font-bold text-navy-900 shrink-0">
                      {a.avgScore ? `${a.avgScore} คะแนน (${a.courseCount} วิชา)` : `${a.courseCount} วิชา`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-ivory-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-navy-700 via-royal-600 to-gold-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attendance Statistics (Daily / Monthly / Semester) */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-navy-700" />
            <h3 className="font-semibold text-navy-900">สถิติการมาเรียนของนักเรียน</h3>
          </div>
          <div className="flex gap-1.5">
            {[
              { id: 'daily', label: 'รายวัน' },
              { id: 'monthly', label: 'รายเดือน' },
              { id: 'semester', label: 'รายภาคเรียน (แยกชั้น)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAttViewMode(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  attViewMode === tab.id
                    ? 'bg-navy-800 text-gold-300'
                    : 'bg-ivory-100 text-slate-600 hover:bg-navy-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
              <tr>
                <th className="py-2.5 px-4 text-left">ช่วงเวลา / ระดับชั้น</th>
                <th className="py-2.5 px-3 text-center">มาเรียน/สาย</th>
                <th className="py-2.5 px-3 text-center">ลาป่วย/ลากิจ</th>
                <th className="py-2.5 px-3 text-center">ขาดเรียน</th>
                <th className="py-2.5 px-4 text-center">อัตราการมาเรียน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {attendanceReportRows.map((r) => {
                const rate = r.total ? ((r.present / r.total) * 100).toFixed(1) : '100.0';
                return (
                  <tr key={r.label} className="hover:bg-ivory-50">
                    <td className="py-2.5 px-4 font-semibold text-navy-900">{r.label}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-medium">{r.present}</td>
                    <td className="py-2.5 px-3 text-center text-sky-700">{r.leave}</td>
                    <td className="py-2.5 px-3 text-center text-rose-700 font-medium">{r.absent}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-navy-900">{rate}%</td>
                  </tr>
                );
              })}
              {attendanceReportRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    ยังไม่มีข้อมูลบันทึกเวลาเรียน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Pp.5 Tracking & Approval Table */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-navy-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-gold-400" />
            <h3 className="font-semibold">ติดตามสถานะการส่ง ปพ.5 และอนุมัติผลการเรียนรายวิชา</h3>
          </div>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-semibold"
          >
            <option value="ทั้งหมด">ทุกระดับชั้น</option>
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
              <tr>
                <th className="py-3 px-4 text-left">รหัสวิชา / รายวิชา</th>
                <th className="py-3 px-3 text-center">ระดับชั้น / เทอม</th>
                <th className="py-3 px-4 text-left">ครูผู้สอน</th>
                <th className="py-3 px-3 text-center">นักเรียน</th>
                <th className="py-3 px-3 text-center">บันทึกผล</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">ตรวจสอบ / อนุมัติ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {filteredCourses.map((c) => {
                const teacher = userMap.get(c.teacher_id);
                const comp = courseCompletions[c.id];
                return (
                  <tr key={c.id} className="hover:bg-ivory-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-navy-900">
                        {c.subject_code} {c.subject_name}
                      </div>
                      <div className="text-xs text-slate-500">{c.learning_area}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold">
                      {c.grade_level}/{c.classroom} (ท.{c.semester || '1'})
                    </td>
                    <td className="py-3 px-4">{teacher?.full_name || 'ไม่ระบุ'}</td>
                    <td className="py-3 px-3 text-center">{c.student_ids?.length || 0} คน</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          comp?.isComplete
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {comp?.isComplete ? '✓ ครบ 100%' : `${comp?.pct ?? 0}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/course/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-800 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> เปิดดูเล่ม
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewCourse(c);
                            setExecComment(c.executive_comment || '');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs font-bold"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> พิจารณาอนุมัติ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive Approval Modal */}
      <Modal
        open={Boolean(reviewCourse)}
        onClose={() => setReviewCourse(null)}
        title={`พิจารณาอนุมัติเอกสาร ปพ.5 — ${reviewCourse?.subject_code || ''} ${reviewCourse?.subject_name || ''}`}
      >
        {reviewCourse && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-ivory-100 border border-ivory-300 text-sm space-y-1">
              <div><b>รายวิชา:</b> {reviewCourse.subject_code} {reviewCourse.subject_name}</div>
              <div><b>ระดับชั้น:</b> {reviewCourse.grade_level}/{reviewCourse.classroom}</div>
              <div><b>ครูผู้สอน:</b> {userMap.get(reviewCourse.teacher_id)?.full_name || '-'}</div>
              <div><b>สถานะปัจจุบัน:</b> <StatusBadge status={reviewCourse.status} /></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ความเห็นผู้บริหารสถานศึกษา ({settings?.director_name})
              </label>
              <textarea
                rows={3}
                value={execComment}
                onChange={(e) => setExecComment(e.target.value)}
                placeholder="เช่น เอกสารครบถ้วนสมบูรณ์ อนุมัติผลการเรียน หรือระบุจุดที่ให้ครูแก้ไข..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-navy-700"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDecision(reviewCourse, 'revision_requested')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4" /> ส่งกลับแก้ไข
              </button>
              <button
                type="button"
                onClick={() => handleDecision(reviewCourse, 'approved')}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> อนุมัติผลการเรียน
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
