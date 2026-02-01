import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyReport } from '../types';

interface MonthlyChartProps {
  data: MonthlyReport[];
}

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = [...data]
    .reverse()
    .map((report) => ({
      name: `${MONTH_NAMES[report.month - 1]} ${report.year}`,
      amount: report.total_amount,
      count: report.transaction_count,
    }));

  if (chartData.length === 0) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
            }
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString('ru-RU')} ₽`,
              'Сумма',
            ]}
            labelStyle={{ color: '#111827', fontWeight: 500 }}
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <Bar
            dataKey="amount"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
