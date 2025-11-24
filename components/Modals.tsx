
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Download, Share2, Trash2, Camera, Loader2, ArrowUpRight, ArrowDownRight, Sparkles, Send, CheckCircle, Circle, Link as LinkIcon, Link2, Upload, ArrowRightLeft, Save, RefreshCw, Building2, Wallet, Landmark, Edit, Key, Settings, Repeat, AlertCircle, FileText, Image as ImageIcon, CreditCard, Copy, LogOut, Users, Split, Calculator, Wand2, PlusIcon, FileSpreadsheet, AlertTriangle, CheckSquare, Square, DollarSign, Clock, Calendar, PieChart, TrendingUp, Layers, Scale, ArrowRight, ChevronDown, Coins } from 'lucide-react';
import { RecurringRule, Person, Category, AssetHolding, Platform, CreditCardLog, Transaction, ChatMessage, BankAccount, InvestmentLot, Group } from '../types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc, getDocs, query, orderBy, where, increment, getDoc } from 'firebase/firestore';
import { db, getCollectionPath, auth, getUserProfilePath } from '../services/firebase';
import { callGemini } from '../services/gemini';

const styles = {
    overlay: "fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200",
    content: "bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto",
    input: "w-full px-4 py-3 rounded-xl border-0 ring-1 ring-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-400",
    btnPrimary: "bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold active:scale-95 py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
    btnSecondary: "bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold active:scale-95 py-3 px-4",
    label: "block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider"
};

// --- Generic Confirmation Modal ---
export const ConfirmActionModal = ({ title, message, onConfirm, onCancel }: any) => (
    <div className={styles.overlay}>
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-xl text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className={styles.btnSecondary + " flex-1"}>取消</button>
                <button onClick={onConfirm} className="bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-bold flex-1 py-3">確認執行</button>
            </div>
        </div>
    </div>
);

