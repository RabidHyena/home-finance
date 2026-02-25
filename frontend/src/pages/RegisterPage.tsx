import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/useAuth';
import { slideUp, staggerContainer, staggerItem } from '../motion';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-accent)';
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-glow)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gradient-hero)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative background circles */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '-5%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(129, 140, 248, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '-8%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

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
          position: 'relative',
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            marginBottom: '2rem',
          }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Wallet size={32} color="var(--color-primary)" />
          </motion.div>
          <h1 style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.06em',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
          }}>HOME FINANCE</h1>
        </motion.div>

        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '1.5rem',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          Регистрация
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
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </motion.div>

          <motion.div variants={staggerItem} style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Имя пользователя</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              minLength={3}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </motion.div>

          <motion.div variants={staggerItem} style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Пароль</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </motion.div>

          <motion.div variants={staggerItem} style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Подтвердите пароль</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(129, 140, 248, 0.25)' }}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                letterSpacing: '0.02em',
              }}
            >
              <UserPlus size={20} />
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </motion.button>
          </motion.div>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
          }}
        >
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            Войти
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
