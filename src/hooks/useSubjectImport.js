import { useState } from 'react';
import {
  parseSubjectsExcelFile,
  downloadSubjectImportTemplate,
} from '../services/subjectImportAdapter';

/**
 * [INTEGRATION HOOK 1] React Hook สำหรับ Import รหัสวิชาและโครงสร้างรายวิชาจาก Excel
 */
export function useSubjectImport(onCommitSubjects) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('__ALL__');
  const [detectedFormat, setDetectedFormat] = useState('');
  const [gradeBreakdown, setGradeBreakdown] = useState({});
  const [previewSubjects, setPreviewSubjects] = useState([]);
  const [errors, setErrors] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (file, sheetName = '__ALL__', customColumnAliases = {}) => {
    if (!file) return;
    setParsing(true);
    setSelectedFile(file);
    try {
      const result = await parseSubjectsExcelFile(file, { sheetName, customColumnAliases });
      setSheetNames(result.sheetNames);
      setActiveSheet(result.usedSheet);
      setDetectedFormat(result.detectedFormat || '');
      setGradeBreakdown(result.gradeBreakdown || {});
      setPreviewSubjects(result.subjects);
      setErrors(result.errors);
    } catch (err) {
      setErrors([`ไม่สามารถอ่านไฟล์ Excel ได้: ${err.message}`]);
      setPreviewSubjects([]);
      setGradeBreakdown({});
    } finally {
      setParsing(false);
    }
  };

  const switchSheet = async (sheetName) => {
    if (!selectedFile) return;
    await handleFileChange(selectedFile, sheetName);
  };

  const commitImport = async () => {
    if (!previewSubjects.length || !onCommitSubjects) return 0;
    setImporting(true);
    try {
      await onCommitSubjects(previewSubjects);
      const count = previewSubjects.length;
      setPreviewSubjects([]);
      setSelectedFile(null);
      setSheetNames([]);
      setGradeBreakdown({});
      setDetectedFormat('');
      setErrors([]);
      return count;
    } finally {
      setImporting(false);
    }
  };

  const clearPreview = () => {
    setSelectedFile(null);
    setSheetNames([]);
    setActiveSheet('__ALL__');
    setDetectedFormat('');
    setGradeBreakdown({});
    setPreviewSubjects([]);
    setErrors([]);
  };

  return {
    selectedFile,
    sheetNames,
    activeSheet,
    detectedFormat,
    gradeBreakdown,
    previewSubjects,
    errors,
    parsing,
    importing,
    handleFileChange,
    switchSheet,
    commitImport,
    clearPreview,
    downloadTemplate: downloadSubjectImportTemplate,
  };
}
