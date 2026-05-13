import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Upload, List, TrendingUp, BarChart3, PiggyBank, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import { useAuth } from '../contexts/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/upload', icon: Upload, label: 'Загрузить' },
  { path: '/transactions', icon: List, label: 'Расходы' },
  { path: '/income', icon: TrendingUp, label: 'Доходы' },
  { path: '/reports', icon: BarChart3, label: 'Отчёты' },
  { path: '/budgets', icon: PiggyBank, label: 'Бюджеты' },
];

const mobileNavItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/upload', icon: Upload, label: 'Загрузить' },
  { path: '/transactions', icon: List, label: 'Расходы' },
  { path: '/reports', icon: BarChart3, label: 'Отчёты' },
  { path: '/budgets', icon: PiggyBank, label: 'Бюджеты' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Header */}
      <header style={{
        height: '56px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1rem',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--color-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.03em',
              boxShadow: '0 0 12px rgba(6,182,212,0.30)',
            }}>
              HF
            </span>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 'var(--text-md)',
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}>
              Home Finance
            </span>
          </Link>

          {/* Mobile header controls (theme + logout) */}
          <div className="mobile-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '0.375rem',
                borderRadius: 'var(--radius-md)',
                border: 'none', background: 'transparent',
                color: 'var(--color-text-secondary)', cursor: 'pointer',
              }}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '0.375rem',
                borderRadius: 'var(--radius-md)',
                border: 'none', background: 'transparent',
                color: 'var(--color-text-muted)', cursor: 'pointer',
              }}
              title="Выйти"
            >
              <LogOut size={17} />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            className="desktop-nav"
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    fontWeight: isActive ? 500 : 400,
                    transition: 'color 120ms ease-out, background 120ms ease-out',
                    whiteSpace: 'nowrap',
                    padding: '0.375rem 0.625rem',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--color-accent-bg)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-surface-2)'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Divider */}
            <span style={{ width: '1px', height: '16px', background: 'var(--color-border-strong)', margin: '0 0.375rem' }} />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.375rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'color 120ms ease-out, background 120ms ease-out',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'background 120ms ease-out, border-color 120ms ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                <span style={{
                  width: '22px', height: '22px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-bg)',
                  border: '1px solid rgba(6,182,212,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 600, color: 'var(--color-accent)',
                  flexShrink: 0,
                }}>
                  {(user?.username ?? 'U')[0].toUpperCase()}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', maxWidth: '96px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.username}
                </span>
                <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6, transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease-out' }} />
              </button>

              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
                    minWidth: '140px',
                    padding: '0.25rem',
                    zIndex: 100,
                    animation: 'fade-up 120ms ease-out',
                  }}
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none', background: 'transparent',
                      color: 'var(--color-danger)',
                      fontSize: 'var(--text-md)',
                      cursor: 'pointer',
                      transition: 'background 120ms ease-out',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut size={14} />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '1.5rem 1rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: '0.35rem 0.5rem',
          display: 'flex',
          justifyContent: 'space-around',
          zIndex: 50,
        }}
        className="mobile-nav"
      >
        {mobileNavItems.map((item) => {
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
                gap: '0.18rem',
                padding: '0.375rem 0.625rem',
                textDecoration: 'none',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontSize: '0.625rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'color 120ms ease-out',
                borderRadius: 'var(--radius-md)',
                minWidth: '44px',
                minHeight: '44px',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ height: '72px' }} className="mobile-nav-spacer" />

      <OfflineIndicator />

      <style>{`
        @media (min-width: 768px) {
          .mobile-nav, .mobile-nav-spacer, .mobile-header-controls { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
