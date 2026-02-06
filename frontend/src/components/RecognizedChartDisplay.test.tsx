import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecognizedChartDisplay } from './RecognizedChartDisplay';
import type { ParsedChart } from '../types';

const makeChart = (overrides: Partial<ParsedChart> = {}): ParsedChart => ({
  type: 'pie',
  categories: [
    { name: 'Еда', value: 5000, percentage: 50 },
    { name: 'Транспорт', value: 3000, percentage: 30 },
    { name: 'Развлечения', value: 2000, percentage: 20 },
  ],
  total: 10000,
  confidence: 0.85,
  ...overrides,
});

describe('RecognizedChartDisplay', () => {
  describe('parsePeriodToDate', () => {
    it('parses Russian month "Январь 2024" and defaults date picker', () => {
      const chart = makeChart({ period: 'Январь 2024' });
      render(
        <RecognizedChartDisplay
          chart={chart}
          onCreateTransactions={() => {}}
        />
      );

      const dateInput = screen.getByDisplayValue(/2024-01/);
      expect(dateInput).toHaveAttribute('type', 'datetime-local');
      expect((dateInput as HTMLInputElement).value).toMatch(/^2024-01-01/);
    });

    it('parses Russian month "Ноябрь 2025"', () => {
      const chart = makeChart({ period: 'Ноябрь 2025' });
      render(
        <RecognizedChartDisplay
          chart={chart}
          onCreateTransactions={() => {}}
        />
      );

      const dateInput = screen.getByDisplayValue(/2025-11/);
      expect((dateInput as HTMLInputElement).value).toMatch(/^2025-11-01/);
    });

    it('parses Russian genitive "ноября 2025"', () => {
      const chart = makeChart({ period: 'ноября 2025' });
      render(
        <RecognizedChartDisplay
          chart={chart}
          onCreateTransactions={() => {}}
        />
      );

      const dateInput = screen.getByDisplayValue(/2025-11/);
      expect((dateInput as HTMLInputElement).value).toMatch(/^2025-11-01/);
    });

    it('parses English month "January 2024" via Date fallback', () => {
      const chart = makeChart({ period: 'January 2024' });
      render(
        <RecognizedChartDisplay
          chart={chart}
          onCreateTransactions={() => {}}
        />
      );

      const dateInput = screen.getByDisplayValue(/2024-01/);
      expect(dateInput).toBeInTheDocument();
    });

    it('defaults to today when period is undefined', () => {
      const chart = makeChart({ period: undefined });
      render(
        <RecognizedChartDisplay
          chart={chart}
          onCreateTransactions={() => {}}
        />
      );

      const today = new Date();
      const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const dateInput = screen.getByDisplayValue(new RegExp(yearMonth));
      expect(dateInput).toBeInTheDocument();
    });
  });

  describe('date picker interaction', () => {
    it('shows date picker when onCreateTransactions is provided', () => {
      render(
        <RecognizedChartDisplay
          chart={makeChart({ period: 'Март 2024' })}
          onCreateTransactions={() => {}}
        />
      );

      expect(screen.getByText('Дата:')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/2024-03-01/)).toBeInTheDocument();
    });

    it('does not show date picker when onCreateTransactions is not provided', () => {
      render(<RecognizedChartDisplay chart={makeChart({ period: 'Март 2024' })} />);

      expect(screen.queryByText('Дата:')).not.toBeInTheDocument();
    });

    it('allows changing the date', () => {
      render(
        <RecognizedChartDisplay
          chart={makeChart({ period: 'Июнь 2024' })}
          onCreateTransactions={() => {}}
        />
      );

      const dateInput = screen.getByDisplayValue(/2024-06-01/);
      fireEvent.change(dateInput, { target: { value: '2024-07-15T10:00' } });
      expect(screen.getByDisplayValue('2024-07-15T10:00')).toBeInTheDocument();
    });
  });

  describe('transaction creation with correct date', () => {
    it('creates transactions with the selected date, not today', () => {
      const onCreateTransactions = vi.fn();
      render(
        <RecognizedChartDisplay
          chart={makeChart({ period: 'Февраль 2024' })}
          onCreateTransactions={onCreateTransactions}
        />
      );

      fireEvent.click(screen.getByText(/Создать транзакции/));

      expect(onCreateTransactions).toHaveBeenCalledTimes(1);
      const transactions = onCreateTransactions.mock.calls[0][0];
      expect(transactions).toHaveLength(3);

      // All transactions should have Feb 2024 date (or Jan 31 UTC due to timezone), not today
      const today = new Date().toISOString().slice(0, 10);
      for (const tx of transactions) {
        // Must NOT be today — that's the bug we fixed
        expect(tx.date.slice(0, 10)).not.toBe(today);
        // Should be in Jan 31 - Feb 1 range (timezone dependent)
        expect(tx.date).toMatch(/2024-0[12]-/);
      }
    });

    it('creates transactions with user-edited date', () => {
      const onCreateTransactions = vi.fn();
      render(
        <RecognizedChartDisplay
          chart={makeChart({ period: 'Февраль 2024' })}
          onCreateTransactions={onCreateTransactions}
        />
      );

      const dateInput = screen.getByDisplayValue(/2024-02-01/);
      fireEvent.change(dateInput, { target: { value: '2024-12-31T23:59' } });

      fireEvent.click(screen.getByText(/Создать транзакции/));

      const transactions = onCreateTransactions.mock.calls[0][0];
      for (const tx of transactions) {
        expect(tx.date).toContain('2024-12-31');
      }
    });

    it('only creates transactions for selected categories', () => {
      const onCreateTransactions = vi.fn();
      render(
        <RecognizedChartDisplay
          chart={makeChart()}
          onCreateTransactions={onCreateTransactions}
        />
      );

      // Deselect "Еда" (first category checkbox after "select all")
      const checkboxes = screen.getAllByRole('checkbox');
      // checkboxes[0] = select all, checkboxes[1] = Еда, checkboxes[2] = Транспорт, checkboxes[3] = Развлечения
      fireEvent.click(checkboxes[1]); // deselect Еда

      fireEvent.click(screen.getByText(/Создать транзакции/));

      const transactions = onCreateTransactions.mock.calls[0][0];
      expect(transactions).toHaveLength(2);
      expect(transactions.map((t: { description: string }) => t.description)).not.toContain(
        expect.stringContaining('Еда')
      );
    });
  });

  it('displays chart info correctly', () => {
    render(<RecognizedChartDisplay chart={makeChart({ period: 'Май 2024' })} />);

    expect(screen.getByText(/Круговая диаграмма/)).toBeInTheDocument();
    expect(screen.getByText(/Май 2024/)).toBeInTheDocument();
    expect(screen.getByText('85% уверенность')).toBeInTheDocument();
    expect(screen.getByText('10000.00 ₽')).toBeInTheDocument();
  });
});
