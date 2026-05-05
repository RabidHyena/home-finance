import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { slideUp } from '../motion';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '2px solid var(--color-border)',
    fontSize: '1rem',
    boxSizing: 'border-box',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.25s ease-out',
    outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-hero)',
      padding: '1rem',
    }}>
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <Wallet size={28} color="var(--color-primary)" />
          <h1 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.06em',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
          }}>HOME FINANCE</h1>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <KeyRound size={48} color="var(--color-accent)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>
              Проверьте почту
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Если email зарегистрирован, на него отправлена ссылка для сброса пароля.
            </p>
            <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
              Вернуться к входу
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
              Сброс пароля
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Введите email — мы отправим ссылку для сброса
            </p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(248, 113, 113, 0.08)',
                    color: 'var(--color-danger)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    border: '1px solid rgba(248, 113, 113, 0.2)',
                    marginBottom: '1rem',
                  }}
                >{error}</motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-glow)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: 'var(--gradient-primary)',
                  color: 'var(--color-text-inverse)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? 'Отправка...' : 'Отправить ссылку'}
              </motion.button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              <Link to="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                Вернуться к входу
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
