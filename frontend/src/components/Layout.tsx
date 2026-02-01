import { Link, useLocation } from 'react-router-dom';
import { Home, Upload, List, BarChart3, Wallet } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/upload', icon: Upload, label: 'Загрузить' },
  { path: '/transactions', icon: List, label: 'Транзакции' },
  { path: '/reports', icon: BarChart3, label: 'Отчёты' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid var(--color-border)',
          padding: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: '1.25rem',
            }}
          >
            <Wallet size={28} color="var(--color-primary)" />
            Home Finance
          </Link>

          {/* Desktop Navigation */}
          <nav
            style={{
              display: 'flex',
              gap: '0.5rem',
            }}
            className="desktop-nav"
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTop: '1px solid var(--color-border)',
          padding: '0.5rem',
          display: 'flex',
          justifyContent: 'space-around',
          zIndex: 50,
        }}
        className="mobile-nav"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem',
                textDecoration: 'none',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '0.75rem',
              }}
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer for mobile nav */}
      <div style={{ height: '80px' }} className="mobile-nav-spacer" />

      <style>{`
        @media (min-width: 768px) {
          .mobile-nav, .mobile-nav-spacer {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
