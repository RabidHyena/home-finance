import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Transaction, TransactionCreate, ParsedTransaction, Category, Currency, TransactionType } from '../types';
import { CATEGORIES, CATEGORY_LABELS, INCOME_CATEGORIES, INCOME_CATEGORY_LABELS, CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_LABELS } from '../types';

interface TransactionFormProps {
  initialData?: Partial<TransactionCreate> | ParsedTransaction | Transaction;
  onSubmit: (data: TransactionCreate) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  confidence?: number;
  type?: TransactionType;
}

export function TransactionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  confidence,
  type: txType = 'expense',
}: TransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState<Currency>('RUB');

  useEffect(() => {
    if (initialData) {
      setAmount(String(initialData.amount ?? ''));
      setDescription(initialData.description || '');
      setCategory((initialData.category as Category) || '');
      setCurrency(('currency' in initialData ? (initialData.currency as Currency) : undefined) || 'RUB');

      if (initialData.date) {
        const d = new Date(initialData.date);
        setDate(format(d, "yyyy-MM-dd'T'HH:mm"));
      }
    } else {
      setAmount('');
      setDescription('');
      setCategory('');
      setCurrency('RUB');
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Введите корректную сумму больше нуля');
      return;
    }

    const data: TransactionCreate = {
      amount: parsedAmount,
      description,
      category: category || undefined,
      date: date.includes('T') ? date : `${date}T00:00:00`,
      currency,
    };

    if ('raw_text' in (initialData || {})) {
      data.raw_text = (initialData as ParsedTransaction).raw_text;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {confidence !== undefined && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            backgroundColor:
              confidence >= 0.8
                ? 'rgba(34, 197, 94, 0.1)'
                : confidence >= 0.5
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${
              confidence >= 0.8
                ? 'var(--color-success)'
                : confidence >= 0.5
                ? 'var(--color-warning)'
                : 'var(--color-danger)'
            }`,
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Уверенность распознавания:{' '}
            <strong>{Math.round(confidence * 100)}%</strong>
            {confidence < 0.8 && ' — проверьте данные'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label className="label" htmlFor="amount">
          Сумма
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label className="label" htmlFor="description">
          Описание
        </label>
        <input
          id="description"
          type="text"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Магазин, услуга..."
          required
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label className="label" htmlFor="category">
          Категория
        </label>
        <select
          id="category"
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | '')}
        >
          <option value="">Выберите категорию</option>
          {txType === 'income'
            ? INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {INCOME_CATEGORY_LABELS[cat]}
                </option>
              ))
            : CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))
          }
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label className="label" htmlFor="currency">
          Валюта
        </label>
        <select
          id="currency"
          className="select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
        >
          {CURRENCIES.map((curr) => (
            <option key={curr} value={curr}>
              {CURRENCY_SYMBOLS[curr]} - {CURRENCY_LABELS[curr]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label" htmlFor="date">
          Дата и время
        </label>
        <input
          id="date"
          type="datetime-local"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
        }}
      >
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
