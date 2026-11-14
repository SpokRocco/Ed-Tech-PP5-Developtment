import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  GraduationCap,
  BarChart3,
  BookOpen,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  UserPlus,
  Database,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSchoolData } from '../hooks/useSchoolData';
import { DEMO_USERS } from '../data/demoSeedData';
import { AppHeader } from '../components/layout/AppHeader';
import { AppFooter } from '../components/layout/AppFooter';
import { SchoolLogo } from '../components/layout/SchoolEmblem';

export function LoginPage() {
  const {
    loginWithEmail,
    signUpWithEmail,
    loginDemoRole,
    authError,
    authNotice,
    isLiveSupabase,
    isSupabaseConfigured,
    schemaReady,
    runtimeMode,
    switchRuntimeMode,
  } = useAuth();
  const { settings } = useSchoolData();
  const navigate = useNavigate();

  const [authTab, setAuthTab] = useState('signin'); // 'signin' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectByRole = (role) => {
    if (role === 'executive') navigate('/executive');
    else if (role === 'admin') navigate('/admin');
    else navigate('/teacher');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (authTab === 'signup' && isLiveSupabase) {
        const res = await signUpWithEmail({ email, password, fullName });
        if (res?.user) redirectByRole(res.user.role);
      } else {
        const res = await loginWithEmail(email, password);
        if (res?.user) redirectByRole(res.user.role);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = (demoUser) => {
    loginDemoRole(demoUser);
    redirectByRole(demoUser.role);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <AppHeader settings={settings} user={null} isLiveSupabase={isLiveSupabase} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          {/* Left Hero Panel */}
          <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-royal-900 text-white p-8 sm:p-10 shadow-academic border border-gold-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-gold-500/15 blur-2xl" />

            <div className="space-y-5 relative">
              <div className="flex items-center gap-4">
                <div className="shrink-0 p-1 rounded-full bg-white/10 ring-2 ring-gold-400">
                  <SchoolLogo logoUrl={settings?.logo_url} alt={settings?.school_name} className="w-16 h-16" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-400/40">
                    <GraduationCap className="w-3.5 h-3.5" />
                    EdTech Academic Platform
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold mt-2 leading-snug">
                    ระบบบันทึกผลการเรียนและเอกสาร ปพ.5 ออนไลน์
                  </h2>
                </div>
              </div>

              <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                ระบบบริหารจัดการงานวัดผลและประเมินผลทางการศึกษา{' '}
                <b className="text-gold-300">{settings?.school_name}</b>{' '}
                สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1 (ระดับชั้น อ.3 – ม.3)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                  <BarChart3 className="w-5 h-5 text-gold-300 mb-2" />
                  <p className="font-semibold text-sm">ผู้บริหารสถานศึกษา</p>
                  <p className="text-xs text-slate-300 mt-0.5">ติดตามผลสัมฤทธิ์ สถิติมาเรียน และอนุมัติ ปพ.5</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                  <ShieldCheck className="w-5 h-5 text-purple-300 mb-2" />
                  <p className="font-semibold text-sm">ผู้ดูแลระบบ (/admin)</p>
                  <p className="text-xs text-slate-300 mt-0.5">นำเข้านักเรียน รหัสวิชา Excel และคลังหลักสูตร</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                  <BookOpen className="w-5 h-5 text-emerald-300 mb-2" />
                  <p className="font-semibold text-sm">ครูผู้สอน</p>
                  <p className="text-xs text-slate-300 mt-0.5">เช็คชื่อ คะแนน ตัวชี้วัด ตัดเกรด และ Export 3 รูปแบบ</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/15 text-xs text-gold-200">
              อ้างอิงหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ปรับปรุง พ.ศ. 2560) และตัวชี้วัดระหว่างทาง/ปลายทาง สพฐ.
            </div>
          </div>

          {/* Right Login Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-ivory-300 shadow-academic p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-navy-900">เข้าสู่ระบบงานวิชาการ</h3>
                {schemaReady && (
                  <button
                    type="button"
                    onClick={() => switchRuntimeMode(runtimeMode === 'live' ? 'demo' : 'live')}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-navy-200 bg-ivory-100 text-navy-800 hover:bg-navy-50"
                  >
                    {runtimeMode === 'live' ? 'สลับเป็น Demo' : 'ใช้ Supabase Live'}
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {isLiveSupabase
                  ? 'ลงชื่อเข้าใช้หรือเปิดใช้งานบัญชีครั้งแรกด้วย Supabase Authentication'
                  : isSupabaseConfigured && !schemaReady
                  ? 'ตรวจพบการตั้งค่า Supabase โปรเจกต์ hadket แล้ว — รอรัน SUPABASE_SETUP.sql ใน SQL Editor (เปิดโหมดสาธิตให้ใช้งานทันที)'
                  : 'ขณะนี้ทำงานในโหมดสาธิต (Demo) สามารถทดสอบสิทธิ์ได้ครบทั้ง 3 บทบาท'}
              </p>

              {isLiveSupabase && (
                <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-ivory-100 border border-ivory-300 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAuthTab('signin')}
                    className={`py-1.5 rounded-lg transition-colors ${
                      authTab === 'signin' ? 'bg-navy-800 text-gold-300' : 'text-slate-600'
                    }`}
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('signup')}
                    className={`py-1.5 rounded-lg transition-colors inline-flex items-center justify-center gap-1 ${
                      authTab === 'signup' ? 'bg-navy-800 text-gold-300' : 'text-slate-600'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> เปิดใช้งานบัญชีครั้งแรก
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {authTab === 'signup' && isLiveSupabase && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล (ครู/บุคลากร)</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="เช่น นายปิยะพันธุ์ ขันไร่"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-100"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลผู้ใช้งาน</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@banhatkhet.ac.th"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required={isLiveSupabase}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLiveSupabase ? '•••••••• (อย่างน้อย 6 ตัวอักษร)' : 'โหมด Demo ไม่บังคับรหัสผ่าน'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-100"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {authError}
                  </div>
                )}
                {authNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                    <Database className="w-4 h-4 shrink-0" /> {authNotice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60"
                >
                  {submitting
                    ? 'กำลังดำเนินการ...'
                    : authTab === 'signup' && isLiveSupabase
                    ? 'ลงทะเบียนเปิดใช้งานบัญชี Supabase'
                    : 'เข้าสู่ระบบ'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {!isLiveSupabase && (
              <div className="mt-6 pt-5 border-t border-ivory-200 space-y-2.5">
                <p className="text-xs font-semibold text-royal-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                  เข้าสู่ระบบด่วนตามบทบาท (โหมดสาธิต):
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleDemoClick(u)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-ivory-100 hover:bg-navy-50 border border-ivory-300 hover:border-navy-300 text-left transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-navy-900">{u.full_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {u.position} • {u.learning_area}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                          u.role === 'executive'
                            ? 'bg-gold-100 text-gold-700'
                            : u.role === 'admin'
                            ? 'bg-royal-100 text-royal-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role === 'executive'
                          ? 'ผู้บริหาร'
                          : u.role === 'admin'
                          ? 'Admin'
                          : 'ครูผู้สอน'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter settings={settings} />
    </div>
  );
}
