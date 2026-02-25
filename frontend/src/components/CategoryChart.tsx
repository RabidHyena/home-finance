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

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

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
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            stroke="rgba(11, 13, 20, 0.5)"
            strokeWidth={2}
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
              borderRadius: '0.75rem',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              background: '#1e2130',
              color: '#e2e8f0',
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
