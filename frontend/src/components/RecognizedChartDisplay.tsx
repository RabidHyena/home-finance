import { useState } from 'react';
import { format } from 'date-fns';
import type { ParsedChart, TransactionCreate, Category } from '../types';
import { CATEGORY_COLORS } from '../types';

const RUSSIAN_MONTHS: Record<string, number> = {
  'январь': 0, 'января': 0, 'янв': 0,
  'февраль': 1, 'февраля': 1, 'фев': 1,
  'март': 2, 'марта': 2, 'мар': 2,
  'апрель': 3, 'апреля': 3, 'апр': 3,
  'май': 4, 'мая': 4,
  'июнь': 5, 'июня': 5, 'июн': 5,
  'июль': 6, 'июля': 6, 'июл': 6,
  'август': 7, 'августа': 7, 'авг': 7,
  'сентябрь': 8, 'сентября': 8, 'сен': 8,
  'октябрь': 9, 'октября': 9, 'окт': 9,
  'ноябрь': 10, 'ноября': 10, 'ноя': 10,
  'декабрь': 11, 'декабря': 11, 'дек': 11,
};

function parsePeriodToDate(period: string | undefined): Date {
  if (!period) return new Date();

  const parts = period.trim().toLowerCase().split(/\s+/);
  for (const part of parts) {
    if (part in RUSSIAN_MONTHS) {
      const monthIndex = RUSSIAN_MONTHS[part];
      const yearPart = parts.find(p => /^\d{4}$/.test(p));
      const year = yearPart ? parseInt(yearPart, 10) : new Date().getFullYear();
      return new Date(year, monthIndex, 1);
    }
  }

  const fallback = new Date(period);
  if (!isNaN(fallback.getTime())) return fallback;

  return new Date();
}

interface RecognizedChartDisplayProps {
  chart: ParsedChart;
  onCreateTransactions?: (transactions: TransactionCreate[]) => void;
  isCreating?: boolean;
}

