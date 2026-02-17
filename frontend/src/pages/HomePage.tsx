import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { TransactionCard, StatCardSkeleton, TransactionCardSkeleton } from '../components';
import { useTransactions, useMonthlyReports } from '../hooks/useApi';

export function HomePage() {
  const { data: txData, isLoading: txLoading, error: txError } = useTransactions(1, 5, undefined, 'expense');
  const { data: expenseReports, isLoading: repLoading, error: repError } = useMonthlyReports(undefined, 'expense');
  const { data: incomeReports, isLoading: incLoading, error: incError } = useMonthlyReports(undefined, 'income');

  const isLoading = txLoading || repLoading || incLoading;
  const error = txError || repError || incError;

  const transactions = txData?.items ?? [];
  const now = new Date();
  const currentExpenseMonth = expenseReports?.find(
    r => r.year === now.getFullYear() && r.month === now.getMonth() + 1
  ) ?? expenseReports?.[0] ?? null;
  const currentIncomeMonth = incomeReports?.find(
    r => r.year === now.getFullYear() && r.month === now.getMonth() + 1
  ) ?? null;

  const expenseTotal = currentExpenseMonth?.total_amount ?? 0;
  const incomeTotal = currentIncomeMonth?.total_amount ?? 0;
  const netBalance = incomeTotal - expenseTotal;

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          Главная
        </h1>
        <div style={{ marginBottom: '1.5rem' }}>
          <StatCardSkeleton />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map((i) => <TransactionCardSkeleton key={i} />)}
        </div>
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

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Expense Card */}
        <div
          className="card"
          style={{
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
                Расходы за месяц
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>
                {expenseTotal.toLocaleString('ru-RU')} ₽
              </p>
              {currentExpenseMonth && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  {currentExpenseMonth.transaction_count} транзакций
                </p>
              )}
            </div>
            <TrendingDown size={40} style={{ opacity: 0.5 }} />
          </div>
        </div>

        {/* Income Card */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
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
                Доходы за месяц
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>
                {incomeTotal.toLocaleString('ru-RU')} ₽
              </p>
              {currentIncomeMonth && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  {currentIncomeMonth.transaction_count} транзакций
                </p>
              )}
            </div>
            <TrendingUp size={40} style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Net Balance */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Баланс за месяц
        </p>
        <p style={{
          margin: '0.25rem 0 0',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: netBalance >= 0 ? '#16a34a' : 'var(--color-danger)',
        }}>
          {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString('ru-RU')} ₽
        </p>
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
              Загрузить скриншот или файл
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
