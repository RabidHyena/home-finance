import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';

interface CategoryChartProps {
  data: Record<string, number>;
}

export const CategoryChart = memo(function CategoryChart({ data }: CategoryChartProps) {
  const chartData = useMemo(
    () => Object.entries(data)
      .map(([category, amount]) => ({
        name: CATEGORY_LABELS[category as Category] || category,
        value: amount,
        color: CATEGORY_COLORS[category as Category] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value),
    [data],
  );

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

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const num = Number(value);
              return [
                `${num.toLocaleString('ru-RU')} ₽ (${total > 0 ? ((num / total) * 100).toFixed(1) : '0'}%)`,
                '',
              ];
            }}
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span style={{ color: 'var(--color-text, #111827)', fontSize: '0.875rem' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
