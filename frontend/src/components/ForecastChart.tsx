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
import type { ForecastData } from '../types';

const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

interface ForecastChartProps {
  data: ForecastData;
}

export function ForecastChart({ data }: ForecastChartProps) {
  // Combine historical and forecast data
  const chartData = [
    ...data.historical.map((point) => ({
      name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
      actual: point.amount,
      forecast: null,
      confidenceMin: null,
      confidenceMax: null,
      isForecast: false,
    })),
    ...data.forecast.map((point) => ({
      name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
      actual: null,
      forecast: point.amount,
      confidenceMin: point.confidence_min,
      confidenceMax: point.confidence_max,
      isForecast: true,
    })),
  ];

  const { statistics } = data;

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Прогноз расходов</h2>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Среднее</p>
          <p className="text-lg font-bold">{statistics.average.toFixed(0)} ₽</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Доверительный интервал</p>
          <p className="text-sm font-semibold text-blue-600">
            {statistics.confidence_interval.min.toFixed(0)} - {statistics.confidence_interval.max.toFixed(0)} ₽
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Отклонение</p>
          <p className="text-lg font-bold text-orange-600">±{statistics.std_deviation.toFixed(0)} ₽</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
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
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined ? `${value.toFixed(2)} ₽` : ''
            }
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />

          {/* Confidence interval area */}
          <Area
            type="monotone"
            dataKey="confidenceMax"
            stroke="none"
            fill="#fbbf24"
            fillOpacity={0.2}
            name="Доверительный интервал"
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="confidenceMin"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            legendType="none"
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

      {/* Info text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Прогноз основан на:</strong> среднем значении расходов за последние{' '}
          {data.historical.length} месяцев. Серая область показывает доверительный интервал (±1 стандартное отклонение).
        </p>
      </div>
    </div>
  );
}
