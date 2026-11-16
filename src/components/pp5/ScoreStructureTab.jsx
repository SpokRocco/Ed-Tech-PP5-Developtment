import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Calculator,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { RATIO_PRESETS } from '../../services/scoringConfigAdapter';
import {
  findMatchingIndicatorsForCourse,
  formatIndicatorsToLines,
} from '../../data/curriculum2551Indicators';
import {
  computeStudentCourseScores,
  getFullStudentName,
  parseBulkStudentLines,
  splitThaiFullName,
} from '../../lib/thaiFormatting';
import { IndicatorAssessmentSection } from './IndicatorAssessmentSection';
import { UnifiedRosterScoreTable } from './UnifiedRosterScoreTable';

export function ScoreStructureTab({
  course,
  students,
  allCourses = [],
  allStudents = [],
  allIndicators,
  scoreStructure,
  studentScores,
  attendanceStatsMap,
  onUpdateCourseIndicators,
  onSaveCourseObject,
  onSaveStructure,
  onSaveScores,
  onCreatePp6Draft,
  onOpenSemesterMerge,
}) {
  const [selectedIds, setSelectedIds] = useState(course.selected_indicator_ids || []);
  const [customIndicatorsText, setCustomIndicatorsText] = useState(
    course.custom_indicators_text || ''
  );
  const [indicatorsStatus, setIndicatorsStatus] = useState(course.indicators_status || 'sample');
  const [showAllAreas, setShowAllAreas] = useState(false);

  const [formativeRatio, setFormativeRatio] = useState(scoreStructure?.formative_ratio ?? 60);
  const [midtermRatio, setMidtermRatio] = useState(scoreStructure?.midterm_ratio ?? 20);
  const [finalRatio, setFinalRatio] = useState(scoreStructure?.final_ratio ?? 20);
  const [units, setUnits] = useState(scoreStructure?.units || []);
  const [requireFinalExam, setRequireFinalExam] = useState(
    Boolean(scoreStructure?.grading_policy?.requireFinalExam ?? false)
  );
  const [minAttendancePct, setMinAttendancePct] = useState(
    Number(scoreStructure?.grading_policy?.minAttendancePct ?? 80)
  );
  const [indicatorMode, setIndicatorMode] = useState(
    scoreStructure?.grading_policy?.indicatorMode || 'score'
  );
  const [indicatorPassPct, setIndicatorPassPct] = useState(
    Number(scoreStructure?.grading_policy?.indicatorPassPct ?? 50)
  );
  const [indicatorMaxScores, setIndicatorMaxScores] = useState(
    scoreStructure?.grading_policy?.indicatorMaxScores || {}
  );

  // Sync from parent when top header config / preset / rounding updates scoreStructure
  useEffect(() => {
    if (!scoreStructure) return;
    setFormativeRatio(scoreStructure.formative_ratio ?? 60);
    setMidtermRatio(scoreStructure.midterm_ratio ?? 20);
    setFinalRatio(scoreStructure.final_ratio ?? 20);
    setUnits(scoreStructure.units || []);
    setRequireFinalExam(Boolean(scoreStructure.grading_policy?.requireFinalExam ?? false));
    setMinAttendancePct(Number(scoreStructure.grading_policy?.minAttendancePct ?? 80));
    setIndicatorMode(scoreStructure.grading_policy?.indicatorMode || 'score');
    setIndicatorPassPct(Number(scoreStructure.grading_policy?.indicatorPassPct ?? 50));
    setIndicatorMaxScores(scoreStructure.grading_policy?.indicatorMaxScores || {});
  }, [scoreStructure]);

  // Local editable score rows keyed by student_id
  const [scoreDrafts, setScoreDrafts] = useState(() => {
    const map = {};
    (studentScores || []).forEach((row) => {
      map[row.student_id] = row;
    });
    return map;
  });

  useEffect(() => {
    const map = {};
    (studentScores || []).forEach((row) => {
      map[row.student_id] = row;
    });
    setScoreDrafts(map);
  }, [studentScores]);

  const [savingMsg, setSavingMsg] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  // Auto-matched curriculum indicators based on subject's learning_area & grade_level
  const autoMatchedIndicators = useMemo(() => {
    const exact = allIndicators.filter(
      (ind) =>
        ind.learning_area === course.learning_area && ind.grade_level === course.grade_level
    );
    if (showAllAreas || exact.length === 0) {
      return allIndicators;
    }
    return exact;
  }, [allIndicators, course.learning_area, course.grade_level, showAllAreas]);

  const selectedIndicatorObjects = useMemo(
    () => allIndicators.filter((i) => selectedIds.includes(i.id)),
    [allIndicators, selectedIds]
  );

  const indicatorLineCount = useMemo(
    () =>
      customIndicatorsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean).length,
    [customIndicatorsText]
  );

  const ratioSum = Number(formativeRatio) + Number(midtermRatio) + Number(finalRatio);

  const toggleIndicator = (id) => {
    setSelectedIds((prev) => {
      const nextIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const nextObjs = allIndicators.filter((item) => nextIds.includes(item.id));
      const nextText = formatIndicatorsToLines(nextObjs);
      setCustomIndicatorsText(nextText);
      setIndicatorsStatus('sample');
      return nextIds;
    });
  };

  const handleAutoFillIndicators = async () => {
    const matched = findMatchingIndicatorsForCourse(course, allIndicators);
    const matchedIds = matched.map((i) => i.id);
    const linesText = formatIndicatorsToLines(matched);
    setSelectedIds(matchedIds);
    setCustomIndicatorsText(linesText);
    setIndicatorsStatus('sample');
    await onUpdateCourseIndicators({
      selected_indicator_ids: matchedIds,
      custom_indicators_text: linesText,
      indicators_status: 'sample',
    });
    setSavingMsg(
      `ดึงตัวชี้วัดหลักสูตรแกนกลางสำหรับ ${course.subject_code} ${course.subject_name} (${matched.length} ข้อ) เรียบร้อย — ใส่ป้าย "ตัวอย่าง" จนกว่าจะติ๊กเฉพาะข้อที่สอนและกดยืนยัน`
    );
  };

  const handleConfirmIndicators = async () => {
    if (!customIndicatorsText.trim()) return;
    setIndicatorsStatus('confirmed');
    await onUpdateCourseIndicators({
      selected_indicator_ids: selectedIds,
      custom_indicators_text: customIndicatorsText,
      indicators_status: 'confirmed',
    });
    setSavingMsg('ยืนยันตัวชี้วัด/ผลการเรียนรู้ของรายวิชาเรียบร้อย (พิมพ์ลงเล่ม ปพ.5 อัตโนมัติ)');
  };

  const applyPreset = (preset) => {
    setFormativeRatio(preset.formative);
    setMidtermRatio(preset.midterm);
    setFinalRatio(preset.final);
  };

  const addUnit = (category = 'formative') => {
    const nextIdx = units.length + 1;
    setUnits((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}-${nextIdx}`,
        name:
          category === 'midterm'
            ? 'สอบกลางภาค'
            : category === 'final'
            ? 'สอบปลายภาค'
            : `หน่วยการเรียนรู้ที่ ${prev.filter((u) => u.category === 'formative').length + 1}`,
        category,
        maxScore: category === 'formative' ? 20 : category === 'midterm' ? midtermRatio : finalRatio,
        indicatorCodes: [],
      },
    ]);
  };

  const updateUnit = (id, patch) => {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const toggleUnitIndicatorCode = (unitId, code) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const current = u.indicatorCodes || [];
        const next = current.includes(code)
          ? current.filter((c) => c !== code)
          : [...current, code];
        return { ...u, indicatorCodes: next };
      })
    );
  };

  const removeUnit = (id) => {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  const currentStructure = useMemo(
    () => ({
      course_id: course.id,
      formative_ratio: Number(formativeRatio),
      midterm_ratio: Number(midtermRatio),
      final_ratio: Number(finalRatio),
      units,
      grading_policy: {
        ...(scoreStructure?.grading_policy || {}),
        minAttendancePct: Number(minAttendancePct),
        requireFinalExam,
        indicatorMode,
        indicatorPassPct: Number(indicatorPassPct),
        indicatorMaxScores,
      },
    }),
    [
      course.id,
      formativeRatio,
      midtermRatio,
      finalRatio,
      units,
      scoreStructure?.grading_policy,
      minAttendancePct,
      requireFinalExam,
      indicatorMode,
      indicatorPassPct,
      indicatorMaxScores,
    ]
  );

  const computedStudents = useMemo(() => {
    return students.map((stu) => {
      const draft = scoreDrafts[stu.id] || { unit_scores: {}, special_status: null };
      const att = attendanceStatsMap[stu.id];
      const computed = computeStudentCourseScores(
        draft,
        currentStructure,
        att,
        course?.total_hours || 40
      );
      return {
        student: stu,
        draft,
        att,
        computed,
      };
    });
  }, [students, scoreDrafts, currentStructure, attendanceStatsMap, course?.total_hours]);

  const gradeSummary = useMemo(() => {
    const counts = { '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0, '0': 0, 'ร': 0, 'มส': 0 };
    computedStudents.forEach(({ computed }) => {
      if (counts[computed.grade] !== undefined) counts[computed.grade] += 1;
    });
    return counts;
  }, [computedStudents]);

  const handleScoreInputChange = (studentId, unitId, maxScore, rawVal) => {
    let val = rawVal;
    if (val !== '') {
      const num = Number(val);
      if (Number.isNaN(num)) return;
      val = Math.max(0, Math.min(Number(maxScore) || 100, num));
    }
    const targetUnit = units.find((u) => u.id === unitId);
    setScoreDrafts((prev) => {
      const cur = prev[studentId] || { student_id: studentId, unit_scores: {} };
      const nextUnitScores = {
        ...(cur.unit_scores || {}),
        [unitId]: val,
      };
      // ถ้าระบุคะแนนรายหน่วย ให้ล้าง direct override ในหมวดเดียวกันเพื่อให้คำนวณจากหน่วยจริง
      if (targetUnit?.category === 'midterm') delete nextUnitScores.__directMidterm;
      else if (targetUnit?.category === 'final') delete nextUnitScores.__directFinal;
      else delete nextUnitScores.__directFormative;

      return {
        ...prev,
        [studentId]: {
          ...cur,
          unit_scores: nextUnitScores,
        },
      };
    });
  };

  const handleDirectFieldChange = (studentId, fieldKey, val) => {
    setScoreDrafts((prev) => {
      const cur = prev[studentId] || { student_id: studentId, unit_scores: {} };
      const nextUnitScores = { ...(cur.unit_scores || {}) };
      if (val === '' || val === null || val === undefined) {
        delete nextUnitScores[fieldKey];
      } else {
        nextUnitScores[fieldKey] = val;
      }
      return {
        ...prev,
        [studentId]: {
          ...cur,
          unit_scores: nextUnitScores,
        },
      };
    });
  };

  const handleStudentIndicatorChange = (studentId, indKey, val) => {
    setScoreDrafts((prev) => {
      const cur = prev[studentId] || { student_id: studentId, unit_scores: {} };
      const nextInd = { ...(cur.unit_scores?.indicatorScores || {}) };
      if (val === '' || val === null || val === undefined) {
        delete nextInd[indKey];
      } else {
        nextInd[indKey] = indicatorMode === 'pass_fail' ? val : Number(val);
      }
      return {
        ...prev,
        [studentId]: {
          ...cur,
          unit_scores: {
            ...(cur.unit_scores || {}),
            indicatorScores: nextInd,
          },
        },
      };
    });
  };

  const buildScorePayloadRows = (draftsSnapshot = scoreDrafts, structSnapshot = currentStructure) => {
    return students.map((stu) => {
      const draft = draftsSnapshot[stu.id] || { unit_scores: {}, special_status: null };
      const att = attendanceStatsMap[stu.id];
      const computed = computeStudentCourseScores(
        draft,
        structSnapshot,
        att,
        course?.total_hours || 40
      );
      return {
        course_id: course.id,
        student_id: stu.id,
        unit_scores: draft.unit_scores || {},
        formative_total: computed.formativeTotal,
        midterm_score: computed.midtermTotal,
        final_score: computed.finalTotal,
        total_score: computed.totalScore,
        grade: computed.grade,
        special_status: draft.special_status || null,
      };
    });
  };

  const handleTransferIndicatorsToFormative = async (formativeMap) => {
    const nextDrafts = { ...scoreDrafts };
    Object.entries(formativeMap).forEach(([stuId, val]) => {
      const cur = nextDrafts[stuId] || { student_id: stuId, unit_scores: {} };
      nextDrafts[stuId] = {
        ...cur,
        unit_scores: {
          ...(cur.unit_scores || {}),
          __directFormative: val,
        },
      };
    });
    setScoreDrafts(nextDrafts);
    await onSaveStructure(currentStructure);
    await onSaveScores(buildScorePayloadRows(nextDrafts, currentStructure));
    setSavingMsg('นำผลรวมตัวชี้วัด (หัวข้อ ๑.๑) ใส่ช่อง "เก็บ" และบันทึกเรียบร้อยแล้ว');
  };

  const handleClearAllIndicators = async () => {
    const nextDrafts = { ...scoreDrafts };
    students.forEach((stu) => {
      const cur = nextDrafts[stu.id] || { student_id: stu.id, unit_scores: {} };
      const nextUnits = { ...(cur.unit_scores || {}) };
      delete nextUnits.indicatorScores;
      nextDrafts[stu.id] = { ...cur, unit_scores: nextUnits };
    });
    setScoreDrafts(nextDrafts);
    await onSaveScores(buildScorePayloadRows(nextDrafts, currentStructure));
    setSavingMsg('ล้างข้อมูลประเมินตัวชี้วัด หัวข้อ ๑.๑ ทั้งตารางเรียบร้อย');
  };

  const handleBulkAddStudents = async (rawText) => {
    const parsed = parseBulkStudentLines(rawText, students.length + 1);
    if (!parsed.length) return;
    const prevCustom = [...(course.cover_settings?.customStudents || [])];
    const nextIds = [...(course.student_ids || students.map((s) => s.id))];

    parsed.forEach((p, idx) => {
      // ตรวจว่ามีในฐานข้อมูลกลางของโรงเรียนหรือไม่ (เทียบจากรหัสหรือชื่อ)
      const matched = allStudents.find(
        (s) =>
          (p.student_code && String(s.student_code) === String(p.student_code)) ||
          (s.first_name === p.first_name && s.last_name === p.last_name)
      );
      if (matched) {
        if (!nextIds.includes(matched.id)) nextIds.push(matched.id);
      } else {
        const newId = `cstu-${Date.now()}-${idx}`;
        prevCustom.push({
          id: newId,
          student_code: p.student_code || '',
          prefix: p.prefix,
          first_name: p.first_name,
          last_name: p.last_name,
          gender: p.gender,
          grade_level: course.grade_level,
          classroom: course.classroom,
          student_number: p.student_number,
          status: 'active',
        });
        nextIds.push(newId);
      }
    });

    await onSaveCourseObject({
      ...course,
      student_ids: Array.from(new Set(nextIds)),
      cover_settings: {
        ...(course.cover_settings || {}),
        customStudents: prevCustom,
      },
    });
    setSavingMsg(`เพิ่มรายชื่อนักเรียน ${parsed.length} คนเรียบร้อย (แปลงคำนำหน้าอัตโนมัติ)`);
  };

  const handleImportRosterFromSource = async (source) => {
    const prevCustom = [...(course.cover_settings?.customStudents || [])];
    const nextIds = [...(course.student_ids || [])];
    let addedCount = 0;

    if (source.type === 'room') {
      source.students.forEach((s) => {
        if (!nextIds.includes(s.id)) {
          nextIds.push(s.id);
          addedCount += 1;
        }
      });
    } else if (source.type === 'course' && source.sourceCourse) {
      const srcIds = source.sourceCourse.student_ids || [];
      const srcCustom = source.sourceCourse.cover_settings?.customStudents || [];
      srcIds.forEach((id) => {
        if (!nextIds.includes(id)) {
          nextIds.push(id);
          addedCount += 1;
        }
      });
      srcCustom.forEach((cs) => {
        if (!prevCustom.some((x) => x.id === cs.id)) prevCustom.push(cs);
        if (!nextIds.includes(cs.id)) nextIds.push(cs.id);
      });
    }

    await onSaveCourseObject({
      ...course,
      student_ids: Array.from(new Set(nextIds)),
      cover_settings: {
        ...(course.cover_settings || {}),
        customStudents: prevCustom,
      },
    });
    setSavingMsg(`ดึงรายชื่อนักเรียนเรียบร้อย (+${addedCount} คน)`);
  };

  const handleAddBlankRow = async () => {
    const prevCustom = [...(course.cover_settings?.customStudents || [])];
    const nextIds = [...(course.student_ids || students.map((s) => s.id))];
    const newId = `cstu-${Date.now()}`;
    prevCustom.push({
      id: newId,
      student_code: '',
      prefix: 'เด็กชาย',
      first_name: `นักเรียนใหม่ ${students.length + 1}`,
      last_name: '',
      gender: 'ชาย',
      grade_level: course.grade_level,
      classroom: course.classroom,
      student_number: students.length + 1,
      status: 'active',
    });
    nextIds.push(newId);
    await onSaveCourseObject({
      ...course,
      student_ids: Array.from(new Set(nextIds)),
      cover_settings: {
        ...(course.cover_settings || {}),
        customStudents: prevCustom,
      },
    });
  };

  const handleUpdateStudentRowMeta = async (studentId, patch) => {
    const customList = [...(course.cover_settings?.customStudents || [])];
    const overrides = { ...(course.cover_settings?.rosterOverrides || {}) };
    const parsedName = patch.fullName ? splitThaiFullName(patch.fullName) : null;
    const cleanPatch = { ...patch };
    delete cleanPatch.fullName;
    if (parsedName) {
      Object.assign(cleanPatch, parsedName);
    }

    const customIdx = customList.findIndex((c) => c.id === studentId);
    if (customIdx >= 0) {
      customList[customIdx] = { ...customList[customIdx], ...cleanPatch };
    } else {
      overrides[studentId] = { ...(overrides[studentId] || {}), ...cleanPatch };
    }

    await onSaveCourseObject({
      ...course,
      cover_settings: {
        ...(course.cover_settings || {}),
        customStudents: customList,
        rosterOverrides: overrides,
      },
    });
  };

  const handleRemoveCourseStudent = async (studentId) => {
    const nextIds = (course.student_ids || students.map((s) => s.id)).filter((id) => id !== studentId);
    const prevCustom = (course.cover_settings?.customStudents || []).filter((c) => c.id !== studentId);
    await onSaveCourseObject({
      ...course,
      student_ids: nextIds,
      cover_settings: {
        ...(course.cover_settings || {}),
        customStudents: prevCustom,
      },
    });
  };

  const handleRenumberStudents = async () => {
    const customList = [...(course.cover_settings?.customStudents || [])];
    const overrides = { ...(course.cover_settings?.rosterOverrides || {}) };
    students.forEach((stu, idx) => {
      const no = idx + 1;
      const customIdx = customList.findIndex((c) => c.id === stu.id);
      if (customIdx >= 0) {
        customList[customIdx] = { ...customList[customIdx], student_number: no };
      } else {
        overrides[stu.id] = { ...(overrides[stu.id] || {}), student_number: no };
      }
    });
    await onSaveCourseObject({
      ...course,
      cover_settings: {
        ...(course.cover_settings || {}),
        customStudents: customList,
        rosterOverrides: overrides,
      },
    });
    setSavingMsg('รันเลขที่นักเรียนใหม่ (1 - ' + students.length + ') เรียบร้อย');
  };

  const handleFillEmptyAttendanceFull = async () => {
    const planHours = Number(course?.total_hours || 40);
    const nextDrafts = { ...scoreDrafts };
    let filledCount = 0;
    computedStudents.forEach(({ student, draft, att }) => {
      const curHours =
        draft.unit_scores?.__manualAttendanceHours ??
        (att?.totalRecorded > 0 ? att.attendedPeriods : '');
      if (curHours === '' || curHours === null || curHours === undefined) {
        nextDrafts[student.id] = {
          ...(draft || { student_id: student.id }),
          unit_scores: {
            ...(draft.unit_scores || {}),
            __manualAttendanceHours: planHours,
          },
        };
        filledCount += 1;
      }
    });
    setScoreDrafts(nextDrafts);
    await onSaveScores(buildScorePayloadRows(nextDrafts, currentStructure));
    setSavingMsg(`เติมเวลาเรียนเต็ม (${planHours} ชม.) ให้ช่องที่ว่างแล้ว ${filledCount} คน`);
  };

  const handleSpecialStatusChange = (studentId, val) => {
    setScoreDrafts((prev) => {
      const cur = prev[studentId] || { student_id: studentId, unit_scores: {} };
      return {
        ...prev,
        [studentId]: {
          ...cur,
          special_status: val || null,
        },
      };
    });
  };

  const handleSaveAll = async () => {
    if (ratioSum !== 100) {
      setSavingMsg('สัดส่วนคะแนน ระหว่างภาค + กลางภาค + ปลายภาค ต้องรวมกันได้ 100 พอดี');
      return;
    }
    setSavingAll(true);
    try {
      await onUpdateCourseIndicators({
        selected_indicator_ids: selectedIds,
        custom_indicators_text: customIndicatorsText,
        indicators_status: indicatorsStatus,
      });
      await onSaveStructure(currentStructure);
      await onSaveScores(buildScorePayloadRows(scoreDrafts, currentStructure));
      setSavingMsg('บันทึกมาตรฐานตัวชี้วัด โครงสร้างคะแนน และผลการตัดเกรดทั้งหมดเรียบร้อย');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {savingMsg && (
        <div
          className={`px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${
            ratioSum !== 100
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {ratioSum !== 100 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {savingMsg}
        </div>
      )}

      {/* Section Main: Unified Live Roster + Attendance Hours + Formative/Midterm/Final + Grade */}
      <UnifiedRosterScoreTable
        course={course}
        students={students}
        allCourses={allCourses}
        allStudents={allStudents}
        scoreStructure={currentStructure}
        scoreDrafts={scoreDrafts}
        computedStudents={computedStudents}
        attendanceStatsMap={attendanceStatsMap}
        gradeSummary={gradeSummary}
        onChangeDirectField={handleDirectFieldChange}
        onChangeSpecialStatus={handleSpecialStatusChange}
        onBulkAddStudents={handleBulkAddStudents}
        onImportRosterFromCourse={handleImportRosterFromSource}
        onAddBlankStudentRow={handleAddBlankRow}
        onUpdateStudentRowMeta={handleUpdateStudentRowMeta}
        onRemoveCourseStudent={handleRemoveCourseStudent}
        onRenumberStudents={handleRenumberStudents}
        onFillEmptyAttendanceFull={handleFillEmptyAttendanceFull}
        onCreatePp6Draft={onCreatePp6Draft}
        onOpenSemesterMerge={onOpenSemesterMerge}
        onSaveAll={handleSaveAll}
        saving={savingAll}
      />

      {/* Section 1.1: Per-Indicator Individual Assessment Matrix */}
      <IndicatorAssessmentSection
        students={students}
        customIndicatorsText={customIndicatorsText}
        selectedIndicatorObjects={selectedIndicatorObjects}
        formativeRatio={formativeRatio}
        indicatorMode={indicatorMode}
        indicatorPassPct={indicatorPassPct}
        indicatorMaxScores={indicatorMaxScores}
        scoreDrafts={scoreDrafts}
        onChangeMode={setIndicatorMode}
        onChangePassPct={setIndicatorPassPct}
        onChangeMaxScore={(indKey, maxVal) =>
          setIndicatorMaxScores((prev) => ({ ...prev, [indKey]: maxVal }))
        }
        onChangeStudentIndicatorScore={handleStudentIndicatorChange}
        onTransferSumToFormative={handleTransferIndicatorsToFormative}
        onClearAllIndicatorScores={handleClearAllIndicators}
      />

      {/* Section A: Course Indicators Box (Auto-Fill + Sample Badge + Checklist + 1-line-per-indicator Textarea) */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
                ตัวชี้วัด/ผลการเรียนรู้ของรายวิชา (บรรทัดละ 1 ตัวชี้วัด — พิมพ์ลงเล่ม ปพ.5 ให้อัตโนมัติ)
              </h3>
              {!customIndicatorsText.trim() ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-600/80 text-slate-100 border border-slate-400/50">
                  ยังไม่มีข้อมูล
                </span>
              ) : indicatorsStatus === 'confirmed' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm">
                  ✓ ยืนยันแล้ว
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-navy-950 shadow-sm">
                  ตัวอย่าง (รอครูยืนยัน)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              ดึงตัวชี้วัดของวิชา {course.subject_code} {course.subject_name} จากหลักสูตรแกนกลาง 2551 (ปรับปรุง 2560 & ตัวชี้วัดระหว่างทาง/ปลายทาง สพฐ.)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillIndicators}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              เติมตัวชี้วัดอัตโนมัติ (หลักสูตรแกนกลาง)
            </button>
            {customIndicatorsText.trim() && indicatorsStatus === 'sample' && (
              <button
                type="button"
                onClick={handleConfirmIndicators}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs sm:text-sm shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                ยืนยันตัวชี้วัดชุดนี้
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4 bg-ivory-50/70">
          {!customIndicatorsText.trim() && (
            <div className="p-4 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/80 text-emerald-950 text-xs sm:text-sm space-y-1">
              <div className="font-bold text-emerald-900">ช่องนี้ยังไม่มีข้อความตัวชี้วัด</div>
              <p className="text-emerald-800 leading-relaxed">
                กดปุ่มเขียวเพื่อเติมตัวชี้วัดของวิชานี้ จากหลักสูตรแกนกลาง (ฉบับที่ใช้ปัจจุบัน) แล้วติ๊กเฉพาะข้อที่สอน — ระบบใส่ป้าย &quot;ตัวอย่าง&quot; ไว้จนกว่าจะกดยืนยัน
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-semibold text-navy-900">
                ข้อความตัวชี้วัดที่จะพิมพ์ลงเล่ม ปพ.5 อัตโนมัติ (บรรทัดละ 1 ตัวชี้วัด)
              </span>
              <span className="text-slate-500">
                ทั้งหมด <b>{indicatorLineCount}</b> บรรทัด
              </span>
            </div>
            <textarea
              rows={5}
              value={customIndicatorsText}
              onChange={(e) => {
                setCustomIndicatorsText(e.target.value);
                if (indicatorsStatus === 'confirmed') setIndicatorsStatus('sample');
              }}
              placeholder="ยังไม่มีข้อความตัวชี้วัด — กดปุ่มสีเขียวด้านบนเพื่อดึงตัวชี้วัดจากระบบ หรือพิมพ์เพิ่มบรรทัดละ 1 ตัวชี้วัด..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-official leading-relaxed bg-white focus:outline-none focus:ring-2 ${
                indicatorsStatus === 'confirmed' && customIndicatorsText.trim()
                  ? 'border-emerald-400 focus:ring-emerald-100'
                  : 'border-amber-300 focus:ring-navy-100'
              }`}
            />
          </div>

          <div className="pt-2 border-t border-ivory-300 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-navy-900">
                ติ๊กเลือกเฉพาะตัวชี้วัดที่สอนจริงในภาคเรียนนี้ (เลือกแล้ว {selectedIds.length} ข้อ — อัปเดตลงช่องด้านบนทันที)
              </span>
              <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllAreas}
                  onChange={(e) => setShowAllAreas(e.target.checked)}
                  className="rounded text-navy-700"
                />
                แสดงคลังตัวชี้วัดทั้งหมดทุกกลุ่มสาระฯ
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
              {autoMatchedIndicators.map((ind) => {
                const checked = selectedIds.includes(ind.id);
                const isFinal = ind.indicator_type === 'ตัวชี้วัดปลายทาง';
                return (
                  <label
                    key={ind.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'bg-white border-navy-600 ring-1 ring-navy-600 shadow-sm'
                        : 'bg-white/70 border-ivory-300 hover:border-navy-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIndicator(ind.id)}
                      className="mt-1 rounded text-navy-800 focus:ring-navy-600"
                    />
                    <div className="text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-navy-900">{ind.indicator_code}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isFinal
                              ? 'bg-royal-50 text-royal-700 border-purple-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {ind.indicator_type}
                        </span>
                        <span className="text-[10px] text-slate-400">{ind.grade_level}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{ind.indicator_text}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Score Ratios & Units Builder */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ivory-200 pb-4">
          <div>
            <h3 className="font-semibold text-navy-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-royal-600" />
              กำหนดโครงสร้างคะแนน หน่วยการเรียนรู้ และสัดส่วนคะแนน (รวม 100 คะแนน)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ผูกตัวชี้วัดเข้ากับช่องคะแนนแต่ละช่อง และปรับอัตราส่วน ระหว่างภาค : กลางภาค : ปลายภาค ได้อิสระ
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RATIO_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  formativeRatio === p.formative &&
                  midtermRatio === p.midterm &&
                  finalRatio === p.final
                    ? 'bg-navy-800 text-gold-300 border-navy-800'
                    : 'bg-ivory-100 text-slate-700 border-ivory-300 hover:bg-navy-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-navy-50 border border-navy-200">
            <label className="block text-xs text-navy-800 font-medium">เก็บระหว่างภาค (%)</label>
            <input
              type="number"
              value={formativeRatio}
              onChange={(e) => setFormativeRatio(Number(e.target.value) || 0)}
              className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white font-bold text-navy-900"
            />
          </div>
          <div className="p-3 rounded-xl bg-royal-50 border border-purple-200">
            <label className="block text-xs text-royal-800 font-medium">สอบกลางภาค (%)</label>
            <input
              type="number"
              value={midtermRatio}
              onChange={(e) => setMidtermRatio(Number(e.target.value) || 0)}
              className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white font-bold text-royal-900"
            />
          </div>
          <div className="p-3 rounded-xl bg-gold-50 border border-gold-200">
            <label className="block text-xs text-gold-700 font-medium">สอบปลายภาค (%)</label>
            <input
              type="number"
              value={finalRatio}
              onChange={(e) => setFinalRatio(Number(e.target.value) || 0)}
              className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-gold-200 bg-white font-bold text-gold-700"
            />
          </div>
          <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300">
            <label className="block text-xs text-slate-600 font-medium">เกณฑ์เวลาเรียนขั้นต่ำ (%)</label>
            <input
              type="number"
              value={minAttendancePct}
              onChange={(e) => setMinAttendancePct(Number(e.target.value) || 80)}
              className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
            />
          </div>
          <div
            className={`p-3 rounded-xl border flex flex-col justify-center ${
              ratioSum === 100
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className="text-xs font-medium">สัดส่วนรวม</span>
            <span className="text-xl font-bold">{ratioSum} / 100%</span>
            <label className="inline-flex items-center gap-1.5 text-[11px] mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={requireFinalExam}
                onChange={(e) => setRequireFinalExam(e.target.checked)}
              />
              บังคับสอบปลายภาค (ไม่สอบ = ร)
            </label>
          </div>
        </div>

        {/* Units Table */}
        <div className="space-y-2.5">
          {units.map((u) => (
            <div
              key={u.id}
              className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-xl bg-ivory-50 border border-ivory-300"
            >
              <select
                value={u.category}
                onChange={(e) => updateUnit(u.id, { category: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
              >
                <option value="formative">คะแนนเก็บระหว่างภาค</option>
                <option value="midterm">สอบกลางภาค</option>
                <option value="final">สอบปลายภาค</option>
              </select>

              <input
                type="text"
                value={u.name}
                onChange={(e) => updateUnit(u.id, { name: e.target.value })}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium"
                placeholder="ชื่อหน่วยการเรียนรู้ / ชิ้นงาน"
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">คะแนนเต็ม:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={u.maxScore}
                  onChange={(e) => updateUnit(u.id, { maxScore: Number(e.target.value) || 1 })}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold text-center"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {selectedIndicatorObjects.map((ind) => {
                  const linked = (u.indicatorCodes || []).includes(ind.indicator_code);
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => toggleUnitIndicatorCode(u.id, ind.indicator_code)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                        linked
                          ? 'bg-navy-800 text-gold-300 border-navy-800'
                          : 'bg-white text-slate-500 border-slate-300 hover:bg-navy-50'
                      }`}
                    >
                      {ind.indicator_code}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => removeUnit(u.id)}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 self-end lg:self-center"
                title="ลบช่องคะแนน"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => addUnit('formative')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-800 text-xs font-semibold border border-navy-200"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มหน่วย/ช่องคะแนนเก็บ
            </button>
            <button
              type="button"
              onClick={() => addUnit('midterm')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-royal-50 hover:bg-purple-100 text-royal-800 text-xs font-semibold border border-purple-200"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มช่องสอบกลางภาค
            </button>
            <button
              type="button"
              onClick={() => addUnit('final')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-50 hover:bg-gold-100 text-gold-700 text-xs font-semibold border border-gold-200"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มช่องสอบปลายภาค
            </button>
          </div>
        </div>
      </div>

      {/* Section C: Score Entry Grid & Auto Grading */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-navy-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-gold-400" />
              ตารางกรอกคะแนนและคำนวณเกรดอัตโนมัติ (0 – 4, ร, มส)
            </h3>
            <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
              {Object.entries(gradeSummary).map(([g, cnt]) => (
                <span key={g} className="px-2 py-0.5 rounded bg-white/10 text-gold-200">
                  เกรด {g}: <b>{cnt}</b>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-sm shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            บันทึกโครงสร้างและคะแนนทั้งหมด
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
              <tr>
                <th className="py-3 px-3 text-center">ที่</th>
                <th className="py-3 px-3 text-left min-w-[170px]">ชื่อ - สกุล</th>
                {units.map((u) => (
                  <th key={u.id} className="py-2 px-2 text-center min-w-[100px] border-l border-ivory-200">
                    <div className="font-semibold line-clamp-1">{u.name}</div>
                    <div className="text-[11px] text-slate-500">เต็ม {u.maxScore}</div>
                  </th>
                ))}
                <th className="py-2 px-2 text-center bg-navy-50 border-l border-ivory-300">
                  เก็บ ({formativeRatio})
                </th>
                <th className="py-2 px-2 text-center bg-royal-50">
                  กลาง ({midtermRatio})
                </th>
                <th className="py-2 px-2 text-center bg-gold-50">
                  ปลาย ({finalRatio})
                </th>
                <th className="py-2 px-3 text-center bg-navy-100 font-bold">รวม (100)</th>
                <th className="py-2 px-3 text-center bg-navy-100 font-bold">เกรด</th>
                <th className="py-2 px-2 text-center">สถานะพิเศษ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {computedStudents.map(({ student, draft, computed }, idx) => {
                const isFailOrSpecial = ['0', 'ร', 'มส'].includes(computed.grade);
                return (
                  <tr key={student.id} className="hover:bg-ivory-50">
                    <td className="py-2 px-3 text-center text-slate-600">
                      {student.student_number || idx + 1}
                    </td>
                    <td className="py-2 px-3 font-medium text-navy-900">
                      {getFullStudentName(student)}
                    </td>
                    {units.map((u) => (
                      <td key={u.id} className="py-1.5 px-2 text-center border-l border-ivory-200">
                        <input
                          type="number"
                          min={0}
                          max={u.maxScore}
                          step="0.5"
                          value={draft.unit_scores?.[u.id] ?? ''}
                          onChange={(e) =>
                            handleScoreInputChange(student.id, u.id, u.maxScore, e.target.value)
                          }
                          className="w-16 text-center py-1 px-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-navy-700 font-medium"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center bg-navy-50/40 font-medium border-l border-ivory-200">
                      {computed.formativeTotal}
                    </td>
                    <td className="py-2 px-2 text-center bg-royal-50/40 font-medium">
                      {computed.midtermTotal}
                    </td>
                    <td className="py-2 px-2 text-center bg-gold-50/40 font-medium">
                      {computed.finalTotal}
                    </td>
                    <td className="py-2 px-3 text-center bg-navy-100/40 font-bold text-navy-900">
                      {computed.totalScore}
                    </td>
                    <td className="py-2 px-3 text-center bg-navy-100/40">
                      <span
                        className={`inline-block min-w-[36px] px-2 py-0.5 rounded-lg font-bold text-xs ${
                          isFailOrSpecial
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {computed.grade}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={draft.special_status || ''}
                        onChange={(e) => handleSpecialStatusChange(student.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg py-1 px-1.5 bg-white"
                      >
                        <option value="">อัตโนมัติ</option>
                        <option value="ร">บังคับ ร</option>
                        <option value="มส">บังคับ มส</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
