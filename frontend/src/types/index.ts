export interface Transaction {
  id: number;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  currency: string;
  image_path: string | null;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  amount: number;
  description: string;
  category?: string;
  date: string;
  currency?: string;
  image_path?: string;
  raw_text?: string;
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
  raw_text: string;
  confidence: number;
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
