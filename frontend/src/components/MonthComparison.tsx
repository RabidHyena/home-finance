import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MonthComparisonData } from '../types';
import { CATEGORY_LABELS } from '../types';

interface MonthComparisonProps {
  data: MonthComparisonData;
}

export function MonthComparison({ data }: MonthComparisonProps) {
  const { current, previous, changes } = data;

  const getChangeIcon = (percent: number) => {
    if (percent > 5) return <TrendingUp style={{ color: 'var(--color-danger, #ef4444)' }} />;
    if (percent < -5) return <TrendingDown style={{ color: 'var(--color-success, #22c55e)' }} />;
    return <Minus style={{ color: 'var(--color-text-secondary, #6b7280)' }} />;
  };

  const getChangeColor = (percent: number): string => {
    if (percent > 0) return '#ef4444';
    if (percent < 0) return '#22c55e';
    return '#6b7280';
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Сравнение с прошлым месяцем</h2>

      {/* Total comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Текущий месяц</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{current.total.toFixed(2)} ₽</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text, #4b5563)' }}>{current.count} транзакций</p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Прошлый месяц</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{previous.total.toFixed(2)} ₽</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text, #4b5563)' }}>{previous.count} транзакций</p>
        </div>
      </div>

      {/* Changes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg, #eff6ff)', borderRadius: '0.5rem' }}>
        {getChangeIcon(changes.total_percent)}
        <span style={{ fontSize: '1.125rem', fontWeight: 600, color: getChangeColor(changes.total_percent) }}>
          {changes.total_percent > 0 ? '+' : ''}{changes.total_percent}%
        </span>
        <span style={{ color: 'var(--color-text, #4b5563)' }}>
          {changes.total_percent > 0 ? 'больше' : changes.total_percent < 0 ? 'меньше' : 'без изменений'} чем в прошлом месяце
        </span>
      </div>

      {/* Category changes */}
      <div>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Изменения по категориям</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {changes.by_category.map((cat) => (
            <div key={cat.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.25rem' }}>
              <div>
                <p style={{ fontWeight: 500 }}>{CATEGORY_LABELS[cat.category as keyof typeof CATEGORY_LABELS] || cat.category}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)' }}>
                  {cat.previous.toFixed(0)} ₽ → {cat.current.toFixed(0)} ₽
                </p>
              </div>
              <span style={{ fontWeight: 600, color: getChangeColor(cat.change_percent) }}>
                {cat.change_percent > 0 ? '+' : ''}{cat.change_percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
