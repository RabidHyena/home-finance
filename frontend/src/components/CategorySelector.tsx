import { CATEGORIES, CATEGORY_LABELS } from '../types';

interface CategorySelectorProps {
  value: string;
  confidence: number;
  onChange: (category: string) => void;
}

export function CategorySelector({ value, confidence, onChange }: CategorySelectorProps) {
  const getBadge = () => {
    if (confidence >= 0.8) return { color: 'var(--color-success)', text: 'Высокая уверенность' };
    if (confidence >= 0.5) return { color: 'var(--color-warning)', text: 'Требует проверки' };
    return { color: 'var(--color-danger)', text: 'Проверьте' };
  };

  const badge = getBadge();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '0.5rem',
          borderRadius: '0.375rem',
          border: `2px solid ${confidence < 0.8 ? 'var(--color-warning)' : 'var(--color-border)'}`,
          backgroundColor: 'var(--color-surface)',
          flex: 1,
        }}
      >
        {CATEGORIES.map(cat => (
          <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
        ))}
      </select>
      <span style={{
        fontSize: '0.75rem',
        color: badge.color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {Math.round(confidence * 100)}% • {badge.text}
      </span>
    </div>
  );
}
