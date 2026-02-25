import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MONTH_NAMES_SHORT } from '../types';
import type { TrendsData } from '../types';

interface TrendsChartProps {
  data: TrendsData;
}

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: '1px solid rgba(148, 163, 184, 0.12)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  background: '#1e2130',
  color: '#e2e8f0',
};

export function TrendsChart({ data }: TrendsChartProps) {
  const chartData = data.data.map((point, index) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: point.total,
    trend: index < data.trend_line.length ? data.trend_line[index] : undefined,
  }));

  const { statistics } = data;

  const statCardStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    background: 'var(--color-surface-elevated)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  };

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      padding: 'var(--space-lg)',
    }}>
      <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em', marginBottom: '1rem' }}>
        Тренды расходов
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Среднее</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Number(statistics.average).toFixed(0)} ₽</p>
        </div>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Минимум</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-success)' }}>{Number(statistics.min).toFixed(0)} ₽</p>
        </div>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Максимум</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-danger)' }}>{Number(statistics.max).toFixed(0)} ₽</p>
        </div>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Отклонение</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-accent)' }}>{Number(statistics.std_deviation).toFixed(0)} ₽</p>
        </div>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
            <XAxis dataKey="name" style={{ fontSize: '0.75rem' }} angle={-45} textAnchor="end" height={60} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }} />
            <YAxis style={{ fontSize: '0.75rem' }} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }} />
            <Tooltip
              formatter={(value: number | undefined) => {
                if (value === undefined || value === null) return '';
                return `${Number(value).toFixed(2)} ₽`;
              }}
              contentStyle={tooltipStyle}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Line type="monotone" dataKey="actual" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4, fill: '#22d3ee' }} name="Фактические" />
            <Line type="monotone" dataKey="trend" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Тренд" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '1rem', textAlign: 'center' }}>
        Период: {data.period}
      </p>
    </div>
  );
}
