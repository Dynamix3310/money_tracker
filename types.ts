
export interface AssetHolding {
  id: string;
  platformId: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currency: string;
  type: 'stock' | 'crypto';
}

export interface Platform {
  id: string;
  name: string;
  type: 'stock' | 'crypto';
  balance: number; // Cash balance on the platform (Buying Power)
  currency: string;
}

export interface BankAccount {
  id: string;
  name: string;
  initialBalance: number;
  currency: string;
  currentBalance?: number;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  type: 'in' | 'out';
  amount: number;
  date: any;
  description: string;
}

export interface CreditCardInfo {
  id: string;
  name: string;
  billingDay: number;
}

export interface CreditCardLog {
  id: string;
  cardId: string;
  date: any;
  amount: number;
  description: string;
  isReconciled: boolean;
  linkedTransactionId?: string;
}

export interface Transaction {
  id: string;
  date: any;
  description: string;
  category: string;
  type: 'expense' | 'income';
  totalAmount: number;
  currency: string;
  payers: Record<string, number>;
  splitDetails: Record<string, number>;
  isRecurring?: boolean;
}

export interface Person {
  id: string;
  name: string;
  isMe: boolean;
  email?: string; // Added to link auth user to person
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  budgetLimit?: number; // Added for Budgeting feature
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  payerId: string;
  nextDate: any;
  frequency: 'monthly';
  active: boolean;
  payers?: Record<string, number>;
  splitDetails?: Record<string, number>;
}

export interface NetWorthHistory {
  id: string;
  date: any;
  amount: number;
  currency: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AppState {
  user: any;
  currentGroupId: string | null;
  baseCurrency: string;
  rates: Record<string, number>;
}

export interface UserProfile {
  uid: string;
  email: string;
  currentGroupId: string;
  name?: string;
}