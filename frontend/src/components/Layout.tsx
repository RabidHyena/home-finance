import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Upload, List, TrendingUp, BarChart3, Wallet, PiggyBank, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
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

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)' }}>
      {/* Header */}
      <header
        style={{
          background: 'var(--color-surface-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.75rem 1rem',
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
              gap: '0.6rem',
              textDecoration: 'none',
              color: 'var(--color-text)',
            }}
          >
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Wallet size={28} color="var(--color-primary)" />
            </motion.div>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '0.05em',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              HOME FINANCE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            style={{
              display: 'flex',
              gap: '0.25rem',
              alignItems: 'center',
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
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-full)',
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                    transition: 'all 0.25s ease-out',
                    background: isActive ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-primary)';
                      e.currentTarget.style.background = 'rgba(129, 140, 248, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        left: '20%',
                        right: '20%',
                        height: 2,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary)',
                        boxShadow: '0 0 8px var(--color-primary-glow)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* User info and logout */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginLeft: '0.75rem',
              paddingLeft: '0.75rem',
              borderLeft: '1px solid var(--color-border)',
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.03em',
              }}>
                {user?.username}
              </span>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.1, color: 'var(--color-danger)' }}
                whileTap={{ scale: 0.9 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Выйти"
              >
                <LogOut size={16} />
              </motion.button>
            </div>
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
          background: 'var(--color-surface-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.4rem 0.5rem',
                textDecoration: 'none',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontSize: '0.65rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'color 0.2s',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Icon size={22} />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '15%',
                    right: '15%',
                    height: 2,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-primary)',
                    boxShadow: '0 0 8px var(--color-primary-glow)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            padding: '0.4rem 0.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--color-text-muted)',
            fontSize: '0.65rem',
            cursor: 'pointer',
          }}
        >
          <LogOut size={22} />
          <span>Выйти</span>
        </button>
      </nav>

      {/* Spacer for mobile nav */}
      <div style={{ height: '72px' }} className="mobile-nav-spacer" />

      {/* Offline Indicator */}
      <OfflineIndicator />

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
