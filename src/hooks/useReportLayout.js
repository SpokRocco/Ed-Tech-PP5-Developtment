import { useState, useCallback } from 'react';
import { mergeReportLayout } from '../services/reportLayoutAdapter';

/**
 * [INTEGRATION HOOK 3] React Hook สำหรับจัดการโครงสร้างรูปเล่มรายงานและหน้าปก ปพ.5
 */
export function useReportLayout(systemCoverConfig = {}, courseCoverConfig = {}) {
  const [layout, setLayout] = useState(() =>
    mergeReportLayout(systemCoverConfig, courseCoverConfig)
  );

  const updateLayout = useCallback((patch) => {
    setLayout((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSignatureLabel = useCallback((key, value) => {
    setLayout((prev) => ({
      ...prev,
      signatures: {
        ...prev.signatures,
        [key]: value,
      },
    }));
  }, []);

  const updateOrientation = useCallback((sectionKey, orientation) => {
    setLayout((prev) => ({
      ...prev,
      orientations: {
        ...prev.orientations,
        [sectionKey]: orientation,
      },
    }));
  }, []);

  return {
    layout,
    setLayout,
    updateLayout,
    updateSignatureLabel,
    updateOrientation,
  };
}
