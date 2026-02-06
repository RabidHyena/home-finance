import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { TransactionCreate, TransactionUpdate, BatchUploadResponse, BudgetCreate, BudgetUpdate } from '../types';

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

export function useMonthComparison(year: number, month: number) {
  return useQuery({
    queryKey: ['month-comparison', year, month],
    queryFn: () => api.getMonthComparison(year, month),
  });
}

export function useSpendingTrends(months = 6) {
  return useQuery({
    queryKey: ['spending-trends', months],
    queryFn: () => api.getSpendingTrends(months),
  });
}

// --- Budgets ---

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.getBudgets(),
  });
}

export function useBudgetsStatus(year?: number, month?: number) {
  return useQuery({
    queryKey: ['budgets-status', year, month],
    queryFn: () => api.getBudgetsStatus(year, month),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetCreate) => api.createBudget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budgets-status'] });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BudgetUpdate }) =>
      api.updateBudget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budgets-status'] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budgets-status'] });
    },
  });
}

// --- Forecast ---

export function useForecast(historyMonths = 6, forecastMonths = 3) {
  return useQuery({
    queryKey: ['forecast', historyMonths, forecastMonths],
    queryFn: () => api.getForecast(historyMonths, forecastMonths),
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

export function useBatchUploadAndParse() {
  return useMutation({
    mutationFn: async (files: File[]): Promise<BatchUploadResponse> => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/upload/batch`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Batch upload failed');
      }

      return response.json();
    },
  });
}
