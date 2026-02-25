import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-background)',
          }}
        >
          <div
            style={{
              padding: '2.5rem',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-surface)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '500px',
            }}
          >
            <h2
              style={{
                margin: '0 0 1rem',
                fontSize: '1.2rem',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.03em',
                color: 'var(--color-danger)',
              }}
            >
              Произошла ошибка
            </h2>
            <p
              style={{
                margin: '0 0 1.5rem',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Что-то пошло не так. Попробуйте перезагрузить страницу.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
