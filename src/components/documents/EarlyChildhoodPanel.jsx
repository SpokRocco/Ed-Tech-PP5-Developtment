import React, { useMemo, useState } from 'react';
import { Factory, RefreshCw, Sparkles } from 'lucide-react';
import { getFullStudentName } from '../../lib/thaiFormatting';
import { dataService } from '../../services/dataService';
import {
  computeEarlyChildhoodSummary,
  EARLY_CHILDHOOD_12_STANDARDS,
  EARLY_CHILDHOOD_2569_COMPONENTS,
  EARLY_CHILDHOOD_LEVELS,
  OB12_DOMAINS,
  OB2569_DOMAINS,
} from '../../data/earlyChildhoodStandards';

export function EarlyChildhoodPanel({
  docState,
  onChangeDoc,
  students = [],
  academicDocuments = [],
  onNotice,
}) {
  const docType = docState.doc_type;
  const is2569 = docType.includes('2569');
  const isOb2 = docType.startsWith('ob2');
  const isOb3 = docType.startsWith('ob3');

  const items = is2569 ? EARLY_CHILDHOOD_2569_COMPONENTS : EARLY_CHILDHOOD_12_STANDARDS;
  const domains = is2569 ? OB2569_DOMAINS : OB12_DOMAINS;

  const gradeLevel = 'อ.3';
  const classroom = String(docState.classroom || '1');
  const semester = String(docState.semester || '1');
  const payload = docState.payload || {};
  const studentRecords = payload.studentRecords || payload.records || {};

  const roomStudents = useMemo(
    () =>
      students
        .filter((s) => s.status === 'active' && s.grade_level === gradeLevel && String(s.classroom || '1') === classroom)
        .sort((a, b) => (a.student_number || 0) - (b.student_number || 0)),
    [students, classroom]
  );

  const [selectedStudentId, setSelectedStudentId] = useState(
    docState.student_id || roomStudents[0]?.id || ''
  );
  const [selectedDomainKey, setSelectedDomainKey] = useState(domains[0]?.key || 'all');

  const activeStudent =
    roomStudents.find((s) => s.id === selectedStudentId) || roomStudents[0] || null;

  const updateStudentRecord = (studentId, patch) => {
    const prevRec = studentRecords[studentId] || { scores: {} };
    const nextRecords = {
      ...studentRecords,
      [studentId]: { ...prevRec, ...patch },
    };
    const pct = roomStudents.length
      ? Math.min(100, Math.max(40, Math.round((Object.keys(nextRecords).length / roomStudents.length) * 100)))
      : 50;
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      completion_pct: pct,
      status: pct >= 90 ? 'completed' : 'draft',
      payload: { ...payload, studentRecords: nextRecords },
    });
  };

  const updateItemScore = (studentId, itemKey, lv) => {
    const prevRec = studentRecords[studentId] || {};
    updateStudentRecord(studentId, {
      scores: { ...(prevRec.scores || {}), [itemKey]: Number(lv) },
    });
  };

  const fillDefaultAllRoom = () => {
    const nextRecords = { ...studentRecords };
    roomStudents.forEach((stu) => {
      const prevRec = nextRecords[stu.id] || {};
      const scores = { ...(prevRec.scores || {}) };
      items.forEach((it) => {
        if (scores[it.key] === undefined) scores[it.key] = 3;
      });
      nextRecords[stu.id] = {
        weightKg: prevRec.weightKg || '18.5',
        heightCm: prevRec.heightCm || '108',
        daysPresent: prevRec.daysPresent || '98',
        daysTotal: prevRec.daysTotal || '100',
        teacherComment:
          prevRec.teacherComment ||
          'เด็กมีพัฒนาการเหมาะสมตามวัย กล้าแสดงออก ร่าเริง และร่วมกิจกรรมกับเพื่อนได้ดี',
        ...prevRec,
        scores,
      };
    });
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      completion_pct: 100,
      status: 'completed',
      payload: { ...payload, studentRecords: nextRecords },
    });
    onNotice?.(`เติมค่าเริ่มต้นพัฒนาการระดับ 3 ครบทั้ง ${roomStudents.length} คนเรียบร้อย`);
  };

  const importFromOb1 = async (asWholeRoom = false) => {
    const sourceType = is2569 ? 'ob1_2569' : 'ob1_dev';
    let sourceDoc = academicDocuments.find(
      (d) =>
        d.doc_type === sourceType &&
        d.grade_level === gradeLevel &&
        String(d.classroom || '1') === classroom &&
        String(d.semester || '1') === semester
    );
    if (!sourceDoc) {
      const fetched = await dataService.fetchAcademicDocuments({
        docType: sourceType,
        gradeLevel,
        classroom,
      });
      sourceDoc = fetched.find((d) => String(d.semester || '1') === semester) || fetched[0];
    }
    const sourceRecords = sourceDoc?.payload?.studentRecords || sourceDoc?.payload?.records;
    if (!sourceRecords) {
      onNotice?.(`ยังไม่พบข้อมูลบันทึกในเล่ม ${is2569 ? 'อบ.1 (2569)' : 'อบ.1'} ของชั้น อ.3/${classroom} ภาคเรียนที่ ${semester}`);
      return;
    }
    onChangeDoc({
      ...docState,
      grade_level: gradeLevel,
      classroom,
      semester,
      student_id: asWholeRoom ? '' : docState.student_id || '',
      title: asWholeRoom
        ? `${is2569 ? 'อบ.2 (2569)' : 'อบ.2'} สมุดรายงานทั้งห้อง ${gradeLevel}/${classroom} ภาค ${semester}`
        : docState.title,
      completion_pct: 100,
      status: 'completed',
      payload: {
        ...payload,
        generatedFromDocId: sourceDoc.id,
        studentRecords: JSON.parse(JSON.stringify(sourceRecords)),
      },
    });
    onNotice?.(
      asWholeRoom
        ? `🏭 สร้างสมุดรายงานทั้งห้อง (${roomStudents.length} เล่ม) จากเล่ม ${is2569 ? 'อบ.1 (2569)' : 'อบ.1'} เรียบร้อย — คลิก Word/Excel เพื่อพิมพ์ทั้งห้องได้ทันที!`
        : `ดึงผลประเมินล่าสุดจากเล่ม ${is2569 ? 'อบ.1 (2569)' : 'อบ.1'} มาอัปเดตเรียบร้อย`
    );
  };

  // สรุปสถิติระดับห้องสำหรับ อบ.3 และแถบสรุป
  const domainRoomStats = useMemo(() => {
    return domains.map((d) => {
      let l3 = 0;
      let l2 = 0;
      let l1 = 0;
      roomStudents.forEach((stu) => {
        const sum = computeEarlyChildhoodSummary(studentRecords[stu.id]?.scores || {}, items, domains);
        const dSum = sum.domainSummaries.find((x) => x.key === d.key);
        if (dSum?.level === 3) l3 += 1;
        else if (dSum?.level === 2) l2 += 1;
        else l1 += 1;
      });
      const total = Math.max(1, roomStudents.length);
      return {
        ...d,
        l3,
        l2,
        l1,
        p3: ((l3 / total) * 100).toFixed(1),
        p2: ((l2 / total) * 100).toFixed(1),
        p1: ((l1 / total) * 100).toFixed(1),
      };
    });
  }, [domains, items, roomStudents, studentRecords]);

  const itemRoomStats = useMemo(() => {
    return items.map((it) => {
      let l3 = 0;
      let l2 = 0;
      let l1 = 0;
      roomStudents.forEach((stu) => {
        const val = Number(studentRecords[stu.id]?.scores?.[it.key] ?? 3);
        if (val >= 3) l3 += 1;
        else if (val === 2) l2 += 1;
        else l1 += 1;
      });
      const total = Math.max(1, roomStudents.length);
      return {
        ...it,
        l3,
        l2,
        l1,
        p3: ((l3 / total) * 100).toFixed(1),
        p2: ((l2 / total) * 100).toFixed(1),
        p1: ((l1 / total) * 100).toFixed(1),
      };
    });
  }, [items, roomStudents, studentRecords]);

  return (
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="bg-white rounded-2xl border border-rose-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
            ระดับชั้น: อนุบาล 3 (อ.3)
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ห้อง</label>
            <input
              type="text"
              value={classroom}
              onChange={(e) => onChangeDoc({ ...docState, classroom: e.target.value || '1' })}
              className="mt-0.5 w-14 px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">ภาคเรียน</label>
            <select
              value={semester}
              onChange={(e) => onChangeDoc({ ...docState, semester: e.target.value })}
              className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">
            จำนวนเด็กในห้อง: <strong className="text-navy-900">{roomStudents.length} คน</strong> • เกณฑ์:{' '}
            {is2569 ? '4 ด้าน 33 องค์ประกอบ (2569 นำร่อง)' : '4 ด้าน 12 มาตรฐาน'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOb2 && (
            <button
              type="button"
              onClick={() => importFromOb1(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-sm"
            >
              <Factory className="w-4 h-4" /> 🏭 ทำทั้งห้องคลิกเดียวจากเล่ม {is2569 ? 'อบ.1 (2569)' : 'อบ.1'}
            </button>
          )}
          {isOb3 && (
            <button
              type="button"
              onClick={() => importFromOb1(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> ดึงข้อมูลจากเล่ม {is2569 ? 'อบ.1 (2569)' : 'อบ.1'}
            </button>
          )}
          {!isOb3 && (
            <button
              type="button"
              onClick={fillDefaultAllRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" /> เติมระดับ 3 ทั้งห้อง
            </button>
          )}
        </div>
      </div>

      {/* อบ.3 / อบ.3 (2569): ตารางสรุป 4 ด้าน + รายมาตรฐาน/องค์ประกอบ */}
      {isOb3 ? (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-sky-50 border-b border-sky-200 font-bold text-sm text-navy-900">
              ตารางสรุปจำนวนและร้อยละเด็กปฐมวัยจำแนกตาม 4 ด้าน ({roomStudents.length} คน)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-navy-900 text-white">
                    <th className="py-2.5 px-3 text-left">ด้านพัฒนาการ / ความสามารถ</th>
                    <th className="py-2.5 px-3 text-center">ทั้งหมด</th>
                    <th className="py-2.5 px-3 text-center">ระดับ 3 (ดีเยี่ยม)</th>
                    <th className="py-2.5 px-3 text-center">ระดับ 2 (ดี)</th>
                    <th className="py-2.5 px-3 text-center">ระดับ 1 (ควรส่งเสริม)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {domainRoomStats.map((d) => (
                    <tr key={d.key} className="hover:bg-ivory-50">
                      <td className="py-2.5 px-3 font-semibold text-navy-900">{d.title}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{roomStudents.length}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                        {d.l3} คน ({d.p3}%)
                      </td>
                      <td className="py-2.5 px-3 text-center text-sky-700 font-semibold">
                        {d.l2} คน ({d.p2}%)
                      </td>
                      <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">
                        {d.l1} คน ({d.p1}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-ivory-100 border-b border-ivory-300 font-bold text-sm text-navy-900">
              ตารางสรุปจำนวนและร้อยละราย{is2569 ? 'องค์ประกอบ (33 องค์ประกอบ)' : 'มาตรฐาน (12 มาตรฐาน)'}
            </div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-navy-800 text-white">
                  <tr>
                    <th className="py-2 px-2 text-center w-12">ข้อ</th>
                    <th className="py-2 px-3 text-left">รายการประเมิน</th>
                    <th className="py-2 px-2 text-center w-28">ระดับ 3</th>
                    <th className="py-2 px-2 text-center w-28">ระดับ 2</th>
                    <th className="py-2 px-2 text-center w-28">ระดับ 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {itemRoomStats.map((it) => (
                    <tr key={it.key} className="hover:bg-ivory-50">
                      <td className="py-2 px-2 text-center font-bold text-slate-600">{it.no}</td>
                      <td className="py-2 px-3 font-medium text-navy-900">{it.name || it.title}</td>
                      <td className="py-2 px-2 text-center text-emerald-700 font-semibold">{it.l3} ({it.p3}%)</td>
                      <td className="py-2 px-2 text-center text-sky-700">{it.l2} ({it.p2}%)</td>
                      <td className="py-2 px-2 text-center text-amber-700">{it.l1} ({it.p1}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* อบ.1 / อบ.2 / อบ.1 (2569) / อบ.2 (2569): เลือกเด็กและประเมิน/แก้ไขรายด้าน */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Sidebar รายชื่อเด็ก อ.3 */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-ivory-300 p-4 space-y-2 h-fit">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-2">
              <h4 className="font-bold text-sm text-navy-900">รายชื่อเด็ก อ.3/{classroom}</h4>
              <span className="text-[11px] text-slate-500">1 เล่ม = 1 คน</span>
            </div>
            <div className="space-y-1.5">
              {roomStudents.map((stu, idx) => {
                const rec = studentRecords[stu.id] || {};
                const sum = computeEarlyChildhoodSummary(rec.scores || {}, items, domains);
                const isActive = activeStudent?.id === stu.id;
                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => setSelectedStudentId(stu.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-ivory-50 hover:bg-ivory-100 border-ivory-300 text-navy-900'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">
                        {stu.student_number || idx + 1}. {getFullStudentName(stu)}
                      </div>
                      <div className={`text-[11px] ${isActive ? 'text-gold-200' : 'text-slate-500'}`}>
                        เฉลี่ย {sum.avg} • {EARLY_CHILDHOOD_LEVELS[sum.level]?.short}
                      </div>
                    </div>
                  </button>
                );
              })}
              {roomStudents.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">ไม่พบรายชื่อนักเรียนชั้น อ.3</p>
              )}
            </div>
          </div>

          {/* แบบประเมิน & ข้อมูลสมุดรายงานรายบุคคล */}
          {activeStudent && (
            <div className="lg:col-span-8 bg-white rounded-2xl border border-ivory-300 p-5 space-y-4">
              {(() => {
                const rec = studentRecords[activeStudent.id] || { scores: {} };
                const sum = computeEarlyChildhoodSummary(rec.scores || {}, items, domains);
                const visibleItems =
                  selectedDomainKey === 'all'
                    ? items
                    : items.filter((it) => it.domainKey === selectedDomainKey);
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-200 pb-3">
                      <div>
                        <h4 className="font-bold text-base text-navy-900">
                          {getFullStudentName(activeStudent)} (รหัส {activeStudent.student_code})
                        </h4>
                        <p className="text-xs text-slate-500">
                          สรุปรวม 4 ด้าน: เฉลี่ย <strong>{sum.avg}</strong> •{' '}
                          <span className="font-bold text-emerald-700">
                            {EARLY_CHILDHOOD_LEVELS[sum.level]?.label}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sum.domainSummaries.map((ds) => (
                          <span
                            key={ds.key}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold ${
                              EARLY_CHILDHOOD_LEVELS[ds.level]?.badge || ''
                            }`}
                          >
                            {ds.short}: {ds.avg}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* การเจริญเติบโต & เวลามาเรียน */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-ivory-100 p-3 rounded-xl border border-ivory-300">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">น้ำหนัก (กก.)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rec.weightKg || ''}
                          placeholder="18.5"
                          onChange={(e) => updateStudentRecord(activeStudent.id, { weightKg: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">ส่วนสูง (ซม.)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={rec.heightCm || ''}
                          placeholder="108"
                          onChange={(e) => updateStudentRecord(activeStudent.id, { heightCm: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">วันมาเรียน (วัน)</label>
                        <input
                          type="number"
                          value={rec.daysPresent || ''}
                          placeholder="98"
                          onChange={(e) => updateStudentRecord(activeStudent.id, { daysPresent: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">เวลาเรียนทั้งหมด</label>
                        <input
                          type="number"
                          value={rec.daysTotal || '100'}
                          onChange={(e) => updateStudentRecord(activeStudent.id, { daysTotal: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    {/* Domain Tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDomainKey('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          selectedDomainKey === 'all'
                            ? 'bg-navy-900 text-gold-300'
                            : 'bg-ivory-100 text-slate-700 border border-ivory-300'
                        }`}
                      >
                        ทุกด้าน ({items.length})
                      </button>
                      {domains.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDomainKey(d.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                            selectedDomainKey === d.key
                              ? 'bg-navy-900 text-gold-300'
                              : 'bg-ivory-100 text-slate-700 border border-ivory-300'
                          }`}
                        >
                          {d.short}
                        </button>
                      ))}
                    </div>

                    {/* รายการประเมิน */}
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {visibleItems.map((it) => {
                        const val = Number(rec.scores?.[it.key] ?? 3);
                        return (
                          <div
                            key={it.key}
                            className="p-3 rounded-xl border border-ivory-300 bg-ivory-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-navy-900">
                                {it.no}. {it.name || it.title}
                              </div>
                              {it.behaviorO3 && (
                                <div className="text-[11px] text-slate-500">
                                  พฤติกรรมที่คาดหวัง (อ.3): {it.behaviorO3}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {[3, 2, 1].map((lv) => (
                                <button
                                  key={lv}
                                  type="button"
                                  onClick={() => updateItemScore(activeStudent.id, it.key, lv)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                    val === lv
                                      ? lv === 3
                                        ? 'bg-emerald-700 text-white border-emerald-700'
                                        : lv === 2
                                        ? 'bg-sky-700 text-white border-sky-700'
                                        : 'bg-amber-600 text-white border-amber-600'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {lv}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* จุดเด่น / จุดควรพัฒนา / ความเห็นครู */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-ivory-200">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">จุดเด่นของเด็ก</label>
                        <input
                          type="text"
                          value={rec.strengthNote || ''}
                          placeholder="เช่น กล้าแสดงออก ช่างสังเกต ช่วยเหลือเพื่อน"
                          onChange={(e) => updateStudentRecord(activeStudent.id, { strengthNote: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">จุดควรพัฒนาเพิ่มเติม</label>
                        <input
                          type="text"
                          value={rec.improveNote || ''}
                          placeholder="เช่น การฝึกสมาธิในการฟังนิทาน / กล้ามเนื้อมัดเล็ก"
                          onChange={(e) => updateStudentRecord(activeStudent.id, { improveNote: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">ความเห็นครูประจำชั้นอนุบาล</label>
                        <textarea
                          rows={2}
                          value={rec.teacherComment || ''}
                          placeholder="ความเห็นเพิ่มเติมสำหรับสมุดรายงานประจำตัวเด็ก"
                          onChange={(e) => updateStudentRecord(activeStudent.id, { teacherComment: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
