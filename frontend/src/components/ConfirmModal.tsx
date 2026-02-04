import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title = 'Подтверждение',
  message,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} color="var(--color-danger)" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
              {title}
            </h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              {message}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Удаление...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
