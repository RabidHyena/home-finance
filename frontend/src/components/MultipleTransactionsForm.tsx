import { useState } from 'react';
import { format } from 'date-fns';
import type { ParsedTransaction, TransactionCreate, Currency } from '../types';
import { CURRENCY_SYMBOLS } from '../types';
import { CategorySelector } from './CategorySelector';

interface MultipleTransactionsFormProps {
  transactions: ParsedTransaction[];
  totalAmount: number;
  onSubmit: (transactions: TransactionCreate[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function MultipleTransactionsForm({
  transactions,
  totalAmount,
  onSubmit,
  onCancel,
  isLoading,
}: MultipleTransactionsFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(transactions.map((_, i) => i))
  );
  const [editedTransactions, setEditedTransactions] = useState<Map<number, Partial<ParsedTransaction>>>(
    new Map()
  );

  const updateCategory = (index: number, category: string) => {
    setEditedTransactions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(index) || {};
      newMap.set(index, { ...current, category });
      return newMap;
    });
  };

  const updateDate = (index: number, date: string) => {
    setEditedTransactions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(index) || {};
      newMap.set(index, { ...current, date });
      return newMap;
    });
  };

  // Handle empty transactions
  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          На скриншоте не найдено транзакций
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Попробуйте загрузить другой скриншот с четким изображением транзакций
        </p>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Попробовать снова
          </button>
        )}
      </div>
    );
  }

  const toggleTransaction = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((_, i) => i)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedTransactions: TransactionCreate[] = transactions
      .map((tx, i) => ({ tx, i }))
      .filter(({ i }) => selectedIds.has(i))
      .map(({ tx, i }) => {
        const edited = editedTransactions.get(i);
        const date = edited?.date || tx.date;
        return {
          amount: Number(tx.amount),
          description: tx.description,
          category: edited?.category || tx.category || undefined,
          date: new Date(date).toISOString(),
          currency: tx.currency as Currency,
          raw_text: tx.raw_text,
          confidence: tx.confidence,
        };
      });

    onSubmit(selectedTransactions);
  };

  const selectedTotal = transactions
    .filter((_, i) => selectedIds.has(i))
    .reduce((sum, tx) => {
      const amount = Number(tx.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

  const allSelected = selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < transactions.length;

  // Get currency from first transaction or default to RUB
  const currency = (transactions[0]?.currency as Currency) || 'RUB';

  // Ensure totalAmount is a number
  const totalAmountNum = Number(totalAmount);
  const safeTotal = isNaN(totalAmountNum) ? 0 : totalAmountNum;

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Распознано транзакций: {transactions.length}
          </h3>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {safeTotal.toFixed(2)} {CURRENCY_SYMBOLS[currency]}
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Выбрано: {selectedIds.size} из {transactions.length} • Сумма: {(isNaN(selectedTotal) ? 0 : selectedTotal).toFixed(2)} {CURRENCY_SYMBOLS[currency]}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: 'var(--color-background)' }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={handleSelectAll}
            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 600 }}>
            {allSelected ? 'Снять выделение со всех' : 'Выбрать все'}
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {transactions.map((tx, index) => {
          const confidence = Number(tx.confidence) || 0;
          return (
            <label
              key={index}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '2px solid',
                borderColor: selectedIds.has(index) ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: selectedIds.has(index) ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(index)}
                onChange={() => toggleTransaction(index)}
                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', flexShrink: 0, marginTop: '0.125rem' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {tx.description}
                    </div>
                    <input
                      type="datetime-local"
                      value={(() => {
                        try {
                          return format(new Date(editedTransactions.get(index)?.date || tx.date), "yyyy-MM-dd'T'HH:mm");
                        } catch {
                          return '';
                        }
                      })()}
                      onChange={(e) => updateDate(index, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)',
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.25rem',
                        padding: '0.125rem 0.25rem',
                        cursor: 'text',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)', textAlign: 'right' }}>
                    {Number(tx.amount).toFixed(2)} {CURRENCY_SYMBOLS[tx.currency as Currency]}
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <CategorySelector
                    value={editedTransactions.get(index)?.category ?? tx.category ?? 'Other'}
                    confidence={confidence}
                    onChange={(cat) => updateCategory(index, cat)}
                  />
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || selectedIds.size === 0}
        >
          {isLoading
            ? 'Сохранение...'
            : `Сохранить ${selectedIds.size === transactions.length ? 'все' : `выбранные (${selectedIds.size})`}`}
        </button>
      </div>
    </form>
  );
}
