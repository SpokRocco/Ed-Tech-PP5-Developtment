import React from 'react';
import { Award, Building2 } from 'lucide-react';

export function AppFooter({ settings }) {
  return (
    <footer className="no-print mt-auto bg-navy-950 text-slate-300 border-t-4 border-gold-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-ivory-50">
              <Building2 className="w-4 h-4 text-gold-400 shrink-0" />
              <span>
                {settings?.school_name || 'โรงเรียนบ้านหาดเค็ด'} สังกัด{' '}
                {settings?.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาน่าน เขต 1'} (
                {settings?.affiliation_short || 'สพป.น่าน เขต 1'})
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs sm:text-sm text-gold-300 font-medium">
              <Award className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <span>
                พัฒนาระบบโดย นายปิยะพันธุ์ ขันไร่ ตำแหน่ง ครู วิทยฐานะครูชำนาญการ โรงเรียนบ้านหาดเค็ด สพป.น่าน เขต 1
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 md:text-right shrink-0 space-y-0.5">
            <div>© {settings?.academic_year || '2569'} โรงเรียนบ้านหาดเค็ด สพป.น่าน เขต 1</div>
            <div className="text-[11px] text-slate-500">
              Academic Evaluation System (ปพ.5 Online) • Version 1.0.0
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
