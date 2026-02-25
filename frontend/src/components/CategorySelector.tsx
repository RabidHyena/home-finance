import { CATEGORIES, CATEGORY_LABELS, INCOME_CATEGORIES, INCOME_CATEGORY_LABELS } from '../types';
import type { TransactionType } from '../types';

interface CategorySelectorProps {
  value: string;
  confidence: number;
  onChange: (category: string) => void;
  type?: TransactionType;
}

export function CategorySelector({ value, confidence, onChange, type = 'expense' }: CategorySelectorProps) {
  const getBadge = () => {
    if (confidence >= 0.8) return { color: 'var(--color-success)', bg: 'rgba(52, 211, 153, 0.1)', text: 'Высокая уверенность' };
    if (confidence >= 0.5) return { color: 'var(--color-warning)', bg: 'rgba(251, 191, 36, 0.1)', text: 'Требует проверки' };
    return { color: 'var(--color-danger)', bg: 'rgba(248, 113, 113, 0.1)', text: 'Проверьте' };
  };

  const badge = getBadge();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${confidence < 0.8 ? 'rgba(251, 191, 36, 0.3)' : 'var(--color-border-strong)'}`,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          flex: 1,
          transition: 'border-color 0.25s',
        }}
      >
        {type === 'income'
          ? INCOME_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{INCOME_CATEGORY_LABELS[cat]}</option>
            ))
          : CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))
        }
      </select>
      <span style={{
        fontSize: '0.7rem',
        color: badge.color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        padding: '0.2rem 0.5rem',
        borderRadius: 'var(--radius-full)',
        background: badge.bg,
        letterSpacing: '0.02em',
      }}>
        {Math.round(confidence * 100)}% • {badge.text}
      </span>
    </div>
  );
}
