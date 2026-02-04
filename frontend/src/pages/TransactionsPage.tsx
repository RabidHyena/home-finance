import { useState, useRef, useCallback } from 'react';
import { Plus, Filter, Loader2 } from 'lucide-react';
import { TransactionCard, TransactionForm, ConfirmModal, useToast, TransactionCardSkeleton } from '../components';
import {
  useInfiniteTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../hooks/useApi';
import type { Transaction, TransactionCreate, Category } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../types';

export function TransactionsPage() {
  const [filter, setFilter] = useState<Category | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const toast = useToast();

  const perPage = 15;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTransactions(perPage, filter || undefined);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const transactions = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const mutationError = createMutation.error || updateMutation.error || deleteMutation.error;

  // Infinite scroll observer
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

  const handleCreate = async (formData: TransactionCreate) => {
    try {
      await createMutation.mutateAsync(formData);
      setShowForm(false);
      toast.success('Транзакция добавлена');
    } catch {
      toast.error('Не удалось создать транзакцию');
    }
  };

  const handleUpdate = async (formData: TransactionCreate) => {
    if (!editingTransaction) return;
    try {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data: formData });
      setEditingTransaction(null);
      toast.success('Транзакция обновлена');
    } catch {
      toast.error('Не удалось обновить транзакцию');
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      setDeleteTarget(null);
      toast.success('Транзакция удалена');
    } catch {
      toast.error('Не удалось удалить транзакцию');
    }
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
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
          Транзакции
          {total > 0 && (
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
              ({total})
            </span>
          )}
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={18} /> Добавить
        </button>
      </div>

      {(error || mutationError) && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          {error
            ? 'Не удалось загрузить транзакции. Попробуйте обновить страницу.'
            : 'Не удалось выполнить операцию. Попробуйте ещё раз.'}
        </div>
      )}

      {/* Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <Filter size={18} color="var(--color-text-secondary)" />
        <select
          className="select"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as Category | '');
          }}
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="">Все категории</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        {filter && (
          <button
            className="btn btn-secondary"
            onClick={() => setFilter('')}
            style={{ padding: '0.25rem 0.75rem' }}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>
              Новая транзакция
            </h2>
            <TransactionForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingTransaction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingTransaction(null);
          }}
        >
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>
              Редактировать
            </h2>
            <TransactionForm
              initialData={editingTransaction}
              onSubmit={handleUpdate}
              onCancel={() => setEditingTransaction(null)}
              isLoading={updateMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Transactions List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map((i) => <TransactionCardSkeleton key={i} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}
        >
          <p>Нет транзакций</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onEdit={setEditingTransaction}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: '1px' }} />

          {isFetchingNextPage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1.5rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Loader2 size={20} className="spin" />
              Загрузка...
            </div>
          )}

          {!hasNextPage && transactions.length > perPage && (
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Все транзакции загружены
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Удалить транзакцию"
        message="Вы уверены, что хотите удалить эту транзакцию? Это действие нельзя отменить."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
