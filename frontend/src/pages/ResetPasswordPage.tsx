import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { slideUp } from '../motion';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      navigate('/login', { state: { message: 'Пароль успешно изменён. Войдите с новым паролем.' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверная или истёкшая ссылка');
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

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 2rem', maxWidth: '420px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Ссылка для сброса недействительна.</p>
          <Link to="/forgot-password" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Запросить новую</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '1rem',
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
          <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', boxShadow: '0 0 16px rgba(6,182,212,0.32)', flexShrink: 0 }}>HF</span>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-body)', letterSpacing: '-0.01em' }}>
            Home Finance
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <KeyRound size={36} color="var(--color-accent)" />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
          Новый пароль
        </h2>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(248, 113, 113, 0.08)', color: 'var(--color-danger)',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                border: '1px solid rgba(248, 113, 113, 0.2)', marginBottom: '1rem',
              }}
            >{error}</motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          {['Новый пароль', 'Подтвердите пароль'].map((label, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
              </label>
              <input
                type="password"
                value={i === 0 ? newPassword : confirm}
                onChange={e => i === 0 ? setNewPassword(e.target.value) : setConfirm(e.target.value)}
                required
                minLength={8}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
              />
            </div>
          ))}
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
              marginTop: '0.5rem',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = `linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%), var(--color-accent-hover)`;
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(6,182,212,0.35), 0 1px 3px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = `linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%), var(--color-accent)`;
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)';
              }
            }}
          >
            {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
