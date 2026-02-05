import type {
  Transaction,
  TransactionCreate,
  TransactionUpdate,
  TransactionList,
  ParsedTransactions,
  MonthlyReport,
  MonthComparisonData,
  TrendsData,
  Budget,
  BudgetCreate,
  BudgetUpdate,
  BudgetStatus,
  ForecastData,
} from '../types';
import {
  mockTransactions,
  mockMonthlyReports,
  mockParsedTransactions,
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
        currency: data.currency || 'RUB',
        image_path: data.image_path || null,
        raw_text: data.raw_text || null,
        ai_category: data.ai_category || null,
        ai_confidence: data.ai_confidence || null,
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
  async uploadAndParse(file: File): Promise<ParsedTransactions> {
    if (USE_MOCK) {
      await delay(1500); // Simulate AI processing time
      // Return mock data with some randomization
      return mockParsedTransactions;
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

  // Month comparison
  async getMonthComparison(year: number, month: number): Promise<MonthComparisonData> {
    if (USE_MOCK) {
      await delay(300);
      // Mock comparison data
      return {
        current_month: { year, month },
        previous_month: { year: month === 1 ? year - 1 : year, month: month === 1 ? 12 : month - 1 },
        current: {
          total: 45230.50,
          count: 42,
          by_category: {
            Food: 15000,
            Transport: 8500,
            Shopping: 12000,
            Bills: 7230.50,
            Entertainment: 2500,
          },
        },
        previous: {
          total: 38120.30,
          count: 38,
          by_category: {
            Food: 12000,
            Transport: 9000,
            Shopping: 10000,
            Bills: 5620.30,
            Entertainment: 1500,
          },
        },
        changes: {
          total_percent: 18.7,
          count_percent: 10.5,
          by_category: [
            { category: 'Food', current: 15000, previous: 12000, change_percent: 25.0 },
            { category: 'Bills', current: 7230.50, previous: 5620.30, change_percent: 28.7 },
            { category: 'Shopping', current: 12000, previous: 10000, change_percent: 20.0 },
            { category: 'Entertainment', current: 2500, previous: 1500, change_percent: 66.7 },
            { category: 'Transport', current: 8500, previous: 9000, change_percent: -5.6 },
          ],
        },
      };
    }

    const response = await fetch(
      `${API_BASE}/api/transactions/analytics/comparison?year=${year}&month=${month}`
    );
    if (!response.ok) throw new Error('Failed to fetch comparison');
    return response.json();
  },

  // Spending trends
  async getSpendingTrends(months = 6): Promise<TrendsData> {
    if (USE_MOCK) {
      await delay(300);
      // Mock trends data
      const data = [];
      const trendLine = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const total = 30000 + Math.random() * 20000 + i * 1000; // Increasing trend
        data.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          total,
          count: Math.floor(30 + Math.random() * 20),
        });
        trendLine.push(30000 + i * 1500); // Linear trend
      }

      return {
        period: `${months} months`,
        data,
        trend_line: trendLine,
        statistics: {
          average: 38500,
          std_deviation: 5200,
          min: 28000,
          max: 48000,
        },
      };
    }

    const response = await fetch(
      `${API_BASE}/api/transactions/analytics/trends?months=${months}`
    );
    if (!response.ok) throw new Error('Failed to fetch trends');
    return response.json();
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    if (USE_MOCK) {
      await delay(300);
      return [
        {
          id: 1,
          category: 'Food',
          limit_amount: 50000,
          period: 'monthly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          category: 'Transport',
          limit_amount: 15000,
          period: 'monthly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }

    const response = await fetch(`${API_BASE}/api/budgets`);
    if (!response.ok) throw new Error('Failed to fetch budgets');
    return response.json();
  },

  async getBudgetsStatus(year?: number, month?: number): Promise<BudgetStatus[]> {
    if (USE_MOCK) {
      await delay(300);
      return [
        {
          budget: {
            id: 1,
            category: 'Food',
            limit_amount: 50000,
            period: 'monthly',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          spent: 35000,
          remaining: 15000,
          percentage: 70,
          exceeded: false,
        },
        {
          budget: {
            id: 2,
            category: 'Transport',
            limit_amount: 15000,
            period: 'monthly',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          spent: 18000,
          remaining: -3000,
          percentage: 120,
          exceeded: true,
        },
      ];
    }

    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));

    const response = await fetch(`${API_BASE}/api/budgets/status?${params}`);
    if (!response.ok) throw new Error('Failed to fetch budget status');
    return response.json();
  },

  async createBudget(data: BudgetCreate): Promise<Budget> {
    if (USE_MOCK) {
      await delay(300);
      return {
        id: Math.floor(Math.random() * 1000),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const response = await fetch(`${API_BASE}/api/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create budget');
    return response.json();
  },

  async updateBudget(id: number, data: BudgetUpdate): Promise<Budget> {
    if (USE_MOCK) {
      await delay(300);
      const existing = {
        id,
        category: 'Food',
        limit_amount: 50000,
        period: 'monthly' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { ...existing, ...data, updated_at: new Date().toISOString() };
    }

    const response = await fetch(`${API_BASE}/api/budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update budget');
    return response.json();
  },

  async deleteBudget(id: number): Promise<void> {
    if (USE_MOCK) {
      await delay(200);
      return;
    }

    const response = await fetch(`${API_BASE}/api/budgets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete budget');
  },

  // Forecast
  async getForecast(historyMonths = 6, forecastMonths = 3): Promise<ForecastData> {
    if (USE_MOCK) {
      await delay(300);
      const now = new Date();
      const historical = [];
      const forecast = [];

      // Generate mock historical data
      for (let i = historyMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        historical.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          amount: 30000 + Math.random() * 15000,
          is_forecast: false,
        });
      }

      // Generate mock forecast
      const avg = 37500;
      const std = 5000;
      for (let i = 1; i <= forecastMonths; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        forecast.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          amount: avg,
          is_forecast: true,
          confidence_min: avg - std,
          confidence_max: avg + std,
        });
      }

      return {
        historical,
        forecast,
        statistics: {
          average: avg,
          std_deviation: std,
          confidence_interval: {
            min: avg - std,
            max: avg + std,
          },
        },
      };
    }

    const response = await fetch(
      `${API_BASE}/api/transactions/analytics/forecast?history_months=${historyMonths}&forecast_months=${forecastMonths}`
    );
    if (!response.ok) throw new Error('Failed to fetch forecast');
    return response.json();
  },
};
