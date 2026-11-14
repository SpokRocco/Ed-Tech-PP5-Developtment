import React from 'react';
import { COURSE_STATUS_META } from '../../lib/thaiFormatting';

export function StatusBadge({ status }) {
  const meta = COURSE_STATUS_META[status] || COURSE_STATUS_META.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.badge}`}>
      {meta.label}
    </span>
  );
}
