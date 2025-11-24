
export interface AssetHolding {
  id: string;
  platformId: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  manualPrice?: number; // User overridden price
  currency: string;
  type: 'stock' | 'crypto';
}

export interface InvestmentLot {
  id: string;
  date: any; // Timestamp
  quantity: number; // Original quantity purchased
  remainingQuantity: number; // Quantity currently held
  costPerShare: number;
  currency: string;
  note?: string;
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
  linkedGroupId?: string; // Added for cross-ledger linking
}

export interface Transaction {
  id: string;
  date: any;
  description: string;
  category: string;
  type: 'expense' | 'income';
  totalAmount: number;
  currency: string; // The currency of totalAmount (usually Ledger Base)
  sourceAmount?: number; // Original amount if different currency
  sourceCurrency?: string; // Original currency
  exchangeRate?: number; // Rate used for conversion
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
  amount: number; // For DRIP, this represents Dividend Per Share (DPS). For others, it's total amount.
  category: string;
  type: 'expense' | 'income';
  payerId: string;
  nextDate: any;
  frequency: 'monthly' | 'custom';
  intervalMonths?: number; // 1=Monthly, 3=Quarterly, 12=Annually
  linkedPlatformId?: string; // If set, adds amount to this platform's balance automatically
  active: boolean;
  payers?: Record<string, number>;
  splitDetails?: Record<string, number>;
  linkedHoldingId?: string; // For DRIP: which asset to update
  isDRIP?: boolean; // If true, calculates shares and updates holding instead of cash
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
