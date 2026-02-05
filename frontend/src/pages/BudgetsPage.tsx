import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import {
  useBudgetsStatus,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../hooks/useApi';
import { useToast } from '../components';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../types';
import type { BudgetStatus } from '../types';

export function BudgetsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data: budgetStatuses = [], isLoading } = useBudgetsStatus(currentYear, currentMonth);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    category: 'Food' as Category,
    limit_amount: '',
    period: 'monthly' as 'monthly' | 'weekly',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.limit_amount || parseFloat(formData.limit_amount) <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            limit_amount: parseFloat(formData.limit_amount),
            period: formData.period,
          },
        });
        toast.success('Бюджет обновлен');
        setEditingId(null);
      } else {
        await createMutation.mutateAsync({
          category: formData.category,
          limit_amount: parseFloat(formData.limit_amount),
          period: formData.period,
        });
        toast.success('Бюджет создан');
      }

      setShowForm(false);
      setFormData({ category: 'Food', limit_amount: '', period: 'monthly' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleEdit = (status: BudgetStatus) => {
    setEditingId(status.budget.id);
    setFormData({
      category: status.budget.category as Category,
      limit_amount: String(status.budget.limit_amount),
      period: status.budget.period,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот бюджет?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Бюджет удален');
    } catch (err) {
      toast.error('Не удалось удалить бюджет');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const usedCategories = new Set(budgetStatuses.map(s => s.budget.category));
  const availableCategories = CATEGORIES.filter(cat => !usedCategories.has(cat) || editingId);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Бюджеты</h1>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ category: availableCategories[0] || 'Food', limit_amount: '', period: 'monthly' });
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Добавить бюджет
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            {editingId ? 'Редактировать бюджет' : 'Новый бюджет'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="label">Категория</label>
                <select
                  className="select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                  disabled={!!editingId}
                  required
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Лимит (₽)</label>
                <input
                  type="number"
                  className="input"
                  value={formData.limit_amount}
                  onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                  placeholder="50000"
                  min="0"
                  step="100"
                  required
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Период</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="monthly"
                    checked={formData.period === 'monthly'}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' })}
                  />
                  Месяц
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="weekly"
                    checked={formData.period === 'weekly'}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as 'weekly' })}
                  />
                  Неделя
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Check size={18} />
                {editingId ? 'Сохранить' : 'Создать'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ category: 'Food', limit_amount: '', period: 'monthly' });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <X size={18} />
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget Status Cards */}
      {budgetStatuses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>Нет установленных бюджетов</p>
          <p style={{ fontSize: '0.875rem' }}>Создайте бюджет для отслеживания расходов по категориям</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {budgetStatuses.map((status) => (
            <div key={status.budget.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {CATEGORY_LABELS[status.budget.category as Category] || status.budget.category}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    Лимит: {status.budget.limit_amount.toLocaleString('ru-RU')} ₽ / {status.budget.period === 'monthly' ? 'месяц' : 'неделю'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(status)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem' }}
                    title="Редактировать"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(status.budget.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem', color: 'var(--color-danger)' }}
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  width: '100%',
                  height: '1.5rem',
                  backgroundColor: 'var(--color-border)',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div
                    className={getProgressColor(status.percentage)}
                    style={{
                      width: `${Math.min(status.percentage, 100)}%`,
                      height: '100%',
                      transition: 'width 0.3s ease',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: status.percentage > 50 ? 'white' : 'var(--color-text)',
                  }}>
                    {status.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Потрачено</p>
                  <p style={{ fontWeight: 600 }}>{status.spent.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Остаток</p>
                  <p style={{ fontWeight: 600, color: status.exceeded ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {status.remaining.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Статус</p>
                  <p style={{ fontWeight: 600, color: status.exceeded ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {status.exceeded ? 'Превышен' : 'В рамках'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
