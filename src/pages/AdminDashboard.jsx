import React, { useMemo, useState } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  BookMarked,
  Upload,
  Download,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  ImagePlus,
  PlugZap,
} from 'lucide-react';
import { useSchoolData } from '../hooks/useSchoolData';
import { useAuth } from '../hooks/useAuth';
import { useSubjectImport } from '../hooks/useSubjectImport';
import { compressImageToDataUrl } from '../lib/mediaUtils';
import { parseStudentsFile, downloadStudentTemplate } from '../services/studentImportExport';
import { exportCurriculumStructureToExcel } from '../services/subjectImportAdapter';
import { getOfficialSchoolCurriculumCatalog } from '../data/schoolCurriculumCatalog';
import { GRADE_LEVELS, LEARNING_AREAS, getFullStudentName, inferSubjectType } from '../lib/thaiFormatting';

export function AdminDashboard() {
  const { isLiveBackend } = useAuth();
  const {
    settings,
    users,
    students,
    subjects,
    indicators,
    schemaMeta,
    updateSettings,
    saveUser,
    deleteUser,
    upsertStudents,
    deleteStudent,
    upsertSubjects,
    deleteSubject,
    upsertIndicator,
    seedDatabase,
    resetDemo,
  } = useSchoolData();

  const [activeTab, setActiveTab] = useState('settings');
  const [statusMsg, setStatusMsg] = useState('');
  const [seedingLive, setSeedingLive] = useState(false);

  // Tab 1: System Settings State
  const [settingsForm, setSettingsForm] = useState(settings);
  const [uploadingAsset, setUploadingAsset] = useState('');

  // Tab 2: Users State
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    initial_password: '',
    position: 'ครู',
    academic_standing: '',
    role: 'teacher',
    learning_area: 'ภาษาไทย',
  });

  // Tab 3: Students State & Bulk Import
  const [studentGradeFilter, setStudentGradeFilter] = useState('ทั้งหมด');
  const [newStudent, setNewStudent] = useState({
    student_code: '',
    prefix: 'เด็กชาย',
    first_name: '',
    last_name: '',
    gender: 'ช',
    grade_level: 'ป.4',
    classroom: '1',
    student_number: 1,
    academic_year: settings?.academic_year || '2569',
    status: 'active',
  });
  const [studentPreview, setStudentPreview] = useState([]);
  const [studentImportErrors, setStudentImportErrors] = useState([]);

  // Tab 4: Subjects Manual + Excel Import Hook
  const [subjectGradeFilter, setSubjectGradeFilter] = useState('ทั้งหมด');
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState('ทั้งหมด');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subject_code: '',
    subject_name: '',
    learning_area: 'ภาษาไทย',
    grade_level: 'ป.4',
    subject_type: 'พื้นฐาน',
    semester: '1',
    credits: 1.0,
    hours_per_semester: 40,
    hours_per_year: 80,
    hours_per_week: 2.0,
    sort_order: 1,
  });

  const subjectImporter = useSubjectImport(async (list) => {
    await upsertSubjects(list);
  });

  // Tab 5: Indicator creation
  const [newIndicator, setNewIndicator] = useState({
    indicator_code: '',
    learning_area: 'คณิตศาสตร์',
    strand: 'สาระที่ 1',
    standard_code: 'ค 1.1',
    standard_text: '',
    grade_level: 'ป.4',
    indicator_type: 'ตัวชี้วัดระหว่างทาง',
    indicator_text: '',
  });

  const notify = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setUploadingAsset(field);
    try {
      const res = await compressImageToDataUrl(file, field);
      if (res.error) {
        notify(`บันทึกภาพไม่สำเร็จ: ${res.error}`);
      } else {
        const next = { ...settingsForm, [field]: res.url };
        setSettingsForm(next);
        await updateSettings({ [field]: res.url });
        notify('บีบอัดและบันทึกไฟล์ภาพเข้าสู่ระบบเรียบร้อย');
      }
    } finally {
      setUploadingAsset('');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await updateSettings(settingsForm);
    notify('บันทึกข้อมูลพื้นฐานโรงเรียนและการตั้งค่าหน้าปกเรียบร้อย');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.full_name || !newUser.email) return;
    const saved = await saveUser({ ...newUser, is_active: true });
    const hadPassword = Boolean(newUser.initial_password?.trim());
    setNewUser({
      full_name: '',
      email: '',
      initial_password: '',
      position: 'ครู',
      academic_standing: '',
      role: 'teacher',
      learning_area: 'ภาษาไทย',
    });
    if (saved?.__authWarning) {
      notify(`บันทึกสิทธิ์ใน Turso SQL แล้ว (คำเตือน: ${saved.__authWarning})`);
    } else if (hadPassword && isLiveBackend) {
      notify('บันทึกสิทธิ์และตั้งรหัสผ่านในฐานข้อมูล Turso SQL เรียบร้อย');
    } else {
      notify('บันทึกบัญชีผู้ใช้งานเรียบร้อย');
    }
  };

  const handleSeedLiveDatabase = async () => {
    setSeedingLive(true);
    try {
      await seedDatabase();
      notify('ซิงค์ข้อมูลตั้งต้น (136 วิชา, นักเรียน, ตัวชี้วัด และ ปพ.5 ตัวอย่าง) เข้าสู่ Turso SQL สำเร็จ');
    } catch (err) {
      notify(`ซิงค์ข้อมูลไม่สำเร็จ: ${err?.message || 'ตรวจสอบสิทธิ์ Admin / การเชื่อมต่อ Turso'}`);
    } finally {
      setSeedingLive(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.student_code || !newStudent.first_name) return;
    await upsertStudents([newStudent]);
    setNewStudent({ ...newStudent, student_code: '', first_name: '', last_name: '' });
    notify('เพิ่มข้อมูลนักเรียนเข้าสู่ฐานข้อมูลส่วนกลางแล้ว');
  };

  const handleStudentFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await parseStudentsFile(file, settings?.academic_year || '2569');
    setStudentPreview(res.students);
    setStudentImportErrors(res.errors);
  };

  const handleCommitStudentImport = async () => {
    if (!studentPreview.length) return;
    await upsertStudents(studentPreview);
    const count = studentPreview.length;
    setStudentPreview([]);
    setStudentImportErrors([]);
    notify(`นำเข้านักเรียนจำนวน ${count} คน เข้าสู่ฐานข้อมูลส่วนกลางสำเร็จ`);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.subject_code || !newSubject.subject_name) return;
    await upsertSubjects([
      {
        ...newSubject,
        subject_code: newSubject.subject_code.trim(),
        subject_name: newSubject.subject_name.trim(),
      },
    ]);
    setNewSubject({ ...newSubject, subject_code: '', subject_name: '' });
    notify('เพิ่มรหัสวิชาเข้าสู่ฐานข้อมูลกลางเรียบร้อย');
  };

  const handleCommitSubjectImport = async () => {
    const count = await subjectImporter.commitImport();
    if (count > 0) notify(`นำเข้ารหัสวิชาจำนวน ${count} รายวิชา เข้าสู่ฐานข้อมูลกลางสำเร็จ`);
  };

  const handleLoadOfficialCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const catalog = getOfficialSchoolCurriculumCatalog();
      await upsertSubjects(catalog);
      notify(`โหลดโครงสร้างหลักสูตร รร.บ้านหาดเค็ด (${catalog.length} รายวิชา อ.3–ม.3 ตามไฟล์ต้นแบบ ref/) สำเร็จ`);
    } catch (err) {
      notify(`ไม่สามารถโหลดโครงสร้างหลักสูตรได้: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleExportCurriculum = () => {
    exportCurriculumStructureToExcel(subjects, settings);
    notify('ส่งออกไฟล์โครงสร้างรายวิชา (.xlsx) เรียบร้อย');
  };

  const handleAddIndicator = async (e) => {
    e.preventDefault();
    if (!newIndicator.indicator_code || !newIndicator.indicator_text) return;
    await upsertIndicator(newIndicator);
    setNewIndicator({ ...newIndicator, indicator_code: '', indicator_text: '' });
    notify('เพิ่มมาตรฐาน/ตัวชี้วัดเข้าคลังหลักสูตรเรียบร้อย');
  };

  const filteredStudents = students.filter(
    (s) => studentGradeFilter === 'ทั้งหมด' || s.grade_level === studentGradeFilter
  );

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((s) => {
        if (subjectGradeFilter !== 'ทั้งหมด' && s.grade_level !== subjectGradeFilter) return false;
        const sem = String(s.semester || '1-2');
        if (subjectSemesterFilter === '1') return sem === '1' || sem === '1-2' || sem === 'ตลอดปี';
        if (subjectSemesterFilter === '2') return sem === '2' || sem === '1-2' || sem === 'ตลอดปี';
        if (subjectSemesterFilter === '1-2') return sem === '1-2' || sem === 'ตลอดปี';
        return true;
      })
      .sort((a, b) => {
        const ga = GRADE_LEVELS.indexOf(a.grade_level);
        const gb = GRADE_LEVELS.indexOf(b.grade_level);
        if (ga !== gb) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb);
        const oa = Number(a.sort_order || 999);
        const ob = Number(b.sort_order || 999);
        if (oa !== ob) return oa - ob;
        return String(a.subject_code || '').localeCompare(String(b.subject_code || ''));
      });
  }, [subjects, subjectGradeFilter, subjectSemesterFilter]);

  const curriculumSummaryByGrade = useMemo(() => {
    const map = new Map();
    for (const g of GRADE_LEVELS) {
      map.set(g, { grade: g, count: 0, basicCount: 0, addCount: 0, creditsSum: 0, hoursSemSum: 0, hoursYearSum: 0 });
    }
    for (const s of subjects) {
      const g = s.grade_level;
      if (!map.has(g)) {
        map.set(g, { grade: g, count: 0, basicCount: 0, addCount: 0, creditsSum: 0, hoursSemSum: 0, hoursYearSum: 0 });
      }
      const entry = map.get(g);
      const sType = s.subject_type || inferSubjectType(s.subject_code, s.subject_name);
      const hrsSem = Number(s.hours_per_semester || 0);
      const hrsYear = Number(s.hours_per_year || (String(s.semester || '') === '1-2' ? hrsSem * 2 : hrsSem) || 0);
      entry.count += 1;
      if (sType === 'เพิ่มเติม') entry.addCount += 1;
      else entry.basicCount += 1;
      entry.creditsSum += Number(s.credits || 0);
      entry.hoursSemSum += hrsSem;
      entry.hoursYearSum += hrsYear;
    }
    return Array.from(map.values()).filter((g) => g.count > 0 || ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'].includes(g.grade));
  }, [subjects]);

  const tabs = [
    { id: 'settings', label: '1. ข้อมูลโรงเรียน & รูปภาพ', icon: Building2 },
    { id: 'users', label: '2. บัญชีผู้ใช้งาน', icon: Users },
    { id: 'students', label: '3. นักเรียนส่วนกลาง & Import', icon: GraduationCap },
    { id: 'subjects', label: '4. โครงสร้างรายวิชา & Import Excel', icon: BookMarked },
    { id: 'indicators', label: '5. คลังตัวชี้วัด 2551/สพฐ.', icon: Sparkles },
    { id: 'hooks', label: '6. สถานะไฟล์อ้างอิง & Hooks', icon: PlugZap },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-navy-900 via-royal-900 to-navy-800 text-white p-6 shadow-academic border border-gold-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-royal-500/30 text-purple-100 border border-purple-300/40">
            Admin Console • เส้นทาง /admin
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            ศูนย์จัดการฐานข้อมูลกลางและตั้งค่าระบบ ปพ.5
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
            จัดการข้อมูลโรงเรียน โลโก้ (Turso SQL Data URL) บัญชีผู้ใช้ นักเรียนส่วนกลาง และรหัสวิชาจากไฟล์ Excel
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-center">
          {isLiveBackend && (
            <button
              type="button"
              disabled={seedingLive}
              onClick={handleSeedLiveDatabase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-200 text-xs font-semibold border border-gold-400/40 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seedingLive ? 'animate-spin' : ''}`} />
              {seedingLive
                ? 'กำลังซิงค์เข้า Turso SQL...'
                : schemaMeta?.isSeeded
                ? 'เติมข้อมูลตั้งต้น/หลักสูตร (Turso SQL)'
                : 'ติดตั้งข้อมูลตั้งต้นเข้า Turso SQL'}
            </button>
          )}
          {!isLiveBackend && (
            <button
              type="button"
              onClick={() => {
                resetDemo();
                notify('รีเซ็ตข้อมูลสาธิตกลับสู่ค่าเริ่มต้นแล้ว');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium border border-white/20"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเซ็ตข้อมูลสาธิต
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                activeTab === t.id
                  ? 'bg-navy-800 text-gold-300 border-navy-800 shadow-sm'
                  : 'bg-white text-slate-700 border-ivory-300 hover:bg-navy-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: System Settings & Compressed Image Data URLs */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อสถานศึกษา</label>
              <input
                type="text"
                value={settingsForm.school_name || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, school_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">สังกัด (เต็ม)</label>
              <input
                type="text"
                value={settingsForm.affiliation || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, affiliation: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ปีการศึกษาปัจจุบัน</label>
              <input
                type="text"
                value={settingsForm.academic_year || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, academic_year: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ภาคเรียนปัจจุบัน</label>
              <select
                value={settingsForm.semester || '1'}
                onChange={(e) => setSettingsForm({ ...settingsForm, semester: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-สกุล ผู้อำนวยการโรงเรียน</label>
              <input
                type="text"
                value={settingsForm.director_name || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, director_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">หัวหน้างานวิชาการ / นายทะเบียน</label>
              <input
                type="text"
                value={settingsForm.academic_head_name || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    academic_head_name: e.target.value,
                    registrar_name: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* Compressed Image Upload Cards (Stored directly in Turso SQL - zero paid storage required) */}
          <div className="border-t border-ivory-200 pt-5">
            <h4 className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-royal-600" />
              จัดการไฟล์ภาพโลโก้ ตราครุฑ และลายเซ็น (บีบอัด Data URL เก็บใน Turso SQL)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'logo_url', title: 'โลโก้โรงเรียนบ้านหาดเค็ด' },
                { key: 'emblem_url', title: 'ตราครุฑ / สัญลักษณ์หน้าปก' },
                { key: 'director_signature_url', title: 'ลายเซ็นดิจิทัลผู้อำนวยการ' },
              ].map((item) => (
                <div key={item.key} className="p-4 rounded-2xl bg-ivory-50 border border-ivory-300 space-y-2">
                  <p className="text-xs font-semibold text-navy-900">{item.title}</p>
                  {settingsForm[item.key] ? (
                    <img
                      src={settingsForm[item.key]}
                      alt={item.title}
                      className="h-20 mx-auto object-contain rounded-lg bg-white p-1 border"
                    />
                  ) : (
                    <div className="h-20 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      ยังไม่อัปโหลดภาพ
                    </div>
                  )}
                  <label className="block">
                    <span className="inline-flex w-full justify-center items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-800 text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingAsset === item.key ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ภาพ'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(item.key, e.target.files?.[0])}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 font-semibold text-sm shadow-sm"
            >
              <Save className="w-4 h-4" /> บันทึกการตั้งค่าระบบ
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-2xl border border-ivory-300 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ - สกุล</label>
              <input
                type="text"
                required
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="เช่น นางสาวกานดา ภูเพียง"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมล</label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="teacher@banhatkhet.ac.th"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">บทบาท (Role)</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                <option value="teacher">ครูผู้สอน</option>
                <option value="executive">ผู้บริหาร</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่มสาระฯ</label>
              <select
                value={newUser.learning_area}
                onChange={(e) => setNewUser({ ...newUser, learning_area: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                {LEARNING_AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            {isLiveBackend && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  รหัสผ่านเริ่มต้น (ไม่บังคับ)
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={newUser.initial_password || ''}
                  onChange={(e) => setNewUser({ ...newUser, initial_password: e.target.value })}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            )}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-ivory-100 text-navy-900 border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4 text-left">ชื่อ - สกุล</th>
                  <th className="py-3 px-4 text-left">อีเมล</th>
                  <th className="py-3 px-3 text-center">บทบาท</th>
                  <th className="py-3 px-4 text-left">กลุ่มสาระฯ / ตำแหน่ง</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-ivory-50">
                    <td className="py-2.5 px-4 font-semibold text-navy-900">{u.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-navy-50 text-navy-800 border border-navy-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">
                      {u.position} {u.academic_standing} • {u.learning_area}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Central Student Database + Excel/CSV Import */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Bulk Import Panel */}
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-navy-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  นำเข้าข้อมูลนักเรียนจำนวนมาก (Excel .xlsx / CSV .csv)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ข้อมูลนักเรียนส่วนกลางจะถูกดึงไปใช้ในสมุด ปพ.5 ของครูผู้สอนอัตโนมัติทุกวิชา
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadStudentTemplate('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Template Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => downloadStudentTemplate('csv')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Template CSV (.csv)
                </button>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> เลือกไฟล์นักเรียนเพื่อ Import
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleStudentFileSelect}
                  />
                </label>
              </div>
            </div>

            {studentImportErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-1">
                {studentImportErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}

            {studentPreview.length > 0 && (
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-900">
                    พร้อมนำเข้า {studentPreview.length} คน (ตรวจสอบก่อนบันทึก)
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitStudentImport}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    ยืนยันบันทึกลงฐานกลาง
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto bg-white rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="py-1.5 px-3 text-left">รหัส</th>
                        <th className="py-1.5 px-3 text-left">ชื่อ - สกุล</th>
                        <th className="py-1.5 px-3 text-center">ชั้น/ห้อง</th>
                        <th className="py-1.5 px-3 text-center">เลขที่</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {studentPreview.slice(0, 30).map((s, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-mono">{s.student_code}</td>
                          <td className="py-1.5 px-3">{getFullStudentName(s)}</td>
                          <td className="py-1.5 px-3 text-center">{s.grade_level}/{s.classroom}</td>
                          <td className="py-1.5 px-3 text-center">{s.student_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Add Single Student */}
          <form
            onSubmit={handleAddStudent}
            className="bg-white rounded-2xl border border-ivory-300 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">รหัสนักเรียน</label>
              <input
                type="text"
                required
                value={newStudent.student_code}
                onChange={(e) => setNewStudent({ ...newStudent, student_code: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">คำนำหน้า</label>
              <select
                value={newStudent.prefix}
                onChange={(e) => setNewStudent({ ...newStudent, prefix: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              >
                <option value="เด็กชาย">เด็กชาย</option>
                <option value="เด็กหญิง">เด็กหญิง</option>
                <option value="นาย">นาย</option>
                <option value="นางสาว">นางสาว</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ</label>
              <input
                type="text"
                required
                value={newStudent.first_name}
                onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">นามสกุล</label>
              <input
                type="text"
                required
                value={newStudent.last_name}
                onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ระดับชั้น</label>
              <select
                value={newStudent.grade_level}
                onChange={(e) => setNewStudent({ ...newStudent, grade_level: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ห้อง</label>
              <input
                type="text"
                value={newStudent.classroom}
                onChange={(e) => setNewStudent({ ...newStudent, classroom: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">เลขที่</label>
              <input
                type="number"
                value={newStudent.student_number}
                onChange={(e) => setNewStudent({ ...newStudent, student_number: Number(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm text-center"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-navy-800 text-gold-300 text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> เพิ่มนักเรียน
            </button>
          </form>

          {/* Student List */}
          <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-ivory-100 border-b border-ivory-300 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy-900">
                รายชื่อนักเรียนในฐานข้อมูล ({filteredStudents.length} คน)
              </span>
              <select
                value={studentGradeFilter}
                onChange={(e) => setStudentGradeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white"
              >
                <option value="ทั้งหมด">ทุกระดับชั้น</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 text-left">รหัสนักเรียน</th>
                    <th className="py-2.5 px-3 text-center">ชั้น/ห้อง</th>
                    <th className="py-2.5 px-3 text-center">เลขที่</th>
                    <th className="py-2.5 px-4 text-left">ชื่อ - สกุล</th>
                    <th className="py-2.5 px-3 text-center">เพศ</th>
                    <th className="py-2.5 px-4 text-right">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-ivory-50">
                      <td className="py-2 px-4 font-mono text-xs">{stu.student_code}</td>
                      <td className="py-2 px-3 text-center font-semibold">{stu.grade_level}/{stu.classroom}</td>
                      <td className="py-2 px-3 text-center">{stu.student_number}</td>
                      <td className="py-2 px-4 font-medium text-navy-900">{getFullStudentName(stu)}</td>
                      <td className="py-2 px-3 text-center">{stu.gender}</td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteStudent(stu.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Subjects + Curriculum Structure + Excel Import [Hook 1] */}
      {activeTab === 'subjects' && (
        <div className="space-y-5">
          {/* Per-Grade Curriculum Summary Bar */}
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-navy-900 flex items-center gap-2 text-sm">
                  <BookMarked className="w-4 h-4 text-royal-600" />
                  โครงสร้างรายวิชาแยกตามระดับชั้น (อ้างอิงหลักสูตรโรงเรียนบ้านหาดเค็ด)
                </h3>
                <p className="text-xs text-slate-500">
                  ประถมศึกษา (ป.1–ป.6): เกณฑ์ 460 ชม./ภาค (920 ชม./ปี) • มัธยมศึกษา (ม.1–ม.3): พื้นฐาน + เพิ่มเติม รวมหน่วยกิต
                </p>
              </div>
              {subjectGradeFilter !== 'ทั้งหมด' && (
                <button
                  type="button"
                  onClick={() => setSubjectGradeFilter('ทั้งหมด')}
                  className="text-xs font-semibold text-royal-700 hover:underline self-start sm:self-auto"
                >
                  แสดงทุกระดับชั้น ({subjects.length} วิชา)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {curriculumSummaryByGrade.map((g) => {
                const isSelected = subjectGradeFilter === g.grade;
                return (
                  <button
                    key={g.grade}
                    type="button"
                    onClick={() => setSubjectGradeFilter(isSelected ? 'ทั้งหมด' : g.grade)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-ivory-50 hover:bg-ivory-100 border-ivory-300 text-navy-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{g.grade}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-gold-500 text-navy-950' : 'bg-white text-slate-600 border border-ivory-300'}`}>
                        {g.count} วิชา
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 ${isSelected ? 'text-ivory-200' : 'text-slate-600'}`}>
                      พื้นฐาน {g.basicCount} / เพิ่มเติม {g.addCount}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-gold-300' : 'text-royal-700'}`}>
                      {g.grade.startsWith('ม.')
                        ? `${g.creditsSum.toFixed(1)} นก.`
                        : `${g.hoursSemSum} ชม./ภาค (${g.hoursYearSum} ชม./ปี)`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Excel Import + Curriculum Actions */}
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-navy-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-royal-600" />
                  นำเข้า / ส่งออก โครงสร้างรายวิชาและรหัสวิชาจาก Excel (.xlsx / .xls / .csv)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รองรับไฟล์ต้นแบบ ปพ.5 ประถม (แยกชีท ป.1–ป.6), ประกาศผลสอบ ม.1–ม.3 (ชีท แม่แบบ) และตารางรหัสวิชามาตรฐาน
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleLoadOfficialCatalog}
                  disabled={loadingCatalog}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-xs font-semibold disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? 'animate-spin' : ''}`} />
                  โหลดโครงสร้างหลักสูตรโรงเรียน (จาก ref/)
                </button>
                <button
                  type="button"
                  onClick={handleExportCurriculum}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> ส่งออกโครงสร้าง (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={subjectImporter.downloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> ดาวน์โหลดเทมเพลตนำเข้า
                </button>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {subjectImporter.parsing ? 'กำลังวิเคราะห์ไฟล์...' : 'อัปโหลดไฟล์ Excel รหัสวิชา'}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => subjectImporter.handleFileChange(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            {subjectImporter.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {subjectImporter.errors.map((err, idx) => (
                  <div key={idx}>{err}</div>
                ))}
              </div>
            )}

            {subjectImporter.previewSubjects.length > 0 && (
              <div className="border border-purple-200 bg-royal-50/40 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-royal-900">
                      พบ {subjectImporter.previewSubjects.length} รายวิชาพร้อมนำเข้า
                    </span>
                    {subjectImporter.detectedFormat && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
                        {subjectImporter.detectedFormat === 'banhatkhet_primary_report'
                          ? 'รูปแบบ ปพ.5 ประถม (HK @ 1 ปีกศ 69)'
                          : subjectImporter.detectedFormat === 'banhatkhet_secondary_template'
                          ? 'รูปแบบประกาศผล ม.1–ม.3 (แม่แบบ)'
                          : 'รูปแบบตารางรหัสวิชามาตรฐาน'}
                      </span>
                    )}
                    {subjectImporter.sheetNames.length > 1 && (
                      <select
                        value={subjectImporter.activeSheet}
                        onChange={(e) => subjectImporter.switchSheet(e.target.value)}
                        className="px-2.5 py-1 rounded-lg border bg-white text-xs font-semibold text-navy-900"
                      >
                        <option value="__ALL__">รวมทุกชีทหลักสูตร ({subjectImporter.sheetNames.length} ชีท)</option>
                        {subjectImporter.sheetNames.map((name) => (
                          <option key={name} value={name}>เฉพาะชีท: {name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCommitSubjectImport}
                    disabled={subjectImporter.importing}
                    className="px-4 py-2 rounded-xl bg-royal-700 hover:bg-royal-800 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {subjectImporter.importing ? 'กำลังบันทึก...' : 'ยืนยันนำเข้าโครงสร้างรายวิชาทั้งหมด'}
                  </button>
                </div>

                {subjectImporter.gradeBreakdown && Object.keys(subjectImporter.gradeBreakdown).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(subjectImporter.gradeBreakdown).map(([grade, count]) => (
                      <span
                        key={grade}
                        className="px-2 py-0.5 rounded-lg bg-white border border-royal-200 text-[11px] font-semibold text-navy-800"
                      >
                        {grade}: {count} วิชา
                      </span>
                    ))}
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto bg-white rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3 text-left">รหัสวิชา</th>
                        <th className="py-1.5 px-3 text-left">ชื่อวิชา</th>
                        <th className="py-1.5 px-3 text-left">กลุ่มสาระฯ</th>
                        <th className="py-1.5 px-2 text-center">ประเภท</th>
                        <th className="py-1.5 px-2 text-center">ชั้น</th>
                        <th className="py-1.5 px-2 text-center">ภาคเรียน</th>
                        <th className="py-1.5 px-2 text-center">นก.</th>
                        <th className="py-1.5 px-2 text-center">ชม./ภาค</th>
                        <th className="py-1.5 px-2 text-center">ชม./ปี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subjectImporter.previewSubjects.map((sub, i) => {
                        const sType = sub.subject_type || inferSubjectType(sub.subject_code, sub.subject_name);
                        return (
                          <tr key={i}>
                            <td className="py-1.5 px-3 font-bold text-navy-900">{sub.subject_code}</td>
                            <td className="py-1.5 px-3">{sub.subject_name}</td>
                            <td className="py-1.5 px-3 text-slate-600">{sub.learning_area}</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sType === 'เพิ่มเติม' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                                {sType}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center font-semibold">{sub.grade_level}</td>
                            <td className="py-1.5 px-2 text-center">{sub.semester || '1-2'}</td>
                            <td className="py-1.5 px-2 text-center">{sub.credits}</td>
                            <td className="py-1.5 px-2 text-center">{sub.hours_per_semester}</td>
                            <td className="py-1.5 px-2 text-center">{sub.hours_per_year || sub.hours_per_semester}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Add Single Subject */}
          <form
            onSubmit={handleAddSubject}
            className="bg-white rounded-2xl border border-ivory-300 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2.5 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">รหัสวิชา</label>
              <input
                type="text"
                required
                value={newSubject.subject_code}
                onChange={(e) => setNewSubject({ ...newSubject, subject_code: e.target.value })}
                placeholder="ท14101"
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อวิชา</label>
              <input
                type="text"
                required
                value={newSubject.subject_name}
                onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border text-sm"
              />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">กลุ่มสาระฯ</label>
              <select
                value={newSubject.learning_area}
                onChange={(e) => setNewSubject({ ...newSubject, learning_area: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
              >
                {LEARNING_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ประเภท</label>
              <select
                value={newSubject.subject_type}
                onChange={(e) => setNewSubject({ ...newSubject, subject_type: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
              >
                <option value="พื้นฐาน">พื้นฐาน</option>
                <option value="เพิ่มเติม">เพิ่มเติม</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ระดับชั้น</label>
              <select
                value={newSubject.grade_level}
                onChange={(e) => setNewSubject({ ...newSubject, grade_level: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border text-sm"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ภาคเรียน</label>
              <select
                value={newSubject.semester}
                onChange={(e) => setNewSubject({ ...newSubject, semester: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="1-2">1-2</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">หน่วยกิต</label>
              <input
                type="number"
                step="0.5"
                value={newSubject.credits}
                onChange={(e) => setNewSubject({ ...newSubject, credits: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชม./ภาค</label>
              <input
                type="number"
                value={newSubject.hours_per_semester}
                onChange={(e) =>
                  setNewSubject({
                    ...newSubject,
                    hours_per_semester: Number(e.target.value),
                    hours_per_year: newSubject.semester === '1-2' ? Number(e.target.value) * 2 : Number(e.target.value),
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg border text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชม./ปี</label>
              <input
                type="number"
                value={newSubject.hours_per_year}
                onChange={(e) => setNewSubject({ ...newSubject, hours_per_year: Number(e.target.value) })}
                className="w-full px-2 py-1.5 rounded-lg border text-sm text-center"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-navy-800 text-gold-300 text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> เพิ่มวิชา
            </button>
          </form>

          {/* Subjects Table */}
          <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-ivory-100 border-b border-ivory-300 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-navy-900">
                ฐานข้อมูลโครงสร้างรหัสวิชา ({filteredSubjects.length} รายวิชา)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={subjectGradeFilter}
                  onChange={(e) => setSubjectGradeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white"
                >
                  <option value="ทั้งหมด">ทุกระดับชั้น</option>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={subjectSemesterFilter}
                  onChange={(e) => setSubjectSemesterFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white"
                >
                  <option value="ทั้งหมด">ทุกภาคเรียน</option>
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                  <option value="1-2">ตลอดปี (1-2)</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">ที่</th>
                    <th className="py-2.5 px-3 text-left">รหัสวิชา</th>
                    <th className="py-2.5 px-3 text-left">ชื่อรายวิชา</th>
                    <th className="py-2.5 px-3 text-left">กลุ่มสาระฯ</th>
                    <th className="py-2.5 px-2 text-center">ประเภท</th>
                    <th className="py-2.5 px-2 text-center">ชั้น</th>
                    <th className="py-2.5 px-2 text-center">เทอม</th>
                    <th className="py-2.5 px-2 text-center">หน่วยกิต</th>
                    <th className="py-2.5 px-2 text-center">ชม./ภาค</th>
                    <th className="py-2.5 px-2 text-center">ชม./ปี</th>
                    <th className="py-2.5 px-3 text-right">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {filteredSubjects.map((sub, idx) => {
                    const sType = sub.subject_type || inferSubjectType(sub.subject_code, sub.subject_name);
                    return (
                      <tr key={sub.id || `${sub.subject_code}-${sub.grade_level}-${idx}`} className="hover:bg-ivory-50">
                        <td className="py-2 px-3 text-center text-xs text-slate-400">{sub.sort_order || idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-navy-900">{sub.subject_code}</td>
                        <td className="py-2 px-3 font-medium">{sub.subject_name}</td>
                        <td className="py-2 px-3 text-xs text-slate-600">{sub.learning_area}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sType === 'เพิ่มเติม' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                            {sType}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-semibold">{sub.grade_level}</td>
                        <td className="py-2 px-2 text-center text-xs">{sub.semester || '1-2'}</td>
                        <td className="py-2 px-2 text-center">{sub.credits}</td>
                        <td className="py-2 px-2 text-center">{sub.hours_per_semester} ชม.</td>
                        <td className="py-2 px-2 text-center text-slate-600">{sub.hours_per_year || sub.hours_per_semester} ชม.</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteSubject(sub.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {subjectGradeFilter !== 'ทั้งหมด' && filteredSubjects.length > 0 && (
                  <tfoot className="bg-navy-50/70 border-t-2 border-navy-200 font-bold text-xs text-navy-900">
                    <tr>
                      <td colSpan={7} className="py-2.5 px-4 text-right">
                        รวมโครงสร้างหลักสูตรชั้น {subjectGradeFilter} ({filteredSubjects.length} รายวิชา):
                      </td>
                      <td className="py-2.5 px-2 text-center text-royal-800">
                        {filteredSubjects.reduce((s, r) => s + Number(r.credits || 0), 0).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-center text-emerald-800">
                        {filteredSubjects.reduce((s, r) => s + Number(r.hours_per_semester || 0), 0)} ชม.
                      </td>
                      <td className="py-2.5 px-2 text-center text-navy-800">
                        {filteredSubjects.reduce((s, r) => s + Number(r.hours_per_year || r.hours_per_semester || 0), 0)} ชม.
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Curriculum Indicators Bank */}
      {activeTab === 'indicators' && (
        <div className="space-y-5">
          <form
            onSubmit={handleAddIndicator}
            className="bg-white rounded-2xl border border-ivory-300 p-5 space-y-3"
          >
            <h3 className="font-semibold text-navy-900 text-sm">
              เพิ่มมาตรฐานการเรียนรู้และตัวชี้วัดเข้าคลังหลักสูตร (ระหว่างทาง / ปลายทาง)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <input
                type="text"
                required
                placeholder="รหัสตัวชี้วัด เช่น ค 1.1 ป.4/5"
                value={newIndicator.indicator_code}
                onChange={(e) => setNewIndicator({ ...newIndicator, indicator_code: e.target.value })}
                className="px-3 py-2 rounded-xl border"
              />
              <select
                value={newIndicator.learning_area}
                onChange={(e) => setNewIndicator({ ...newIndicator, learning_area: e.target.value })}
                className="px-3 py-2 rounded-xl border"
              >
                {LEARNING_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select
                value={newIndicator.grade_level}
                onChange={(e) => setNewIndicator({ ...newIndicator, grade_level: e.target.value })}
                className="px-3 py-2 rounded-xl border"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={newIndicator.indicator_type}
                onChange={(e) => setNewIndicator({ ...newIndicator, indicator_type: e.target.value })}
                className="px-3 py-2 rounded-xl border"
              >
                <option value="ตัวชี้วัดระหว่างทาง">ตัวชี้วัดระหว่างทาง</option>
                <option value="ตัวชี้วัดปลายทาง">ตัวชี้วัดปลายทาง</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="คำอธิบายตัวชี้วัด..."
                value={newIndicator.indicator_text}
                onChange={(e) => setNewIndicator({ ...newIndicator, indicator_text: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-navy-800 text-gold-300 text-sm font-semibold"
              >
                + เพิ่มตัวชี้วัด
              </button>
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-ivory-300 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-ivory-100 border-b font-semibold text-sm text-navy-900">
              คลังตัวชี้วัดทั้งหมดในระบบ ({indicators.length} ตัวชี้วัด)
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-ivory-200">
              {indicators.map((ind) => (
                <div key={ind.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-navy-900 text-sm">{ind.indicator_code}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-800 border">
                        {ind.learning_area} • {ind.grade_level}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          ind.indicator_type === 'ตัวชี้วัดปลายทาง'
                            ? 'bg-royal-100 text-royal-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {ind.indicator_type}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">{ind.indicator_text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 3 Reference Files Integration Hooks */}
      {activeTab === 'hooks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-ivory-300 p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Hook 1 พร้อมเชื่อมต่อ
            </span>
            <h4 className="font-bold text-navy-900">ไฟล์ Excel รหัสวิชาโรงเรียน</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              เชื่อมต่อผ่าน <code className="bg-slate-100 px-1 rounded">src/services/subjectImportAdapter.js</code> และ{' '}
              <code className="bg-slate-100 px-1 rounded">useSubjectImport.js</code> รองรับหัวคอลัมน์ยืดหยุ่นและการถอดรหัสชั้น/กลุ่มสาระฯ
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-ivory-300 p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Hook 2 พร้อมเชื่อมต่อ
            </span>
            <h4 className="font-bold text-navy-900">รูปภาพตัวอย่าง UI สัดส่วนคะแนน</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              เชื่อมต่อผ่าน <code className="bg-slate-100 px-1 rounded">src/services/scoringConfigAdapter.js</code> และ{' '}
              <code className="bg-slate-100 px-1 rounded">useScoringModel.js</code> รองรับการปรับสัดส่วนน้ำหนักคุณลักษณะฯ และคะแนนเก็บ
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-ivory-300 p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Hook 3 พร้อมเชื่อมต่อ
            </span>
            <h4 className="font-bold text-navy-900">ไฟล์ Google Docs ตัวอย่างรูปเล่ม</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              เชื่อมต่อผ่าน <code className="bg-slate-100 px-1 rounded">src/services/reportLayoutAdapter.js</code> และ{' '}
              <code className="bg-slate-100 px-1 rounded">exportEngine.js</code> รองรับการปรับหน้าปกและ Export `.docx` / PDF A4
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
