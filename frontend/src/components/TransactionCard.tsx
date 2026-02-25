import { memo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <motion.div
      whileHover={{ scale: 1.01, y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.875rem 1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
      onHoverStart={(_, info) => {
        const el = (info as { target?: HTMLElement })?.target;
        if (el) {
          el.style.borderColor = categoryColor + '40';
          el.style.boxShadow = `0 0 16px ${categoryColor}15`;
        }
      }}
    >
      {/* Category indicator */}
      <div
        style={{
          width: '4px',
          height: '40px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: categoryColor,
          flexShrink: 0,
          boxShadow: `0 0 8px ${categoryColor}40`,
        }}
      />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontWeight: 500,
              fontSize: '0.95rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--color-text)',
            }}>
              {transaction.description}
            </p>
            <p style={{
              margin: '0.2rem 0 0',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
            }}>
              <span style={{
                display: 'inline-block',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                background: categoryColor + '18',
                color: categoryColor,
                fontSize: '0.75rem',
                fontWeight: 500,
                marginRight: '0.4rem',
              }}>
                {categoryLabel}
              </span>
              {(() => {
                try {
                  return format(new Date(transaction.date), 'd MMM, HH:mm', { locale: ru });
                } catch {
                  return 'Неизвестная дата';
                }
              })()}
            </p>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{
              margin: 0,
              fontWeight: 700,
              fontSize: '1.05rem',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em',
              color: isIncome ? 'var(--color-accent)' : 'var(--color-danger)',
            }}>
              {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} {CURRENCY_SYMBOLS[transaction.currency as Currency] || '₽'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          {onEdit && (
            <motion.button
              onClick={() => onEdit(transaction)}
              whileHover={{ scale: 1.15, color: 'var(--color-accent)' }}
              whileTap={{ scale: 0.9 }}
              style={{
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'color 0.2s',
              }}
              title="Редактировать"
            >
              <Edit2 size={16} />
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              onClick={() => onDelete(transaction.id)}
              whileHover={{ scale: 1.15, color: 'var(--color-danger)' }}
              whileTap={{ scale: 0.9 }}
              style={{
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'color 0.2s',
              }}
              title="Удалить"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
});
