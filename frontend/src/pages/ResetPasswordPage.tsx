import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Wallet } from 'lucide-react';
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
    border: '2px solid var(--color-border)',
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-hero)' }}>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem', maxWidth: '420px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
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
            fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '0.06em',
            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0,
          }}>HOME FINANCE</h1>
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
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-glow)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-full)', border: 'none',
              background: 'var(--gradient-primary)', color: 'var(--color-text-inverse)',
              fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginTop: '0.5rem',
            }}
          >
            {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
