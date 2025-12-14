// Author: Senior Frontend Engineer
// OS support: Web
// Description: Type definitions for the application

export interface AssetHolding {
  id: string;
  platformId: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  manualPrice?: number;
  currency: string;
  type: 'stock' | 'crypto';
}

export interface InvestmentLot {
  id: string;
  date: any;
  quantity: number;
  remainingQuantity: number;
  costPerShare: number;
  currency: string;
  note?: string;
}

export interface Platform {
  id: string;
  name: string;
  type: 'stock' | 'crypto';
  balance: number;
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
  linkedGroupId?: string;
}

export interface Transaction {
  id: string;
  date: any;
  description: string;
  category: string;
  type: 'expense' | 'income';
  totalAmount: number;
  currency: string;
  sourceAmount?: number;
  sourceCurrency?: string;
  exchangeRate?: number;
  payers: Record<string, number>;
  splitDetails: Record<string, number>;
  isRecurring?: boolean;
}

export interface Person {
  id: string;
  name: string;
  isMe: boolean;
  email?: string;
  uid?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  budgetLimit?: number;
  order?: number;
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  payerId: string;
  nextDate: any;
  frequency: 'monthly' | 'custom';
  intervalMonths?: number;
  linkedPlatformId?: string;
  active: boolean;
  payers?: Record<string, number>;
  splitDetails?: Record<string, number>;
  linkedHoldingId?: string;
  isDRIP?: boolean;
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

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
}

export interface PortfolioTarget {
  stock: number;
  crypto: number;
  cash: number;
}

// --- End of types.ts ---