import React from 'react';

const COLOR_MAP = {
  navy: 'bg-navy-50 text-navy-800 border-navy-200',
  purple: 'bg-royal-50 text-royal-700 border-purple-200',
  gold: 'bg-gold-50 text-gold-700 border-gold-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function StatCard({ title, value, subtitle, icon: Icon, tone = 'navy' }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-300 p-5 shadow-sm hover:shadow-academic transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${COLOR_MAP[tone] || COLOR_MAP.navy}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
