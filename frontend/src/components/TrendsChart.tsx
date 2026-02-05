import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TrendsData } from '../types';

const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

interface TrendsChartProps {
  data: TrendsData;
}

export function TrendsChart({ data }: TrendsChartProps) {
  // Transform data for Recharts
  const chartData = data.data.map((point, index) => ({
    name: `${MONTH_NAMES_SHORT[point.month - 1]} ${point.year}`,
    actual: point.total,
    trend: data.trend_line[index],
  }));

  const { statistics } = data;

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Тренды расходов</h2>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Среднее</p>
          <p className="text-lg font-bold">{statistics.average.toFixed(0)} ₽</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Минимум</p>
          <p className="text-lg font-bold text-green-600">{statistics.min.toFixed(0)} ₽</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Максимум</p>
          <p className="text-lg font-bold text-red-600">{statistics.max.toFixed(0)} ₽</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Отклонение</p>
          <p className="text-lg font-bold text-blue-600">{statistics.std_deviation.toFixed(0)} ₽</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
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

      {/* Period info */}
      <p className="text-sm text-gray-500 mt-4 text-center">
        Период: {data.period}
      </p>
    </div>
  );
}
