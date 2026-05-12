import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Upload, List, TrendingUp, BarChart3, PiggyBank, LogOut, Sun, Moon } from 'lucide-react';
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

function Divider() {
  return (
    <span aria-hidden="true" style={{
      color: 'var(--color-border-strong)',
      fontSize: 'var(--text-sm)',
      userSelect: 'none',
    }}>|</span>
  );
}

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
        height: '48px',
        background: 'var(--color-bg)',
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
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 'var(--text-md)',
              color: 'var(--color-text)',
            }}>
              Home Finance
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            className="desktop-nav"
          >
            {navItems.map((item, i) => {
              const isActive = location.pathname === item.path;
              return (
                <span key={item.path} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {i > 0 && <Divider />}
                  <Link
                    to={item.path}
                    style={{
                      textDecoration: 'none',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-md)',
                      fontWeight: isActive ? 500 : 400,
                      transition: 'color 120ms ease-out',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--color-text)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    {item.label}
                  </Link>
                </span>
              );
            })}

            <Divider />

            <span style={{
              fontSize: 'var(--text-md)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}>
              {user?.username}
            </span>

            <Divider />

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'color 120ms ease-out',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              title="Выйти"
            >
              <LogOut size={16} />
            </button>

            <Divider />

            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'color 120ms ease-out',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
          padding: '0.4rem 0.25rem',
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
                gap: '0.2rem',
                padding: '0.4rem 0.5rem',
                textDecoration: 'none',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontSize: '0.65rem',
                fontWeight: isActive ? 500 : 400,
                transition: 'color 120ms ease-out',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          title="Выйти"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            padding: '0.4rem 0.5rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            fontSize: '0.65rem',
            cursor: 'pointer',
          }}
        >
          <LogOut size={22} />
          <span>Выйти</span>
        </button>
      </nav>

      <div style={{ height: '72px' }} className="mobile-nav-spacer" />

      <OfflineIndicator />

      <style>{`
        @media (min-width: 768px) {
          .mobile-nav, .mobile-nav-spacer { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
