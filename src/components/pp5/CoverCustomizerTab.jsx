import React, { useState, useMemo } from 'react';
import { Save, Eye, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { useReportLayout } from '../../hooks/useReportLayout';
import { buildCoverSummaryStats } from '../../services/reportLayoutAdapter';
import { SchoolEmblem } from '../layout/SchoolEmblem';

/**
 * [INTEGRATION HOOK 3 UI]
 * เมนูตั้งค่าปก ปพ.5 และรูปเล่มรายงาน พร้อมหน้าปก A4 Live Preview (ฟอนต์ Sarabun)
 */
export function CoverCustomizerTab({
  course,
  teacher,
  settings,
  students,
  computedScoresMap,
  characteristicsMap,
  onSaveCoverSettings,
}) {
  const { layout, updateLayout, updateSignatureLabel } = useReportLayout(
    settings?.cover_config,
    course?.cover_settings
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const summary = useMemo(
    () => buildCoverSummaryStats(students, computedScoresMap, characteristicsMap),
    [students, computedScoresMap, characteristicsMap]
  );

  const handleSave = async () => {
    await onSaveCoverSettings(layout);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const isMono = layout.themeStyle === 'official-monochrome';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: Cover Customizer Form */}
      <div className="xl:col-span-5 bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4 h-fit">
        <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
          <h3 className="font-semibold text-navy-900 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-royal-600" />
            ตั้งค่าหน้าปกและองค์ประกอบ ปพ.5
          </h3>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold shadow-sm"
          >
            <Save className="w-4 h-4" /> บันทึกปกนี้
          </button>
        </div>

        {savedNotice && (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> บันทึกการตั้งค่าหน้าปกเรียบร้อยแล้ว
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">รหัสเอกสาร</label>
              <input
                type="text"
                value={layout.documentCode}
                onChange={(e) => updateLayout({ documentCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">ธีมสีหน้าปก</label>
              <select
                value={layout.themeStyle}
                onChange={(e) => updateLayout({ themeStyle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              >
                <option value="academic-navy-gold">กรมท่า - ทอง (อัตลักษณ์โรงเรียน)</option>
                <option value="official-monochrome">ขาว - ดำ (แบบราชการประหยัดหมึก)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">หัวข้อหน้าปก</label>
            <input
              type="text"
              value={layout.documentTitle}
              onChange={(e) => updateLayout({ documentTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">คำอธิบายหลักสูตร</label>
            <textarea
              rows={2}
              value={layout.subtitle}
              onChange={(e) => updateLayout({ subtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-ivory-50 border border-ivory-300 cursor-pointer">
              <input
                type="checkbox"
                checked={layout.showLogo}
                onChange={(e) => updateLayout({ showLogo: e.target.checked })}
              />
              แสดงตราโรงเรียน
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-ivory-50 border border-ivory-300 cursor-pointer">
              <input
                type="checkbox"
                checked={layout.showGaruda}
                onChange={(e) => updateLayout({ showGaruda: e.target.checked })}
              />
              แสดงตราครุฑ (ถ้าอัปโหลด)
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-ivory-50 border border-ivory-300 cursor-pointer">
              <input
                type="checkbox"
                checked={layout.showSummaryTable}
                onChange={(e) => updateLayout({ showSummaryTable: e.target.checked })}
              />
              แสดงตารางสรุปผลหน้าปก
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-ivory-50 border border-ivory-300 cursor-pointer">
              <input
                type="checkbox"
                checked={layout.showApprovalBlock}
                onChange={(e) => updateLayout({ showApprovalBlock: e.target.checked })}
              />
              แสดงช่องลงนามอนุมัติ
            </label>
          </div>

          <div className="pt-2 border-t border-ivory-200 space-y-2">
            <p className="text-xs font-semibold text-navy-900">ป้ายตำแหน่งผู้ลงนาม</p>
            <input
              type="text"
              value={layout.signatures.teacherLabel}
              onChange={(e) => updateSignatureLabel('teacherLabel', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              placeholder="ตำแหน่งครูผู้สอน"
            />
            <input
              type="text"
              value={layout.signatures.academicHeadLabel}
              onChange={(e) => updateSignatureLabel('academicHeadLabel', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              placeholder="ตำแหน่งหัวหน้าวิชาการ"
            />
            <input
              type="text"
              value={layout.signatures.directorLabel}
              onChange={(e) => updateSignatureLabel('directorLabel', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              placeholder="ตำแหน่งผู้อำนวยการ"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุหน้าปก (ถ้ามี)</label>
            <input
              type="text"
              value={layout.coverNote || ''}
              onChange={(e) => updateLayout({ coverNote: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              placeholder="เช่น ฉบับสมบูรณ์ส่งงานวัดผลประจำภาคเรียน"
            />
          </div>
        </div>
      </div>

      {/* Right: Live A4 Cover Preview */}
      <div className="xl:col-span-7">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
          <Eye className="w-4 h-4 text-navy-700" />
          ตัวอย่างหน้าปกจริงขนาดมาตรฐาน A4 (ฟอนต์ Sarabun)
        </div>

        <div
          className={`font-official bg-white rounded-xl shadow-academic border-2 p-8 sm:p-10 aspect-[210/297] flex flex-col justify-between ${
            isMono ? 'border-slate-800 text-slate-900' : 'border-navy-800 text-slate-900'
          }`}
        >
          {/* Top Cover Header */}
          <div className="text-center space-y-2">
            <div className="flex items-start justify-between">
              <div className="w-16" />
              <div className="flex flex-col items-center">
                {layout.showGaruda && settings?.emblem_url && (
                  <img src={settings.emblem_url} alt="ตราครุฑ" className="h-14 object-contain mb-2" />
                )}
                {layout.showLogo &&
                  (settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt={settings.school_name}
                      className="w-20 h-20 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <SchoolEmblem className="w-20 h-20" />
                  ))}
              </div>
              <div
                className={`px-3 py-1 rounded-lg border-2 font-bold text-lg ${
                  isMono
                    ? 'border-slate-800 text-slate-900'
                    : 'border-navy-800 bg-navy-800 text-gold-300'
                }`}
              >
                {layout.documentCode}
              </div>
            </div>

            <h2
              className={`text-xl sm:text-2xl font-bold pt-2 ${
                isMono ? 'text-slate-900' : 'text-navy-900'
              }`}
            >
              {layout.documentTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-700">{layout.subtitle}</p>
            <div className="pt-2">
              <p className="text-lg font-bold text-slate-900">{settings?.school_name}</p>
              <p className="text-sm text-slate-700">
                {settings?.affiliation} ({settings?.affiliation_short})
              </p>
            </div>
          </div>

          {/* Course Info Grid */}
          <div
            className={`my-4 p-4 rounded-xl border text-sm space-y-1.5 ${
              isMono ? 'border-slate-400 bg-slate-50' : 'border-navy-200 bg-navy-50/40'
            }`}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <b>รหัสวิชา:</b> {course.subject_code}
              </div>
              <div>
                <b>ภาคเรียนที่:</b> {course.semester} / {course.academic_year}
              </div>
              <div className="col-span-2">
                <b>ชื่อรายวิชา:</b> {course.subject_name}
              </div>
              <div>
                <b>กลุ่มสาระฯ:</b> {course.learning_area}
              </div>
              <div>
                <b>ชั้น / ห้อง:</b> {course.grade_level}/{course.classroom}
              </div>
              <div>
                <b>หน่วยกิต / น้ำหนัก:</b> {course.credits}
              </div>
              <div>
                <b>เวลาเรียน:</b> {course.total_hours} ชั่วโมง
              </div>
              <div className="col-span-2">
                <b>ครูผู้สอน:</b> {teacher?.full_name || '-'}{' '}
                {teacher?.academic_standing ? `(${teacher.academic_standing})` : ''}
              </div>
            </div>
          </div>

          {/* Grade Summary Table */}
          {layout.showSummaryTable && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-center">
                ตารางสรุปผลสัมฤทธิ์ทางการเรียน (จำนวนนักเรียนทั้งหมด {summary.totalStudents} คน)
              </p>
              <table className="w-full text-xs border-collapse border border-slate-700 text-center">
                <thead>
                  <tr className={isMono ? 'bg-slate-200' : 'bg-navy-800 text-white'}>
                    <th className="border border-slate-700 py-1">4</th>
                    <th className="border border-slate-700 py-1">3.5</th>
                    <th className="border border-slate-700 py-1">3</th>
                    <th className="border border-slate-700 py-1">2.5</th>
                    <th className="border border-slate-700 py-1">2</th>
                    <th className="border border-slate-700 py-1">1.5</th>
                    <th className="border border-slate-700 py-1">1</th>
                    <th className="border border-slate-700 py-1">0</th>
                    <th className="border border-slate-700 py-1">ร</th>
                    <th className="border border-slate-700 py-1">มส</th>
                    <th className="border border-slate-700 py-1">ร้อยละ 3+</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].map((g) => (
                      <td key={g} className="border border-slate-700 py-1 font-semibold">
                        {summary.gradeBuckets[g]}
                      </td>
                    ))}
                    <td className="border border-slate-700 py-1 font-bold">
                      {summary.goodAndAbovePct}%
                    </td>
                  </tr>
                </tbody>
              </table>
              {layout.coverNote && (
                <p className="text-[11px] text-slate-600 text-center pt-1">หมายเหตุ: {layout.coverNote}</p>
              )}
            </div>
          )}

          {/* Approval Signatures */}
          {layout.showApprovalBlock && (
            <div className="pt-4 space-y-4">
              <p className="text-xs text-center font-semibold">
                {layout.signatures.approvalStatement}
              </p>
              <div className="grid grid-cols-3 gap-3 text-center text-[11px] pt-2">
                <div>
                  <p>ลงชื่อ.....................................</p>
                  <p className="mt-1">({teacher?.full_name || 'ครูผู้สอน'})</p>
                  <p className="text-slate-600">{layout.signatures.teacherLabel}</p>
                </div>
                <div>
                  <p>ลงชื่อ.....................................</p>
                  <p className="mt-1">({settings?.academic_head_name || 'หัวหน้าวิชาการ'})</p>
                  <p className="text-slate-600">{layout.signatures.academicHeadLabel}</p>
                </div>
                <div>
                  {settings?.director_signature_url ? (
                    <img
                      src={settings.director_signature_url}
                      alt="ลายเซ็นผู้อำนวยการ"
                      className="h-8 mx-auto object-contain"
                    />
                  ) : (
                    <p>ลงชื่อ.....................................</p>
                  )}
                  <p className="mt-1 font-semibold">({settings?.director_name || 'นายเอกชัย สุภา'})</p>
                  <p className="text-slate-600">{layout.signatures.directorLabel}</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-center text-slate-500 border-t border-slate-200 pt-2">
            {layout.footerCredit}
          </div>
        </div>
      </div>
    </div>
  );
}
