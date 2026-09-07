// Currency configuration shared by the app shell and the modals.
export const CURRENCY_SYMBOLS: Record<string, string> = { 'TWD': 'NT$', 'USD': '$', 'JPY': '¥', 'KRW': '₩', 'EUR': '€', 'CNY': '¥' };

// Currencies selectable as the ledger base and on transaction / asset forms.
export const ALLOWED_CURRENCIES = ['TWD', 'USD', 'JPY', 'KRW'];

// Investment platforms may also settle in USDT.
export const PLATFORM_CURRENCIES = [...ALLOWED_CURRENCIES, 'USDT'];

// Fallback rates (per 1 TWD) used before the first exchange-rate fetch lands.
export const FALLBACK_RATES: Record<string, number> = { 'TWD': 1, 'USD': 0.032, 'JPY': 4.6, 'KRW': 45 };

// 獨秀指數 (Solo Index)，出自 YouTuber 陳一枝：能力收入(月) / 生活成本(月)。
// >1 經濟自給、=1 打平、<1 需縮支或增收。
// 「能力收入」= 靠專業與勞務產生的現金流，所以只認薪水與獎金；
// 零用錢、紅包、股利配息等被動或他人給予的收入不算。
//
// 分類是使用者自訂的，正解是讓使用者在「設定 > 分類」逐一勾選 (Category.isSoloIncome)。
// 下面這組關鍵字只是「還沒勾過任何一個分類」時的預設值，讓舊帳本開箱就有合理數字。
export const SOLO_INCOME_KEYWORDS = ['薪水', '薪資', '工資', '獎金', 'salary', 'bonus'];

const matchesSoloIncomeKeyword = (name?: string) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return SOLO_INCOME_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
};

/**
 * 回傳算進獨秀指數分子的收入分類名稱。
 * 只要有任何一個收入分類被明確勾選過，就完全照使用者的勾選走；
 * 都沒勾過才退回關鍵字預設。
 */
export const getSoloIncomeCategoryNames = (categories: { name: string; type: string; isSoloIncome?: boolean }[]) => {
    const income = categories.filter(c => c.type === 'income');
    const picked = income.filter(c => c.isSoloIncome === true);
    const configured = income.some(c => typeof c.isSoloIncome === 'boolean');
    const source = configured ? picked : income.filter(c => matchesSoloIncomeKeyword(c.name));
    return new Set(source.map(c => c.name));
};