export function RecognizedChartDisplay({
  chart,
  onCreateTransactions,
  isCreating = false,
}: RecognizedChartDisplayProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    new Set(chart.categories.map((_, i) => i))
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    format(parsePeriodToDate(chart.period), "yyyy-MM-dd'T'HH:mm")
  );

  const toggleCategory = (index: number) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCategories.size === chart.categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(chart.categories.map((_, i) => i)));
    }
  };

  const handleCreateTransactions = () => {
    if (!onCreateTransactions) return;

    const transactions: TransactionCreate[] = chart.categories
      .filter((_, i) => selectedCategories.has(i))
      .map((category) => {
        // Try to map category name to our predefined categories
        const normalizedName = category.name.toLowerCase();
        let mappedCategory: Category | undefined;

        if (normalizedName.includes('еда') || normalizedName.includes('food')) mappedCategory = 'Food';
        else if (normalizedName.includes('транспорт') || normalizedName.includes('transport')) mappedCategory = 'Transport';
        else if (normalizedName.includes('развлеч') || normalizedName.includes('entertainment')) mappedCategory = 'Entertainment';
        else if (normalizedName.includes('покупк') || normalizedName.includes('shopping')) mappedCategory = 'Shopping';
        else if (normalizedName.includes('счет') || normalizedName.includes('bills') || normalizedName.includes('платеж')) mappedCategory = 'Bills';
        else if (normalizedName.includes('здоровье') || normalizedName.includes('health') || normalizedName.includes('аптек')) mappedCategory = 'Health';
        else mappedCategory = 'Other';

        return {
          amount: Number(category.value),
          description: `${category.name}${chart.period ? ` - ${chart.period}` : ''}`,
          category: mappedCategory,
          date: new Date(selectedDate).toISOString(),
          currency: 'RUB',
          raw_text: `Создано из диаграммы: ${chart.type}`,
        };
      });

    onCreateTransactions(transactions);
  };

  const getChartTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      pie: 'Круговая диаграмма',
      bar: 'Столбчатая диаграмма',
      line: 'Линейный график',
      other: 'Диаграмма',
    };
    return types[type] || 'Диаграмма';
  };

  const getCategoryColor = (name: string) => {
    // Try to match with predefined categories
    const normalizedName = name.toLowerCase();
    if (normalizedName.includes('еда') || normalizedName.includes('food')) return CATEGORY_COLORS.Food;
    if (normalizedName.includes('транспорт') || normalizedName.includes('transport')) return CATEGORY_COLORS.Transport;
    if (normalizedName.includes('развлеч') || normalizedName.includes('entertainment')) return CATEGORY_COLORS.Entertainment;
    if (normalizedName.includes('покупк') || normalizedName.includes('shopping')) return CATEGORY_COLORS.Shopping;
    if (normalizedName.includes('счет') || normalizedName.includes('bills')) return CATEGORY_COLORS.Bills;
    if (normalizedName.includes('здоровье') || normalizedName.includes('health')) return CATEGORY_COLORS.Health;

    // Generate a color based on the name
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'];
    return colors[hash % colors.length];
  };

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid var(--color-primary)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            📊 Обнаружена диаграмма
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {getChartTypeLabel(chart.type)}
            {chart.period && ` • ${chart.period}`}
          </p>
        </div>
        <div
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            backgroundColor:
              chart.confidence >= 0.8
                ? 'rgba(34, 197, 94, 0.1)'
                : chart.confidence >= 0.5
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            color:
              chart.confidence >= 0.8
                ? 'var(--color-success)'
                : chart.confidence >= 0.5
                ? 'var(--color-warning)'
                : 'var(--color-danger)',
          }}
        >
          {Math.round(chart.confidence * 100)}% уверенность
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--color-background)',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Общая сумма:</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {Number(chart.total).toFixed(2)} ₽
          </span>
        </div>

        {onCreateTransactions && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--color-background)',
              marginBottom: '0.75rem',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Дата:</span>
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
              }}
            />
          </div>
        )}

        {onCreateTransactions && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                backgroundColor: 'var(--color-background)',
              }}
            >
              <input
                type="checkbox"
                checked={selectedCategories.size === chart.categories.length}
                onChange={handleSelectAll}
                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {selectedCategories.size === chart.categories.length
                  ? 'Снять выделение со всех'
                  : 'Выбрать все категории'}
              </span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {chart.categories.map((item, index) => {
            const percentage = item.percentage || (Number(item.value) / Number(chart.total)) * 100;
            const color = getCategoryColor(item.name);

            const isSelected = selectedCategories.has(index);

            return (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-surface)',
                  border: onCreateTransactions ? '2px solid' : 'none',
                  borderColor: isSelected ? 'var(--color-primary)' : 'transparent',
                  cursor: onCreateTransactions ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                {onCreateTransactions && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(index)}
                    style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', flexShrink: 0 }}
                  />
                )}
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.name}</div>
                  <div
                    style={{
                      marginTop: '0.25rem',
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: 'var(--color-background)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {Number(item.value).toFixed(2)} ₽
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {onCreateTransactions ? (
        <>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              marginBottom: '1rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              💡 <strong>Создание транзакций:</strong> Выберите категории, для которых хотите
              создать транзакции. Для каждой категории будет создана одна транзакция с указанной суммой.
            </p>
          </div>
          <button
            onClick={handleCreateTransactions}
            disabled={isCreating || selectedCategories.size === 0}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {isCreating
              ? 'Создание транзакций...'
              : `Создать транзакции из выбранных категорий (${selectedCategories.size})`}
          </button>
        </>
      ) : (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            💡 <strong>Подсказка:</strong> Эти данные распознаны с диаграммы на скриншоте.
            Вы можете использовать их для анализа расходов по категориям.
          </p>
        </div>
      )}
    </div>
  );
}
