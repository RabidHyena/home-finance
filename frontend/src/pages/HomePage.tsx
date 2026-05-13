import { Link } from 'react-router-dom';
import { ArrowRight, Plus, BarChart3, Receipt } from 'lucide-react';
import { TransactionCard, StatCardSkeleton, TransactionCardSkeleton } from '../components';
import { useTransactions, useMonthlyReports } from '../hooks/useApi';
import { MONTH_NAMES } from '../types';

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
};

interface StatCardProps {
  label: string;
  amount: number;
  count: number | null;
  amountColor?: string;
}

function StatCard({ label, amount, count, amountColor }: StatCardProps) {
  const accentColor = amountColor || 'var(--color-text)';
  const accentBg = amountColor
    ? amountColor.includes('income') ? 'var(--color-income-bg)'
    : amountColor.includes('danger') ? 'var(--color-danger-bg)'
    : amountColor.includes('accent') ? 'var(--color-accent-bg)'
    : 'var(--color-surface-2)'
    : 'var(--color-surface-2)';

  return (
    <div className="card-lift" style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <p style={labelStyle}>{label}</p>
        {amountColor && (
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 6px ${accentBg}`,
            flexShrink: 0,
          }} />
        )}
      </div>
      <p style={{
        margin: 0,
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'var(--text-2xl)',
        fontWeight: 600,
        color: accentColor,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      }}>
        {amount.toLocaleString('ru-RU')} ₽
      </p>
      <p style={{ margin: '0.625rem 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.625rem' }}>
        {count != null ? (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{count}</span>
            {' транзакций'}
          </>
        ) : ' '}
      </p>
    </div>
  );
}

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
  ) ?? incomeReports?.[0] ?? null;

  const expenseTotal = currentExpenseMonth?.total_amount ?? 0;
  const incomeTotal = currentIncomeMonth?.total_amount ?? 0;
  const netBalance = incomeTotal - expenseTotal;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isExpenseCurrent = currentExpenseMonth?.year === currentYear && currentExpenseMonth?.month === currentMonth;
  const isIncomeCurrent = currentIncomeMonth?.year === currentYear && currentIncomeMonth?.month === currentMonth;

  const expenseLabel = isExpenseCurrent || !currentExpenseMonth
    ? 'Расходы за месяц'
    : `Расходы за ${MONTH_NAMES[currentExpenseMonth.month - 1].toLowerCase()}`;
  const incomeLabel = isIncomeCurrent || !currentIncomeMonth
    ? 'Доходы за месяц'
    : `Доходы за ${MONTH_NAMES[currentIncomeMonth.month - 1].toLowerCase()}`;
  const balanceLabel = isExpenseCurrent && isIncomeCurrent ? 'Баланс за месяц' : 'Баланс';

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '1.5rem', color: 'var(--color-text)' }}>
          Главная
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
        </div>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {[1, 2, 3].map((i) => <TransactionCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fade-up 150ms ease-out' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '1.5rem', color: 'var(--color-text)', fontWeight: 600, letterSpacing: '-0.02em' }}>
        Главная
      </h1>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-danger-bg)',
          border: '1px solid rgba(220,38,38,0.2)',
          color: 'var(--color-danger)',
        }}>
          Не удалось загрузить данные. Попробуйте обновить страницу.
        </div>
      )}

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <StatCard label={expenseLabel} amount={expenseTotal} count={currentExpenseMonth?.transaction_count ?? null} />
        <StatCard
          label={incomeLabel}
          amount={incomeTotal}
          count={currentIncomeMonth?.transaction_count ?? null}
          amountColor='var(--color-income)'
        />
        <StatCard
          label={balanceLabel}
          amount={netBalance}
          count={null}
          amountColor={netBalance >= 0 ? 'var(--color-income)' : 'var(--color-danger)'}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link
          to="/upload"
          className="card-lift"
          style={{
            textDecoration: 'none',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{
            width: '44px', height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Plus size={18} color="var(--color-accent)" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 'var(--text-md)' }}>Добавить</p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Загрузить скриншот или файл</p>
          </div>
        </Link>

        <Link
          to="/reports"
          className="card-lift"
          style={{
            textDecoration: 'none',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{
            width: '44px', height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BarChart3 size={18} color="var(--color-accent)" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 'var(--text-md)' }}>Отчёты</p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Статистика трат</p>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          Последние транзакции
        </h2>
        <Link
          to="/transactions"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}
        >
          Все <ArrowRight size={14} />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--color-border-strong)',
          padding: '2.5rem var(--space-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: '44px', height: '44px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.25rem',
          }}>
            <Receipt size={20} color="var(--color-text-muted)" />
          </div>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>Нет транзакций</p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Загрузите скриншот чека или выписки
          </p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
            Добавить первую
          </Link>
        </div>
      ) : (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {transactions.map((tx, i) => (
            <div key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <TransactionCard transaction={tx} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
