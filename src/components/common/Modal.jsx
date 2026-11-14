import React from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
      <div className={`bg-white w-full ${maxWidth} rounded-2xl shadow-2xl border border-ivory-300 overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white border-b-2 border-gold-500">
          <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
