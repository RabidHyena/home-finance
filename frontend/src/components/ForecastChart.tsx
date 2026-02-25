import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, ComposedChart,
} from 'recharts';
import { MONTH_NAMES_SHORT } from '../types';
import type { ForecastData } from '../types';

interface ForecastChartProps {
  data: ForecastData;
}

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: '1px solid rgba(148, 163, 184, 0.12)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  background: '#1e2130',
  color: '#e2e8f0',
};

export function ForecastChart({ data }: ForecastChartProps) {
  const lastHistorical = data.historical[data.historical.length - 1];

  const historicalPoints = data.historical.map((point) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: point.amount,
    forecast: null as number | null,
    confidenceMin: null as number | null,
    confidenceMax: null as number | null,
  }));

  const forecastPoints = data.forecast.map((point) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: null as number | null,
    forecast: point.amount,
    confidenceMin: point.confidence_min ?? null,
    confidenceMax: point.confidence_max ?? null,
  }));

  if (lastHistorical && forecastPoints.length > 0) {
    historicalPoints[historicalPoints.length - 1] = {
      ...historicalPoints[historicalPoints.length - 1],
      forecast: lastHistorical.amount,
    };
  }

  const chartData = [...historicalPoints, ...forecastPoints];
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
        Прогноз расходов
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Среднее</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Number(statistics.average).toFixed(0)} ₽</p>
        </div>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Доверительный интервал</p>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--color-accent)' }}>
            {Number(statistics.confidence_interval.min).toFixed(0)} - {Number(statistics.confidence_interval.max).toFixed(0)} ₽
          </p>
        </div>
        <div style={statCardStyle}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Отклонение</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-warning)' }}>±{Number(statistics.std_deviation).toFixed(0)} ₽</p>
        </div>
      </div>

      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
            <XAxis dataKey="name" style={{ fontSize: '0.75rem' }} angle={-45} textAnchor="end" height={80} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }} />
            <YAxis style={{ fontSize: '0.75rem' }} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }} />
            <Tooltip
              formatter={(value: number | undefined) => {
                if (value === undefined || value === null) return '';
                return `${Number(value).toFixed(2)} ₽`;
              }}
              contentStyle={tooltipStyle}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />

            <Area type="monotone" dataKey="confidenceMax" stroke="none" fill="#fbbf24" fillOpacity={0.15} name="Доверительный интервал" legendType="none" connectNulls={false} />
            <Area type="monotone" dataKey="confidenceMin" stroke="none" fill="#0b0d14" fillOpacity={1} legendType="none" connectNulls={false} />

            <Line type="monotone" dataKey="actual" stroke="#22d3ee" strokeWidth={3} dot={{ r: 5, fill: '#22d3ee' }} name="Фактические" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#fbbf24" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5, fill: '#fbbf24' }} name="Прогноз" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-surface-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
          <strong style={{ color: 'var(--color-text)' }}>Прогноз основан на:</strong> среднем значении расходов за последние{' '}
          {data.historical.length} месяцев. Жёлтая область показывает доверительный интервал (±1 стандартное отклонение).
        </p>
      </div>
    </div>
  );
}
