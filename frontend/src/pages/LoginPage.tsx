import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/useAuth';
import { slideUp, staggerContainer, staggerItem } from '../motion';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border-strong)',
    fontSize: '1rem',
    boxSizing: 'border-box',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.25s ease-out',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 500,
    marginBottom: '0.5rem',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-body)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
            Home Finance
          </span>
        </div>

        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '1.5rem',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          Вход в аккаунт
        </h2>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              style={{
                background: 'rgba(248, 113, 113, 0.08)',
                color: 'var(--color-danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                overflow: 'hidden',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem} style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Email или имя пользователя</label>
            <input
              type="text"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              required
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
            />
          </motion.div>

          <motion.div variants={staggerItem} style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Пароль</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: `linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%), var(--color-accent)`,
                color: 'white',
                fontSize: 'var(--text-md)',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background 120ms ease-out, box-shadow 120ms ease-out',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = `linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%), var(--color-accent-hover)`;
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(5,150,105,0.40), 0 1px 3px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = `linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%), var(--color-accent)`;
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)';
                }
              }}
            >
              <LogIn size={20} />
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </motion.div>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}
        >
          <Link to="/forgot-password" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
            Забыли пароль?
          </Link>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            textAlign: 'center',
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
          }}
        >
          Нет аккаунта?{' '}
          <Link to="/register" style={{
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s',
          }}>
            Зарегистрироваться
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
