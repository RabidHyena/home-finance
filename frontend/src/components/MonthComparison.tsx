import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MonthComparisonData } from '../types';
import { CATEGORY_LABELS } from '../types';

interface MonthComparisonProps {
  data: MonthComparisonData;
}

export function MonthComparison({ data }: MonthComparisonProps) {
  const { current, previous, changes } = data;

  const getChangeIcon = (percent: number) => {
    if (percent > 5) return <TrendingUp style={{ color: 'var(--color-danger)' }} />;
    if (percent < -5) return <TrendingDown style={{ color: 'var(--color-success)' }} />;
    return <Minus style={{ color: 'var(--color-text-muted)' }} />;
  };

  const getChangeColor = (percent: number): string => {
    if (percent > 0) return '#f87171';
    if (percent < 0) return '#34d399';
    return '#94a3b8';
  };

  const periodCardStyle: React.CSSProperties = {
    padding: '1rem 1.25rem',
    background: 'var(--color-surface-elevated)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  };

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      padding: 'var(--space-lg)',
    }}>
      <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em', marginBottom: '1rem' }}>
        Сравнение с прошлым месяцем
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={periodCardStyle}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Текущий месяц</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Number(current.total).toFixed(2)} ₽</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{current.count} транзакций</p>
        </div>

        <div style={periodCardStyle}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Прошлый месяц</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Number(previous.total).toFixed(2)} ₽</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{previous.count} транзакций</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        padding: '0.875rem 1rem',
        background: 'var(--color-surface-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        {getChangeIcon(changes.total_percent)}
        <span style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: getChangeColor(changes.total_percent) }}>
          {changes.total_percent > 0 ? '+' : ''}{changes.total_percent}%
        </span>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {changes.total_percent > 0 ? 'больше' : changes.total_percent < 0 ? 'меньше' : 'без изменений'} чем в прошлом месяце
        </span>
      </div>

      <div>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.02em' }}>
          Изменения по категориям
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {changes.by_category.map((cat) => (
            <div key={cat.category} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.875rem',
              background: 'var(--color-surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              transition: 'border-color 0.2s',
            }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>
                  {CATEGORY_LABELS[cat.category as keyof typeof CATEGORY_LABELS] || cat.category}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
                  {Number(cat.previous).toFixed(0)} ₽ → {Number(cat.current).toFixed(0)} ₽
                </p>
              </div>
              <span style={{
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                fontSize: '0.85rem',
                color: getChangeColor(cat.change_percent),
              }}>
                {cat.change_percent > 0 ? '+' : ''}{cat.change_percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
