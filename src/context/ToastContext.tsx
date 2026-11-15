import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type, duration = 3500 }: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, title, message, type, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const getIcon = () => {
              switch (toast.type) {
                case 'success':
                  return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
                case 'warning':
                  return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
                case 'error':
                  return <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />;
                default:
                  return <Info className="w-4 h-4 text-[#4f46e5] shrink-0" />;
              }
            };

            const getBorderAndBg = () => {
              switch (toast.type) {
                case 'success':
                  return 'bg-white border-emerald-200 shadow-[0_8px_20px_rgba(5,150,105,0.12)]';
                case 'warning':
                  return 'bg-white border-amber-200 shadow-[0_8px_20px_rgba(217,119,6,0.12)]';
                case 'error':
                  return 'bg-white border-red-200 shadow-[0_8px_20px_rgba(220,38,38,0.12)]';
                default:
                  return 'bg-white border-[#c7d2fe] shadow-[0_8px_20px_rgba(79,70,229,0.12)]';
              }
            };

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`pointer-events-auto p-3.5 rounded-xl border flex items-start gap-3 text-left ${getBorderAndBg()}`}
              >
                <div className="mt-0.5">{getIcon()}</div>
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-[#0b1c30]">{toast.title}</h4>
                  {toast.message && (
                    <p className="text-[11px] text-[#565e74] mt-0.5 leading-relaxed">{toast.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-[#777587] hover:text-[#0b1c30] p-0.5 rounded transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
