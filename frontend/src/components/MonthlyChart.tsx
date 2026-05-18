import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useState } from 'react';
import { MONTH_NAMES_SHORT } from '../types';
import type { MonthlyReport } from '../types';

interface MonthlyChartProps {
  data: MonthlyReport[];
}

const BAR_COLOR = '#818cf8';
const BAR_HOVER_COLOR = '#a5b4fc';

export function MonthlyChart({ data }: MonthlyChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
        <BarChart
          data={chartData}
          onMouseLeave={() => setActiveIndex(null)}
        >
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
            cursor={false}
            formatter={(value) => [
              `${Number(value).toLocaleString('ru-RU')} ₽`,
              'Сумма',
            ]}
            labelStyle={{ color: 'var(--color-text)', fontWeight: 500, marginBottom: '0.2rem' }}
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              padding: '0.5rem 0.75rem',
            }}
            itemStyle={{ color: BAR_COLOR, fontWeight: 600 }}
          />
          <Bar
            dataKey="amount"
            radius={[6, 6, 0, 0]}
            maxBarSize={72}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={index === activeIndex ? BAR_HOVER_COLOR : BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
