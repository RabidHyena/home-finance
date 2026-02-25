import { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { MonthlyChart, CategoryChart, MonthComparison, TrendsChart, ForecastChart, StatCardSkeleton, ChartSkeleton } from '../components';
import { useMonthlyReports, useMonthComparison, useSpendingTrends, useForecast } from '../hooks/useApi';
import { MONTH_NAMES, CATEGORY_LABELS, INCOME_CATEGORY_LABELS, type Category, type IncomeCategory, type TransactionType } from '../types';
import { staggerContainer, staggerItem } from '../motion';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const { data: reports = [], isLoading, error } = useMonthlyReports(undefined, activeTab);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);

  const selectedReport = useMemo(() => {
    if (reports.length === 0) return null;
    if (selectedPeriod) {
      const match = reports.find((r) => r.year === selectedPeriod.year && r.month === selectedPeriod.month);
      if (match) return match;
    }
    return reports[0];
  }, [reports, selectedPeriod]);

  const comparisonYear = selectedReport?.year ?? new Date().getFullYear();
  const comparisonMonth = selectedReport?.month ?? (new Date().getMonth() + 1);
  const comparisonQuery = useMonthComparison(comparisonYear, comparisonMonth, activeTab);
  const trendsQuery = useSpendingTrends(6, activeTab);
  const forecastQuery = useForecast(6, 3, activeTab);

  const categoryLabels = useMemo(
    () => activeTab === 'income' ? INCOME_CATEGORY_LABELS : CATEGORY_LABELS,
    [activeTab],
  );
  const isIncome = activeTab === 'income';

  const sortedCategories = useMemo(
    () => selectedReport
      ? Object.entries(selectedReport.by_category).sort((a, b) => b[1] - a[1])
      : [],
    [selectedReport],
  );

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', marginBottom: '1.5rem' }}>
          Отчёты
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton height="250px" />
        <div style={{ marginTop: '1.5rem' }}>
          <ChartSkeleton height="250px" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <motion.h1 variants={staggerItem} style={{
        fontSize: '1.4rem',
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.04em',
        marginBottom: '1rem',
      }}>
        Отчёты
      </motion.h1>

      {/* Type Tab Switcher */}
      <motion.div variants={staggerItem} style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '1.5rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-full)',
        padding: '0.25rem',
        border: '1px solid var(--color-border)',
        width: 'fit-content',
      }}>
        {(['expense', 'income'] as TransactionType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              position: 'relative',
              padding: '0.5rem 1.5rem',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: activeTab === tab
                ? (tab === 'expense' ? 'var(--gradient-warm)' : 'var(--gradient-cool)')
                : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.25s ease-out',
            }}
          >
            {tab === 'expense' ? 'Расходы' : 'Доходы'}
          </button>
        ))}
      </motion.div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(248, 113, 113, 0.08)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--color-danger)',
        }}>
          Не удалось загрузить отчёты. Попробуйте обновить страницу.
        </div>
      )}

      {reports.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-xl)',
        }}>
          <p>Нет данных для отображения</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Добавьте транзакции, чтобы увидеть статистику
          </p>
        </div>
      ) : (
        <>
          {/* Month Selector */}
          <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Calendar size={18} color="var(--color-accent)" />
            <select
              className="select"
              value={selectedReport ? `${selectedReport.year}-${selectedReport.month}` : ''}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-').map(Number);
                setSelectedPeriod({ year, month });
              }}
              style={{ width: 'auto', minWidth: '200px' }}
            >
              {reports.map((report) => (
                <option key={`${report.year}-${report.month}`} value={`${report.year}-${report.month}`}>
                  {MONTH_NAMES[report.month - 1]} {report.year}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Summary Cards */}
          {selectedReport && (
            <motion.div variants={staggerItem} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-lg)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isIncome ? 'Всего получено' : 'Всего потрачено'}
                </p>
                <p style={{
                  margin: '0.25rem 0 0',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: isIncome ? 'var(--color-accent)' : 'var(--color-primary)',
                }}>
                  {selectedReport.total_amount.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-lg)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Транзакций
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {selectedReport.transaction_count}
                </p>
              </div>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-lg)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Средний чек
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {selectedReport.transaction_count > 0
                    ? Math.round(selectedReport.total_amount / selectedReport.transaction_count).toLocaleString('ru-RU')
                    : 0} ₽
                </p>
              </div>
            </motion.div>
          )}

          {/* Month Comparison */}
          {comparisonQuery.data && (
            <motion.div variants={staggerItem} style={{ marginBottom: '1.5rem' }}>
              <MonthComparison data={comparisonQuery.data} />
            </motion.div>
          )}

          {/* Spending Trends */}
          {trendsQuery.isError && (
            <div style={{
              marginBottom: '1.5rem', padding: '1rem',
              background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--color-danger)',
            }}>
              Ошибка загрузки трендов: {trendsQuery.error?.message}
            </div>
          )}
          {trendsQuery.isLoading && <div style={{ marginBottom: '1.5rem' }}><ChartSkeleton height="300px" /></div>}
          {trendsQuery.data && (
            <motion.div variants={staggerItem} style={{ marginBottom: '1.5rem' }}>
              <TrendsChart data={trendsQuery.data} />
            </motion.div>
          )}

          {/* Forecast */}
          {forecastQuery.isError && (
            <div style={{
              marginBottom: '1.5rem', padding: '1rem',
              background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--color-danger)',
            }}>
              Ошибка загрузки прогноза: {forecastQuery.error?.message}
            </div>
          )}
          {forecastQuery.isLoading && <div style={{ marginBottom: '1.5rem' }}><ChartSkeleton height="350px" /></div>}
          {forecastQuery.data && (
            <motion.div variants={staggerItem} style={{ marginBottom: '1.5rem' }}>
              <ForecastChart data={forecastQuery.data} />
            </motion.div>
          )}

          {/* Monthly Chart */}
          <motion.div variants={staggerItem} style={{
            marginBottom: '1.5rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            padding: 'var(--space-lg)',
          }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>
              {isIncome ? 'Доходы по месяцам' : 'Расходы по месяцам'}
            </h2>
            <MonthlyChart data={reports} />
          </motion.div>

          {/* Category Chart */}
          {selectedReport && (
            <motion.div variants={staggerItem} style={{
              marginBottom: '1.5rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-lg)',
            }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>
                {isIncome ? 'Доходы' : 'Расходы'} по категориям ({MONTH_NAMES[selectedReport.month - 1]})
              </h2>
              <CategoryChart data={selectedReport.by_category} />
            </motion.div>
          )}

          {/* Category Breakdown Table */}
          {selectedReport && (
            <motion.div variants={staggerItem} style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-lg)',
            }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>
                Детализация по категориям
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Категория
                    </th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Сумма
                    </th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map(([category, amount]) => (
                    <tr key={category} style={{ transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                        {categoryLabels[category as Category & IncomeCategory] || category}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                        {amount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {Number(selectedReport.total_amount) > 0
                          ? ((Number(amount) / Number(selectedReport.total_amount)) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
