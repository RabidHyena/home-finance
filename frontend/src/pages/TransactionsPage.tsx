import { useEffect, useState, useCallback } from 'react';
import { Plus, Filter } from 'lucide-react';
import { api } from '../api/client';
import { TransactionCard, TransactionForm } from '../components';
import type { Transaction, TransactionCreate, Category } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../types';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Category | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const perPage = 10;

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getTransactions(
        page,
        perPage,
        filter || undefined
      );
      setTransactions(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleCreate = async (data: TransactionCreate) => {
    setSaving(true);
    try {
      await api.createTransaction(data);
      setShowForm(false);
      setPage(1);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: TransactionCreate) => {
    if (!editingTransaction) return;

    setSaving(true);
    try {
      await api.updateTransaction(editingTransaction.id, data);
      setEditingTransaction(null);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to update transaction:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить транзакцию?')) return;

    try {
      await api.deleteTransaction(id);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const totalPages = Math.ceil(total / perPage);

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
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={18} /> Добавить
        </button>
      </div>

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
            setPage(1);
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
            onClick={() => {
              setFilter('');
              setPage(1);
            }}
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
              isLoading={saving}
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
              isLoading={saving}
            />
          </div>
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
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
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem',
              }}
            >
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </button>
              <span style={{ padding: '0 1rem', color: 'var(--color-text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