// --- Generic Manage List Modal ---
export const ManageListModal = ({ title, items, renderItem, onEdit, onDelete, onClose }: any) => (
    <div className={styles.overlay}>
        <div className={styles.content}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">{title}</h3>
                <button onClick={onClose}><X size={20} /></button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {items.length === 0 && <div className="text-center text-slate-400 py-8">無資料</div>}
                {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1 overflow-hidden">{renderItem(item)}</div>
                        <div className="flex gap-1 ml-2">
                            <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"><Edit size={16} /></button>
                            <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- Manage Recurring Rules Modal ---
export const ManageRecurringModal = ({ rules, onClose, onAdd, onEdit, onDelete }: any) => (
    <div className={styles.overlay}>
        <div className={styles.content}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">管理固定收支</h3>
                <button onClick={onClose}><X size={20} /></button>
            </div>
            <button onClick={onAdd} className="w-full py-2 mb-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm flex justify-center items-center gap-2"><PlusIcon size={16} /> 新增規則</button>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {rules.length === 0 && <div className="text-center text-slate-400 py-8">無固定收支規則</div>}
                {rules.map((r: any) => (
                    <div key={r.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">{r.name} <span className={`text-[10px] px-1.5 rounded ${r.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{r.active ? '啟用' : '停用'}</span></div>
                            <div className="text-xs text-slate-400">下次: {r.nextDate?.seconds ? new Date(r.nextDate.seconds * 1000).toLocaleDateString() : 'N/A'} • ${r.amount} {r.intervalMonths ? `(每${r.intervalMonths}月)` : '(每月)'}</div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => onEdit(r)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={16} /></button>
                            <button onClick={() => onDelete(r.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- Add/Edit Recurring Rule Modal ---
export const AddRecurringModal = ({ userId, groupId, people, categories, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [amount, setAmount] = useState(editData?.amount?.toString() || '');
    const [type, setType] = useState<'expense' | 'income'>(editData?.type || 'expense');
    const [category, setCategory] = useState(editData?.category || '');
    const [payerId, setPayerId] = useState(editData?.payerId || (people[0]?.id || ''));
    const [nextDate, setNextDate] = useState(editData?.nextDate?.seconds ? new Date(editData.nextDate.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [active, setActive] = useState(editData ? editData.active : true);

    const currentCats = categories.filter((c: any) => c.type === type);
    useEffect(() => { if (currentCats.length > 0 && !category) setCategory(currentCats[0].name); }, [type, categories]);

    const handleSave = async () => {
        if (!name || !amount) return;
        const data = {
            name, amount: parseFloat(amount), type, category, payerId,
            frequency: 'monthly', active,
            nextDate: Timestamp.fromDate(new Date(nextDate))
        };
        const col = collection(db, getCollectionPath(userId, groupId, 'recurring'));
        if (editData) await updateDoc(doc(col, editData.id), data);
        else await addDoc(col, data);
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData ? '編輯固定收支' : '新增固定收支 (每月)'}</h3>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>支出</button><button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'income' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>收入</button></div>
                <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="例如: 房租" /></div>
                <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>分類</label><select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>{currentCats.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    <div><label className={styles.label}>成員</label><select className={styles.input} value={payerId} onChange={e => setPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div><label className={styles.label}>下次執行日期</label><input type="date" className={styles.input} value={nextDate} onChange={e => setNextDate(e.target.value)} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4" /><label htmlFor="active" className="text-sm font-bold text-slate-600">啟用自動記帳</label></div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    )
}

// --- Settings ---
export const SettingsModal = ({ onClose, onExport, onExportCSV, onImport, currentGroupId, groups, user, categories, onAddCategory, onDeleteCategory, onGroupJoin, onGroupCreate, onGroupSwitch }: any) => {
    const [activeTab, setActiveTab] = useState('ledger');
    const [newCat, setNewCat] = useState('');
    const [catType, setCatType] = useState<'expense' | 'income'>('expense');
    const [newCatBudget, setNewCatBudget] = useState('');

    const [finnhubKey, setFinnhubKey] = useState(localStorage.getItem('finnhub_key') || '');
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('user_gemini_key') || '');

    const [joinId, setJoinId] = useState('');
    const [newGroupName, setNewGroupName] = useState('');

    const handleSaveKeys = () => {
        localStorage.setItem('finnhub_key', finnhubKey);
        localStorage.setItem('user_gemini_key', geminiKey);
        alert('API Keys 已儲存');
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">設定</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('ledger')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'ledger' ? 'bg-white shadow' : 'text-slate-400'}`}>帳本管理</button>
                    <button onClick={() => setActiveTab('category')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'category' ? 'bg-white shadow' : 'text-slate-400'}`}>分類與預算</button>
                    <button onClick={() => setActiveTab('keys')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'keys' ? 'bg-white shadow' : 'text-slate-400'}`}>API & 資料</button>
                </div>

                {activeTab === 'ledger' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><Users size={16} /> 我的帳本列表</div>
                            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                                {groups.map((g: Group) => (
                                    <div key={g.id} onClick={() => onGroupSwitch(g.id)} className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${g.id === currentGroupId ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-white/50 border-transparent hover:bg-white'}`}>
                                        <div>
                                            <div className={`font-bold text-sm ${g.id === currentGroupId ? 'text-indigo-700' : 'text-slate-700'}`}>{g.name}</div>
                                            <div className="text-[10px] text-slate-400">{g.id === user.uid ? '個人預設' : '群組帳本'}</div>
                                        </div>
                                        {g.id === currentGroupId && <CheckCircle size={16} className="text-indigo-600"/>}
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-indigo-200 pt-4 space-y-4">
                                <div>
                                    <label className={styles.label}>建立新帳本</label>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="帳本名稱 (如: 旅遊公帳)"
                                            className={`${styles.input} py-2 text-sm bg-white`}
                                            value={newGroupName}
                                            onChange={e => setNewGroupName(e.target.value)}
                                        />
                                        <button onClick={() => { onGroupCreate(newGroupName); setNewGroupName(''); }} disabled={!newGroupName} className="bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm whitespace-nowrap disabled:opacity-50">
                                            建立
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={styles.label}>加入現有帳本</label>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="輸入邀請碼 (Group ID)"
                                            className={`${styles.input} py-2 text-sm bg-white`}
                                            value={joinId}
                                            onChange={e => setJoinId(e.target.value)}
                                        />
                                        <button onClick={() => { onGroupJoin(joinId); setJoinId(''); }} disabled={!joinId} className="bg-slate-700 text-white px-4 rounded-xl font-bold text-sm whitespace-nowrap disabled:opacity-50">
                                            加入
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <label className={styles.label}>當前帳本邀請碼</label>
                            <div className="flex gap-2 mt-1">
                                <div className="bg-slate-100 px-3 py-2 rounded-lg text-xs font-mono flex-1 truncate select-all text-slate-600">{currentGroupId}</div>
                                <button onClick={() => navigator.clipboard.writeText(currentGroupId)} className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300"><Copy size={14} /></button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">將此代碼分享給他人，對方即可加入此帳本。</p>
                        </div>
                    </div>
                )}

                {activeTab === 'keys' && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 p-3 rounded-lg text-amber-800 text-xs mb-2">
                            若非系統管理員，需自行提供 Key 才能使用 AI 與股票功能。
                        </div>
                        <div>
                            <label className={styles.label}>Gemini API Key (AI)</label>
                            <input type="password" placeholder="貼上您的 Key" className={styles.input} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>Finnhub API Key (股票)</label>
                            <input type="password" placeholder="貼上 Finnhub Key" className={styles.input} value={finnhubKey} onChange={e => setFinnhubKey(e.target.value)} />
                        </div>
                        <button onClick={handleSaveKeys} className={styles.btnPrimary}>儲存金鑰</button>

                        <div className="border-t pt-4 mt-4">
                            <label className={styles.label}>資料備份與匯出</label>
                            <div className="flex gap-2 mt-2">
                                <button onClick={onExport} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-200">
                                    <Download size={14} /> JSON
                                </button>
                                <button onClick={onExportCSV} className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-emerald-100 border border-emerald-100">
                                    <FileSpreadsheet size={14} /> Excel
                                </button>
                            </div>
                            <button onClick={onImport} className="w-full mt-2 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-200">
                                <Upload size={14} /> 匯入備份 (JSON)
                            </button>
                        </div>
                        
                        <button onClick={() => { auth.signOut(); onClose(); }} className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors mt-4">
                            <LogOut size={18} /> 登出帳號
                        </button>
                    </div>
                )}

                {activeTab === 'category' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <label className={styles.label}>分類名稱</label>
                                    <input placeholder="例如: 娛樂" className={`${styles.input} py-2 text-sm`} value={newCat} onChange={e => setNewCat(e.target.value)} />
                                </div>
                                <div className="w-24">
                                    <label className={styles.label}>類型</label>
                                    <select className="border rounded-lg px-2 py-2 text-sm h-[38px] w-full bg-white" value={catType} onChange={(e: any) => setCatType(e.target.value)}><option value="expense">支出</option><option value="income">收入</option></select>
                                </div>
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className={styles.label}>每月預算 (可選)</label>
                                    <input type="number" placeholder="0 = 無限制" className={`${styles.input} py-2 text-sm`} value={newCatBudget} onChange={e => setNewCatBudget(e.target.value)} />
                                </div>
                                <button onClick={() => { onAddCategory(newCat, catType, parseFloat(newCatBudget)); setNewCat(''); setNewCatBudget(''); }} className="bg-indigo-600 text-white px-4 py-2 h-[38px] rounded-lg font-bold text-sm mb-[1px] flex items-center gap-1"><PlusIcon size={14} /> 新增</button>
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {categories.map((c: Category) => (
                                <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                    <div>
                                        <span className="text-sm font-bold flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${c.type === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>{c.name}</span>
                                        {c.budgetLimit && c.budgetLimit > 0 && <div className="text-xs text-slate-400 pl-4">預算: ${c.budgetLimit.toLocaleString()}</div>}
                                    </div>
                                    <button onClick={() => onDeleteCategory(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Rebalance Modal ---
export const PortfolioRebalanceModal = ({ holdings, platforms, rates, baseCurrency, convert, onClose }: any) => {
    const [targets, setTargets] = useState({ stock: 60, crypto: 30, cash: 10 });
    const [aiAdvice, setAiAdvice] = useState('');
    const [loadingAi, setLoadingAi] = useState(false);

    const totalPercent = targets.stock + targets.crypto + targets.cash;

    const calcData = useMemo(() => {
        let stockTotal = 0, cryptoTotal = 0, cashTotal = 0;

        platforms.forEach((p: Platform) => {
            const val = convert(p.balance, p.currency, baseCurrency, rates);
            cashTotal += val;
        });

        holdings.forEach((h: AssetHolding) => {
            const price = h.manualPrice ?? h.currentPrice;
            const val = convert(h.quantity * price, h.currency, baseCurrency, rates);
            if (h.type === 'crypto') cryptoTotal += val;
            else stockTotal += val;
        });

        const total = stockTotal + cryptoTotal + cashTotal;
        const stockPct = total ? (stockTotal / total) * 100 : 0;
        const cryptoPct = total ? (cryptoTotal / total) * 100 : 0;
        const cashPct = total ? (cashTotal / total) * 100 : 0;

        const stockDrift = stockPct - targets.stock;
        const cryptoDrift = cryptoPct - targets.crypto;
        const cashDrift = cashPct - targets.cash;

        const stockDiffVal = total * (stockDrift / 100);
        const cryptoDiffVal = total * (cryptoDrift / 100);
        const cashDiffVal = total * (cashDrift / 100);

        return {
            total,
            stock: { val: stockTotal, pct: stockPct, drift: stockDrift, diff: stockDiffVal },
            crypto: { val: cryptoTotal, pct: cryptoPct, drift: cryptoDrift, diff: cryptoDiffVal },
            cash: { val: cashTotal, pct: cashPct, drift: cashDrift, diff: cashDiffVal }
        };
    }, [holdings, platforms, rates, baseCurrency, targets]);

    const handleAIAnalysis = async () => {
        setLoadingAi(true);
        try {
            const prompt = `
            As a financial advisor, analyze this portfolio rebalancing need.
            Currency: ${baseCurrency}
            Total Portfolio Value: ${Math.round(calcData.total)}
            
            Current State:
            - Stock: ${calcData.stock.pct.toFixed(1)}% (Target ${targets.stock}%) -> Drift: ${calcData.stock.drift.toFixed(1)}% (${calcData.stock.diff > 0 ? 'Overweight' : 'Underweight'} by ${Math.round(Math.abs(calcData.stock.diff))})
            - Crypto: ${calcData.crypto.pct.toFixed(1)}% (Target ${targets.crypto}%) -> Drift: ${calcData.crypto.drift.toFixed(1)}% (${calcData.crypto.diff > 0 ? 'Overweight' : 'Underweight'} by ${Math.round(Math.abs(calcData.crypto.diff))})
            - Cash: ${calcData.cash.pct.toFixed(1)}% (Target ${targets.cash}%) -> Drift: ${calcData.cash.drift.toFixed(1)}% (${calcData.cash.diff > 0 ? 'Excess' : 'Shortage'} by ${Math.round(Math.abs(calcData.cash.diff))})

            Holdings Detail:
            ${holdings.map((h: any) => `- ${h.symbol} (${h.type}): ${h.quantity} shares @ ${h.manualPrice||h.currentPrice} ${h.currency}`).join('\n')}

            Provide a specific, actionable rebalancing plan. 
            1. Summary of actions (e.g. "Sell $X of Stocks, Buy $Y of Crypto").
            2. Specific trade suggestions based on the holdings list. If needing to sell stocks, suggest selling the ones with largest position size. If needing to buy, suggest generic sector ETFs or increasing existing positions.
            3. Keep it concise and use Traditional Chinese.
            `;
            
            const result = await callGemini(prompt);
            setAiAdvice(result);
        } catch (e) {
            setAiAdvice("無法連線至 AI 顧問，請稍後再試。");
        } finally {
            setLoadingAi(false);
        }
    };

    const renderRow = (label: string, data: any, target: number, setTarget: Function) => (
        <div className="mb-4">
            <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                <span>{label}</span>
                <span>{Math.round(data.val).toLocaleString()} ({data.pct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-3">
                <input 
                    type="range" min="0" max="100" 
                    value={target} onChange={e => setTarget(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="w-16 text-right text-sm font-mono bg-slate-100 rounded px-1">Target: {target}%</div>
            </div>
            <div className="flex justify-between items-center mt-1 text-xs">
                <span className="text-slate-400">偏差:</span>
                <span className={`font-bold ${data.drift > 0 ? 'text-red-500' : data.drift < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {data.drift > 0 ? '+' : ''}{data.drift.toFixed(1)}% 
                    ({data.diff > 0 ? `賣出 $${Math.round(data.diff).toLocaleString()}` : `買入 $${Math.round(Math.abs(data.diff)).toLocaleString()}`})
                </span>
            </div>
        </div>
    );

    return (
        <div className={styles.overlay}>
            <div className={`${styles.content} max-w-2xl h-[90vh]`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl flex items-center gap-2"><Scale className="text-indigo-600"/> 投資組合再平衡</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                    <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase tracking-wider">配置目標設定 (總和: <span className={totalPercent!==100?'text-red-500':'text-emerald-600'}>{totalPercent}%</span>)</h4>
                    {renderRow('股票 (Stocks)', calcData.stock, targets.stock, (v:number) => setTargets(p => ({...p, stock: v})))}
                    {renderRow('加密貨幣 (Crypto)', calcData.crypto, targets.crypto, (v:number) => setTargets(p => ({...p, crypto: v})))}
                    {renderRow('現金 (Cash)', calcData.cash, targets.cash, (v:number) => setTargets(p => ({...p, cash: v})))}
                </div>

                {totalPercent === 100 && (
                    <>
                        <button 
                            onClick={handleAIAnalysis} 
                            disabled={loadingAi}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2 mb-4"
                        >
                            {loadingAi ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                            {loadingAi ? 'AI 分析中...' : '生成再平衡建議'}
                        </button>

                        {aiAdvice && (
                            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 animate-in slide-in-from-bottom-4">
                                <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><Sparkles size={16}/> AI 建議計畫</h4>
                                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {aiAdvice}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// --- Transactions ---
export const AddTransactionModal = ({ userId, groupId, people, categories, onClose, editData, rates, convert }: any) => {
    const [type, setType] = useState<'expense' | 'income'>(editData?.type || 'expense');
    const [amount, setAmount] = useState(editData?.sourceAmount?.toString() || editData?.totalAmount?.toString() || '');
    const [currency, setCurrency] = useState(editData?.sourceCurrency || editData?.currency || 'TWD');
    const [description, setDescription] = useState(editData?.description || '');
    const [category, setCategory] = useState(editData?.category || '');
    const [date, setDate] = useState(editData?.date?.seconds ? new Date(editData.date.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    const [payerMode, setPayerMode] = useState<'single' | 'multi'>('single');
    const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
    const [isRecurring, setIsRecurring] = useState(false);

    const [mainPayerId, setMainPayerId] = useState(editData ? Object.keys(editData.payers)[0] : (people.find((p: any) => p.isMe || p.uid === auth.currentUser?.uid)?.id || people[0]?.id || ''));
    const [multiPayers, setMultiPayers] = useState<Record<string, string>>(
        editData && Object.keys(editData.payers).length > 1
            ? Object.fromEntries(Object.entries(editData.payers).map(([k, v]: any) => [k, v.toString()]))
            : {}
    );

    const [customSplits, setCustomSplits] = useState<Record<string, string>>(
        editData && editData.splitDetails
            ? Object.fromEntries(Object.entries(editData.splitDetails).map(([k, v]: any) => [k, v.toString()]))
            : {}
    );

    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (editData) {
            if (Object.keys(editData.payers).length > 1) setPayerMode('multi');
            const values: number[] = Object.values(editData.splitDetails);
            if (values.length > 0) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                if (max - min > 1) setSplitMode('custom');
            }
        }
    }, []);

    const currentCats = categories.filter((c: any) => c.type === type);
    useEffect(() => { if (currentCats.length > 0 && !category) setCategory(currentCats[0].name); }, [type, categories]);

    // Calculate TWD equivalent
    const rawAmount = parseFloat(amount) || 0;
    const convertedAmount = useMemo(() => {
        if (currency === 'TWD') return rawAmount;
        if (!rates) return rawAmount;
        return convert(rawAmount, currency, 'TWD', rates);
    }, [rawAmount, currency, rates, convert]);

    // For splitting, use converted amount (TWD)
    const finalAmt = convertedAmount;
    const payerSum = payerMode === 'single' ? finalAmt : Object.values(multiPayers).reduce((acc: number, val: any) => acc + (parseFloat(val as string) || 0), 0);
    const splitSum = splitMode === 'equal' ? finalAmt : Object.values(customSplits).reduce((acc: number, val: any) => acc + (parseFloat(val as string) || 0), 0);
    
    const isValidPayer = Math.abs(payerSum - finalAmt) < 1;
    const isValidSplit = Math.abs(splitSum - finalAmt) < 1;

    const fillRemainder = (id: string, currentMap: Record<string, string>, setMap: Function) => {
        if (finalAmt <= 0) return;
        const otherSum = Object.entries(currentMap).filter(([k, v]) => k !== id).reduce((acc: number, [k, v]) => acc + (parseFloat(v as string) || 0), 0);
        const remainder = Math.max(0, finalAmt - otherSum);
        setMap({ ...currentMap, [id]: Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(1) });
    };

    const handlePayerChange = (id: string, val: string) => {
        setMultiPayers({ ...multiPayers, [id]: val });
    };

    const handleSplitChange = (id: string, val: string) => {
        setCustomSplits({ ...customSplits, [id]: val });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setLoadingAI(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const prompt = `Analyze receipt. Extract totalAmount, currency (e.g. TWD, USD, JPY), date(YYYY-MM-DD), description, category from list: ${currentCats.map((c: any) => c.name).join(',')}. Return JSON.`;
                const resultText = await callGemini(prompt, reader.result as string);
                const json = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, ''));
                if (json.totalAmount) setAmount(json.totalAmount);
                if (json.currency) setCurrency(json.currency);
                if (json.description) setDescription(json.description);
                if (json.category) setCategory(json.category);
                if (json.date) setDate(json.date);
            } catch (err) { alert("AI 辨識失敗"); } finally { setLoadingAI(false); }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!amount || !description) return;
        if (type === 'expense') {
            if (!isValidPayer) { alert(`付款金額總和 (${Math.round(payerSum)}) 不等於總金額 (${Math.round(finalAmt)})`); return; }
            if (!isValidSplit) { alert(`分帳金額總和 (${Math.round(splitSum)}) 不等於總金額 (${Math.round(finalAmt)})`); return; }
        }
        
        let payers: Record<string, number> = {};
        if (payerMode === 'single') payers[mainPayerId] = finalAmt;
        else Object.entries(multiPayers).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) payers[pid] = parseFloat(val as string); });

        let splits: Record<string, number> = {};
        if (splitMode === 'equal') { const splitAmt = finalAmt / (people.length || 1); people.forEach((p: any) => splits[p.id] = splitAmt); }
        else Object.entries(customSplits).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) splits[pid] = parseFloat(val as string); });

        const data = { 
            totalAmount: finalAmt, // Always TWD
            description, 
            category, 
            type, 
            payers, 
            splitDetails: splits, 
            date: Timestamp.fromDate(new Date(date)), 
            currency: 'TWD',
            sourceAmount: parseFloat(amount),
            sourceCurrency: currency,
            exchangeRate: currency === 'TWD' ? 1 : (finalAmt / parseFloat(amount))
        };
        const col = collection(db, getCollectionPath(userId, groupId, 'transactions'));
        if (editData) await updateDoc(doc(col, editData.id), data);
        else await addDoc(col, data);

        if (isRecurring && !editData) {
            const nextMonthDate = new Date(date); nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), {
                name: description, amount: finalAmt, type, category, payerId: mainPayerId, payers, splitDetails: splits,
                frequency: 'monthly', active: true, nextDate: Timestamp.fromDate(nextMonthDate)
            });
        }
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">{editData ? '編輯交易' : '記一筆'}</h3>
                    {!editData && <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                        {loadingAI ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} AI <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loadingAI} />
                    </label>}
                </div>
                <div className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>支出</button>
                        <button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'income' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>收入</button>
                    </div>

                    <div>
                        <label className={styles.label}>金額</label>
                        <div className="flex gap-2 items-center">
                            <select className="bg-slate-100 rounded-lg p-2 text-sm font-bold outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                                <option value="TWD">TWD</option>
                                <option value="USD">USD</option>
                                <option value="JPY">JPY</option>
                                <option value="EUR">EUR</option>
                                <option value="CNY">CNY</option>
                            </select>
                            <input type="number" placeholder="0" className="text-3xl font-bold w-full text-right border-b pb-2 outline-none bg-transparent" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        {currency !== 'TWD' && amount && (
                            <div className="text-right text-xs text-slate-400 mt-1 font-bold">
                                ≈ NT$ {Math.round(convertedAmount).toLocaleString()}
                            </div>
                        )}
                    </div>

                    {type === 'expense' && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <label className={styles.label}>付款人 (誰出的錢?)</label>
                                {people.length > 1 && (
                                    <div className="flex bg-white border rounded-lg p-0.5">
                                        <button onClick={() => setPayerMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'single' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>單人</button>
                                        <button onClick={() => setPayerMode('multi')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'multi' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>多人</button>
                                    </div>
                                )}
                            </div>
                            {payerMode === 'single' ? (
                                <select className={styles.input} value={mainPayerId} onChange={e => setMainPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                            ) : (
                                <div className="space-y-2">
                                    {people.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={multiPayers[p.id] || ''} onChange={e => handlePayerChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, multiPayers, setMultiPayers)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>
                                    ))}
                                    <div className={`text-xs text-right font-bold ${isValidPayer ? 'text-emerald-500' : 'text-red-500'}`}>合計: {Math.round(payerSum)} / 目標: {Math.round(finalAmt)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {type === 'expense' && people.length > 1 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <label className={styles.label}>分帳方式 (誰該出?)</label>
                                <div className="flex bg-white border rounded-lg p-0.5">
                                    <button onClick={() => setSplitMode('equal')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'equal' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>平分</button>
                                    <button onClick={() => setSplitMode('custom')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'custom' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>自訂</button>
                                </div>
                            </div>
                            {splitMode === 'equal' ? (
                                <div className="text-center text-xs text-slate-500 py-2 bg-white rounded-lg border border-dashed">每人負擔約 <span className="font-bold text-indigo-600">${(finalAmt / people.length).toFixed(1)}</span></div>
                            ) : (
                                <div className="space-y-2">
                                    {people.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={customSplits[p.id] || ''} onChange={e => handleSplitChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, customSplits, setCustomSplits)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>
                                    ))}
                                    <div className={`text-xs text-right font-bold ${isValidSplit ? 'text-emerald-500' : 'text-red-500'}`}>合計: {Math.round(splitSum)} / 目標: {Math.round(finalAmt)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    <div><label className={styles.label}>項目說明</label><input placeholder="例如: 午餐" className={styles.input} value={description} onChange={e => setDescription(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} /></div>
                        <div><label className={styles.label}>分類</label><select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>{currentCats.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    </div>
                    {!editData && (<div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100"><input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" /><label htmlFor="recurring" className="text-sm font-bold text-indigo-700 flex items-center gap-2 cursor-pointer select-none"><Repeat size={16} /> 每月自動執行此交易</label></div>)}
                    <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
                </div>
            </div>
        </div>
    )
}

export const CardDetailModal = ({ userId, card, cardLogs, transactions, allCardLogs, onClose, groups, currentGroupId }: any) => {
    const [showAddLog, setShowAddLog] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [amt, setAmt] = useState('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [linkLog, setLinkLog] = useState<CreditCardLog | null>(null);
    const [targetGroupId, setTargetGroupId] = useState(currentGroupId);
    const [targetTransactions, setTargetTransactions] = useState<Transaction[]>([]);
    const [loadingTrans, setLoadingTrans] = useState(false);

    const today = new Date();
    const billingDay = card.billingDay;
    let cycleStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (today.getDate() < billingDay) cycleStart.setMonth(cycleStart.getMonth() - 1);
    const [viewStart, setViewStart] = useState(cycleStart.toISOString().split('T')[0]);
    const currentCycleStart = new Date(viewStart);
    const currentCycleEnd = new Date(currentCycleStart); currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1); currentCycleEnd.setDate(currentCycleEnd.getDate() - 1);
    
    const prevCycle = () => { const d = new Date(viewStart); d.setMonth(d.getMonth() - 1); setViewStart(d.toISOString().split('T')[0]); };
    const nextCycle = () => { const d = new Date(viewStart); d.setMonth(d.getMonth() + 1); setViewStart(d.toISOString().split('T')[0]); };
    
    const globalUsedIds = allCardLogs.filter((cl: any) => cl.id !== linkLog?.id && cl.linkedTransactionId).map((cl: any) => cl.linkedTransactionId);
    
    // Logic to fetch transactions from other groups if selected
    useEffect(() => {
        const fetchTrans = async () => {
            if (!targetGroupId) return;
            
            // If current group, use props
            if (targetGroupId === currentGroupId) {
                setTargetTransactions(transactions);
                return;
            }

            setLoadingTrans(true);
            try {
                const q = query(collection(db, getCollectionPath(userId, targetGroupId, 'transactions')), orderBy('date', 'desc'));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
                setTargetTransactions(list);
            } catch(e) {
                console.error(e);
            } finally {
                setLoadingTrans(false);
            }
        };
        if(linkLog) fetchTrans();
    }, [targetGroupId, currentGroupId, transactions, userId, linkLog]);

    const availableTrans = targetTransactions.filter((t: any) => !globalUsedIds.includes(t.id)).slice(0, 30);
    
    const viewLogs = cardLogs.filter((l: any) => {
        if (!l.date?.seconds) return false;
        const d = new Date(Number(l.date.seconds) * 1000);
        return d.getTime() >= currentCycleStart.getTime() && d.getTime() <= currentCycleEnd.getTime();
    }).sort((a: any, b: any) => (Number(b.date?.seconds as any) || 0) - (Number(a.date?.seconds as any) || 0));
    
    const handleSaveLog = async () => {
        if (!amt || !desc) return;
        const col = collection(db, getCollectionPath(userId, null, 'cardLogs'));
        const payload = { cardId: card.id, amount: parseFloat(amt), description: desc, date: Timestamp.fromDate(new Date(date)) };
        if (editingId) { await updateDoc(doc(col, editingId), payload); setEditingId(null); } else { await addDoc(col, { ...payload, isReconciled: false }); }
        setAmt(''); setDesc(''); setShowAddLog(false);
    };
    
    const handleEditClick = (log: any) => { setEditingId(log.id); setAmt(log.amount.toString()); setDesc(log.description); setDate(new Date((log.date.seconds as number) * 1000).toISOString().split('T')[0]); setShowAddLog(true); };
    const handleDeleteClick = async (id: string) => { if (window.confirm('確定要刪除此筆刷卡紀錄嗎？(需二次確認)')) { await deleteDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), id)); if (editingId === id) { setShowAddLog(false); setEditingId(null); } } };
    const linkTrans = async (transId: string) => { if (!linkLog) return; await updateDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), linkLog.id), { isReconciled: true, linkedTransactionId: transId, linkedGroupId: targetGroupId }); setLinkLog(null); }
    
    return (
        <div className={styles.overlay}> 
            {linkLog ? (
                <div className={styles.content}> 
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">連結記帳資料</h3>
                        <button onClick={() => setLinkLog(null)}><X /></button>
                    </div> 
                    <div className="mb-3">
                        <label className={styles.label}>選擇帳本搜尋</label>
                        <select className={styles.input} value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}>
                            {groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    {loadingTrans ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-indigo-600"/></div> : (
                        <div className="space-y-2 max-h-80 overflow-y-auto"> 
                            {availableTrans.length === 0 && <div className="text-center text-slate-400 py-4">無可用交易</div>}
                            {availableTrans.map((t: any) => (
                                <div key={t.id} onClick={() => linkTrans(t.id)} className="bg-white p-3 border rounded-xl hover:border-indigo-500 cursor-pointer flex justify-between"> 
                                    <div> 
                                        <div className="font-bold text-sm">{t.description}</div> 
                                        <div className="text-xs text-slate-400 font-bold text-indigo-500">{t.date?.seconds ? new Date(t.date.seconds * 1000).toLocaleDateString() : ''}</div> 
                                    </div> 
                                    <div className="font-bold">${t.totalAmount}</div> 
                                </div>
                            ))} 
                        </div> 
                    )}
                </div>
            ) : (
                <div className={`${styles.content} h-[85vh]`}> 
                    <div className="flex justify-between items-center mb-4"> 
                        <div><h3 className="font-bold text-xl">{card.name}</h3><div className="text-xs text-slate-500">結帳日: 每月 {card.billingDay} 號</div></div> 
                        <button onClick={onClose}><X /></button> 
                    </div> 
                    <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-4"> 
                        <button onClick={prevCycle} className="p-1 hover:bg-white rounded">◀</button> 
                        <div className="text-xs font-bold text-slate-600">{currentCycleStart.toLocaleDateString()} ~ {currentCycleEnd.toLocaleDateString()}</div> 
                        <button onClick={nextCycle} className="p-1 hover:bg-white rounded">▶</button> 
                    </div> 
                    <button onClick={() => { setShowAddLog(!showAddLog); setEditingId(null); setAmt(''); setDesc(''); }} className="w-full py-2 mb-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm">{showAddLog && !editingId ? '隱藏新增' : '+ 新增刷卡紀錄'}</button> 
                    {showAddLog && (
                        <div className="bg-slate-50 p-4 rounded-xl border mb-4 space-y-2 animate-in slide-in-from-bottom-4"> 
                            <div className="text-xs font-bold text-indigo-500 mb-1">{editingId ? '編輯紀錄' : '新增紀錄'}</div> 
                            <div className="flex gap-2"> 
                                <div className="flex-1"><label className={styles.label}>日期</label><input type="date" className="w-full p-2 rounded border text-sm" value={date} onChange={e => setDate(e.target.value)} /></div> 
                                <div className="flex-1"><label className={styles.label}>金額</label><input type="number" className="w-full p-2 rounded border text-sm" value={amt} onChange={e => setAmt(e.target.value)} /></div> 
                            </div> 
                            <div><label className={styles.label}>說明</label><div className="flex gap-2"><input className="flex-1 p-2 rounded border text-sm" value={desc} onChange={e => setDesc(e.target.value)} /><button onClick={handleSaveLog} className="bg-indigo-600 text-white px-4 rounded text-xs font-bold">{editingId ? '更新' : '存'}</button></div></div> 
                        </div>
                    )} 
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto"> 
                        {viewLogs.length === 0 && <div className="text-center text-slate-400 py-4">此週期無紀錄</div>} 
                        {viewLogs.map((log: any) => { 
                            // Note: linked transaction might be in a different group, so finding it in `transactions` prop might fail if not current group
                            // We just show basic "linked" status or fetch if needed. For UI simplicity, just show ID or "Linked"
                            const linkedT = transactions.find((t: any) => t.id === log.linkedTransactionId); 
                            const isLinkedOther = log.isReconciled && !linkedT; // Linked but not found in current view (likely other group)

                            return (
                                <div key={log.id} className={`p-3 rounded-xl border ${log.isReconciled ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200'}`}> 
                                    <div className="flex justify-between items-center mb-1"> 
                                        <div className="flex items-center gap-2"> 
                                            <button onClick={async () => { await updateDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), log.id), { isReconciled: !log.isReconciled }) }}>{log.isReconciled ? <CheckCircle size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-300" />}</button> 
                                            <span className={`text-sm font-bold ${log.isReconciled ? 'text-slate-400 line-through' : ''}`}>{log.description}</span> 
                                        </div> 
                                        <div className="font-bold font-mono">${log.amount}</div> 
                                    </div> 
                                    <div className="flex justify-between items-center pl-7"> 
                                        <div className="text-[10px] text-slate-400">{new Date((log.date.seconds as number) * 1000).toLocaleDateString()}</div> 
                                        <div className="flex items-center gap-2"> 
                                            {!log.isReconciled && <button onClick={() => {setLinkLog(log); setTargetGroupId(currentGroupId);}} className="text-[10px] flex gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold"><LinkIcon size={10} /> 連結</button>} 
                                            {log.isReconciled && (
                                                <span className="text-[10px] text-emerald-600 flex gap-1 bg-emerald-50 px-2 py-1 rounded">
                                                    <Link2 size={10} /> 
                                                    {linkedT ? linkedT.description : (isLinkedOther ? '已連結 (其他帳本)' : '已連結')}
                                                </span>
                                            )} 
                                            <button onClick={() => handleEditClick(log)} className="text-slate-400 hover:text-indigo-600"><Edit size={12} /></button> 
                                            <button onClick={() => handleDeleteClick(log.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={12} /></button> 
                                        </div> 
                                    </div> 
                                </div>
                            ) 
                        })} 
                    </div> 
                </div>
            )} 
        </div>
    )
}

// NEW COMPONENTS

export const AddPlatformModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [currency, setCurrency] = useState(editData?.currency || 'TWD');
    const [type, setType] = useState(editData?.type || 'stock');
    const [balance, setBalance] = useState(editData?.balance?.toString() || '0');

    const handleSave = async () => {
        if (!userId || !name) return;
        const col = collection(db, getCollectionPath(userId, null, 'platforms'));
        const data = { name, currency, type, balance: parseFloat(balance) || 0 };
        if (editData) await updateDoc(doc(col, editData.id), data);
        else await addDoc(col, data);
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData ? '編輯平台' : '新增投資平台'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Firstrade, Binance" /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>類型</label><select className={styles.input} value={type} onChange={e => setType(e.target.value)}><option value="stock">證券/股票</option><option value="crypto">加密貨幣</option></select></div>
                    <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}><option value="TWD">TWD</option><option value="USD">USD</option><option value="JPY">JPY</option></select></div>
                </div>
                <div><label className={styles.label}>初始現金餘額 (Buying Power)</label><input type="number" className={styles.input} value={balance} onChange={e => setBalance(e.target.value)} /></div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    );
};

export const ManagePlatformCashModal = ({ platform, userId, onClose }: any) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'deposit'|'withdraw'>('deposit');
    
    const handleSave = async () => {
        if(!amount) return;
        const val = parseFloat(amount);
        const newBal = type === 'deposit' ? platform.balance + val : platform.balance - val;
        await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), { balance: newBal });
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{platform.name} 現金管理</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={()=>setType('deposit')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='deposit'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>入金</button>
                <button onClick={()=>setType('withdraw')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='withdraw'?'bg-white shadow text-red-500':'text-slate-400'}`}>出金</button>
            </div>
            <div className="mb-4">
                <label className={styles.label}>金額 ({platform.currency})</label>
                <input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} autoFocus/>
            </div>
            <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認</button></div>
        </div></div>
    );
};

export const AddAssetModal = ({ userId, platforms, onClose }: any) => {
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [platformId, setPlatformId] = useState(platforms[0]?.id || '');
    const [type, setType] = useState<'stock'|'crypto'>('stock');

    const handleSave = async () => {
        if(!symbol || !quantity || !platformId) return;
        const platform = platforms.find((p:any)=>p.id===platformId);
        const data = {
            symbol: symbol.toUpperCase(), quantity: parseFloat(quantity), avgCost: parseFloat(cost)||0,
            currentPrice: parseFloat(cost)||0, platformId, type, currency: platform?.currency || 'USD'
        };
        await addDoc(collection(db, getCollectionPath(userId, null, 'holdings')), data);
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">新增持倉</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>代號 (Symbol)</label><input className={styles.input} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. AAPL, BTC" /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>數量</label><input type="number" className={styles.input} value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                    <div><label className={styles.label}>平均成本 (單價)</label><input type="number" className={styles.input} value={cost} onChange={e => setCost(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>平台</label><select className={styles.input} value={platformId} onChange={e => setPlatformId(e.target.value)}>{platforms.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label className={styles.label}>類型</label><select className={styles.input} value={type} onChange={e => setType(e.target.value as any)}><option value="stock">股票</option><option value="crypto">加密貨幣</option></select></div>
                </div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>新增</button></div>
            </div>
        </div></div>
    );
};

export const EditAssetModal = ({ holding, userId, onClose, onDelete }: any) => {
    const [quantity, setQuantity] = useState(holding.quantity.toString());
    const [avgCost, setAvgCost] = useState(holding.avgCost.toString());

    const handleSave = async () => {
        await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), {
            quantity: parseFloat(quantity), avgCost: parseFloat(avgCost)
        });
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">編輯資產: {holding.symbol}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>持倉數量</label><input type="number" className={styles.input} value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div><label className={styles.label}>平均成本</label><input type="number" className={styles.input} value={avgCost} onChange={e => setAvgCost(e.target.value)} /></div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className={styles.btnSecondary}>取消</button>
                    <button onClick={()=>onDelete(holding)} className="bg-red-50 text-red-500 rounded-xl font-bold px-4 hover:bg-red-100"><Trash2 size={18}/></button>
                    <button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button>
                </div>
            </div>
        </div></div>
    );
};

export const EditAssetPriceModal = ({ holding, userId, onClose, onEditInfo, onSell }: any) => {
    const [manualPrice, setManualPrice] = useState(holding.manualPrice?.toString() || '');
    
    const handleSave = async () => {
        const price = manualPrice ? parseFloat(manualPrice) : null;
        // If price is cleared (NaN or 0 or empty), we set manualPrice to null to resume auto-update logic?
        // Firestore doesn't support 'undefined', use null or deleteField(). Here we use null.
        // But types.ts says optional number.
        await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), {
            manualPrice: price && price > 0 ? price : null
        });
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-xl">{holding.symbol}</h3>
                    <div className="text-xs text-slate-500">現價: {holding.currentPrice} {holding.currency}</div>
                </div>
                <button onClick={onClose}><X size={20}/></button>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-lg text-amber-800 text-xs mb-4">
                <AlertCircle size={14} className="inline mr-1"/>
                設定手動價格將覆蓋自動更新的報價。清空並儲存可恢復自動更新。
            </div>

            <div className="mb-6">
                <label className={styles.label}>手動報價 ({holding.currency})</label>
                <input type="number" placeholder="自動" className={styles.input} value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={onEditInfo} className="bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200"><Edit size={16}/> 修改成本/數量</button>
                <button onClick={onSell} className="bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100"><Coins size={16}/> 賣出資產</button>
            </div>
            
            <button onClick={handleSave} className={`${styles.btnPrimary} w-full`}>儲存價格設定</button>
        </div></div>
    );
};

export const SellAssetModal = ({ holding, onClose, onConfirm }: any) => {
    const [price, setPrice] = useState(holding.manualPrice || holding.currentPrice);
    const [qty, setQty] = useState(holding.quantity);

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">賣出 {holding.symbol}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>賣出價格</label><input type="number" className={styles.input} value={price} onChange={e => setPrice(parseFloat(e.target.value))} /></div>
                <div><label className={styles.label}>賣出數量 (持有: {holding.quantity})</label><input type="number" className={styles.input} value={qty} onChange={e => setQty(parseFloat(e.target.value))} /></div>
                <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="flex justify-between text-sm mb-1"><span>預估總額</span><span className="font-bold">{Math.round(price * qty).toLocaleString()} {holding.currency}</span></div>
                    <div className="flex justify-between text-sm text-slate-500"><span>成本</span><span>{Math.round(holding.avgCost * qty).toLocaleString()}</span></div>
                    <div className={`flex justify-between font-bold mt-2 pt-2 border-t ${price>holding.avgCost?'text-emerald-600':'text-red-500'}`}><span>預估損益</span><span>{(price - holding.avgCost) * qty > 0 ? '+' : ''}{Math.round((price - holding.avgCost) * qty).toLocaleString()}</span></div>
                </div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={()=>onConfirm(price, qty)} className={`${styles.btnPrimary} flex-1`}>確認賣出</button></div>
            </div>
        </div></div>
    );
};

export const AddDividendModal = ({ userId, groupId, platforms, holdings, people, onClose }: any) => {
    // Simplified logic: Just add an income transaction and add cash to platform
    const [holdingId, setHoldingId] = useState(holdings[0]?.id || '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = async () => {
        if(!holdingId || !amount) return;
        const h = holdings.find((x:any)=>x.id===holdingId);
        if(!h) return;
        
        const total = parseFloat(amount);
        
        // 1. Add Transaction
        await addDoc(collection(db, getCollectionPath(userId, groupId, 'transactions')), {
            date: Timestamp.fromDate(new Date(date)),
            description: `股息: ${h.symbol}`,
            category: '投資收益', // Assuming this category exists or just string
            type: 'income',
            totalAmount: total, // We assume TWD for simplicity in ledger, or user enters TWD equivalent. Ideally should convert.
            currency: 'TWD', // MVP: Assume user enters converted amount or system base currency
            payers: { [people[0].id]: total }, // Assign to first person (usually Me)
            splitDetails: { [people[0].id]: total }
        });

        // 2. Add to Platform Balance
        if(h.platformId) {
            // Need to handle currency match. If platform is USD and user entered TWD, this is tricky. 
            // For MVP, we assume user enters amount in Platform Currency for the cash update, 
            // but Ledger usually tracks in Base Currency.
            // Let's assume input is in Holding/Platform Currency.
            const p = platforms.find((x:any)=>x.id===h.platformId);
            if(p) {
                await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), p.id), {
                    balance: increment(total)
                });
            }
        }
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">領取股息</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>標的</label><select className={styles.input} value={holdingId} onChange={e=>setHoldingId(e.target.value)}>{holdings.map((h:any)=><option key={h.id} value={h.id}>{h.symbol}</option>)}</select></div>
                <div><label className={styles.label}>總金額 (原幣)</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} /></div>
                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e=>setDate(e.target.value)} /></div>
                <button onClick={handleSave} className={styles.btnPrimary}>確認領取</button>
            </div>
        </div></div>
    );
};

export const AddAccountModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [currency, setCurrency] = useState(editData?.currency || 'TWD');
    const [initialBalance, setInitialBalance] = useState(editData?.initialBalance?.toString() || '0');

    const handleSave = async () => {
        if (!name) return;
        const col = collection(db, getCollectionPath(userId, null, 'accounts'));
        const data = { name, currency, initialBalance: parseFloat(initialBalance) || 0 };
        if (editData) await updateDoc(doc(col, editData.id), data);
        else await addDoc(col, data);
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData ? '編輯帳戶' : '新增銀行帳戶'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>帳戶名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 台新 Richart" /></div>
                <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}><option value="TWD">TWD</option><option value="USD">USD</option><option value="JPY">JPY</option></select></div>
                <div><label className={styles.label}>初始餘額</label><input type="number" className={styles.input} value={initialBalance} onChange={e => setInitialBalance(e.target.value)} /></div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    );
};

export const AddCardModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [billingDay, setBillingDay] = useState(editData?.billingDay?.toString() || '1');

    const handleSave = async () => {
        if (!name) return;
        const col = collection(db, getCollectionPath(userId, null, 'creditCards'));
        const data = { name, billingDay: parseInt(billingDay) };
        if (editData) await updateDoc(doc(col, editData.id), data);
        else await addDoc(col, data);
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData ? '編輯信用卡' : '新增信用卡'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>卡片名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 台新 GoGo 卡" /></div>
                <div><label className={styles.label}>結帳日 (每月幾號)</label><input type="number" min="1" max="31" className={styles.input} value={billingDay} onChange={e => setBillingDay(e.target.value)} /></div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    );
};

export const BankDetailModal = ({ userId, account, logs, onClose, onImport }: any) => {
    const [showAdd, setShowAdd] = useState(false);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'in'|'out'>('out');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSaveLog = async () => {
        if(!amount || !desc) return;
        await addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), {
            accountId: account.id, type, amount: parseFloat(amount), description: desc,
            date: Timestamp.fromDate(new Date(date))
        });
        setAmount(''); setDesc(''); setShowAdd(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm('確定刪除此紀錄?')) await deleteDoc(doc(db, getCollectionPath(userId, null, 'bankLogs'), id));
    };

    const sortedLogs = logs.sort((a:any,b:any) => b.date.seconds - a.date.seconds);

    return (
        <div className={styles.overlay}><div className={`${styles.content} h-[85vh]`}>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="font-bold text-xl">{account.name}</h3><div className="text-xs text-slate-500">{account.currency}</div></div>
                <button onClick={onClose}><X size={20}/></button>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-900">當前餘額</span>
                <span className="text-2xl font-bold text-indigo-600">${account.currentBalance?.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={()=>setShowAdd(!showAdd)} className="py-2 border-2 border-dashed border-slate-200 rounded-xl font-bold text-slate-500 text-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                    {showAdd ? '取消' : '+ 手動紀錄'}
                </button>
                <button onClick={onImport} className="py-2 bg-slate-100 rounded-xl font-bold text-slate-600 text-sm flex items-center justify-center gap-1 hover:bg-slate-200">
                    <Sparkles size={14}/> AI 匯入
                </button>
            </div>

            {showAdd && (
                <div className="bg-slate-50 p-4 rounded-xl mb-4 animate-in slide-in-from-top-2">
                    <div className="flex bg-white rounded-lg p-1 mb-3 border">
                        <button onClick={()=>setType('in')} className={`flex-1 py-1 rounded text-xs font-bold ${type==='in'?'bg-emerald-100 text-emerald-600':'text-slate-400'}`}>入帳 (+)</button>
                        <button onClick={()=>setType('out')} className={`flex-1 py-1 rounded text-xs font-bold ${type==='out'?'bg-red-100 text-red-500':'text-slate-400'}`}>支出 (-)</button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2"><input type="date" className="w-1/3 p-2 rounded border text-xs" value={date} onChange={e=>setDate(e.target.value)} /><input type="number" placeholder="金額" className="flex-1 p-2 rounded border text-xs" value={amount} onChange={e=>setAmount(e.target.value)} /></div>
                        <div className="flex gap-2"><input placeholder="說明" className="flex-1 p-2 rounded border text-xs" value={desc} onChange={e=>setDesc(e.target.value)} /><button onClick={handleSaveLog} className="bg-indigo-600 text-white px-3 rounded text-xs font-bold">存</button></div>
                    </div>
                </div>
            )}

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {sortedLogs.map((l:any) => (
                    <div key={l.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-sm text-slate-800">{l.description}</div>
                            <div className="text-[10px] text-slate-400">{new Date(l.date.seconds*1000).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`font-bold font-mono ${l.type==='in'?'text-emerald-600':'text-slate-800'}`}>{l.type==='in'?'+':'-'}{l.amount.toLocaleString()}</span>
                            <button onClick={()=>handleDelete(l.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div></div>
    );
};

export const TransferModal = ({ userId, accounts, onClose }: any) => {
    const [fromId, setFromId] = useState(accounts[0]?.id || '');
    const [toId, setToId] = useState(accounts[1]?.id || '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = async () => {
        if(!fromId || !toId || !amount || fromId === toId) return;
        const amt = parseFloat(amount);
        const batch = [
            addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), { accountId: fromId, type: 'out', amount: amt, description: `轉帳至 ${accounts.find((a:any)=>a.id===toId)?.name}`, date: Timestamp.fromDate(new Date(date)) }),
            addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), { accountId: toId, type: 'in', amount: amt, description: `來自 ${accounts.find((a:any)=>a.id===fromId)?.name} 轉帳`, date: Timestamp.fromDate(new Date(date)) })
        ];
        await Promise.all(batch);
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">帳戶轉帳</h3>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <label className={styles.label}>轉出帳戶</label>
                        <select className={styles.input} value={fromId} onChange={e=>setFromId(e.target.value)}>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 mt-6"/>
                    <div className="flex-1">
                        <label className={styles.label}>轉入帳戶</label>
                        <select className={styles.input} value={toId} onChange={e=>setToId(e.target.value)}>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
                    </div>
                </div>
                <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} /></div>
                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e=>setDate(e.target.value)} /></div>
                <button onClick={handleSave} className={styles.btnPrimary}>確認轉帳</button>
            </div>
        </div></div>
    );
};

export const AIAssistantModal = ({ onClose, contextData }: any) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([{role: 'model', text: '你好！我是你的 AI 理財助理。我可以幫你分析資產配置、回答財務問題，或提供投資建議。'}]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        if(!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, {role: 'user', text: userMsg}]);
        setLoading(true);

        try {
            // Build context string
            const context = `
            Context Data:
            Total Net Worth: ${Math.round(contextData.totalNetWorth)}
            Holdings: ${contextData.holdings.map((h:any) => `${h.symbol}: ${h.quantity} shares`).join(', ')}
            Recent Transactions: ${contextData.transactions.slice(0,5).map((t:any) => `${t.date?.seconds?new Date(t.date.seconds*1000).toLocaleDateString():''}: ${t.description} ${t.totalAmount}`).join('\n')}
            `;
            const prompt = `System: You are a helpful financial assistant. Answer briefly and in Traditional Chinese. \n${context}\n\nUser: ${userMsg}`;
            const result = await callGemini(prompt);
            setMessages(prev => [...prev, {role: 'model', text: result}]);
        } catch(e) {
            setMessages(prev => [...prev, {role: 'model', text: '抱歉，我現在無法回答。'}]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}><div className={`${styles.content} h-[80vh] flex flex-col p-0 overflow-hidden`}>
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold flex items-center gap-2"><Sparkles className="text-indigo-600" size={18}/> AI 助理</h3>
                <button onClick={onClose}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role==='user'?'bg-indigo-600 text-white rounded-br-none':'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && <div className="flex justify-start"><div className="bg-slate-100 p-3 rounded-2xl rounded-bl-none"><Loader2 className="animate-spin text-slate-400" size={16}/></div></div>}
                <div ref={scrollRef}/>
            </div>
            <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <input className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="問點什麼..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}/>
                    <button onClick={handleSend} disabled={loading} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50"><Send size={18}/></button>
                </div>
            </div>
        </div></div>
    );
};

export const AIBatchImportModal = ({ initialConfig, userId, groupId, categories, existingTransactions, accounts, creditCards, existingBankLogs, existingCardLogs, people, onClose }: any) => {
    // Mode: 'ledger' | 'bank' | 'card'
    const [mode, setMode] = useState<'ledger'|'bank'|'card'>(initialConfig?.target || 'ledger');
    const [targetId, setTargetId] = useState(initialConfig?.targetId || (mode === 'bank' ? accounts[0]?.id : (mode === 'card' ? creditCards[0]?.id : '')));
    const [inputText, setInputText] = useState('');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if(!inputText) return;
        setLoading(true);
        try {
            let prompt = "";
            const common = "Parse the following text (which might be OCR result or pasted CSV) into a JSON array. Return ONLY raw JSON without markdown formatting. ";
            
            if (mode === 'ledger') {
                prompt = `${common} For each item, extract: date (YYYY-MM-DD), description, amount (number), category (pick best match from: ${categories.map((c:any)=>c.name).join(',')}), type ('expense' or 'income'). Text: \n${inputText}`;
            } else {
                prompt = `${common} For each item, extract: date (YYYY-MM-DD), description, amount (number), type ('in' or 'out' - verify by context, usually credit is out, deposit is in). Text: \n${inputText}`;
            }

            const result = await callGemini(prompt);
            const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);
            if(Array.isArray(data)) setPreviewData(data);
            else alert("無法解析為陣列，請重試");
        } catch(e) {
            console.error(e);
            alert("解析失敗");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if(previewData.length === 0) return;
        setLoading(true);
        try {
            const batch = [];
            for(const item of previewData) {
                const date = item.date ? Timestamp.fromDate(new Date(item.date)) : serverTimestamp();
                if(mode === 'ledger') {
                    // Default to first person payer if not specified (AI simple parsing doesn't handle split yet)
                    const payerId = people[0]?.id; 
                    batch.push(addDoc(collection(db, getCollectionPath(userId, groupId, 'transactions')), {
                        date, description: item.description, totalAmount: item.amount, 
                        type: item.type, category: item.category || '其他',
                        currency: 'TWD', payers: {[payerId]: item.amount}, splitDetails: {[payerId]: item.amount}
                    }));
                } else if(mode === 'bank') {
                    if(!targetId) continue;
                    batch.push(addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), {
                        accountId: targetId, date, description: item.description, amount: item.amount, type: item.type
                    }));
                } else if(mode === 'card') {
                    if(!targetId) continue;
                    // Cards are usually expenses, so type is irrelevant or strictly 'out' equivalent? 
                    // Card logs structure: amount, description, date, isReconciled
                    batch.push(addDoc(collection(db, getCollectionPath(userId, null, 'cardLogs')), {
                        cardId: targetId, date, description: item.description, amount: item.amount, isReconciled: false
                    }));
                }
            }
            await Promise.all(batch);
            onClose();
            alert(`成功匯入 ${previewData.length} 筆資料`);
        } catch(e) {
            alert("匯入發生錯誤");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}><div className={`${styles.content} max-w-2xl`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-indigo-600"/> AI 批次匯入</h3>
                <button onClick={onClose}><X size={20}/></button>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="w-1/3 space-y-3">
                    <div>
                        <label className={styles.label}>匯入目標</label>
                        <select className={styles.input} value={mode} onChange={e=>setMode(e.target.value as any)}>
                            <option value="ledger">記帳 (Ledger)</option>
                            <option value="bank">銀行明細 (Bank)</option>
                            <option value="card">信用卡帳單 (Card)</option>
                        </select>
                    </div>
                    {mode !== 'ledger' && (
                        <div>
                            <label className={styles.label}>選擇帳戶/卡片</label>
                            <select className={styles.input} value={targetId} onChange={e=>setTargetId(e.target.value)}>
                                {mode==='bank' ? accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>) : creditCards.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <label className={styles.label}>貼上文字 (發票明細/CSV/文字敘述)</label>
                    <textarea className="w-full h-32 p-3 rounded-xl border bg-slate-50 text-xs font-mono" placeholder="貼上內容..." value={inputText} onChange={e=>setInputText(e.target.value)}></textarea>
                </div>
            </div>

            {previewData.length === 0 ? (
                <button onClick={handleAnalyze} disabled={loading || !inputText} className={styles.btnPrimary}>
                    {loading ? <Loader2 className="animate-spin"/> : <Wand2 size={18}/>} 開始解析
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto border rounded-xl">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 font-bold text-slate-600"><tr><th className="p-2">Date</th><th className="p-2">Desc</th><th className="p-2">Amount</th><th className="p-2">{mode==='ledger'?'Category':'Type'}</th></tr></thead>
                            <tbody>
                                {previewData.map((row, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-2">{row.date}</td>
                                        <td className="p-2">{row.description}</td>
                                        <td className="p-2">{row.amount}</td>
                                        <td className="p-2">{row.category || row.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={()=>setPreviewData([])} className={styles.btnSecondary}>重設</button>
                        <button onClick={handleImport} disabled={loading} className={`${styles.btnPrimary} flex-1`}>確認匯入 ({previewData.length}筆)</button>
                    </div>
                </div>
            )}
        </div></div>
    );
};
