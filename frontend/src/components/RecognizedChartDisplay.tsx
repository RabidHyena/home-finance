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

interface PeriodInfo {
  startDate: Date;
  endDate: Date;
  type: 'month' | 'year' | 'week' | 'custom';
}

function parsePeriod(period: string | undefined, periodType?: string): PeriodInfo {
  const now = new Date();
  const resolvedType = (periodType as PeriodInfo['type']) || undefined;

  if (!period) {
    // No period string but we have a type hint — use current year/month
    if (resolvedType === 'year') {
      return { startDate: new Date(now.getFullYear(), 0, 1), endDate: new Date(now.getFullYear(), 11, 31), type: 'year' };
    }
    if (resolvedType === 'month') {
      return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0), type: 'month' };
    }
    return { startDate: now, endDate: now, type: 'custom' };
  }

  // Try range format "YYYY-MM to YYYY-MM"
  const rangeMatch = period.match(/^(\d{4})-(\d{2})\s*(?:to|-|—)\s*(\d{4})-(\d{2})$/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1], 10);
    const startMonth = parseInt(rangeMatch[2], 10) - 1;
    const endYear = parseInt(rangeMatch[3], 10);
    const endMonth = parseInt(rangeMatch[4], 10) - 1;
    return {
      startDate: new Date(startYear, startMonth, 1),
      endDate: new Date(endYear, endMonth + 1, 0),
      type: resolvedType || 'custom',
    };
  }

  // Try structured format "YYYY-MM"
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1], 10);
    const month = parseInt(monthMatch[2], 10) - 1;
    // If AI says it's a year, trust it — expand to full year
    if (resolvedType === 'year') {
      return { startDate: new Date(year, 0, 1), endDate: new Date(year, 11, 31), type: 'year' };
    }
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month + 1, 0),
      type: resolvedType || 'month',
    };
  }

  // Try structured format "YYYY"
  const yearMatch = period.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return {
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      type: 'year',
    };
  }

  // Try Russian month names
  const parts = period.trim().toLowerCase().split(/\s+/);
  for (const part of parts) {
    if (part in RUSSIAN_MONTHS) {
      const monthIndex = RUSSIAN_MONTHS[part];
      const yearPart = parts.find(p => /^\d{4}$/.test(p));
      const year = yearPart ? parseInt(yearPart, 10) : now.getFullYear();
      // If AI says it's a year, trust it — expand to full year
      if (resolvedType === 'year') {
        return { startDate: new Date(year, 0, 1), endDate: new Date(year, 11, 31), type: 'year' };
      }
      return {
        startDate: new Date(year, monthIndex, 1),
        endDate: new Date(year, monthIndex + 1, 0),
        type: resolvedType || 'month',
      };
    }
  }

  const fallback = new Date(period);
  if (!isNaN(fallback.getTime())) {
    return { startDate: fallback, endDate: fallback, type: resolvedType || 'custom' };
  }

  // Last resort: use type hint to determine period
  if (resolvedType === 'year') {
    return { startDate: new Date(now.getFullYear(), 0, 1), endDate: new Date(now.getFullYear(), 11, 31), type: 'year' };
  }
  if (resolvedType === 'month') {
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0), type: 'month' };
  }

  return { startDate: now, endDate: now, type: 'custom' };
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

  const periodInfo = parsePeriod(chart.period, chart.period_type);

  const [periodStart, setPeriodStart] = useState<string>(
    format(periodInfo.startDate, "yyyy-MM-dd")
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    format(periodInfo.endDate, "yyyy-MM-dd")
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

  const mapCategory = (name: string): Category => {
    const n = name.toLowerCase();
    if (n.includes('еда') || n.includes('food') || n.includes('продукт') || n.includes('ресторан')) return 'Food';
    if (n.includes('транспорт') || n.includes('transport')) return 'Transport';
    if (n.includes('развлеч') || n.includes('entertainment')) return 'Entertainment';
    if (n.includes('покупк') || n.includes('shopping')) return 'Shopping';
    if (n.includes('счет') || n.includes('bills') || n.includes('платеж') || n.includes('комму')) return 'Bills';
    if (n.includes('здоровье') || n.includes('health') || n.includes('аптек') || n.includes('медиц')) return 'Health';
    return 'Other';
  };

  const getCategoryColor = (name: string): string => {
    const mapped = mapCategory(name);
    if (mapped !== 'Other') return CATEGORY_COLORS[mapped];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const fallbackColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'];
    return fallbackColors[hash % fallbackColors.length];
  };

  const handleCreateTransactions = () => {
    if (!onCreateTransactions) return;

    const selectedItems = chart.categories.filter((_, i) => selectedCategories.has(i));

    const start = new Date(periodStart + 'T00:00:00');
    const end = new Date(periodEnd + 'T23:59:59');

    const transactions: TransactionCreate[] = [];

    // For annual data, distribute each category across 12 months
    if (periodInfo.type === 'year') {
      const year = start.getFullYear();
      const monthlyAmount = 12; // number of months to distribute across

      for (const category of selectedItems) {
        const totalAmount = Number(category.value);
        const amountPerMonth = Math.round((totalAmount / monthlyAmount) * 100) / 100; // Round to 2 decimals

        for (let month = 0; month < 12; month++) {
          transactions.push({
            amount: Number(amountPerMonth.toFixed(2)),
            description: `${category.name} - ${year}-${String(month + 1).padStart(2, '0')}`,
            category: mapCategory(category.name),
            date: new Date(year, month, 15, 12, 0, 0).toISOString(),
            currency: 'RUB',
            raw_text: `Создано из годовой диаграммы: ${chart.type}`,
          });
        }
      }
    } else {
      // For monthly or custom periods, create one transaction per category (mid-period)
      const mid = new Date((start.getTime() + end.getTime()) / 2);

      for (const category of selectedItems) {
        const amount = Number(category.value);
        transactions.push({
          amount: Number(amount.toFixed(2)),
          description: `${category.name}${chart.period ? ` - ${chart.period}` : ''}`,
          category: mapCategory(category.name),
          date: mid.toISOString(),
          currency: 'RUB',
          raw_text: `Создано из диаграммы: ${chart.type}`,
        });
      }
    }

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
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Период:</span>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>—</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              (даты распределятся по периоду)
            </span>
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
              💡 <strong>Создание транзакций:</strong>{' '}
              {periodInfo.type === 'year'
                ? 'Годовая сумма каждой категории будет автоматически распределена на 12 месяцев (по месяцам).'
                : 'Для каждой выбранной категории будет создана одна транзакция с указанной суммой.'}
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
