import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<Props> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      onDismiss(toasts[0].id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <aside 
      id="notification-toast-container"
      aria-label="Notificaciones del sistema"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
              isSuccess
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                : isError
                ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                : isWarning
                ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                : 'bg-stone-50/95 border-stone-200 text-stone-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-stone-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="mt-1 text-xs opacity-90 leading-relaxed break-words">{toast.message}</p>
              )}
            </div>

            <button
              id={`btn-close-toast-${toast.id}`}
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </aside>
  );
};
