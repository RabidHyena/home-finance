import { memo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Trash2, Edit2 } from 'lucide-react';
import type { Transaction, Category, IncomeCategory, Currency } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS, INCOME_CATEGORY_COLORS, INCOME_CATEGORY_LABELS, CURRENCY_SYMBOLS } from '../types';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: number) => void;
}

export const TransactionCard = memo(function TransactionCard({
  transaction,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const isIncome = transaction.type === 'income';
  const category = transaction.category as (Category | IncomeCategory) | null;
  const categoryColor = category
    ? (isIncome ? INCOME_CATEGORY_COLORS[category as IncomeCategory] : CATEGORY_COLORS[category as Category]) || '#6b7280'
    : '#6b7280';
  const categoryLabel = category
    ? (isIncome ? INCOME_CATEGORY_LABELS[category as IncomeCategory] : CATEGORY_LABELS[category as Category]) || category
    : 'Без категории';

  const dateStr = (() => {
    try { return format(new Date(transaction.date), 'd MMM, HH:mm', { locale: ru }); }
    catch { return 'Неизвестная дата'; }
  })();

  return (
    <div
      className="tx-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'transparent',
        transition: 'background 120ms ease-out',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Category dot */}
      <span style={{
        width: '9px',
        height: '9px',
        borderRadius: '50%',
        background: categoryColor,
        flexShrink: 0,
        boxShadow: `0 0 5px ${categoryColor}55`,
      }} />

      {/* Description */}
      <span style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        fontSize: 'var(--text-base)',
        color: 'var(--color-text)',
        flex: '1 1 0',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {transaction.description}
      </span>

      {/* Category badge */}
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        background: categoryColor + '1f',
        color: categoryColor,
        borderRadius: 'var(--radius-sm)',
        padding: '2px 6px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {categoryLabel}
      </span>

      {/* Date */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-muted)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {dateStr}
      </span>

      {/* Amount */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        fontSize: 'var(--text-md)',
        color: isIncome ? 'var(--color-income)' : 'var(--color-text)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        minWidth: '80px',
        textAlign: 'right',
      }}>
        {isIncome ? '+' : '−'}{transaction.amount.toLocaleString('ru-RU')} {CURRENCY_SYMBOLS[transaction.currency as Currency] || '₽'}
      </span>

      {/* Actions — revealed on row hover via CSS */}
      {(onEdit || onDelete) && (
        <div
          className="tx-actions"
          style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, opacity: 0, transition: 'opacity 120ms ease-out' }}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              style={{
                padding: '0.25rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'color 120ms ease-out',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title="Редактировать"
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              style={{
                padding: '0.25rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'color 120ms ease-out',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title="Удалить"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
