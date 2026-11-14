import { useState, useCallback } from 'react';
import {
  DEFAULT_CHARACTERISTICS_MODEL,
  evaluateCriteriaSummary,
} from '../services/scoringConfigAdapter';

/**
 * [INTEGRATION HOOK 2] React Hook สำหรับปรับแต่งโมเดลสัดส่วนคะแนนคุณลักษณะฯ และอ่านคิดวิเคราะห์เขียน
 */
export function useScoringModel(initialConfig = {}) {
  const [model, setModel] = useState({
    ...DEFAULT_CHARACTERISTICS_MODEL,
    ...initialConfig,
  });

  const updateModel = useCallback((patch) => {
    setModel((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateTraitWeight = useCallback((key, weight) => {
    setModel((prev) => ({
      ...prev,
      traitItems: prev.traitItems.map((item) =>
        item.key === key ? { ...item, weight: Number(weight) || 0 } : item
      ),
    }));
  }, []);

  const updateRtwWeight = useCallback((key, weight) => {
    setModel((prev) => ({
      ...prev,
      rtwItems: prev.rtwItems.map((item) =>
        item.key === key ? { ...item, weight: Number(weight) || 0 } : item
      ),
    }));
  }, []);

  const evaluateStudentTraits = useCallback(
    (traitsMap) => evaluateCriteriaSummary(traitsMap, model.traitItems, model),
    [model]
  );

  const evaluateStudentRtw = useCallback(
    (rtwMap) => evaluateCriteriaSummary(rtwMap, model.rtwItems, model),
    [model]
  );

  return {
    model,
    setModel,
    updateModel,
    updateTraitWeight,
    updateRtwWeight,
    evaluateStudentTraits,
    evaluateStudentRtw,
  };
}
