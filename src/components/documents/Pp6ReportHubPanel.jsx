import React, { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  buildClassroomMatrix,
  getFullStudentName,
  GRADE_LEVELS,
  LEVEL_LABELS,
} from '../../lib/thaiFormatting';
import { dataService } from '../../services/dataService';
import { SchoolLogo } from '../layout/SchoolEmblem';

const REPORT_GRADES = GRADE_LEVELS.filter((g) => g !== 'อ.3');

export function Pp6ReportHubPanel({
  docState,
  onChangeDoc,
  settings,
  students = [],
  subjects = [],
  courses = [],
  users = [],
}) {
  const gradeLevel = REPORT_GRADES.includes(docState.grade_level) ? docState.grade_level : 'ป.4';
  const classroom = String(docState.classroom || '1');
  const semester = String(docState.semester || '1');
  const payload = docState.payload || {};

  const [rawData, setRawData] = useState({
    allScores: [],
    allAttendance: [],
    allCharacteristics: [],
    scoreStructures: [],
  });

  useEffect(() => {
    let alive = true;
    dataService.fetchClassroomMatrixData(gradeLevel, classroom, { courses, students, subjects }).then((res) => {
      if (alive) setRawData(res);
    });
    return () => {
      alive = false;
    };
  }, [gradeLevel, classroom, courses, students, subjects]);

  const matrix = useMemo(
    () =>
      buildClassroomMatrix({
        students,
        gradeLevel,
        classroom,
        courses,
        subjects,
        semester,
        ...rawData,
      }),
    [students, gradeLevel, classroom, courses, subjects, semester, rawData]
  );

  const selectedStudentId = docState.student_id || matrix.studentRows[0]?.student?.id || '';
  const selectedRow =
    matrix.studentRows.find((r) => r.student.id === selectedStudentId) || matrix.studentRows[0] || null;

  const homeroomTeacher = useMemo(
    () => users.find((u) => u.homeroom_class === `${gradeLevel}/${classroom}` || u.homeroom_class === gradeLevel),
    [users, gradeLevel, classroom]
  );

  const remarksByStudent = payload.teacherRemarksByStudent || {};
  const activeRemark = selectedRow
    ? remarksByStudent[selectedRow.student.id] ??
      'นักเรียนมีความตั้งใจเรียนรู้ ปฏิบัติตามข้อตกลงของห้องเรียนและร่วมกิจกรรมอย่างสม่ำเสมอ'
    : '';

  const updateRemark = (val) => {
    if (!selectedRow) return;
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      student_id: selectedRow.student.id,
      completion_pct: 90,
      status: 'completed',
      payload: {
        ...payload,
        teacherRemarksByStudent: {
          ...remarksByStudent,
          [selectedRow.student.id]: val,
        },
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="no-print bg-white rounded-2xl border border-emerald-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ระดับชั้น</label>
            <select
              value={gradeLevel}
              onChange={(e) =>
                onChangeDoc({
                  ...docState,
                  grade_level: e.target.value,
                  student_id: '',
                  title: `ปพ.6 สมุดรายงานผลรายบุคคล ${e.target.value}/${classroom} ภาค ${semester}`,
                })
              }
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold"
            >
              {REPORT_GRADES.map((g) => (
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
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ภาคเรียน</label>
            <select
              value={semester}
              onChange={(e) => onChangeDoc({ ...docState, semester: e.target.value })}
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
              <option value="all">ตลอดปีการศึกษา</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">เลือกนักเรียน</label>
            <select
              value={selectedStudentId}
              onChange={(e) =>
                onChangeDoc({
                  ...docState,
                  student_id: e.target.value,
                })
              }
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold min-w-[200px]"
            >
              {matrix.studentRows.map((r) => (
                <option key={r.student.id} value={r.student.id}>
                  เลขที่ {r.no} • {getFullStudentName(r.student)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold"
        >
          <Printer className="w-4 h-4" /> พิมพ์สมุด ปพ.6 (A4)
        </button>
      </div>

      {!selectedRow ? (
        <div className="bg-white rounded-2xl border border-ivory-300 p-8 text-center text-sm text-slate-500">
          ไม่พบรายชื่อนักเรียนในชั้น {gradeLevel}/{classroom}
        </div>
      ) : (
        <div className="font-official bg-white rounded-2xl border border-slate-300 shadow-academic p-6 sm:p-8 max-w-4xl mx-auto space-y-5">
          <div className="flex items-start justify-between border-b-2 border-emerald-800 pb-3">
            <SchoolLogo logoUrl={settings?.logo_url} className="w-16 h-16" />
            <div className="text-center flex-1 px-4">
              <h3 className="text-xl font-bold text-navy-900">แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.6)</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings?.school_name} ({settings?.affiliation_short}) • ปีการศึกษา {docState.academic_year || settings?.academic_year} •{' '}
                {semester === 'all' ? 'สรุปผลตลอดปีการศึกษา' : `ภาคเรียนที่ ${semester}`}
              </p>
            </div>
            <span className="px-3 py-1 border-2 border-emerald-700 text-emerald-800 font-bold text-sm rounded">ปพ.6</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-ivory-100 border border-ivory-300 text-xs">
            <div><b>ชื่อ - สกุล:</b> {getFullStudentName(selectedRow.student)}</div>
            <div><b>รหัสนักเรียน:</b> {selectedRow.student.student_code}</div>
            <div><b>ระดับชั้น/เลขที่:</b> {gradeLevel}/{classroom} เลขที่ {selectedRow.no}</div>
            <div><b>ผลการเรียนเฉลี่ย (GPA):</b> <span className="text-navy-900 font-bold">{selectedRow.gpa?.toFixed ? selectedRow.gpa.toFixed(2) : selectedRow.gpa}</span></div>
            <div><b>ลำดับที่ในห้อง:</b> {selectedRow.rank}</div>
            <div><b>เวลาเรียนรวม:</b> {selectedRow.attendancePct}%</div>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-700">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-700 py-2 px-2 w-10">ที่</th>
                <th className="border border-slate-700 py-2 px-2 w-24">รหัสวิชา</th>
                <th className="border border-slate-700 py-2 px-3 text-left">รายวิชา</th>
                <th className="border border-slate-700 py-2 px-2 w-16">นก./ชม.</th>
                <th className="border border-slate-700 py-2 px-2 w-20">คะแนน</th>
                <th className="border border-slate-700 py-2 px-2 w-20">ระดับผลฯ</th>
              </tr>
            </thead>
            <tbody>
              {matrix.roomCourses.map((c, idx) => {
                const sg = selectedRow.subjectGrades[c.id] || {};
                return (
                  <tr key={c.id}>
                    <td className="border border-slate-700 py-1.5 px-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center font-medium">{c.subject_code}</td>
                    <td className="border border-slate-700 py-1.5 px-3">{c.subject_name}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center">{c.credits || 1}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center">{sg.totalScore ?? '-'}</td>
                    <td className="border border-slate-700 py-1.5 px-2 text-center font-bold">{sg.grade ?? '-'}</td>
                  </tr>
                );
              })}
              {matrix.roomCourses.length === 0 && (
                <tr>
                  <td colSpan={6} className="border border-slate-700 py-4 text-center text-slate-500">
                    ยังไม่มีรายวิชาในชั้น {gradeLevel}/{classroom} ภาคเรียนที่ {semester}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 border border-slate-400 rounded-lg">
              <b>คุณลักษณะอันพึงประสงค์:</b> {LEVEL_LABELS[selectedRow.traitsLevel]?.label || 'ดีเยี่ยม'}
            </div>
            <div className="p-2.5 border border-slate-400 rounded-lg">
              <b>อ่าน คิดวิเคราะห์ และเขียน:</b> {LEVEL_LABELS[selectedRow.rtwLevel]?.label || 'ดีเยี่ยม'}
            </div>
            <div className="p-2.5 border border-slate-400 rounded-lg">
              <b>กิจกรรมพัฒนาผู้เรียน:</b> {selectedRow.activitiesPass ? 'ผ่าน (ผ)' : 'ไม่ผ่าน (มผ)'}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">ข้อเสนอแนะ / ความเห็นครูประจำชั้น (บันทึกรายคนได้)</label>
            <textarea
              rows={2}
              value={activeRemark}
              onChange={(e) => updateRemark(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 text-center text-xs">
            <div>
              <p>ลงชื่อ........................................</p>
              <p className="mt-1">(........................................)</p>
              <p className="text-slate-600">ผู้ปกครองลงนามรับทราบ</p>
            </div>
            <div>
              <p>ลงชื่อ........................................</p>
              <p className="mt-1">({homeroomTeacher?.full_name || 'ครูประจำชั้น'})</p>
              <p className="text-slate-600">ครูประจำชั้น</p>
            </div>
            <div>
              <p>ลงชื่อ........................................</p>
              <p className="mt-1">({settings?.director_name})</p>
              <p className="text-slate-600">{settings?.director_title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
