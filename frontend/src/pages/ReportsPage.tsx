import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { MonthlyChart, CategoryChart, MonthComparison, TrendsChart, ForecastChart, StatCardSkeleton, ChartSkeleton } from '../components';
import { useMonthlyReports, useMonthComparison, useSpendingTrends, useForecast } from '../hooks/useApi';
import { MONTH_NAMES, CATEGORY_LABELS, INCOME_CATEGORY_LABELS, type Category, type IncomeCategory, type TransactionType } from '../types';
import type { MonthlyReport } from '../types';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const { data: reports = [], isLoading, error } = useMonthlyReports(undefined, activeTab);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);

  // Get comparison for selected month
  const comparisonYear = selectedReport?.year ?? new Date().getFullYear();
  const comparisonMonth = selectedReport?.month ?? (new Date().getMonth() + 1);
  const comparisonQuery = useMonthComparison(comparisonYear, comparisonMonth, activeTab);

  // Get spending trends for last 6 months
  const trendsQuery = useSpendingTrends(6, activeTab);

  // Get forecast for next 3 months based on last 6 months
  const forecastQuery = useForecast(6, 3, activeTab);

  // Reset selected report when tab changes
  useEffect(() => {
    setSelectedReport(null);
  }, [activeTab]);

  useEffect(() => {
    if (reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          Отчёты
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
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
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        Отчёты
      </h1>

      {/* Type Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--color-border)',
        paddingBottom: '0.5rem',
      }}>
        <button
          onClick={() => setActiveTab('expense')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem 0.5rem 0 0',
            border: 'none',
            backgroundColor: activeTab === 'expense' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'expense' ? 'white' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'expense' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
          }}
        >
          Расходы
        </button>
        <button
          onClick={() => setActiveTab('income')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem 0.5rem 0 0',
            border: 'none',
            backgroundColor: activeTab === 'income' ? '#16a34a' : 'transparent',
            color: activeTab === 'income' ? 'white' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'income' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
          }}
        >
          Доходы
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          Не удалось загрузить отчёты. Попробуйте обновить страницу.
        </div>
      )}

      {reports.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}
        >
          <p>Нет данных для отображения</p>
          <p style={{ fontSize: '0.875rem' }}>
            Добавьте транзакции, чтобы увидеть статистику
          </p>
        </div>
      ) : (
        <>
          {/* Month Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <Calendar size={18} color="var(--color-text-secondary)" />
            <select
              className="select"
              value={selectedReport ? `${selectedReport.year}-${selectedReport.month}` : ''}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-').map(Number);
                const report = reports.find(
                  (r) => r.year === year && r.month === month
                );
                if (report) setSelectedReport(report);
              }}
              style={{ width: 'auto', minWidth: '200px' }}
            >
              {reports.map((report) => (
                <option
                  key={`${report.year}-${report.month}`}
                  value={`${report.year}-${report.month}`}
                >
                  {MONTH_NAMES[report.month - 1]} {report.year}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Cards */}
          {selectedReport && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="card">
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {isIncome ? 'Всего получено' : 'Всего потрачено'}
                </p>
                <p
                  style={{
                    margin: '0.25rem 0 0',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: isIncome ? '#16a34a' : 'var(--color-danger)',
                  }}
                >
                  {selectedReport.total_amount.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div className="card">
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Транзакций
                </p>
                <p
                  style={{
                    margin: '0.25rem 0 0',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedReport.transaction_count}
                </p>
              </div>
              <div className="card">
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Средний чек
                </p>
                <p
                  style={{
                    margin: '0.25rem 0 0',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedReport.transaction_count > 0
                    ? Math.round(selectedReport.total_amount / selectedReport.transaction_count).toLocaleString('ru-RU')
                    : 0}{' '}
                  ₽
                </p>
              </div>
            </div>
          )}

          {/* Month Comparison */}
          {comparisonQuery.data && (
            <div style={{ marginBottom: '1.5rem' }}>
              <MonthComparison data={comparisonQuery.data} />
            </div>
          )}

          {/* Spending Trends */}
          {trendsQuery.isError && (
            <div className="card" style={{ marginBottom: '1.5rem', color: 'var(--color-danger)' }}>
              Ошибка загрузки трендов: {trendsQuery.error?.message}
            </div>
          )}
          {trendsQuery.isLoading && (
            <div style={{ marginBottom: '1.5rem' }}><ChartSkeleton height="300px" /></div>
          )}
          {trendsQuery.data && (
            <div style={{ marginBottom: '1.5rem' }}>
              <TrendsChart data={trendsQuery.data} />
            </div>
          )}

          {/* Forecast */}
          {forecastQuery.isError && (
            <div className="card" style={{ marginBottom: '1.5rem', color: 'var(--color-danger)' }}>
              Ошибка загрузки прогноза: {forecastQuery.error?.message}
            </div>
          )}
          {forecastQuery.isLoading && (
            <div style={{ marginBottom: '1.5rem' }}><ChartSkeleton height="350px" /></div>
          )}
          {forecastQuery.data && (
            <div style={{ marginBottom: '1.5rem' }}>
              <ForecastChart data={forecastQuery.data} />
            </div>
          )}

          {/* Monthly Chart */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                margin: '0 0 1rem',
                fontSize: '1.125rem',
                fontWeight: 600,
              }}
            >
              {isIncome ? 'Доходы по месяцам' : 'Расходы по месяцам'}
            </h2>
            <MonthlyChart data={reports} />
          </div>

          {/* Category Chart */}
          {selectedReport && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1rem',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                }}
              >
                {isIncome ? 'Доходы' : 'Расходы'} по категориям ({MONTH_NAMES[selectedReport.month - 1]})
              </h2>
              <CategoryChart data={selectedReport.by_category} />
            </div>
          )}

          {/* Category Breakdown Table */}
          {selectedReport && (
            <div className="card">
              <h2
                style={{
                  margin: '0 0 1rem',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                }}
              >
                Детализация по категориям
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Категория
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '0.75rem',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Сумма
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '0.75rem',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map(([category, amount]) => (
                      <tr key={category}>
                        <td
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--color-border)',
                          }}
                        >
                          {categoryLabels[category as Category & IncomeCategory] || category}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--color-border)',
                            textAlign: 'right',
                            fontWeight: 500,
                          }}
                        >
                          {amount.toLocaleString('ru-RU')} ₽
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--color-border)',
                            textAlign: 'right',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {Number(selectedReport.total_amount) > 0
                            ? ((Number(amount) / Number(selectedReport.total_amount)) * 100).toFixed(1)
                            : '0.0'}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
