import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';

interface CategoryChartProps {
  data: Record<string, number>;
}

interface TooltipEntry {
  name?: string;
  value?: number;
  payload?: { _total?: number };
}

function renderTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = Number(item.value ?? 0);
  const total = item.payload?._total ?? 0;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  return (
    <div style={{
      borderRadius: '0.75rem',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)',
      background: 'var(--color-surface)',
      padding: '0.5rem 0.875rem',
    }}>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
        {item.name}
      </p>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>
        {value.toLocaleString('ru-RU')} ₽
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
          ({pct}%)
        </span>
      </p>
    </div>
  );
}

export const CategoryChart = memo(function CategoryChart({ data }: CategoryChartProps) {
  const total = useMemo(
    () => Object.values(data).reduce((sum, v) => sum + v, 0),
    [data],
  );

  const chartData = useMemo(
    () => Object.entries(data)
      .map(([category, amount]) => ({
        name: CATEGORY_LABELS[category as Category] || category,
        value: amount,
        color: CATEGORY_COLORS[category as Category] || '#6b7280',
        _total: total,
      }))
      .sort((a, b) => b.value - a.value),
    [data, total],
  );

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
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={(props) => renderTooltip(props as any)} animationDuration={0} />
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
