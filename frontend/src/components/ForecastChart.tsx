import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, ComposedChart,
} from 'recharts';
import { MONTH_NAMES_SHORT } from '../types';
import type { ForecastData } from '../types';

interface ForecastChartProps {
  data: ForecastData;
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: '0.75rem',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  padding: '0.5rem 0.75rem',
};

const HIDDEN_KEYS = new Set(['bandMin', 'bandSize']);

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(p => !HIDDEN_KEYS.has(p.dataKey) && p.value != null);
  if (!visible.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ margin: '0 0 0.3rem', fontSize: '0.78rem', color: '#94a3b8' }}>{label}</p>
      {visible.map(entry => (
        <p key={entry.dataKey} style={{ margin: '0.1rem 0', fontSize: '0.85rem', color: entry.color, fontWeight: 600 }}>
          {entry.name}: {Number(entry.value).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
        </p>
      ))}
    </div>
  );
}

export function ForecastChart({ data }: ForecastChartProps) {
  const lastHistorical = data.historical[data.historical.length - 1];

  const historicalPoints = data.historical.map((point) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: point.amount,
    forecast: null as number | null,
    // No confidence band for historical points — use 0 so stacking doesn't break
    bandMin: 0,
    bandSize: 0,
  }));

  const forecastPoints = data.forecast.map((point) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: null as number | null,
    forecast: point.amount,
    // Confidence band: stacked approach — bottom (transparent) + height (yellow band)
    bandMin: point.confidence_min ?? 0,
    bandSize: Math.max(0, (point.confidence_max ?? 0) - (point.confidence_min ?? 0)),
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

  const hasData = data.historical.some(h => h.amount > 0);

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

      {!hasData ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Недостаточно данных для прогноза
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={statCardStyle}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Среднее</p>
              <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{Number(statistics.average).toFixed(0)} ₽</p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Доверительный интервал</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--color-accent)' }}>
                {Number(statistics.confidence_interval.min).toFixed(0)} – {Number(statistics.confidence_interval.max).toFixed(0)} ₽
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
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />

                {/* Stacked confidence band: transparent base + yellow top layer */}
                <Area type="monotone" dataKey="bandMin" stackId="band" fill="transparent" stroke="none" legendType="none" connectNulls={false} />
                <Area type="monotone" dataKey="bandSize" stackId="band" fill="#fbbf24" fillOpacity={0.18} stroke="#fbbf24" strokeOpacity={0.25} strokeWidth={1} name="Доверительный интервал" legendType="square" connectNulls={false} />

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
        </>
      )}
    </div>
  );
}
