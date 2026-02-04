import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionList,
  ParsedTransaction,
  MonthlyReport,
} from '../types';
import {
  mockTransactions,
  mockMonthlyReports,
  mockParsedTransaction,
} from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory store for mock data
let transactions = [...mockTransactions];
let nextId = transactions.length + 1;

// API base URL (proxied through Vite dev server / Nginx in production)
const API_BASE = import.meta.env.VITE_API_URL || '';

// Flag to use mock data (default: false — use real backend)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const api = {
  // Transactions
  async getTransactions(
    page = 1,
    perPage = 20,
    category?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<TransactionList> {
    if (USE_MOCK) {
      await delay(300);
      let filtered = [...transactions];
      if (category) {
        filtered = filtered.filter((t) => t.category === category);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.description.toLowerCase().includes(searchLower) ||
            (t.raw_text && t.raw_text.toLowerCase().includes(searchLower))
        );
      }
      if (dateFrom) {
        filtered = filtered.filter(
          (t) => new Date(t.date) >= new Date(dateFrom)
        );
      }
      if (dateTo) {
        filtered = filtered.filter(
          (t) => new Date(t.date) <= new Date(dateTo)
        );
      }
      filtered.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const start = (page - 1) * perPage;
      const items = filtered.slice(start, start + perPage);
      return {
        items,
        total: filtered.length,
        page,
        per_page: perPage,
      };
    }

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    const response = await fetch(`${API_BASE}/api/transactions?${params}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  async getTransaction(id: number): Promise<Transaction> {
    if (USE_MOCK) {
      await delay(200);
      const transaction = transactions.find((t) => t.id === id);
      if (!transaction) throw new Error('Transaction not found');
      return transaction;
    }

    const response = await fetch(`${API_BASE}/api/transactions/${id}`);
    if (!response.ok) throw new Error('Transaction not found');
    return response.json();
  },

  async createTransaction(data: TransactionCreate): Promise<Transaction> {
    if (USE_MOCK) {
      await delay(300);
      const now = new Date().toISOString();
      const transaction: Transaction = {
        id: nextId++,
        amount: data.amount,
        description: data.description,
        category: data.category || null,
        date: data.date,
        image_path: data.image_path || null,
        raw_text: data.raw_text || null,
        created_at: now,
        updated_at: now,
      };
      transactions.unshift(transaction);
      return transaction;
    }

    const response = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create transaction');
    return response.json();
  },

  async updateTransaction(
    id: number,
    data: TransactionUpdate
  ): Promise<Transaction> {
    if (USE_MOCK) {
      await delay(300);
      const index = transactions.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Transaction not found');

      transactions[index] = {
        ...transactions[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return transactions[index];
    }

    const response = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update transaction');
    return response.json();
  },

  async deleteTransaction(id: number): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      const index = transactions.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Transaction not found');
      transactions.splice(index, 1);
      return;
    }

    const response = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete transaction');
  },

  // Reports
  async getMonthlyReports(year?: number): Promise<MonthlyReport[]> {
    if (USE_MOCK) {
      await delay(300);
      if (year) {
        return mockMonthlyReports.filter((r) => r.year === year);
      }
      return mockMonthlyReports;
    }

    const params = year ? `?year=${year}` : '';
    const response = await fetch(
      `${API_BASE}/api/transactions/reports/monthly${params}`
    );
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
  },

  // Upload and parse
  async uploadAndParse(file: File): Promise<ParsedTransaction> {
    if (USE_MOCK) {
      await delay(1500); // Simulate AI processing time
      // Return mock data with some randomization
      return {
        ...mockParsedTransaction,
        amount: Math.round(Math.random() * 5000 + 100),
        date: new Date().toISOString(),
        confidence: 0.85 + Math.random() * 0.15,
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || `Upload failed (${response.status})`);
    }
    return response.json();
  },

  // Export to CSV
  async exportTransactions(
    category?: string,
    dateFrom?: string,
    dateTo?: string,
    search?: string
  ): Promise<Blob> {
    if (USE_MOCK) {
      await delay(500);
      // Filter mock transactions
      const filtered = mockTransactions.filter(t => {
        if (category && t.category !== category) return false;
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
        return true;
      });

      // Generate CSV
      const csv = '\ufeffID,Дата,Сумма,Валюта,Описание,Категория\n' +
        filtered.map(t =>
          `${t.id},${t.date},${t.amount},${t.currency},"${t.description}",${t.category || ''}`
        ).join('\n');
      return new Blob([csv], { type: 'text/csv; charset=utf-8' });
    }

    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE}/api/transactions/export?${params}`);
    if (!response.ok) throw new Error('Failed to export');
    return response.blob();
  },
};
