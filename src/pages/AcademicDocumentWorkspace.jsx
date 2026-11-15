import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Plus,
  Save,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSchoolData } from '../hooks/useSchoolData';
import { ACADEMIC_DOCUMENT_TYPES, getDocumentTypeMeta } from '../data/academicDocumentsCatalog';
import { dataService } from '../services/dataService';
import { exportAcademicDocument } from '../services/academicDocExporter';
import { Pp1TransferPanel } from '../components/documents/Pp1TransferPanel';
import { Pp4TraitsPanel } from '../components/documents/Pp4TraitsPanel';
import { Pp6ReportHubPanel } from '../components/documents/Pp6ReportHubPanel';
import { Pp7CertificatePanel } from '../components/documents/Pp7CertificatePanel';
import { Pp8CumulativePanel } from '../components/documents/Pp8CumulativePanel';
import { EarlyChildhoodPanel } from '../components/documents/EarlyChildhoodPanel';
import { DocumentTypesCatalog } from '../components/common/DocumentTypesCatalog';

function makeDefaultDoc(docType, settings, students = [], user = null) {
  const meta = getDocumentTypeMeta(docType);
  const year = String(settings?.academic_year || '2569');
  const sem = String(settings?.semester || '1');
  const isEarly = docType.startsWith('ob');
  const isP13 = docType === 'pp1_transfer_2569';
  const defaultGrade = isEarly ? 'อ.3' : isP13 ? 'ป.1' : 'ป.4';
  const firstStu =
    students.find((s) => s.status === 'active' && s.grade_level === defaultGrade) ||
    students.find((s) => s.status === 'active');

  return {
    id: `${docType}-${Date.now()}`,
    doc_type: docType,
    title: `${meta.shortLabel} ${defaultGrade}/1 ภาค ${sem}/${year}`,
    grade_level: defaultGrade,
    classroom: '1',
    academic_year: year,
    semester: sem,
    student_id: docType === 'pp7_certificate' || docType === 'pp8_cumulative' ? firstStu?.id || '' : '',
    owner_id: user?.id || null,
    status: 'draft',
    completion_pct: 40,
    payload: {},
  };
}

