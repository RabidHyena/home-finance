import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { TransactionCreate, TransactionUpdate } from '../types';

// Query keys
const keys = {
  transactions: ['transactions'] as const,
  reports: ['reports'] as const,
};

// --- Queries ---

export function useTransactions(page = 1, perPage = 20, category?: string) {
  return useQuery({
    queryKey: [...keys.transactions, page, perPage, category],
    queryFn: () => api.getTransactions(page, perPage, category),
  });
}

export function useInfiniteTransactions(
  perPage = 20,
  category?: string,
  search?: string,
  dateFrom?: string,
  dateTo?: string
) {
  return useInfiniteQuery({
    queryKey: [...keys.transactions, 'infinite', perPage, category, search, dateFrom, dateTo],
    queryFn: ({ pageParam = 1 }) =>
      api.getTransactions(pageParam, perPage, category, search, dateFrom, dateTo),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.per_page);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: [...keys.transactions, id],
    queryFn: () => api.getTransaction(id),
  });
}

export function useMonthlyReports(year?: number) {
  return useQuery({
    queryKey: [...keys.reports, year],
    queryFn: () => api.getMonthlyReports(year),
  });
}

// --- Mutations ---

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreate) => api.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions });
      qc.invalidateQueries({ queryKey: keys.reports });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionUpdate }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions });
      qc.invalidateQueries({ queryKey: keys.reports });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions });
      qc.invalidateQueries({ queryKey: keys.reports });
    },
  });
}

export function useUploadAndParse() {
  return useMutation({
    mutationFn: (file: File) => api.uploadAndParse(file),
  });
}
