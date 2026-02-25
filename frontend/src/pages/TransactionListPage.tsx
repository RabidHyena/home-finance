import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Filter, Loader2, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransactionCard, TransactionForm, ConfirmModal, useToast, TransactionCardSkeleton } from '../components';
import {
  useInfiniteTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useDeleteAllTransactions,
} from '../hooks/useApi';
import type { Transaction, TransactionCreate, TransactionType } from '../types';
import { api } from '../api/client';
import { staggerContainer, staggerItem, backdropVariants, scaleIn } from '../motion';

interface TransactionListPageProps {
  type: TransactionType;
  title: string;
  titleColor?: string;
  buttonColor?: string;
  categories: readonly string[];
  categoryLabels: Record<string, string>;
  emptyLabel: string;
  allLoadedLabel: string;
  createTitle: string;
  exportPrefix: string;
  deleteAllTitle: string;
  deleteAllMessage: (total: number) => string;
  deleteOneTitle: string;
  deleteOneMessage: string;
  toasts: {
    created: string;
    createError: string;
    updated: string;
    updateError: string;
    deleted: string;
    deleteError: string;
    allDeleted: string;
    allDeleteError: string;
    loadError: string;
  };
}

export function TransactionListPage({
  type,
  title,
  titleColor,
  buttonColor,
  categories,
  categoryLabels,
  emptyLabel,
  allLoadedLabel,
  createTitle,
  exportPrefix,
  deleteAllTitle,
  deleteAllMessage,
  deleteOneTitle,
  deleteOneMessage,
  toasts,
}: TransactionListPageProps) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const toast = useToast();

  const perPage = 15;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const isDateRangeInvalid = !!(dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo));

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(
    perPage,
    filter || undefined,
    debouncedSearch || undefined,
    isDateRangeInvalid ? undefined : (dateFrom || undefined),
    isDateRangeInvalid ? undefined : (dateTo || undefined),
    type,
  );
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const deleteAllMutation = useDeleteAllTransactions();

  const transactions = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const mutationError = createMutation.error || updateMutation.error || deleteMutation.error;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const handleCreate = useCallback(async (formData: TransactionCreate) => {
    try {
      await createMutation.mutateAsync(type === 'income' ? { ...formData, type: 'income' } : formData);
      setShowForm(false);
      toast.success(toasts.created);
    } catch {
      toast.error(toasts.createError);
    }
  }, [createMutation, type, toast, toasts]);

  const handleUpdate = useCallback(async (formData: TransactionCreate) => {
    if (!editingTransaction) return;
    try {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data: formData });
      setEditingTransaction(null);
      toast.success(toasts.updated);
    } catch {
      toast.error(toasts.updateError);
    }
  }, [editingTransaction, updateMutation, toast, toasts]);

  const handleDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success(toasts.deleted);
    } catch {
      toast.error(toasts.deleteError);
      deleteMutation.reset();
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation, toast, toasts]);

  const handleDeleteAll = useCallback(async () => {
    try {
      await deleteAllMutation.mutateAsync(type);
      toast.success(toasts.allDeleted);
    } catch {
      toast.error(toasts.allDeleteError);
      deleteAllMutation.reset();
    }
    setShowDeleteAll(false);
  }, [deleteAllMutation, type, toast, toasts]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await api.exportTransactions(
        filter || undefined,
        dateFrom || undefined,
        dateTo || undefined,
        debouncedSearch || undefined,
        type,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportPrefix}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Экспорт завершён');
    } catch {
      toast.error('Ошибка экспорта');
    }
  }, [filter, dateFrom, dateTo, debouncedSearch, type, exportPrefix, toast]);

  const btnStyle = buttonColor
    ? { background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}dd)`, borderColor: 'transparent' }
    : undefined;

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 100,
  };

  const modalCardStyle: React.CSSProperties = {
    maxWidth: '420px',
    width: '100%',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
    padding: 'var(--space-xl)',
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1 style={{
          margin: 0,
          fontSize: '1.4rem',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.04em',
          color: titleColor || 'var(--color-text)',
        }}>
          {title}
          {total > 0 && (
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
              ({total})
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowDeleteAll(true)}
            disabled={total === 0}
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={16} /> Удалить все
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={total === 0}
          >
            <Download size={16} /> Экспорт
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            style={btnStyle}
          >
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {(error || mutationError) && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(248, 113, 113, 0.08)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--color-danger)',
        }}>
          {error
            ? toasts.loadError
            : 'Не удалось выполнить операцию. Попробуйте ещё раз.'}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          className="input"
          placeholder="Поиск по описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>От</label>
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>До</label>
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Сбросить даты
            </button>
          </div>
        )}
      </div>

      {isDateRangeInvalid && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(251, 191, 36, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          color: 'var(--color-warning)',
          fontSize: '0.875rem',
        }}>
          Дата "От" не может быть позже даты "До"
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Filter size={18} color="var(--color-text-muted)" />
        <select
          className="select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{categoryLabels[cat]}</option>
          ))}
        </select>
        {filter && (
          <button className="btn btn-secondary" onClick={() => setFilter('')} style={{ padding: '0.25rem 0.75rem' }}>
            Сбросить
          </button>
        )}
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={modalOverlayStyle}
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit" style={modalCardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>{createTitle}</h2>
              <TransactionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isLoading={createMutation.isPending} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {editingTransaction && (
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={modalOverlayStyle}
            onClick={(e) => { if (e.target === e.currentTarget) setEditingTransaction(null); }}
          >
            <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit" style={modalCardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>Редактировать</h2>
              <TransactionForm initialData={editingTransaction} onSubmit={handleUpdate} onCancel={() => setEditingTransaction(null)} isLoading={updateMutation.isPending} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map((i) => <TransactionCardSkeleton key={i} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-xl)',
        }}>
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {transactions.map((tx) => (
              <motion.div key={tx.id} variants={staggerItem}>
                <TransactionCard transaction={tx} onEdit={setEditingTransaction} onDelete={setDeleteTarget} />
              </motion.div>
            ))}
          </motion.div>

          <div ref={sentinelRef} style={{ height: '1px' }} />

          {isFetchingNextPage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
              <Loader2 size={20} className="spin" />
              Загрузка...
            </div>
          )}

          {!hasNextPage && transactions.length > perPage && (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              {allLoadedLabel}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={deleteOneTitle}
        message={deleteOneMessage}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={showDeleteAll}
        title={deleteAllTitle}
        message={deleteAllMessage(total)}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAll(false)}
        isLoading={deleteAllMutation.isPending}
      />
    </div>
  );
}
