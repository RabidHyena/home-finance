import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultipleTransactionsForm } from './MultipleTransactionsForm';
import type { ParsedTransaction } from '../types';

const makeTx = (overrides: Partial<ParsedTransaction> = {}): ParsedTransaction => ({
  amount: 100,
  description: 'Test transaction',
  date: '2024-06-15T12:30:00',
  category: 'Food',
  currency: 'RUB',
  raw_text: 'raw',
  confidence: 0.9,
  ...overrides,
});

describe('MultipleTransactionsForm', () => {
  it('renders date inputs for each transaction', () => {
    const txs = [makeTx({ description: 'Tx A' }), makeTx({ description: 'Tx B' })];
    render(
      <MultipleTransactionsForm
        transactions={txs}
        totalAmount={200}
        onSubmit={() => {}}
      />
    );

    const dateInputs = screen.getAllByDisplayValue(/2024-06-15/);
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0]).toHaveAttribute('type', 'datetime-local');
  });

  it('allows editing a date', () => {
    const txs = [makeTx()];
    render(
      <MultipleTransactionsForm
        transactions={txs}
        totalAmount={100}
        onSubmit={() => {}}
      />
    );

    const dateInput = screen.getByDisplayValue(/2024-06-15/);
    fireEvent.change(dateInput, { target: { value: '2025-01-20T09:00' } });
    expect(screen.getByDisplayValue('2025-01-20T09:00')).toBeInTheDocument();
  });

  it('submits with the edited date', () => {
    const onSubmit = vi.fn();
    const txs = [makeTx({ date: '2024-03-10T10:00:00' })];
    render(
      <MultipleTransactionsForm
        transactions={txs}
        totalAmount={100}
        onSubmit={onSubmit}
      />
    );

    const dateInput = screen.getByDisplayValue(/2024-03-10/);
    fireEvent.change(dateInput, { target: { value: '2025-11-05T14:30' } });

    fireEvent.submit(screen.getByRole('button', { name: /Сохранить/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toHaveLength(1);
    // The submitted date should be the edited one, not the original
    expect(submitted[0].date).toContain('2025-11-05');
  });

  it('submits with original date when not edited', () => {
    const onSubmit = vi.fn();
    const txs = [makeTx({ date: '2024-03-10T10:00:00' })];
    render(
      <MultipleTransactionsForm
        transactions={txs}
        totalAmount={100}
        onSubmit={onSubmit}
      />
    );

    fireEvent.submit(screen.getByRole('button', { name: /Сохранить/ }));

    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted[0].date).toContain('2024-03-10');
  });

  it('preserves correct indices after filtering selected transactions', () => {
    const onSubmit = vi.fn();
    const txs = [
      makeTx({ description: 'First', date: '2024-01-01T00:00:00' }),
      makeTx({ description: 'Second', date: '2024-02-01T00:00:00' }),
      makeTx({ description: 'Third', date: '2024-03-01T00:00:00' }),
    ];
    render(
      <MultipleTransactionsForm
        transactions={txs}
        totalAmount={300}
        onSubmit={onSubmit}
      />
    );

    // Edit date on the third transaction (index 2)
    const dateInputs = screen.getAllByDisplayValue(/2024-0/);
    fireEvent.change(dateInputs[2], { target: { value: '2025-12-25T18:00' } });

    // Deselect the first transaction (index 0)
    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[0] is "select all", checkboxes[1] is tx0, checkboxes[2] is tx1, checkboxes[3] is tx2
    fireEvent.click(checkboxes[1]); // deselect first tx

    fireEvent.submit(screen.getByRole('button', { name: /Сохранить/ }));

    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toHaveLength(2);
    // Third transaction should have the edited date
    const third = submitted.find((t: { description: string }) => t.description === 'Third');
    expect(third.date).toContain('2025-12-25');
    // Second transaction should have its original date (Jan 31 UTC or Feb 1 local, depending on timezone)
    const second = submitted.find((t: { description: string }) => t.description === 'Second');
    expect(second.date).toMatch(/2024-0[12]-/);
  });

  it('shows empty state for no transactions', () => {
    render(
      <MultipleTransactionsForm
        transactions={[]}
        totalAmount={0}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText(/не найдено транзакций/i)).toBeInTheDocument();
  });
});
