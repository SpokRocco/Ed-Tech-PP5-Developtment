import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  Trash2,
  MessageSquareWarning,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSchoolData } from '../hooks/useSchoolData';
import { dataService } from '../services/dataService';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { DocumentTypesCatalog } from '../components/common/DocumentTypesCatalog';
import { MyDocumentsSection } from '../components/documents/MyDocumentsSection';
import { GRADE_LEVELS, computeCourseCompletion, getFullStudentName } from '../lib/thaiFormatting';

export function TeacherDashboard() {
  const { user } = useAuth();
  const { settings, subjects, students, indicators, courses, saveCourse, deleteCourse } =
    useSchoolData();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [classroom, setClassroom] = useState('1');
  const [semesterFilter, setSemesterFilter] = useState('all'); // 'all' | '1' | '2'
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [scoreStructures, setScoreStructures] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      dataService.fetchAllSchoolScores(),
      dataService.fetchAllSchoolAttendance(),
      dataService.fetchAllSchoolCharacteristics(),
      dataService.fetchAllSchoolScoreStructures(),
    ]).then(([sc, att, ch, st]) => {
      if (!active) return;
      setAllScores(sc);
      setAllAttendance(att);
      setAllCharacteristics(ch);
      setScoreStructures(st);
    });
    return () => {
      active = false;
    };
  }, [courses]);

  const myAllCourses = useMemo(() => {
    if (user?.role === 'admin') return courses;
    return courses.filter((c) => c.teacher_id === user?.id);
  }, [courses, user]);

  const myCourses = useMemo(() => {
    if (semesterFilter === 'all') return myAllCourses;
    return myAllCourses.filter((c) => String(c.semester || '1') === String(semesterFilter));
  }, [myAllCourses, semesterFilter]);

  const courseCompletions = useMemo(() => {
    const structureList = Array.isArray(scoreStructures)
      ? scoreStructures
      : Object.values(scoreStructures || {});
    const structMap = new Map(structureList.map((st) => [st.course_id, st]));
    const out = {};
    myAllCourses.forEach((c) => {
      out[c.id] = computeCourseCompletion(c, {
        students,
        scoreStructure: structMap.get(c.id) || null,
        studentScores: allScores,
        attendanceRecords: allAttendance,
        characteristicsRows: allCharacteristics,
      });
    });
    return out;
  }, [myAllCourses, students, scoreStructures, allScores, allAttendance, allCharacteristics]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const handleSubjectPick = (subId) => {
    setSelectedSubjectId(subId);
    const sub = subjects.find((s) => s.id === subId);
    if (sub) {
      // Auto-pull matching active students from central student database
      const matched = students
        .filter(
          (stu) =>
            stu.status === 'active' &&
            stu.grade_level === sub.grade_level &&
            stu.classroom === classroom
        )
        .map((stu) => stu.id);
      setSelectedStudentIds(matched);
    }
  };

  const handleClassroomChange = (room) => {
    setClassroom(room);
    if (selectedSubject) {
      const matched = students
        .filter(
          (stu) =>
            stu.status === 'active' &&
            stu.grade_level === selectedSubject.grade_level &&
            stu.classroom === room
        )
        .map((stu) => stu.id);
      setSelectedStudentIds(matched);
    }
  };

  const toggleStudentId = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const autoIndicators = useMemo(() => {
    if (!selectedSubject) return [];
    return indicators.filter(
      (i) =>
        i.learning_area === selectedSubject.learning_area &&
        i.grade_level === selectedSubject.grade_level
    );
  }, [selectedSubject, indicators]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!selectedSubject) return;
    const created = await saveCourse({
      subject_id: selectedSubject.id,
      subject_code: selectedSubject.subject_code,
      subject_name: selectedSubject.subject_name,
      learning_area: selectedSubject.learning_area,
      teacher_id: user.id,
      grade_level: selectedSubject.grade_level,
      classroom,
      academic_year: settings?.academic_year || '2569',
      semester: semesterFilter === 'all' ? (settings?.semester || '1') : semesterFilter,
      credits: selectedSubject.credits,
      total_hours: selectedSubject.hours_per_semester,
      student_ids: selectedStudentIds,
      selected_indicator_ids: [],
      custom_indicators_text: '',
      indicators_status: 'sample',
      cover_settings: settings?.cover_config || {},
      status: 'in_progress',
    });
    setCreateOpen(false);
    navigate(`/course/${created.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-royal-800 text-white p-6 shadow-academic border border-gold-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
            Teacher Workspace • สมุดบันทึกผลการเรียน ปพ.5
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            สวัสดี {user?.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
            {user?.position} {user?.academic_standing} • กลุ่มสาระการเรียนรู้{user?.learning_area}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-sm shadow-gold transition-colors self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> สร้างสมุด ปพ.5 รายวิชาใหม่
        </button>
      </div>

      {/* Document Types Hub */}
      <DocumentTypesCatalog onCreateSubjectClick={() => setCreateOpen(true)} />

      {/* Searchable My Documents List (ปพ.4-8 & อบ.1-3) */}
      <MyDocumentsSection
        myCourses={myAllCourses}
        courseCompletions={courseCompletions}
        allScores={allScores}
        allAttendance={allAttendance}
        allCharacteristics={allCharacteristics}
        scoreStructures={scoreStructures}
        onDeleteCourse={deleteCourse}
      />

      {/* Semester Overview Switcher */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <CalendarDays className="w-4 h-4 text-royal-600" />
          สมุด ปพ.5 ของฉัน ({myCourses.length} วิชา)
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: `ทุกภาคเรียน (${myAllCourses.length})` },
            {
              id: '1',
              label: `ภาคเรียนที่ 1 (${myAllCourses.filter((c) => String(c.semester || '1') === '1').length})`,
            },
            {
              id: '2',
              label: `ภาคเรียนที่ 2 (${myAllCourses.filter((c) => String(c.semester || '1') === '2').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSemesterFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                semesterFilter === tab.id
                  ? 'bg-navy-900 text-gold-300 border-navy-900'
                  : 'bg-ivory-50 text-slate-700 border-ivory-300 hover:bg-ivory-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course Cards */}
      {myCourses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-300 p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-navy-300 mx-auto" />
          <h3 className="font-semibold text-navy-900 text-lg">ยังไม่มีสมุดบันทึก ปพ.5 ในภาคเรียนนี้</h3>
          <p className="text-sm text-slate-500">
            กดปุ่ม "สร้างสมุด ปพ.5 รายวิชาใหม่" ระบบจะดึงรหัสวิชา ตัวชี้วัด และรายชื่อนักเรียนจากฐานกลางให้อัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCourses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-ivory-300 shadow-sm hover:shadow-academic transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-navy-50 text-navy-800 border border-navy-200">
                      {c.subject_code}
                    </span>
                    <h3 className="font-bold text-lg text-navy-900 mt-1.5">{c.subject_name}</h3>
                    <p className="text-xs text-slate-500">{c.learning_area}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-ivory-50 p-3 rounded-xl border border-ivory-200">
                  <div>
                    <span className="text-slate-500">ระดับชั้น: </span>
                    <b className="text-navy-900">{c.grade_level}/{c.classroom}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">เวลาเรียน: </span>
                    <b className="text-navy-900">{c.total_hours} ชม.</b>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-royal-600" />
                    <span>นักเรียน <b>{c.student_ids?.length || 0}</b> คน</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                    <span>
                      ตัวชี้วัด{' '}
                      <b>
                        {c.custom_indicators_text?.trim()
                          ? c.custom_indicators_text.split('\n').filter((l) => l.trim()).length
                          : c.selected_indicator_ids?.length || 0}
                      </b>
                      {c.custom_indicators_text?.trim() && (
                        <span
                          className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.indicators_status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.indicators_status === 'confirmed' ? 'ยืนยันแล้ว' : 'ตัวอย่าง'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {c.executive_comment && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <MessageSquareWarning className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>ความเห็นผู้บริหาร: {c.executive_comment}</span>
                  </div>
                )}

                {(() => {
                  const comp = courseCompletions[c.id];
                  if (!comp) return null;
                  return (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">
                          เทอม {c.semester || '1'} • ความครบการบันทึกผล
                        </span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            comp.isComplete ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {comp.isComplete && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {comp.isComplete ? 'ครบ 100% (แสดงผลให้ครูประจำชั้นแล้ว)' : `${comp.pct}%`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            comp.isComplete ? 'bg-emerald-600' : comp.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${comp.pct}%` }}
                        />
                      </div>
                      {!comp.isComplete && comp.missingItems?.length > 0 && (
                        <div className="text-[10px] text-slate-500 truncate" title={comp.missingItems.join(' • ')}>
                          รอเพิ่ม: {comp.missingItems.slice(0, 2).join(' • ')}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="px-5 py-3 bg-ivory-50 border-t border-ivory-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => deleteCourse(c.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                  title="ลบสมุดรายวิชา"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link
                  to={`/course/${c.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold transition-colors"
                >
                  เปิดบันทึก ปพ.5 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Course from Central DB */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="สร้างสมุดบันทึก ปพ.5 รายวิชาใหม่ (ดึงข้อมูลจากฐานกลางอัตโนมัติ)"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลือกรหัสวิชา / รายวิชา (จากฐานข้อมูลกลาง)
              </label>
              <select
                required
                value={selectedSubjectId}
                onChange={(e) => handleSubjectPick(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                <option value="">-- เลือกรายวิชา --</option>
                {GRADE_LEVELS.map((grade) => {
                  const list = subjects.filter((s) => s.grade_level === grade);
                  if (!list.length) return null;
                  return (
                    <optgroup key={grade} label={`ระดับชั้น ${grade}`}>
                      {list.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_code} {s.subject_name} ({s.credits} นก. / {s.hours_per_semester} ชม.)
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ห้องเรียน</label>
              <input
                type="text"
                value={classroom}
                onChange={(e) => handleClassroomChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-center font-bold"
              />
            </div>
          </div>

          {selectedSubject && (
            <>
              <div className="p-3.5 rounded-xl bg-navy-50 border border-navy-200 text-xs space-y-1">
                <div className="font-bold text-navy-900">
                  ตัวชี้วัดอัตโนมัติที่จะถูกผูกเข้ากับรายวิชา ({autoIndicators.length} ตัวชี้วัด)
                </div>
                <div className="text-slate-600">
                  {autoIndicators.length
                    ? autoIndicators.map((i) => i.indicator_code).join(', ')
                    : 'สามารถเลือกเพิ่มจากคลังตัวชี้วัดได้ภายหลังภายในเล่ม ปพ.5'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-navy-900">
                    รายชื่อนักเรียนที่ดึงอัตโนมัติจากชั้น {selectedSubject.grade_level}/{classroom} ({selectedStudentIds.length} คน)
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto border rounded-xl divide-y">
                  {students
                    .filter((s) => s.grade_level === selectedSubject.grade_level)
                    .map((stu) => (
                      <label
                        key={stu.id}
                        className="flex items-center justify-between px-3 py-2 text-xs hover:bg-ivory-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(stu.id)}
                            onChange={() => toggleStudentId(stu.id)}
                          />
                          <span className="font-medium">{getFullStudentName(stu)}</span>
                        </div>
                        <span className="text-slate-500">
                          ห้อง {stu.classroom} • เลขที่ {stu.student_number}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border text-sm text-slate-600"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!selectedSubject}
              className="px-5 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-sm font-bold disabled:opacity-50"
            >
              สร้างสมุดบันทึก ปพ.5
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
