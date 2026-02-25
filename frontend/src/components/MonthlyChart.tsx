import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MONTH_NAMES_SHORT } from '../types';
import type { MonthlyReport } from '../types';

interface MonthlyChartProps {
  data: MonthlyReport[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = [...data]
    .reverse()
    .map((report) => ({
      name: `${MONTH_NAMES_SHORT[report.month - 1]} ${report.year}`,
      amount: report.total_amount,
      count: report.transaction_count,
    }));

  if (chartData.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }}
            tickLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }}
            tickLine={{ stroke: 'rgba(148, 163, 184, 0.12)' }}
            tickFormatter={(value) => {
              const num = Number(value);
              return num >= 1000 ? `${(num / 1000).toFixed(0)}k` : String(num);
            }}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString('ru-RU')} ₽`,
              'Сумма',
            ]}
            labelStyle={{ color: '#e2e8f0', fontWeight: 500 }}
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              background: '#1e2130',
              color: '#e2e8f0',
            }}
          />
          <Bar
            dataKey="amount"
            fill="#818cf8"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
