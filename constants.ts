// Currency configuration shared by the app shell and the modals.
export const CURRENCY_SYMBOLS: Record<string, string> = { 'TWD': 'NT$', 'USD': '$', 'JPY': '¥', 'KRW': '₩', 'EUR': '€', 'CNY': '¥' };

// Currencies selectable as the ledger base and on transaction / asset forms.
export const ALLOWED_CURRENCIES = ['TWD', 'USD', 'JPY', 'KRW'];

// Investment platforms may also settle in USDT.
export const PLATFORM_CURRENCIES = [...ALLOWED_CURRENCIES, 'USDT'];

// Fallback rates (per 1 TWD) used before the first exchange-rate fetch lands.
export const FALLBACK_RATES: Record<string, number> = { 'TWD': 1, 'USD': 0.032, 'JPY': 4.6, 'KRW': 45 };
