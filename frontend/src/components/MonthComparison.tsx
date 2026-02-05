import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MonthComparisonData } from '../types';
import { CATEGORY_LABELS } from '../types';

interface MonthComparisonProps {
  data: MonthComparisonData;
}

export function MonthComparison({ data }: MonthComparisonProps) {
  const { current, previous, changes } = data;

  const getChangeIcon = (percent: number) => {
    if (percent > 5) return <TrendingUp className="text-red-500" />;
    if (percent < -5) return <TrendingDown className="text-green-500" />;
    return <Minus className="text-gray-500" />;
  };

  const getChangeColor = (percent: number) => {
    if (percent > 0) return 'text-red-500';
    if (percent < 0) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Сравнение с прошлым месяцем</h2>

      {/* Total comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Текущий месяц</p>
          <p className="text-2xl font-bold">{current.total.toFixed(2)} ₽</p>
          <p className="text-sm text-gray-600">{current.count} транзакций</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Прошлый месяц</p>
          <p className="text-2xl font-bold">{previous.total.toFixed(2)} ₽</p>
          <p className="text-sm text-gray-600">{previous.count} транзакций</p>
        </div>
      </div>

      {/* Changes */}
      <div className="flex items-center gap-2 mb-6 p-4 bg-blue-50 rounded-lg">
        {getChangeIcon(changes.total_percent)}
        <span className={`text-lg font-semibold ${getChangeColor(changes.total_percent)}`}>
          {changes.total_percent > 0 ? '+' : ''}{changes.total_percent}%
        </span>
        <span className="text-gray-600">
          {changes.total_percent > 0 ? 'больше' : 'меньше'} чем в прошлом месяце
        </span>
      </div>

      {/* Category changes */}
      <div>
        <h3 className="font-semibold mb-3">Изменения по категориям</h3>
        <div className="space-y-2">
          {changes.by_category.map((cat) => (
            <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{CATEGORY_LABELS[cat.category as keyof typeof CATEGORY_LABELS] || cat.category}</p>
                <p className="text-sm text-gray-500">
                  {cat.current.toFixed(0)} ₽ → {cat.previous.toFixed(0)} ₽
                </p>
              </div>
              <span className={`font-semibold ${getChangeColor(cat.change_percent)}`}>
                {cat.change_percent > 0 ? '+' : ''}{cat.change_percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
