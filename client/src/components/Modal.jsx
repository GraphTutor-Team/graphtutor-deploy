import { useEffect, useRef } from 'react';
import { makeModalAccessible } from '../utils/accessibility';

export default function Modal({ open, title, onClose, children, footer }){
  const modalRef = useRef(null);

  useEffect(() => {
    if (open && modalRef.current) {
      makeModalAccessible(modalRef.current);
    }
  }, [open]);

  if(!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between mb-3">
          <div id="modal-title" className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
            aria-label="关闭对话框"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
