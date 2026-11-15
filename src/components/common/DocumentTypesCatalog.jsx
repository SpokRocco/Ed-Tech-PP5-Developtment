import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookMarked, FileSpreadsheet, FileText, Info, Lock, Plus } from 'lucide-react';
import {
  ACADEMIC_DOCUMENT_TYPES,
  EXPORT_CAPABILITY_BADGE,
  OBEC_CONTROL_NOTICE,
} from '../../data/academicDocumentsCatalog';

const TONE_STYLES = {
  amber: {
    card: 'border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/60 to-white',
    btn: 'bg-navy-800 hover:bg-navy-900 text-gold-300',
    badge: 'bg-amber-100 text-amber-800',
  },
  sky: {
    card: 'border-sky-200 hover:border-sky-400 bg-gradient-to-br from-sky-50/60 to-white',
    btn: 'bg-sky-700 hover:bg-sky-800 text-white',
    badge: 'bg-sky-100 text-sky-800',
  },
  emerald: {
    card: 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50/60 to-white',
    btn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  indigo: {
    card: 'border-indigo-200 hover:border-indigo-400 bg-gradient-to-br from-indigo-50/70 to-white',
    btn: 'bg-indigo-700 hover:bg-indigo-800 text-white',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  violet: {
    card: 'border-violet-200 hover:border-violet-400 bg-gradient-to-br from-violet-50/70 to-white',
    btn: 'bg-violet-700 hover:bg-violet-800 text-white',
    badge: 'bg-violet-100 text-violet-800',
  },
  navy: {
    card: 'border-navy-200 hover:border-navy-400 bg-gradient-to-br from-navy-50/50 to-white',
    btn: 'bg-navy-800 hover:bg-navy-900 text-white',
    badge: 'bg-navy-100 text-navy-800',
  },
  rose: {
    card: 'border-rose-200 hover:border-rose-400 bg-gradient-to-br from-rose-50/60 to-white',
    btn: 'bg-rose-700 hover:bg-rose-800 text-white',
    badge: 'bg-rose-100 text-rose-800',
  },
  teal: {
    card: 'border-teal-200 hover:border-teal-400 bg-gradient-to-br from-teal-50/60 to-white',
    btn: 'bg-teal-700 hover:bg-teal-800 text-white',
    badge: 'bg-teal-100 text-teal-800',
  },
};

export function DocumentTypesCatalog({
  onCreateSubjectClick,
  previewOnly = false,
  onPreviewSelect,
  title = 'ศูนย์เอกสารประเมินผล ปพ. / อบ.',
}) {
  return (
    <section className="bg-white rounded-3xl border border-ivory-300 shadow-sm p-5 sm:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-ivory-200 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <BookMarked className="w-5 h-5 text-gold-600 shrink-0" />
            <h3 className="font-bold text-navy-900 text-base sm:text-lg">
              {previewOnly ? 'เอกสารที่สร้างได้ (ครบเกณฑ์วิชาการ)' : title}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold-100 text-gold-800 border border-gold-300">
              ครบ {ACADEMIC_DOCUMENT_TYPES.length} เอกสาร
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5">
            {previewOnly ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                เข้าสู่ระบบเพื่อสร้างและจัดการเอกสารครบทุกประเภท (ปพ.4–ปพ.8 และ อบ.1–อบ.3)
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                สร้างเอกสารใหม่ — เลือกประเภท
              </>
            )}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ivory-100 border border-ivory-300 text-xs text-navy-900 font-medium">
          <FileText className="w-4 h-4 text-sky-700 shrink-0" />
          <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{EXPORT_CAPABILITY_BADGE}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACADEMIC_DOCUMENT_TYPES.map((doc) => {
          const tone = TONE_STYLES[doc.tone] || TONE_STYLES.navy;
          return (
            <div
              key={doc.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-md ${tone.card}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-navy-900 text-sm leading-snug">
                    {doc.icon} {doc.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5">
                  {previewOnly && (
                    <span className="shrink-0 select-none" aria-hidden="true">
                      🔒
                    </span>
                  )}
                  <span>{doc.description}</span>
                </p>
              </div>

              {previewOnly ? (
                <button
                  type="button"
                  onClick={() => onPreviewSelect && onPreviewSelect(doc)}
                  className="inline-flex items-center justify-between px-3 py-2 rounded-xl bg-ivory-100 hover:bg-navy-50 border border-ivory-300 text-navy-900 text-xs font-semibold transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    เข้าสู่ระบบเพื่อใช้งาน {doc.shortLabel}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ) : doc.id === 'pp5_subject' && onCreateSubjectClick ? (
                <button
                  type="button"
                  onClick={onCreateSubjectClick}
                  className={`inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${tone.btn}`}
                >
                  <span>+ สร้างสมุด ปพ.5 รายวิชา</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  to={doc.route}
                  className={`inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${tone.btn}`}
                >
                  <span>เปิด / สร้าง {doc.shortLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 flex items-start gap-2.5 text-xs text-sky-950 leading-relaxed">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <p>
          <strong>ความรู้ที่ถูกต้อง:</strong> {OBEC_CONTROL_NOTICE}
        </p>
      </div>
    </section>
  );
}
