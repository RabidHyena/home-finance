# Phase 4.4: Расширенная Аналитика - План Реализации

## Обзор

Фаза 4.4 добавляет продвинутую аналитику для глубокого понимания финансовых паттернов пользователя:
1. **Сравнение месяцев** - Как изменились расходы по сравнению с прошлым месяцем
2. **Тренды** - Динамика расходов за несколько месяцев с трендом
3. **Бюджеты** - Установка лимитов по категориям и отслеживание
4. **Прогнозирование** - Предсказание будущих расходов

---

## Структура реализации

### Incremental 4-Phase Rollout:
- **Phase 4.4.1** (День 1): Сравнение месяцев
- **Phase 4.4.2** (День 1): Тренды расходов
- **Phase 4.4.3** (День 2): Бюджеты и лимиты
- **Phase 4.4.4** (День 2): Прогнозирование

---

## Phase 4.4.1: Сравнение месяцев

### Цель
Показать пользователю, как изменились его расходы по сравнению с предыдущим месяцем.

### Backend

**1. Новый endpoint** `backend/app/routers/transactions.py`

```python
@router.get("/analytics/comparison")
def get_month_comparison(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Compare current month with previous month."""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta

    # Current month dates
    current_start = datetime(year, month, 1)
    current_end = (current_start + relativedelta(months=1)) - relativedelta(days=1)

    # Previous month dates
    prev_start = current_start - relativedelta(months=1)
    prev_end = current_start - relativedelta(days=1)

    # Query current month
    current_txs = db.query(Transaction).filter(
        Transaction.date >= current_start,
        Transaction.date <= current_end
    ).all()

    # Query previous month
    prev_txs = db.query(Transaction).filter(
        Transaction.date >= prev_start,
        Transaction.date <= prev_end
    ).all()

    # Calculate metrics
    current_total = sum(tx.amount for tx in current_txs)
    prev_total = sum(tx.amount for tx in prev_txs)

    # Category breakdown
    current_by_category = {}
    for tx in current_txs:
        cat = tx.category or "Other"
        current_by_category[cat] = current_by_category.get(cat, Decimal('0')) + tx.amount

    prev_by_category = {}
    for tx in prev_txs:
        cat = tx.category or "Other"
        prev_by_category[cat] = prev_by_category.get(cat, Decimal('0')) + tx.amount

    # Calculate changes
    total_change = float((current_total - prev_total) / prev_total * 100) if prev_total > 0 else 0
    count_change = float((len(current_txs) - len(prev_txs)) / len(prev_txs) * 100) if len(prev_txs) > 0 else 0

    # Top categories by change
    category_changes = []
    all_cats = set(current_by_category.keys()) | set(prev_by_category.keys())
    for cat in all_cats:
        curr = float(current_by_category.get(cat, 0))
        prev = float(prev_by_category.get(cat, 0))
        change_pct = ((curr - prev) / prev * 100) if prev > 0 else 0
        category_changes.append({
            "category": cat,
            "current": curr,
            "previous": prev,
            "change_percent": round(change_pct, 1)
        })

    # Sort by absolute change
    category_changes.sort(key=lambda x: abs(x["change_percent"]), reverse=True)

    return {
        "current_month": {"year": year, "month": month},
        "previous_month": {"year": prev_start.year, "month": prev_start.month},
        "current": {
            "total": float(current_total),
            "count": len(current_txs),
            "by_category": {k: float(v) for k, v in current_by_category.items()}
        },
        "previous": {
            "total": float(prev_total),
            "count": len(prev_txs),
            "by_category": {k: float(v) for k, v in prev_by_category.items()}
        },
        "changes": {
            "total_percent": round(total_change, 1),
            "count_percent": round(count_change, 1),
            "by_category": category_changes[:5]  # Top 5
        }
    }
```

**2. Добавить зависимость** `backend/requirements.txt`

```txt
python-dateutil>=2.8.2
```

### Frontend

**1. Типы** `frontend/src/types/index.ts`

```typescript
export interface MonthComparisonData {
  current_month: { year: number; month: number };
  previous_month: { year: number; month: number };
  current: {
    total: number;
    count: number;
    by_category: Record<string, number>;
  };
  previous: {
    total: number;
    count: number;
    by_category: Record<string, number>;
  };
  changes: {
    total_percent: number;
    count_percent: number;
    by_category: Array<{
      category: string;
      current: number;
      previous: number;
      change_percent: number;
    }>;
  };
}
```

**2. API хук** `frontend/src/hooks/useApi.ts`

```typescript
export function useMonthComparison(year: number, month: number) {
  return useQuery({
    queryKey: ['month-comparison', year, month],
    queryFn: () => api.getMonthComparison(year, month),
  });
}
```

