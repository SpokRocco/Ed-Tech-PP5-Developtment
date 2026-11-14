import React from 'react';
import { LogOut, Calendar, ShieldCheck, Database, UserCircle2, Sparkles } from 'lucide-react';
import { SchoolLogo } from './SchoolEmblem';

const ROLE_LABELS = {
  executive: { label: 'ผู้บริหารสถานศึกษา', cls: 'bg-gold-500/20 text-gold-200 border-gold-400/50' },
  admin: { label: 'ผู้ดูแลระบบ (Admin)', cls: 'bg-royal-500/30 text-purple-100 border-purple-300/40' },
  teacher: { label: 'ครูผู้สอน', cls: 'bg-emerald-500/20 text-emerald-100 border-emerald-300/40' },
};

export function AppHeader({ settings, user, isLiveSupabase, onLogout }) {
  const roleMeta = user ? ROLE_LABELS[user.role] || ROLE_LABELS.teacher : null;

  return (
    <header className="no-print relative overflow-hidden bg-gradient-to-r from-navy-900 via-navy-800 to-royal-800 text-white shadow-academic border-b-4 border-gold-500">
      {/* Decorative subtle pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_#FBBF24_0%,_transparent_45%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Brand & School Info */}
          <div className="flex items-center gap-4">
            <div className="shrink-0 p-1 rounded-full bg-white/10 ring-2 ring-gold-400/60 shadow-gold">
              <SchoolLogo logoUrl={settings?.logo_url} alt={settings?.school_name} className="w-14 h-14" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-wide text-ivory-50">
                  ระบบบันทึกผลการเรียนและเอกสาร ปพ. ออนไลน์
                </h1>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                    isLiveSupabase
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-100 border-amber-300/40'
                  }`}
                >
                  {isLiveSupabase ? <Database className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  {isLiveSupabase ? 'Supabase Live' : 'โหมดสาธิตพร้อมใช้งาน'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gold-200 font-medium mt-0.5">
                {settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'}{' '}
                {settings?.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1'}
              </p>
            </div>
          </div>

          {/* Right Status: Academic Year + Logged-in User + Logout */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <div className="flex items-center gap-2 bg-navy-950/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs sm:text-sm">
              <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
              <div>
                <span className="text-slate-300">ปีการศึกษา </span>
                <span className="font-bold text-gold-300">{settings?.academic_year || '2569'}</span>
                <span className="mx-1.5 text-white/30">|</span>
                <span className="text-slate-300">ภาคเรียนที่ </span>
                <span className="font-bold text-gold-300">{settings?.semester || '1'}</span>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3.5 py-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gold-500/25 border border-gold-300/50 flex items-center justify-center text-gold-200">
                    {user.role === 'admin' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <UserCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs sm:text-sm font-semibold text-white">
                      {user.full_name}
                    </div>
                    <span
                      className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full border ${roleMeta.cls}`}
                    >
                      {roleMeta.label}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 border border-rose-300/30 text-xs font-medium transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
