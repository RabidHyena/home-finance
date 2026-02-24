import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { TransactionCreate, TransactionUpdate, TransactionType, BudgetCreate, BudgetUpdate } from '../types';

// Consolidated query keys
const keys = {
  transactions: ['transactions'] as const,
  reports: ['reports'] as const,
  monthComparison: ['month-comparison'] as const,
  spendingTrends: ['spending-trends'] as const,
  budgets: ['budgets'] as const,
  budgetsStatus: ['budgets-status'] as const,
  forecast: ['forecast'] as const,
};

// --- Queries ---

export function useTransactions(page = 1, perPage = 20, category?: string, type?: TransactionType) {
  return useQuery({
    queryKey: [...keys.transactions, page, perPage, category, type],
    queryFn: () => api.getTransactions(page, perPage, category, undefined, undefined, undefined, type),
  });
}

export function useInfiniteTransactions(
  perPage = 20,
  category?: string,
  search?: string,
  dateFrom?: string,
  dateTo?: string,
  type?: TransactionType
) {
  return useInfiniteQuery({
    queryKey: [...keys.transactions, 'infinite', perPage, category, search, dateFrom, dateTo, type],
    queryFn: ({ pageParam = 1 }) =>
      api.getTransactions(pageParam, perPage, category, search, dateFrom, dateTo, type),
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

export function useMonthlyReports(year?: number, type?: TransactionType) {
  return useQuery({
    queryKey: [...keys.reports, year, type],
    queryFn: () => api.getMonthlyReports(year, type),
    staleTime: 1000 * 60 * 10, // reports change rarely — 10 min
  });
}

export function useMonthComparison(year: number, month: number, type?: TransactionType) {
  return useQuery({
    queryKey: [...keys.monthComparison, year, month, type],
    queryFn: () => api.getMonthComparison(year, month, type),
    staleTime: 1000 * 60 * 10,
  });
}

export function useSpendingTrends(months = 6, type?: TransactionType) {
  return useQuery({
    queryKey: [...keys.spendingTrends, months, type],
    queryFn: () => api.getSpendingTrends(months, type),
    staleTime: 1000 * 60 * 10,
  });
}

// --- Budgets ---

export function useBudgets() {
  return useQuery({
    queryKey: [...keys.budgets],
    queryFn: () => api.getBudgets(),
  });
}

export function useBudgetsStatus(year?: number, month?: number) {
  return useQuery({
    queryKey: [...keys.budgetsStatus, year, month],
    queryFn: () => api.getBudgetsStatus(year, month),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetCreate) => api.createBudget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budgets });
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BudgetUpdate }) =>
      api.updateBudget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budgets });
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.budgets });
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
    },
  });
}

// --- Forecast ---

export function useForecast(historyMonths = 6, forecastMonths = 3, type?: TransactionType) {
  return useQuery({
    queryKey: [...keys.forecast, historyMonths, forecastMonths, type],
    queryFn: () => api.getForecast(historyMonths, forecastMonths, type),
    staleTime: 1000 * 60 * 10,
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
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
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
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
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
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
    },
  });
}

export function useDeleteAllTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type?: TransactionType) => api.deleteAllTransactions(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions });
      qc.invalidateQueries({ queryKey: keys.reports });
      qc.invalidateQueries({ queryKey: keys.budgetsStatus });
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
    mutationFn: (files: File[]) => api.batchUpload(files),
  });
}
