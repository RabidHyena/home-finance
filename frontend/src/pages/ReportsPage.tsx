import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { MonthlyChart, CategoryChart, StatCardSkeleton, ChartSkeleton } from '../components';
import { useMonthlyReports } from '../hooks/useApi';
import type { MonthlyReport } from '../types';
import { CATEGORY_LABELS, type Category } from '../types';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function ReportsPage() {
  const { data: reports = [], isLoading, error } = useMonthlyReports();
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);

  useEffect(() => {
    if (reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Отчёты
      </h1>

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
                  Всего потрачено
                </p>
                <p
                  style={{
                    margin: '0.25rem 0 0',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-danger)',
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
                  {Math.round(
                    selectedReport.total_amount / selectedReport.transaction_count
                  ).toLocaleString('ru-RU')}{' '}
                  ₽
                </p>
              </div>
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
              Расходы по месяцам
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
                Расходы по категориям ({MONTH_NAMES[selectedReport.month - 1]})
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
                  {Object.entries(selectedReport.by_category)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => (
                      <tr key={category}>
                        <td
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--color-border)',
                          }}
                        >
                          {CATEGORY_LABELS[category as Category] || category}
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
                          {((amount / selectedReport.total_amount) * 100).toFixed(1)}%
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
