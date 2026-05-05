import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCreateTransactionsBulk } from './useApi';
import { api } from '../api/client';
import type { TransactionCreate } from '../types';

vi.mock('../api/client', () => ({
  api: {
    createTransactionsBulk: vi.fn(),
  },
}));

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCreateTransactionsBulk', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(api.createTransactionsBulk).mockResolvedValue([]);
  });

  it('invalidates transactions, reports, and budgetsStatus on success', async () => {
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTransactionsBulk(), {
      wrapper: makeWrapper(qc),
    });

    const tx: TransactionCreate = {
      amount: 100,
      description: 'Test',
      date: '2024-06-15T12:00:00',
      category: 'Food',
      currency: 'RUB',
      type: 'expense',
    };

    await act(async () => {
      await result.current.mutateAsync([tx]);
    });

    await waitFor(() => {
      const invalidatedKeys = invalidate.mock.calls.map(
        call => (call[0] as { queryKey: unknown[] }).queryKey
      );
      expect(invalidatedKeys).toContainEqual(['transactions']);
      expect(invalidatedKeys).toContainEqual(['reports']);
      expect(invalidatedKeys).toContainEqual(['budgets-status']);
    });
  });
});