export function AcademicDocumentWorkspace() {
  const { docType, docId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    settings,
    users,
    students,
    subjects,
    courses,
    academicDocuments,
    saveAcademicDocument,
  } = useSchoolData();

  const [docState, setDocState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState('');
  const [notice, setNotice] = useState('');

  const meta = getDocumentTypeMeta(docType || 'pp4_traits');

  const matchingDocs = useMemo(
    () => (academicDocuments || []).filter((d) => !docType || d.doc_type === docType),
    [academicDocuments, docType]
  );

  useEffect(() => {
    if (!docType) {
      setDocState(null);
      return;
    }
    if (docId) {
      const found = (academicDocuments || []).find((d) => d.id === docId);
      if (found) {
        setDocState(JSON.parse(JSON.stringify(found)));
        return;
      }
      dataService.fetchAcademicDocuments({ id: docId }).then((rows) => {
        if (rows[0]) setDocState(rows[0]);
      });
      return;
    }
    const existing = matchingDocs[0];
    if (existing) {
      setDocState(JSON.parse(JSON.stringify(existing)));
    } else {
      setDocState(makeDefaultDoc(docType, settings, students, user));
    }
  }, [docType, docId]);

  const handleSave = async () => {
    if (!docState) return;
    setSaving(true);
    try {
      const saved = await saveAcademicDocument({
        ...docState,
        owner_id: docState.owner_id || user?.id || null,
      });
      setDocState(saved);
      setNotice(`บันทึกเอกสาร "${saved.title}" เรียบร้อยแล้ว`);
      if (!docId) {
        navigate(`/documents/${saved.doc_type}/${saved.id}`, { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = () => {
    const fresh = makeDefaultDoc(docType, settings, students, user);
    setDocState(fresh);
    navigate(`/documents/${docType}`, { replace: true });
    setNotice('สร้างฉบับร่างใหม่พร้อมใช้งาน — กดบันทึกเพื่อเก็บเข้าคลังเอกสารของฉัน');
  };

  const handleExport = async (format) => {
    if (!docState) return;
    setExporting(format);
    try {
      const gradeLevel = docState.grade_level || 'ป.4';
      const classroom = String(docState.classroom || '1');
      const matrixData =
        docState.doc_type === 'pp6_report'
          ? await dataService.fetchClassroomMatrixData(gradeLevel, classroom, { courses, students, subjects })
          : {};
      await exportAcademicDocument({
        doc: docState,
        typeId: docState.doc_type,
        format,
        settings,
        users,
        students,
        subjects,
        courses,
        ...matrixData,
      });
    } finally {
      setExporting('');
    }
  };

  if (!docType) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-navy-900 via-royal-900 to-navy-800 text-white p-6 shadow-academic border border-gold-500/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-gold-300" />
              ศูนย์เอกสารประเมินผล ปพ.4–ปพ.8 และ อบ.1–อบ.3 (ครบ 14 ประเภท)
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              เลือกประเภทเอกสารที่ต้องการสร้างหรือดูรายการเอกสารทั้งหมด พร้อมดาวน์โหลด Word ฟอนต์ราชการ + Excel
            </p>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้าหลักครูผู้สอน
          </Link>
        </div>

        <DocumentTypesCatalog />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="no-print rounded-3xl bg-gradient-to-r from-navy-900 via-royal-900 to-indigo-900 text-white p-5 sm:p-6 shadow-academic border border-gold-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/teacher"
                className="inline-flex items-center gap-1 text-xs text-gold-300 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> ศูนย์เอกสารของฉัน
              </Link>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-gold-200 font-semibold">
                {meta.icon} {meta.shortLabel}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold">{meta.title}</h2>
            <p className="text-xs text-slate-200 max-w-4xl">{meta.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20"
            >
              <Plus className="w-3.5 h-3.5" /> สร้างฉบับใหม่
            </button>
            <button
              type="button"
              onClick={() => handleExport('docx')}
              disabled={Boolean(exporting)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {exporting === 'docx' ? 'กำลังสร้าง Word...' : 'ดาวน์โหลด Word'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={Boolean(exporting)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exporting === 'xlsx' ? 'กำลังสร้าง Excel...' : 'ดาวน์โหลด Excel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs sm:text-sm font-bold shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
            </button>
          </div>
        </div>

        {/* Title + Saved picker bar */}
        {docState && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/15 text-xs">
            <div className="flex-1 min-w-[240px]">
              <label className="text-[11px] text-slate-300 block mb-0.5">ชื่อเอกสารในรายการ "เอกสารของฉัน"</label>
              <input
                type="text"
                value={docState.title || ''}
                onChange={(e) => setDocState({ ...docState, title: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/25 text-white placeholder-slate-300 text-xs font-semibold focus:outline-none focus:bg-white/20"
              />
            </div>
            {matchingDocs.length > 0 && (
              <div className="min-w-[220px]">
                <label className="text-[11px] text-slate-300 block mb-0.5">สลับฉบับที่บันทึกไว้ ({matchingDocs.length})</label>
                <select
                  value={docState.id || ''}
                  onChange={(e) => {
                    const found = matchingDocs.find((d) => d.id === e.target.value);
                    if (found) {
                      setDocState(JSON.parse(JSON.stringify(found)));
                      navigate(`/documents/${docType}/${found.id}`, { replace: true });
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-navy-800 border border-white/25 text-white text-xs font-semibold"
                >
                  {matchingDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.completion_pct || 0}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 font-semibold text-gold-300">
              ความครบถ้วน: {docState.completion_pct || 0}%
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div className="no-print p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {notice}
          </span>
          <button type="button" onClick={() => setNotice('')} className="underline text-[11px]">
            ปิด
          </button>
        </div>
      )}

      {/* Workspace Panel Switch */}
      {docState && docType === 'pp1_transfer_2569' && (
        <Pp1TransferPanel docState={docState} onChangeDoc={setDocState} students={students} onNotice={setNotice} />
      )}
      {docState && docType === 'pp4_traits' && (
        <Pp4TraitsPanel
          docState={docState}
          onChangeDoc={setDocState}
          students={students}
          subjects={subjects}
          courses={courses}
          onNotice={setNotice}
        />
      )}
      {docState && docType === 'pp6_report' && (
        <Pp6ReportHubPanel
          docState={docState}
          onChangeDoc={setDocState}
          settings={settings}
          students={students}
          subjects={subjects}
          courses={courses}
          users={users}
        />
      )}
      {docState && docType === 'pp7_certificate' && (
        <Pp7CertificatePanel docState={docState} onChangeDoc={setDocState} settings={settings} students={students} />
      )}
      {docState && docType === 'pp8_cumulative' && (
        <Pp8CumulativePanel docState={docState} onChangeDoc={setDocState} students={students} />
      )}
      {docState && docType.startsWith('ob') && (
        <EarlyChildhoodPanel
          docState={docState}
          onChangeDoc={setDocState}
          students={students}
          academicDocuments={academicDocuments}
          onNotice={setNotice}
        />
      )}

      {/* Quick switch strip to jump among other document types */}
      <div className="no-print bg-white rounded-2xl border border-ivory-300 p-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-600 mr-1">สลับเอกสารอื่น:</span>
        {ACADEMIC_DOCUMENT_TYPES.filter((t) => !['pp5_subject', 'pp5_classroom', 'pp5_primary_2569'].includes(t.id)).map((t) => (
          <Link
            key={t.id}
            to={t.route}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              t.id === docType
                ? 'bg-navy-900 text-gold-300 border-navy-900'
                : 'bg-ivory-100 hover:bg-ivory-200 text-navy-900 border-ivory-300'
            }`}
          >
            {t.icon} {t.shortLabel}
          </Link>
        ))}
      </div>
    </div>
  );
}