**3. API метод** `frontend/src/api/client.ts`

```typescript
async getMonthComparison(year: number, month: number): Promise<MonthComparisonData> {
  const response = await fetch(`${API_BASE}/api/transactions/analytics/comparison?year=${year}&month=${month}`);
  if (!response.ok) throw new Error('Failed to fetch comparison');
  return response.json();
}
```

**4. Компонент** `frontend/src/components/MonthComparison.tsx`

```typescript
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MonthComparisonData } from '../types';
import { CATEGORY_LABELS, CURRENCY_SYMBOLS } from '../types';

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
```

**5. Интеграция в ReportsPage** `frontend/src/pages/ReportsPage.tsx`

```typescript
import { MonthComparison } from '../components';
import { useMonthComparison } from '../hooks/useApi';

// В компоненте:
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const comparisonQuery = useMonthComparison(currentYear, currentMonth);

// В JSX добавить:
{comparisonQuery.data && <MonthComparison data={comparisonQuery.data} />}
```

---

## Phase 4.4.2: Тренды расходов

### Цель
Показать динамику расходов за последние N месяцев с линией тренда.

### Backend

**1. Endpoint для трендов** `backend/app/routers/transactions.py`

```python
@router.get("/analytics/trends")
def get_spending_trends(
    months: int = Query(6, ge=3, le=24),
    db: Session = Depends(get_db),
):
    """Get spending trends for last N months."""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    import numpy as np

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - relativedelta(months=months)

    # Get transactions
    transactions = db.query(Transaction).filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).all()

    # Group by month
    monthly_data = {}
    for tx in transactions:
        key = (tx.date.year, tx.date.month)
        if key not in monthly_data:
            monthly_data[key] = {"total": Decimal('0'), "count": 0}
        monthly_data[key]["total"] += tx.amount
        monthly_data[key]["count"] += 1

    # Create series
    series = []
    current = start_date.replace(day=1)
    while current <= end_date:
        key = (current.year, current.month)
        data = monthly_data.get(key, {"total": Decimal('0'), "count": 0})
        series.append({
            "year": current.year,
            "month": current.month,
            "total": float(data["total"]),
            "count": data["count"]
        })
        current = current + relativedelta(months=1)

    # Calculate trend (linear regression)
    if len(series) >= 2:
        x = np.array(range(len(series)))
        y = np.array([s["total"] for s in series])

        # Simple linear regression
        n = len(x)
        slope = (n * np.sum(x * y) - np.sum(x) * np.sum(y)) / (n * np.sum(x**2) - (np.sum(x))**2)
        intercept = (np.sum(y) - slope * np.sum(x)) / n

        trend_line = [float(slope * i + intercept) for i in range(len(series))]
    else:
        trend_line = []

    # Calculate statistics
    totals = [s["total"] for s in series if s["total"] > 0]
    avg = np.mean(totals) if totals else 0
    std = np.std(totals) if totals else 0

    return {
        "period": f"{months} months",
        "data": series,
        "trend_line": trend_line,
        "statistics": {
            "average": float(avg),
            "std_deviation": float(std),
            "min": float(min(totals)) if totals else 0,
            "max": float(max(totals)) if totals else 0
        }
    }
```

**2. Добавить numpy** `backend/requirements.txt`

```txt
numpy>=1.24.0
```

### Frontend

**Компонент TrendsChart** будет создан с использованием Recharts LineChart.

---

## Phase 4.4.3: Бюджеты и лимиты

### Цель
Позволить пользователям устанавливать месячные лимиты по категориям и отслеживать прогресс.

### Backend

**1. Модель Budget** `backend/app/models.py`

```python
class Budget(Base):
    """Budget limits for categories."""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, unique=True)
    limit_amount = Column(Numeric(12, 2), nullable=False)
    period = Column(String(20), default='monthly')  # monthly, weekly
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

**2. CRUD endpoints для бюджетов**
**3. Endpoint для статуса бюджетов**

---

## Phase 4.4.4: Прогнозирование

### Цель
Предсказать будущие расходы на основе исторических данных.

### Метод
Простой moving average + доверительный интервал на основе стандартного отклонения.

---

## Порядок реализации

1. ✅ Phase 4.4.1: Сравнение месяцев (начинаем сейчас)
2. ⏳ Phase 4.4.2: Тренды
3. ⏳ Phase 4.4.3: Бюджеты
4. ⏳ Phase 4.4.4: Прогнозирование

---

## Тестирование

После каждой подфазы:
- Проверить endpoint в Swagger UI
- Протестировать компонент в браузере
- Проверить с пустыми данными
- Проверить с большим объёмом данных

---

*План создан: 5 февраля 2026*
