// Auth types
export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  currency: string;
  type: TransactionType;
  image_path: string | null;
  raw_text: string | null;
  ai_category: string | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  amount: number;
  description: string;
  category?: string;
  date: string;
  currency?: string;
  type?: TransactionType;
  image_path?: string;
  raw_text?: string;
  ai_category?: string;
  ai_confidence?: number;
}

export interface TransactionUpdate {
  amount?: number;
  description?: string;
  category?: string;
  date?: string;
  currency?: string;
}

export interface TransactionList {
  items: Transaction[];
  total: number;
  page: number;
  per_page: number;
}

export interface ParsedTransaction {
  amount: number;
  description: string;
  date: string;
  category: string | null;
  currency: string;
  type?: TransactionType;
  raw_text: string;
  confidence: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
  percentage?: number;
}

export interface ParsedChart {
  type: string;
  categories: ChartDataItem[];
  total: number;
  period?: string;
  period_type?: 'month' | 'year' | 'week' | 'custom';
  confidence: number;
}

export interface ParsedTransactions {
  transactions: ParsedTransaction[];
  total_amount: number;
  chart?: ParsedChart | null;
  raw_text: string;
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_amount: number;
  transaction_count: number;
  by_category: Record<string, number>;
}

export type Category =
  | 'Food'
  | 'Transport'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Health'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Entertainment',
  'Shopping',
  'Bills',
  'Health',
  'Other',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#22c55e',
  Transport: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#f59e0b',
  Bills: '#ef4444',
  Health: '#ec4899',
  Other: '#6b7280',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  Food: 'Еда',
  Transport: 'Транспорт',
  Entertainment: 'Развлечения',
  Shopping: 'Покупки',
  Bills: 'Счета',
  Health: 'Здоровье',
  Other: 'Другое',
};

export type IncomeCategory =
  | 'Salary'
  | 'Transfer'
  | 'Cashback'
  | 'Investment'
  | 'OtherIncome';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary',
  'Transfer',
  'Cashback',
  'Investment',
  'OtherIncome',
];

export const INCOME_CATEGORY_COLORS: Record<IncomeCategory, string> = {
  Salary: '#22c55e',
  Transfer: '#3b82f6',
  Cashback: '#f59e0b',
  Investment: '#a855f7',
  OtherIncome: '#6b7280',
};

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  Salary: 'Зарплата',
  Transfer: 'Перевод',
  Cashback: 'Кэшбэк',
  Investment: 'Инвестиции',
  OtherIncome: 'Другое',
};

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

export const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
] as const;

export const CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP'] as const;
export type Currency = typeof CURRENCIES[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  RUB: 'Российский рубль',
  USD: 'Доллар США',
  EUR: 'Евро',
  GBP: 'Фунт стерлингов',
};

export interface BatchUploadResult {
  filename: string;
  status: 'success' | 'error';
  data?: ParsedTransactions;
  error?: string;
}

export interface BatchUploadResponse {
  results: BatchUploadResult[];
  total_files: number;
  successful: number;
  failed: number;
}

export interface MonthComparisonData {
  current_month: { year: number; month: number };
  previous_month: { year: number; month: number };
  current: {
    total: number;
    count: number;
    by_category: Record<string, number>;
  };
  previous: {
    total: number;
    count: number;
    by_category: Record<string, number>;
  };
  changes: {
    total_percent: number;
    count_percent: number;
    by_category: Array<{
      category: string;
      current: number;
      previous: number;
      change_percent: number;
    }>;
  };
}

export interface TrendsData {
  period: string;
  data: Array<{
    year: number;
    month: number;
    total: number;
    count: number;
  }>;
  trend_line: number[];
  statistics: {
    average: number;
    std_deviation: number;
    min: number;
    max: number;
  };
}

export interface Budget {
  id: number;
  category: string;
  limit_amount: number;
  period: 'monthly' | 'weekly';
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  category: string;
  limit_amount: number;
  period: 'monthly' | 'weekly';
}

export interface BudgetUpdate {
  limit_amount?: number;
  period?: 'monthly' | 'weekly';
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  exceeded: boolean;
}

export interface ForecastDataPoint {
  year: number;
  month: number;
  amount: number;
  is_forecast: boolean;
  confidence_min?: number;
  confidence_max?: number;
}

export interface ForecastData {
  historical: ForecastDataPoint[];
  forecast: ForecastDataPoint[];
  statistics: {
    average: number;
    std_deviation: number;
    confidence_interval: {
      min: number;
      max: number;
    };
  };
}
