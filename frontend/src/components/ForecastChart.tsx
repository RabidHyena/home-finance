import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { MONTH_NAMES_SHORT } from '../types';
import type { ForecastData } from '../types';

interface ForecastChartProps {
  data: ForecastData;
}

export function ForecastChart({ data }: ForecastChartProps) {
  const lastHistorical = data.historical[data.historical.length - 1];

  // Build chart data with a bridge point so lines connect
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

  // Bridge: last historical point also gets forecast value so lines connect
  if (lastHistorical && forecastPoints.length > 0) {
    historicalPoints[historicalPoints.length - 1] = {
      ...historicalPoints[historicalPoints.length - 1],
      forecast: lastHistorical.amount,
    };
  }

  const chartData = [...historicalPoints, ...forecastPoints];

  const { statistics } = data;

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Прогноз расходов</h2>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Среднее</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{Number(statistics.average).toFixed(0)} ₽</p>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Доверительный интервал</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary, #2563eb)' }}>
            {Number(statistics.confidence_interval.min).toFixed(0)} - {Number(statistics.confidence_interval.max).toFixed(0)} ₽
          </p>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg, #f9fafb)', borderRadius: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '0.25rem' }}>Отклонение</p>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-warning, #ea580c)' }}>±{Number(statistics.std_deviation).toFixed(0)} ₽</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              style={{ fontSize: '0.75rem' }}
              angle={-45}
              textAnchor="end"
              height={80}
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

            {/* Confidence interval — upper bound area (filled) */}
            <Area
              type="monotone"
              dataKey="confidenceMax"
              stroke="none"
              fill="#fbbf24"
              fillOpacity={0.2}
              name="Доверительный интервал"
              legendType="none"
              connectNulls={false}
            />
            {/* Confidence interval — lower bound area (white fill to cut out) */}
            <Area
              type="monotone"
              dataKey="confidenceMin"
              stroke="none"
              fill="var(--color-surface, #ffffff)"
              fillOpacity={1}
              legendType="none"
              connectNulls={false}
            />

            {/* Historical data line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5 }}
              name="Фактические"
              connectNulls={false}
            />

            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#f59e0b"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 5, fill: '#f59e0b' }}
              name="Прогноз"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Info text */}
      <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-bg, #eff6ff)', borderRadius: '0.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text, #374151)' }}>
          <strong>Прогноз основан на:</strong> среднем значении расходов за последние{' '}
          {data.historical.length} месяцев. Жёлтая область показывает доверительный интервал (±1 стандартное отклонение).
        </p>
      </div>
    </div>
  );
}
