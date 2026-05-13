import { useMemo } from 'react';
import { CATEGORIES, CATEGORY_LABELS, INCOME_CATEGORIES, INCOME_CATEGORY_LABELS } from '../types';
import type { Category, IncomeCategory, TransactionType } from '../types';
import { Select } from './Select';

interface CategorySelectorProps {
  value: string;
  confidence: number;
  onChange: (category: string) => void;
  type?: TransactionType;
}

export function CategorySelector({ value, confidence, onChange, type = 'expense' }: CategorySelectorProps) {
  const getBadge = () => {
    if (confidence >= 0.8) return { color: 'var(--color-income)', bg: 'var(--color-income-bg)', text: 'Высокая' };
    if (confidence >= 0.5) return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', text: 'Проверь' };
    return { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', text: 'Низкая' };
  };

  const badge = getBadge();

  const options = useMemo(() => type === 'income'
    ? INCOME_CATEGORIES.map(cat => ({ value: cat, label: INCOME_CATEGORY_LABELS[cat as IncomeCategory] }))
    : CATEGORIES.map(cat => ({ value: cat, label: CATEGORY_LABELS[cat as Category] }))
  , [type]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        style={{ flex: 1 }}
      />
      <span style={{
        fontSize: 'var(--text-xs)',
        color: badge.color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        padding: '0.25rem 0.5rem',
        borderRadius: 'var(--radius-full)',
        background: badge.bg,
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}>
        {Math.round(confidence * 100)}% · {badge.text}
      </span>
    </div>
  );
}
