import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { TransactionCard, StatCardSkeleton, TransactionCardSkeleton } from '../components';
import { useTransactions, useMonthlyReports } from '../hooks/useApi';
import { MONTH_NAMES } from '../types';
import { staggerContainer, staggerItem } from '../motion';

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
  const balanceLabel = isExpenseCurrent && isIncomeCurrent
    ? 'Баланс за месяц'
    : 'Баланс';

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', marginBottom: '1.5rem', color: 'var(--color-text)' }}>
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
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.h1
        variants={staggerItem}
        style={{
          fontSize: '1.4rem',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.04em',
          marginBottom: '1.5rem',
          color: 'var(--color-text)',
        }}
      >
        Главная
      </motion.h1>

      {error && (
        <motion.div
          variants={staggerItem}
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'var(--color-danger)',
          }}
        >
          Не удалось загрузить данные. Попробуйте обновить страницу.
        </motion.div>
      )}

      {/* Summary Cards */}
      <motion.div
        variants={staggerItem}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Expense Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            background: 'var(--gradient-warm)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid rgba(129, 140, 248, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                {expenseLabel}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-heading)' }}>
                {expenseTotal.toLocaleString('ru-RU')} ₽
              </p>
              {currentExpenseMonth && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                  {currentExpenseMonth.transaction_count} транзакций
                </p>
              )}
            </div>
            <TrendingDown size={40} style={{ opacity: 0.3, color: 'white' }} />
          </div>
        </motion.div>

        {/* Income Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            background: 'var(--gradient-cool)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid rgba(34, 211, 238, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                {incomeLabel}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-heading)' }}>
                {incomeTotal.toLocaleString('ru-RU')} ₽
              </p>
              {currentIncomeMonth && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                  {currentIncomeMonth.transaction_count} транзакций
                </p>
              )}
            </div>
            <TrendingUp size={40} style={{ opacity: 0.3, color: 'white' }} />
          </div>
        </motion.div>
      </motion.div>

      {/* Net Balance */}
      <motion.div
        variants={staggerItem}
        whileHover={{ boxShadow: netBalance >= 0 ? '0 0 24px rgba(34, 211, 238, 0.15)' : '0 0 24px rgba(248, 113, 113, 0.15)' }}
        style={{
          marginBottom: '1.5rem',
          textAlign: 'center',
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${netBalance >= 0 ? 'rgba(34, 211, 238, 0.15)' : 'rgba(248, 113, 113, 0.15)'}`,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          {balanceLabel}
        </p>
        <p style={{
          margin: '0.25rem 0 0',
          fontSize: '1.5rem',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          color: netBalance >= 0 ? 'var(--color-accent)' : 'var(--color-danger)',
        }}>
          {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString('ru-RU')} ₽
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={staggerItem}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/upload"
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
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.25s',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(129, 140, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Plus size={20} color="var(--color-primary)" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Добавить</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Загрузить скриншот или файл
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/reports"
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
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.25s',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 211, 238, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingDown size={20} color="var(--color-accent)" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Отчёты</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Статистика трат
              </p>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        variants={staggerItem}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>
          Последние транзакции
        </h2>
        <Link
          to="/transactions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          Все <ArrowRight size={16} />
        </Link>
      </motion.div>

      {transactions.length === 0 ? (
        <motion.div
          variants={staggerItem}
          style={{
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-xl)',
          }}
        >
          <p>Нет транзакций</p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Добавить первую
          </Link>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {transactions.map((tx) => (
            <motion.div key={tx.id} variants={staggerItem}>
              <TransactionCard transaction={tx} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
