import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-enter"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: `1px solid ${
                toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
              }`,
              minWidth: '280px',
              maxWidth: '400px',
              pointerEvents: 'auto',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={20} color="var(--color-success)" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                padding: '0.25rem',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
