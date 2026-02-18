import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MONTH_NAMES_SHORT } from '../types';
import type { TrendsData } from '../types';

interface TrendsChartProps {
  data: TrendsData;
}

export function TrendsChart({ data }: TrendsChartProps) {
  // Transform data for Recharts
  const chartData = data.data.map((point, index) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: point.total,
    trend: index < data.trend_line.length ? data.trend_line[index] : undefined,
  }));

  const { statistics } = data;

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Тренды расходов</h2>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Среднее</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{Number(statistics.average).toFixed(0)} ₽</p>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Минимум</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-success, #16a34a)' }}>{Number(statistics.min).toFixed(0)} ₽</p>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Максимум</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-danger, #dc2626)' }}>{Number(statistics.max).toFixed(0)} ₽</p>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Отклонение</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>{Number(statistics.std_deviation).toFixed(0)} ₽</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              style={{ fontSize: '0.75rem' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              style={{ fontSize: '0.75rem' }}
              tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number | undefined) => {
                if (value === undefined || value === null) return '';
                return `${Number(value).toFixed(2)} ₽`;
              }}
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Фактические"
            />
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Тренд"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Period info */}
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '1rem', textAlign: 'center' }}>
        Период: {data.period}
      </p>
    </div>
  );
}
