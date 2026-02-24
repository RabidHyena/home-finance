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
  const category = transaction.category as (Category & IncomeCategory) | null;
  const categoryColor = category
    ? (isIncome ? INCOME_CATEGORY_COLORS[category as IncomeCategory] : CATEGORY_COLORS[category as Category]) || '#6b7280'
    : '#6b7280';
  const categoryLabel = category
    ? (isIncome ? INCOME_CATEGORY_LABELS[category as IncomeCategory] : CATEGORY_LABELS[category as Category]) || category
    : 'Без категории';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
      }}
    >
      {/* Category indicator */}
      <div
        style={{
          width: '4px',
          height: '40px',
          borderRadius: '2px',
          backgroundColor: categoryColor,
          flexShrink: 0,
        }}
      />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontWeight: 500,
                fontSize: '1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {transaction.description}
            </p>
            <p
              style={{
                margin: '0.25rem 0 0',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              {categoryLabel} •{' '}
              {(() => {
                try {
                  return format(new Date(transaction.date), 'd MMM, HH:mm', { locale: ru });
                } catch {
                  return 'Неизвестная дата';
                }
              })()}
            </p>
          </div>

          <div
            style={{
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '1.125rem',
                color: isIncome ? '#16a34a' : 'var(--color-danger)',
              }}
            >
              {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} {CURRENCY_SYMBOLS[transaction.currency as Currency] || '₽'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'color 0.2s',
              }}
              title="Редактировать"
            >
              <Edit2 size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction.id)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'color 0.2s',
              }}
              title="Удалить"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
