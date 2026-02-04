import { Link } from 'react-router-dom';
import { TrendingDown, ArrowRight, Plus } from 'lucide-react';
import { TransactionCard } from '../components';
import { useTransactions, useMonthlyReports } from '../hooks/useApi';

export function HomePage() {
  const { data: txData, isLoading: txLoading, error: txError } = useTransactions(1, 5);
  const { data: reports, isLoading: repLoading, error: repError } = useMonthlyReports();

  const isLoading = txLoading || repLoading;
  const error = txError || repError;

  const transactions = txData?.items ?? [];
  const currentMonth = reports?.[0] ?? null;

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Главная
      </h1>

      {error && (
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
          Не удалось загрузить данные. Попробуйте обновить страницу.
        </div>
      )}

      {/* Summary Card */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
              Расходы за текущий месяц
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 700 }}>
              {currentMonth
                ? `${currentMonth.total_amount.toLocaleString('ru-RU')} ₽`
                : '0 ₽'}
            </p>
            {currentMonth && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                {currentMonth.transaction_count} транзакций
              </p>
            )}
          </div>
          <TrendingDown size={48} style={{ opacity: 0.5 }} />
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <Link
          to="/upload"
          className="card"
          style={{
            textDecoration: 'none',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} color="var(--color-primary)" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 500 }}>Добавить</p>
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Загрузить скриншот
            </p>
          </div>
        </Link>

        <Link
          to="/reports"
          className="card"
          style={{
            textDecoration: 'none',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingDown size={20} color="var(--color-success)" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 500 }}>Отчёты</p>
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Статистика трат
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
          Последние транзакции
        </h2>
        <Link
          to="/transactions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Все <ArrowRight size={16} />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}
        >
          <p>Нет транзакций</p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Добавить первую
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {transactions.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
}
