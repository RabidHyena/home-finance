import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useBudgetsStatus,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../hooks/useApi';
import { useToast, ConfirmModal } from '../components';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../types';
import type { BudgetStatus } from '../types';
import { staggerContainer, staggerItem, slideUp } from '../motion';

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
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    category: 'Food' as Category,
    limit_amount: '',
    period: 'monthly' as 'monthly' | 'weekly',
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.limit_amount || parseFloat(formData.limit_amount) <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    try {
      if (editingId !== null) {
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
  }, [editingId, formData, updateMutation, createMutation, toast]);

  const handleEdit = useCallback((status: BudgetStatus) => {
    setEditingId(status.budget.id);
    setFormData({
      category: status.budget.category as Category,
      limit_amount: String(status.budget.limit_amount),
      period: status.budget.period,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Бюджет удален');
    } catch {
      toast.error('Не удалось удалить бюджет');
    } finally {
      setDeleteId(null);
    }
  }, [deleteMutation, toast]);

  const getProgressColor = useCallback((percentage: number): string => {
    if (percentage < 70) return '#34d399';
    if (percentage < 90) return '#fbbf24';
    return '#f87171';
  }, []);

  const getProgressGlow = useCallback((percentage: number): string => {
    if (percentage < 70) return 'rgba(52, 211, 153, 0.25)';
    if (percentage < 90) return 'rgba(251, 191, 36, 0.25)';
    return 'rgba(248, 113, 113, 0.25)';
  }, []);

  const usedCategories = useMemo(() => new Set(budgetStatuses.map(s => s.budget.category)), [budgetStatuses]);
  const availableCategories = useMemo(() => {
    const editingCategory = editingId
      ? budgetStatuses.find(s => s.budget.id === editingId)?.budget.category
      : null;
    return CATEGORIES.filter(
      cat => !usedCategories.has(cat) || cat === editingCategory
    );
  }, [budgetStatuses, editingId, usedCategories]);

  if (isLoading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--color-accent)',
        fontFamily: 'var(--font-heading)',
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={staggerItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', margin: 0 }}>Бюджеты</h1>
        {!showForm && availableCategories.length > 0 && (
          <motion.button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ category: availableCategories[0], limit_amount: '', period: 'monthly' });
            }}
            className="btn btn-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} />
            Добавить бюджет
          </motion.button>
        )}
      </motion.div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              marginBottom: '1.5rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              padding: 'var(--space-lg)',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em', marginBottom: '1rem' }}>
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
                  {(['monthly', 'weekly'] as const).map((p) => (
                    <label key={p} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      border: `2px solid ${formData.period === p ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: formData.period === p ? 'rgba(129, 140, 248, 0.08)' : 'transparent',
                      transition: 'all 0.2s',
                      fontSize: '0.875rem',
                    }}>
                      <input
                        type="radio"
                        value={p}
                        checked={formData.period === p}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'weekly' })}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      {p === 'monthly' ? 'Месяц' : 'Неделя'}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Check size={16} />
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
                >
                  <X size={16} />
                  Отмена
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Status Cards */}
      {budgetStatuses.length === 0 ? (
        <motion.div variants={staggerItem} style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-xl)',
        }}>
          <p>Нет установленных бюджетов</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Создайте бюджет для отслеживания расходов по категориям</p>
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ display: 'grid', gap: '1rem' }}>
          {budgetStatuses.map((status) => (
            <motion.div
              key={status.budget.id}
              variants={staggerItem}
              whileHover={{ scale: 1.005, borderColor: getProgressColor(status.percentage) + '40' }}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
                padding: 'var(--space-lg)',
                transition: 'border-color 0.25s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.02em', marginBottom: '0.25rem' }}>
                    {CATEGORY_LABELS[status.budget.category as Category] || status.budget.category}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Лимит: <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{status.budget.limit_amount.toLocaleString('ru-RU')} ₽</span> / {status.budget.period === 'monthly' ? 'месяц' : 'неделю'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <motion.button
                    onClick={() => handleEdit(status)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem' }}
                    title="Редактировать"
                  >
                    <Edit2 size={14} />
                  </motion.button>
                  <motion.button
                    onClick={() => setDeleteId(status.budget.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  width: '100%',
                  height: '1.5rem',
                  background: 'var(--color-surface-elevated)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid var(--color-border)',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(status.percentage, 100)}%` }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{
                      backgroundColor: getProgressColor(status.percentage),
                      height: '100%',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: `0 0 12px ${getProgressGlow(status.percentage)}`,
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
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-heading)',
                    color: status.percentage > 50 ? 'white' : 'var(--color-text)',
                  }}>
                    {Number(status.percentage).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}>Потрачено</p>
                  <p style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', margin: 0 }}>{status.spent.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}>Остаток</p>
                  <p style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', color: status.exceeded ? 'var(--color-danger)' : 'var(--color-success)', margin: 0 }}>
                    {status.remaining.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}>Статус</p>
                  <p style={{
                    fontWeight: 600,
                    color: status.exceeded ? 'var(--color-danger)' : 'var(--color-success)',
                    margin: 0,
                  }}>
                    {status.exceeded ? 'Превышен' : 'В рамках'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Удалить бюджет"
        message="Вы уверены, что хотите удалить этот бюджет?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
