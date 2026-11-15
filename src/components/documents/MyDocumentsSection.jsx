import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, Pencil, Search, Trash2, BarChart2 } from 'lucide-react';
import { ACADEMIC_DOCUMENT_TYPES, getDocumentTypeMeta } from '../../data/academicDocumentsCatalog';
import { exportAcademicDocument } from '../../services/academicDocExporter';
import { useAuth } from '../../hooks/useAuth';
import { useSchoolData } from '../../hooks/useSchoolData';

function formatShortThaiDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const thaiYearShort = String(d.getFullYear() + 543).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${thaiYearShort} ${hh}:${mm}`;
}

export function MyDocumentsSection({
  myCourses = [],
  courseCompletions = {},
  allScores = [],
  allAttendance = [],
  allCharacteristics = [],
  scoreStructures = [],
  onDeleteCourse,
}) {
  const { user } = useAuth();
  const {
    settings,
    users,
    students,
    subjects,
    indicators,
    courses,
    academicDocuments,
    deleteAcademicDocument,
  } = useSchoolData();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportingId, setExportingId] = useState('');

  // รวมเอกสารทั้งหมดเข้าด้วยกัน (ปพ.5 รายวิชา + ปพ.4/6/7/8 + เทียบผล ปพ.1 + อบ.1-3)
  const unifiedItems = useMemo(() => {
    const subjectItems = myCourses.map((c) => {
      const comp = courseCompletions[c.id] || { pct: 50, isComplete: false };
      const pct = comp.isComplete ? 100 : comp.pct;
      return {
        id: `course:${c.id}`,
        rawId: c.id,
        kind: 'course',
        docType: 'pp5_subject',
        title: `ปพ.5 • ${c.subject_name} (${c.subject_code}) ${c.grade_level}/${c.classroom} ภาค ${c.semester || '1'}/${c.academic_year || '2569'}`,
        pct,
        status: c.status === 'approved' ? 'approved' : pct >= 100 ? 'complete' : 'in_progress',
        updatedAt: c.updated_at || new Date().toISOString(),
        openTo: `/course/${c.id}`,
        _courseRef: c,
        canDelete: user?.role === 'admin' || c.teacher_id === user?.id,
      };
    });

    const extraItems = (academicDocuments || [])
      .filter((d) => user?.role === 'admin' || user?.role === 'executive' || !d.owner_id || d.owner_id === user?.id)
      .map((d) => {
        const pct = Number(d.completion_pct ?? 50);
        return {
          id: `doc:${d.id}`,
          rawId: d.id,
          kind: 'academic_doc',
          docType: d.doc_type,
          title: d.title,
          pct,
          status:
            d.status === 'approved'
              ? 'approved'
              : pct >= 100 || d.status === 'completed'
              ? 'complete'
              : 'in_progress',
          updatedAt: d.updated_at || new Date().toISOString(),
          openTo: `/documents/${d.doc_type}/${d.id}`,
          _docRef: d,
          canDelete: user?.role === 'admin' || !d.owner_id || d.owner_id === user?.id,
        };
      });

    return [...subjectItems, ...extraItems].sort((a, b) =>
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    );
  }, [myCourses, courseCompletions, academicDocuments, user]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedItems.filter((item) => {
      if (typeFilter !== 'all' && item.docType !== typeFilter) return false;
      if (statusFilter === 'complete' && item.pct < 100) return false;
      if (statusFilter === 'in_progress' && item.pct >= 100) return false;
      if (statusFilter === 'approved' && item.status !== 'approved') return false;
      if (q && !String(item.title || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [unifiedItems, searchQuery, typeFilter, statusFilter]);

  const handleQuickWord = async (item) => {
    setExportingId(item.id);
    try {
      await exportAcademicDocument({
        doc: item.kind === 'course' ? { _courseRef: item._courseRef } : item._docRef,
        typeId: item.docType,
        format: 'docx',
        settings,
        users,
        students,
        subjects,
        courses,
        allScores,
        allAttendance,
        allCharacteristics,
        scoreStructures,
        indicators,
      });
    } finally {
      setExportingId('');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`ต้องการลบเอกสาร "${item.title}" ออกจากรายการใช่หรือไม่?`)) return;
    if (item.kind === 'course') {
      await onDeleteCourse?.(item.rawId);
    } else {
      await deleteAcademicDocument(item.rawId);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-ivory-300 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-navy-900 text-base sm:text-lg flex items-center gap-2">
          <span aria-hidden="true">🗂</span>
          เอกสารของฉัน ({filteredItems.length})
        </h3>
      </div>

      {/* ค้นหาและตัวกรองตรงตามภาพตัวอย่าง */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเอกสาร..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
        >
          <option value="all">ทุกประเภท</option>
          {ACADEMIC_DOCUMENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.shortLabel}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="complete">✓ ครบ 100% / พร้อมส่ง</option>
          <option value="in_progress">กำลังดำเนินการ (&lt; 100%)</option>
          <option value="approved">อนุมัติแล้ว</option>
        </select>
      </div>

      {/* รายการเอกสารแบบ Row List */}
      <div className="divide-y divide-ivory-200 border border-ivory-200 rounded-2xl overflow-hidden">
        {filteredItems.map((item) => {
          const meta = getDocumentTypeMeta(item.docType);
          const isComplete = item.pct >= 100;
          return (
            <div
              key={item.id}
              className="px-4 py-3.5 bg-white hover:bg-ivory-50 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="text-base shrink-0" aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="font-bold text-sm text-navy-900 truncate">{item.title}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Progress & Timestamp */}
                <div className="flex items-center gap-2.5 min-w-[175px]">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold ${
                      isComplete ? 'text-emerald-700' : 'text-indigo-700'
                    }`}
                  >
                    {isComplete ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> ครบ 100%
                      </>
                    ) : (
                      <>
                        <BarChart2 className="w-3.5 h-3.5" /> {item.pct}%
                      </>
                    )}
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isComplete ? 'bg-emerald-600' : 'bg-indigo-600'}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {formatShortThaiDateTime(item.updatedAt)}
                  </span>
                </div>

                {/* Action Buttons: ทำต่อ / เปิดแก้ไข + Word + Delete */}
                <div className="flex items-center gap-2">
                  <Link
                    to={item.openTo}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-colors ${
                      isComplete
                        ? 'bg-white hover:bg-amber-50 text-indigo-800 border-indigo-200'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    {isComplete ? 'เปิดแก้ไข' : 'ทำต่อ'}
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleQuickWord(item)}
                    disabled={exportingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-sky-50 text-navy-900 border border-indigo-200 text-xs font-bold shadow-sm transition-colors disabled:opacity-60"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    {exportingId === item.id ? 'กำลังสร้าง...' : 'Word'}
                  </button>

                  {item.canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                      title="ลบเอกสาร"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500 bg-ivory-50">
            ไม่พบเอกสารที่ตรงกับเงื่อนไขการค้นหา
          </div>
        )}
      </div>
    </section>
  );
}
