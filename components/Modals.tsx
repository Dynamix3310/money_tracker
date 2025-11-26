
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Download, Share2, Trash2, Camera, Loader2, ArrowUpRight, ArrowDownRight, Sparkles, Send, CheckCircle, Circle, Link as LinkIcon, Link2, Upload, ArrowRightLeft, Save, RefreshCw, Building2, Wallet, Landmark, Edit, Key, Settings, Repeat, AlertCircle, FileText, Image as ImageIcon, CreditCard, Copy, LogOut, Users, Split, Calculator, Wand2, PlusIcon, FileSpreadsheet, AlertTriangle, CheckSquare, Square, DollarSign, Clock, Calendar, PieChart, TrendingUp, Layers, Scale, ArrowRight, ChevronDown, Coins, History } from 'lucide-react';
import { RecurringRule, Person, Category, AssetHolding, Platform, CreditCardLog, Transaction, ChatMessage, BankAccount, InvestmentLot, Group } from '../types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc, getDocs, query, orderBy, where, increment, getDoc, writeBatch } from 'firebase/firestore';
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

// Helper for number formatting
const fmt = (num: number | undefined, digits = 2) => num ? Number(num).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits }) : '0';

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
                                        <input placeholder="帳本名稱" className={`${styles.input} py-2 text-sm bg-white`} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                        <button onClick={() => { onGroupCreate(newGroupName); setNewGroupName(''); }} disabled={!newGroupName} className="bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm whitespace-nowrap disabled:opacity-50">建立</button>
                                    </div>
                                </div>
                                <div>
                                    <label className={styles.label}>加入現有帳本</label>
                                    <div className="flex gap-2">
                                        <input placeholder="輸入邀請碼 (Group ID)" className={`${styles.input} py-2 text-sm bg-white`} value={joinId} onChange={e => setJoinId(e.target.value)} />
                                        <button onClick={() => { onGroupJoin(joinId); setJoinId(''); }} disabled={!joinId} className="bg-slate-700 text-white px-4 rounded-xl font-bold text-sm whitespace-nowrap disabled:opacity-50">加入</button>
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
                        </div>
                    </div>
                )}
                {activeTab === 'keys' && (
                    <div className="space-y-4">
                        <div><label className={styles.label}>Gemini API Key (AI)</label><input type="password" placeholder="貼上您的 Key" className={styles.input} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} /></div>
                        <div><label className={styles.label}>Finnhub API Key (股票)</label><input type="password" placeholder="貼上 Finnhub Key" className={styles.input} value={finnhubKey} onChange={e => setFinnhubKey(e.target.value)} /></div>
                        <button onClick={handleSaveKeys} className={styles.btnPrimary}>儲存金鑰</button>
                        <div className="border-t pt-4 mt-4">
                            <div className="flex gap-2 mt-2"><button onClick={onExport} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-200"><Download size={14} /> JSON</button><button onClick={onExportCSV} className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-emerald-100 border border-emerald-100"><FileSpreadsheet size={14} /> Excel</button></div>
                            <button onClick={onImport} className="w-full mt-2 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-200"><Upload size={14} /> 匯入備份 (JSON)</button>
                        </div>
                        <button onClick={() => { auth.signOut(); onClose(); }} className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors mt-4"><LogOut size={18} /> 登出帳號</button>
                    </div>
                )}
                {activeTab === 'category' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex gap-2 items-center"><div className="flex-1"><label className={styles.label}>分類名稱</label><input placeholder="例如: 娛樂" className={`${styles.input} py-2 text-sm`} value={newCat} onChange={e => setNewCat(e.target.value)} /></div><div className="w-24"><label className={styles.label}>類型</label><select className="border rounded-lg px-2 py-2 text-sm h-[38px] w-full bg-white" value={catType} onChange={(e: any) => setCatType(e.target.value)}><option value="expense">支出</option><option value="income">收入</option></select></div></div>
                            <div className="flex gap-2 items-end"><div className="flex-1"><label className={styles.label}>每月預算 (可選)</label><input type="number" placeholder="0 = 無限制" className={`${styles.input} py-2 text-sm`} value={newCatBudget} onChange={e => setNewCatBudget(e.target.value)} /></div><button onClick={() => { onAddCategory(newCat, catType, parseFloat(newCatBudget)); setNewCat(''); setNewCatBudget(''); }} className="bg-indigo-600 text-white px-4 py-2 h-[38px] rounded-lg font-bold text-sm mb-[1px] flex items-center gap-1"><PlusIcon size={14} /> 新增</button></div>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">{categories.map((c: Category) => (<div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100"><div><span className="text-sm font-bold flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${c.type === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>{c.name}</span>{c.budgetLimit && c.budgetLimit > 0 && <div className="text-xs text-slate-400 pl-4">預算: ${c.budgetLimit.toLocaleString()}</div>}</div><button onClick={() => onDeleteCategory(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div>))}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export const PortfolioRebalanceModal = ({ holdings, platforms, rates, baseCurrency, convert, onClose }: any) => {
    const [targets, setTargets] = useState({ stock: 60, crypto: 30, cash: 10 });
    const [aiAdvice, setAiAdvice] = useState('');
    const [loadingAi, setLoadingAi] = useState(false);
    const totalPercent = targets.stock + targets.crypto + targets.cash;

    const calcData = useMemo(() => {
        let stockTotal = 0, cryptoTotal = 0, cashTotal = 0;
        platforms.forEach((p: Platform) => { cashTotal += convert(p.balance, p.currency, baseCurrency, rates); });
        holdings.forEach((h: AssetHolding) => {
            const price = h.manualPrice ?? h.currentPrice;
            const val = convert(h.quantity * price, h.currency, baseCurrency, rates);
            if (h.type === 'crypto') cryptoTotal += val; else stockTotal += val;
        });
        const total = stockTotal + cryptoTotal + cashTotal;
        const stockPct = total ? (stockTotal / total) * 100 : 0;
        const cryptoPct = total ? (cryptoTotal / total) * 100 : 0;
        const cashPct = total ? (cashTotal / total) * 100 : 0;
        return {
            total,
            stock: { val: stockTotal, pct: stockPct, drift: stockPct - targets.stock, diff: total * ((stockPct - targets.stock) / 100) },
            crypto: { val: cryptoTotal, pct: cryptoPct, drift: cryptoPct - targets.crypto, diff: total * ((cryptoPct - targets.crypto) / 100) },
            cash: { val: cashTotal, pct: cashPct, drift: cashPct - targets.cash, diff: total * ((cashPct - targets.cash) / 100) }
        };
    }, [holdings, platforms, rates, baseCurrency, targets]);

    const handleAIAnalysis = async () => {
        setLoadingAi(true);
        try {
            const prompt = `As a financial advisor, analyze this portfolio rebalancing need. Currency: ${baseCurrency}. Total Value: ${Math.round(calcData.total)}. Stock: ${calcData.stock.pct.toFixed(1)}% (Target ${targets.stock}%), Crypto: ${calcData.crypto.pct.toFixed(1)}% (Target ${targets.crypto}%), Cash: ${calcData.cash.pct.toFixed(1)}% (Target ${targets.cash}%). Holdings: ${holdings.map((h:any) => `${h.symbol} (${h.type})`).join(', ')}. Provide a concise trade plan in Traditional Chinese.`;
            const result = await callGemini(prompt);
            setAiAdvice(result);
        } catch (e) { setAiAdvice("AI Error"); } finally { setLoadingAi(false); }
    };

    const renderRow = (label: string, data: any, target: number, setTarget: Function) => (
        <div className="mb-4">
            <div className="flex justify-between text-sm mb-1 font-bold text-slate-700"><span>{label}</span><span>{Math.round(data.val).toLocaleString()} ({data.pct.toFixed(1)}%)</span></div>
            <div className="flex items-center gap-3"><input type="range" min="0" max="100" value={target} onChange={e => setTarget(parseInt(e.target.value))} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" /><div className="w-16 text-right text-sm font-mono bg-slate-100 rounded px-1">Target: {target}%</div></div>
            <div className="flex justify-between items-center mt-1 text-xs"><span className="text-slate-400">偏差:</span><span className={`font-bold ${data.drift > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{data.drift > 0 ? '+' : ''}{data.drift.toFixed(1)}% ({data.diff > 0 ? `賣出 $${Math.round(data.diff).toLocaleString()}` : `買入 $${Math.round(Math.abs(data.diff)).toLocaleString()}`})</span></div>
        </div>
    );

    return (
        <div className={styles.overlay}><div className={`${styles.content} max-w-2xl`}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl flex items-center gap-2"><Scale className="text-indigo-600"/> 再平衡</h3><button onClick={onClose}><X size={20} /></button></div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase">配置目標 (總和: <span className={totalPercent!==100?'text-red-500':'text-emerald-600'}>{totalPercent}%</span>)</h4>
                {renderRow('股票', calcData.stock, targets.stock, (v:number) => setTargets(p => ({...p, stock: v})))}
                {renderRow('加密貨幣', calcData.crypto, targets.crypto, (v:number) => setTargets(p => ({...p, crypto: v})))}
                {renderRow('現金', calcData.cash, targets.cash, (v:number) => setTargets(p => ({...p, cash: v})))}
            </div>
            {totalPercent === 100 && (<><button onClick={handleAIAnalysis} disabled={loadingAi} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 mb-4">{loadingAi ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>} AI 建議</button>{aiAdvice && <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-sm text-slate-700 whitespace-pre-wrap">{aiAdvice}</div>}</>)}
        </div></div>
    );
};

// --- AddTransactionModal ---
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
    const [multiPayers, setMultiPayers] = useState<Record<string, string>>(editData && Object.keys(editData.payers).length > 1 ? Object.fromEntries(Object.entries(editData.payers).map(([k, v]: any) => [k, v.toString()])) : {});
    const [customSplits, setCustomSplits] = useState<Record<string, string>>(editData && editData.splitDetails ? Object.fromEntries(Object.entries(editData.splitDetails).map(([k, v]: any) => [k, v.toString()])) : {});
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => { if (editData) { if (Object.keys(editData.payers).length > 1) setPayerMode('multi'); const values: number[] = Object.values(editData.splitDetails); if (values.length > 0 && (Math.max(...values) - Math.min(...values) > 1)) setSplitMode('custom'); } }, []);
    const currentCats = categories.filter((c: any) => c.type === type);
    useEffect(() => { if (currentCats.length > 0 && !category) setCategory(currentCats[0].name); }, [type, categories]);

    const rawAmount = parseFloat(amount) || 0;
    const convertedAmount = useMemo(() => (currency === 'TWD' || !rates) ? rawAmount : convert(rawAmount, currency, 'TWD', rates), [rawAmount, currency, rates, convert]);
    const finalAmt = convertedAmount;
    const payerSum = payerMode === 'single' ? finalAmt : Object.values(multiPayers).reduce((acc: number, val: any) => acc + (parseFloat(val as string) || 0), 0);
    const splitSum = splitMode === 'equal' ? finalAmt : Object.values(customSplits).reduce((acc: number, val: any) => acc + (parseFloat(val as string) || 0), 0);
    const fillRemainder = (id: string, currentMap: Record<string, string>, setMap: Function) => { if (finalAmt <= 0) return; const otherSum = Object.entries(currentMap).filter(([k, v]) => k !== id).reduce((acc: number, [k, v]) => acc + (parseFloat(v as string) || 0), 0); const remainder = Math.max(0, finalAmt - otherSum); setMap({ ...currentMap, [id]: Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(1) }); };
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setLoadingAI(true); const reader = new FileReader(); reader.onloadend = async () => { try { const prompt = `Analyze receipt. Extract totalAmount, currency, date, description, category. Return JSON.`; const resultText = await callGemini(prompt, reader.result as string); const json = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '')); if (json.totalAmount) setAmount(json.totalAmount); if (json.currency) setCurrency(json.currency); if (json.description) setDescription(json.description); if (json.category) setCategory(json.category); if (json.date) setDate(json.date); } catch (err) { alert("AI Error"); } finally { setLoadingAI(false); } }; reader.readAsDataURL(file); };
    const handleSave = async () => { if (!amount || !description) return; if (type === 'expense' && (Math.abs(payerSum - finalAmt) > 1 || Math.abs(splitSum - finalAmt) > 1)) { alert('金額不符'); return; } let payers: any = {}; if (payerMode === 'single') payers[mainPayerId] = finalAmt; else Object.entries(multiPayers).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) payers[pid] = parseFloat(val as string); }); let splits: any = {}; if (splitMode === 'equal') { const splitAmt = finalAmt / (people.length || 1); people.forEach((p: any) => splits[p.id] = splitAmt); } else Object.entries(customSplits).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) splits[pid] = parseFloat(val as string); }); const data = { totalAmount: finalAmt, description, category, type, payers, splitDetails: splits, date: Timestamp.fromDate(new Date(date)), currency: 'TWD', sourceAmount: parseFloat(amount), sourceCurrency: currency, exchangeRate: currency === 'TWD' ? 1 : (finalAmt / parseFloat(amount)) }; const col = collection(db, getCollectionPath(userId, groupId, 'transactions')); if (editData) await updateDoc(doc(col, editData.id), data); else await addDoc(col, data); if (isRecurring && !editData) { const nm = new Date(date); nm.setMonth(nm.getMonth() + 1); await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), { name: description, amount: finalAmt, type, category, payerId: mainPayerId, payers, splitDetails: splits, frequency: 'monthly', active: true, nextDate: Timestamp.fromDate(nm) }); } onClose(); };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl">{editData ? '編輯' : '記一筆'}</h3>{!editData && <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">{loadingAI ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>} AI <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loadingAI}/></label>}</div>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>支出</button><button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'income' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>收入</button></div>
                <div><label className={styles.label}>金額</label><div className="flex gap-2 items-center"><select className="bg-slate-100 rounded-lg p-2 text-sm font-bold outline-none" value={currency} onChange={e => setCurrency(e.target.value)}><option value="TWD">TWD</option><option value="USD">USD</option><option value="JPY">JPY</option></select><input type="number" className="text-3xl font-bold w-full text-right border-b pb-2 outline-none bg-transparent" value={amount} onChange={e => setAmount(e.target.value)} /></div>{currency !== 'TWD' && amount && <div className="text-right text-xs text-slate-400 mt-1 font-bold">≈ NT$ {Math.round(convertedAmount).toLocaleString()}</div>}</div>
                {type === 'expense' && (<div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-2"><label className={styles.label}>付款人</label>{people.length > 1 && (<div className="flex bg-white border rounded-lg p-0.5"><button onClick={() => setPayerMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'single' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>單人</button><button onClick={() => setPayerMode('multi')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'multi' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>多人</button></div>)}</div>{payerMode === 'single' ? (<select className={styles.input} value={mainPayerId} onChange={e => setMainPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={multiPayers[p.id] || ''} onChange={e => setMultiPayers({ ...multiPayers, [p.id]: e.target.value })} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, multiPayers, setMultiPayers)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}</div>)}
                {type === 'expense' && people.length > 1 && (<div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-2"><label className={styles.label}>分帳</label><div className="flex bg-white border rounded-lg p-0.5"><button onClick={() => setSplitMode('equal')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'equal' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>平分</button><button onClick={() => setSplitMode('custom')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'custom' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>自訂</button></div></div>{splitMode === 'equal' ? (<div className="text-center text-xs text-slate-500 py-2">每人約 <span className="font-bold text-indigo-600">${(finalAmt / people.length).toFixed(1)}</span></div>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={customSplits[p.id] || ''} onChange={e => setCustomSplits({ ...customSplits, [p.id]: e.target.value })} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, customSplits, setCustomSplits)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}</div>)}
                <div><label className={styles.label}>說明</label><input className={styles.input} value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} /></div><div><label className={styles.label}>分類</label><select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>{currentCats.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div></div>
                {!editData && (<div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100"><input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" /><label htmlFor="recurring" className="text-sm font-bold text-indigo-700 flex items-center gap-2"><Repeat size={16} /> 固定收支</label></div>)}
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    )
}

export const AddPlatformModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [currency, setCurrency] = useState(editData?.currency || 'USD');
    const [type, setType] = useState(editData?.type || 'stock');
    const [balance, setBalance] = useState(editData?.balance?.toString() || '0');
    const handleSave = async () => {
        if (!name) return;
        const col = collection(db, getCollectionPath(userId, null, 'platforms'));
        const data = { name, currency, type, balance: parseFloat(balance) || 0 };
        if (editData) await updateDoc(doc(col, editData.id), data); else await addDoc(col, data);
        onClose();
    };
    return (<div className={styles.overlay}><div className={styles.content}><h3 className="font-bold text-xl mb-4">{editData ? '編輯平台' : '新增平台'}</h3><div className="space-y-4"><div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div><label className={styles.label}>類型</label><select className={styles.input} value={type} onChange={e => setType(e.target.value)}><option value="stock">證券</option><option value="crypto">加密</option></select></div><div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}><option>USD</option><option>TWD</option><option>JPY</option><option>USDT</option></select></div></div><div><label className={styles.label}>現金餘額</label><input type="number" className={styles.input} value={balance} onChange={e => setBalance(e.target.value)} /></div><div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div></div></div></div>);
};

export const ManagePlatformCashModal = ({ platform, userId, onClose }: any) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'deposit'|'withdraw'>('deposit');
    const handleSave = async () => {
        if(!amount) return;
        const newBal = type === 'deposit' ? platform.balance + parseFloat(amount) : platform.balance - parseFloat(amount);
        await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), { balance: newBal });
        onClose();
    };
    return (<div className={styles.overlay}><div className={styles.content}><h3 className="font-bold text-xl mb-4">{platform.name} 現金管理</h3><div className="flex bg-slate-100 p-1 rounded-xl mb-4"><button onClick={()=>setType('deposit')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='deposit'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>入金</button><button onClick={()=>setType('withdraw')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='withdraw'?'bg-white shadow text-red-500':'text-slate-400'}`}>出金</button></div><div className="mb-4"><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} autoFocus/></div><div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認</button></div></div></div>);
};

// --- Add Asset Modal (Enhanced with Lots) ---
export const AddAssetModal = ({ userId, platforms, onClose }: any) => {
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [platformId, setPlatformId] = useState(platforms[0]?.id || '');
    const [type, setType] = useState<'stock'|'crypto'>('stock');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [deductCash, setDeductCash] = useState(true);

    const handleSave = async () => {
        if(!symbol || !quantity || !cost || !platformId) return;
        const qtyNum = parseFloat(quantity);
        const costNum = parseFloat(cost);
        const totalCost = qtyNum * costNum;
        const platform = platforms.find((p:any) => p.id === platformId);
        if(!platform) return;

        const holdingsRef = collection(db, getCollectionPath(userId, null, 'holdings'));
        
        // Check if holding exists
        const q = query(holdingsRef, where('symbol', '==', symbol.toUpperCase()), where('platformId', '==', platformId));
        const snap = await getDocs(q);
        
        let holdingDocRef;
        let currentQty = 0;
        let currentAvgCost = 0;

        if (!snap.empty) {
            const docSnap = snap.docs[0];
            holdingDocRef = docSnap.ref;
            const data = docSnap.data();
            currentQty = data.quantity;
            currentAvgCost = data.avgCost;
        } else {
            // Create new holding
            const newDoc = await addDoc(holdingsRef, {
                symbol: symbol.toUpperCase(),
                platformId,
                type,
                currency: platform.currency,
                quantity: 0,
                avgCost: 0,
                currentPrice: costNum // Init with buy price
            });
            holdingDocRef = newDoc;
        }

        const batch = writeBatch(db);

        // 1. Create Lot
        const lotRef = doc(collection(holdingDocRef, 'lots'));
        batch.set(lotRef, {
            date: Timestamp.fromDate(new Date(date)),
            quantity: qtyNum,
            remainingQuantity: qtyNum,
            costPerShare: costNum,
            currency: platform.currency
        });

        // 2. Update Holding Aggregates (Weighted Average)
        const newTotalQty = currentQty + qtyNum;
        const newAvgCost = ((currentQty * currentAvgCost) + totalCost) / newTotalQty;
        
        batch.update(holdingDocRef, {
            quantity: newTotalQty,
            avgCost: newAvgCost
        });

        // 3. Deduct Cash
        if (deductCash) {
            const platformRef = doc(db, getCollectionPath(userId, null, 'platforms'), platformId);
            batch.update(platformRef, {
                balance: increment(-totalCost)
            });
        }

        await batch.commit();
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">新增持倉 (買入)</h3>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('stock')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'stock' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>股票</button><button onClick={() => setType('crypto')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'crypto' ? 'bg-white shadow text-orange-600' : 'text-slate-400'}`}>加密貨幣</button></div>
                <div><label className={styles.label}>平台</label><select className={styles.input} value={platformId} onChange={e => setPlatformId(e.target.value)}>{platforms.map((p:any)=><option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}</select></div>
                <div><label className={styles.label}>代號</label><input placeholder="e.g. AAPL, 2330.TW" className={styles.input} value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>數量</label><input type="number" className={styles.input} value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                    <div><label className={styles.label}>單價 (成本)</label><input type="number" className={styles.input} value={cost} onChange={e => setCost(e.target.value)} /></div>
                </div>
                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={deductCash} onChange={e => setDeductCash(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /><label className="text-sm font-bold text-slate-600">從平台餘額扣款</label></div>
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>新增</button></div>
            </div>
        </div></div>
    );
};

// --- Sell Asset Modal (FIFO / Lots) ---
export const SellAssetModal = ({ holding, userId, onClose }: any) => {
    const [price, setPrice] = useState(holding.manualPrice || holding.currentPrice);
    const [mode, setMode] = useState<'fifo'|'specific'>('fifo');
    const [sellQty, setSellQty] = useState<string>('');
    const [lots, setLots] = useState<any[]>([]);
    const [loadingLots, setLoadingLots] = useState(true);
    const [lotSelection, setLotSelection] = useState<Record<string, number>>({}); // LotID -> Sell Amount
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchLots = async () => {
            const q = query(collection(db, getCollectionPath(userId, null, 'holdings'), holding.id, 'lots'), orderBy('date', 'asc'));
            const snap = await getDocs(q);
            const fetchedLots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Check if sum of lots matches holding qty
            const sumLots = fetchedLots.reduce((acc, l:any) => acc + l.remainingQuantity, 0);
            if (holding.quantity - sumLots > 0.0001) {
                // Create a virtual legacy lot for the difference
                fetchedLots.unshift({
                    id: 'legacy',
                    date: { seconds: 0 }, // Oldest
                    quantity: holding.quantity - sumLots,
                    remainingQuantity: holding.quantity - sumLots,
                    costPerShare: holding.avgCost,
                    note: 'Legacy / Unspecified'
                });
            }
            setLots(fetchedLots);
            setLoadingLots(false);
        };
        fetchLots();
    }, [holding]);

    // Calculate selection for FIFO
    useEffect(() => {
        if (mode === 'fifo' && sellQty) {
            let remainingToSell = parseFloat(sellQty);
            const newSelection: any = {};
            for (const lot of lots) {
                if (remainingToSell <= 0) break;
                const take = Math.min(lot.remainingQuantity, remainingToSell);
                newSelection[lot.id] = take;
                remainingToSell -= take;
            }
            setLotSelection(newSelection);
        } else if (mode === 'specific') {
            // Manual, don't auto calc
        }
    }, [sellQty, mode, lots]);

    const analysis = useMemo(() => {
        let totalSellQty = 0;
        let totalCostBasis = 0;
        Object.entries(lotSelection).forEach(([lotId, qty]) => {
            if ((qty as number) > 0) {
                const lot = lots.find(l => l.id === lotId);
                if (lot) {
                    totalSellQty += (qty as number);
                    totalCostBasis += (qty as number) * lot.costPerShare;
                }
            }
        });
        const proceeds = totalSellQty * price;
        const realizedPnL = proceeds - totalCostBasis;
        return { totalSellQty, totalCostBasis, proceeds, realizedPnL };
    }, [lotSelection, price, lots]);

    const handleConfirm = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const batch = writeBatch(db);
            const holdingRef = doc(db, getCollectionPath(userId, null, 'holdings'), holding.id);
            
            // 1. Update Lots
            for (const [lotId, qty] of Object.entries(lotSelection)) {
                if ((qty as number) <= 0) continue;
                if (lotId === 'legacy') {
                    // Legacy isn't a real doc, we just reduce holding qty later. 
                    // If we wanted to persist legacy tracking, we'd need to create a doc.
                    // For now, assume it's implicitly handled by parent holding updates.
                } else {
                    const lot = lots.find(l => l.id === lotId);
                    const newRem = lot.remainingQuantity - (qty as number);
                    const lotRef = doc(holdingRef, 'lots', lotId);
                    if (newRem < 0.00001) {
                        batch.delete(lotRef);
                    } else {
                        batch.update(lotRef, { remainingQuantity: newRem });
                    }
                }
            }

            // 2. Update Parent Holding
            const newQty = holding.quantity - analysis.totalSellQty;
            if (newQty < 0.00001) {
                batch.delete(holdingRef);
            } else {
                // Recalculate Avg Cost?
                // Current Total Value = Old Qty * Old Avg
                // Sold Value (Cost Basis) = analysis.totalCostBasis
                // New Total Value = Old Total Value - Sold Cost Basis
                // New Avg = New Total / New Qty
                const oldTotalCost = holding.quantity * holding.avgCost;
                const newTotalCost = oldTotalCost - analysis.totalCostBasis;
                const newAvg = newQty > 0 ? newTotalCost / newQty : 0;
                
                batch.update(holdingRef, {
                    quantity: newQty,
                    avgCost: newAvg
                });
            }

            // 3. Update Platform Balance
            const platformRef = doc(db, getCollectionPath(userId, null, 'platforms'), holding.platformId);
            batch.update(platformRef, { balance: increment(analysis.proceeds) });

            // 4. Add Transaction
            // Need current group ID? We don't have it here. Let's check User Profile or pass it.
            // For simplicity, sell transaction goes to user's private ledger or default group if we can find it.
            // We will read profile to get current group.
            const profileRef = doc(db, getUserProfilePath(userId));
            const profileSnap = await getDoc(profileRef);
            const groupId = profileSnap.exists() ? profileSnap.data().currentGroupId : null;
            
            const transRef = collection(db, getCollectionPath(userId, groupId, 'transactions'));
            const newTrans = doc(transRef);
            
            // Need a payer ID (myself)
            const peopleRef = collection(db, getCollectionPath(userId, groupId, 'people'));
            const peopleSnap = await getDocs(query(peopleRef, where('isMe', '==', true)));
            const myId = !peopleSnap.empty ? peopleSnap.docs[0].id : 'unknown';

            batch.set(newTrans, {
                date: serverTimestamp(),
                description: `賣出 ${holding.symbol} (${fmt(analysis.totalSellQty)} 股)`,
                category: '投資收益',
                type: 'income',
                totalAmount: analysis.proceeds,
                currency: holding.currency,
                payers: { [myId]: analysis.proceeds },
                splitDetails: { [myId]: analysis.proceeds }, // All to me
                note: `Realized PnL: ${fmt(analysis.realizedPnL)}`
            });

            await batch.commit();
            onClose();
        } catch (e) {
            console.error(e);
            alert('交易失敗');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay}><div className={`${styles.content} max-w-lg`}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">賣出 {holding.symbol}</h3><button onClick={onClose}><X/></button></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className={styles.label}>賣出單價 ({holding.currency})</label><input type="number" className={styles.input} value={price} onChange={e=>setPrice(parseFloat(e.target.value))} /></div>
                <div>
                    <label className={styles.label}>賣出模式</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={()=>{setMode('fifo'); setLotSelection({});}} className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode==='fifo'?'bg-white shadow text-indigo-600':'text-slate-400'}`}>FIFO (先進先出)</button>
                        <button onClick={()=>{setMode('specific'); setLotSelection({});}} className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode==='specific'?'bg-white shadow text-indigo-600':'text-slate-400'}`}>指定批次</button>
                    </div>
                </div>
            </div>

            {mode === 'fifo' && (
                <div className="mb-4"><label className={styles.label}>賣出總數量 (持有: {fmt(holding.quantity)})</label><input type="number" className={styles.input} value={sellQty} onChange={e=>setSellQty(e.target.value)} placeholder="輸入數量" /></div>
            )}

            <div className="max-h-48 overflow-y-auto border rounded-xl mb-4">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600"><tr><th className="p-2">買入日期</th><th className="p-2">成本</th><th className="p-2">剩餘</th><th className="p-2">賣出</th></tr></thead>
                    <tbody>
                        {loadingLots ? <tr><td colSpan={4} className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></td></tr> : lots.map(lot => (
                            <tr key={lot.id} className="border-b last:border-0">
                                <td className="p-2 text-slate-500">{lot.id==='legacy'?'Legacy':new Date(lot.date.seconds*1000).toLocaleDateString()}</td>
                                <td className="p-2">{fmt(lot.costPerShare)}</td>
                                <td className="p-2">{fmt(lot.remainingQuantity, 4)}</td>
                                <td className="p-2">
                                    {mode === 'fifo' ? (
                                        <span className={lotSelection[lot.id] > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}>{fmt(lotSelection[lot.id] || 0, 4)}</span>
                                    ) : (
                                        <input type="number" className="w-16 border rounded p-1 text-right" value={lotSelection[lot.id] || ''} onChange={e => setLotSelection({...lotSelection, [lot.id]: parseFloat(e.target.value)})} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-sm">
                <div className="flex justify-between mb-1"><span>預估賣出總值 (Proceeds)</span><span className="font-bold">{fmt(analysis.proceeds)} {holding.currency}</span></div>
                <div className="flex justify-between mb-1 text-slate-500"><span>成本 (Cost Basis)</span><span>{fmt(analysis.totalCostBasis)}</span></div>
                <div className={`flex justify-between font-bold pt-2 border-t ${analysis.realizedPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span>實現損益 (Realized PnL)</span><span>{analysis.realizedPnL > 0 ? '+' : ''}{fmt(analysis.realizedPnL)}</span>
                </div>
            </div>

            <button onClick={handleConfirm} disabled={submitting || analysis.totalSellQty <= 0} className={`${styles.btnPrimary} w-full`}>{submitting ? <Loader2 className="animate-spin"/> : '確認賣出'}</button>
        </div></div>
    );
};

// --- Edit Asset Price Modal (Fix buttons not working) ---
export const EditAssetPriceModal = ({ holding, userId, onClose, onEditInfo, onSell }: any) => {
    const [manualPrice, setManualPrice] = useState(holding.manualPrice?.toString() || '');
    const handleSave = async () => {
        const price = manualPrice ? parseFloat(manualPrice) : null;
        await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), {
            manualPrice: price && price > 0 ? price : null
        });
        onClose();
    };
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-start mb-4">
                <div><h3 className="font-bold text-xl">{holding.symbol}</h3><div className="text-xs text-slate-500">現價: {holding.currentPrice} {holding.currency}</div></div>
                <button onClick={onClose}><X size={20}/></button>
            </div>
            <div className="mb-6"><label className={styles.label}>手動報價 ({holding.currency})</label><input type="number" placeholder="自動" className={styles.input} value={manualPrice} onChange={e => setManualPrice(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={onEditInfo} className="bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 hover:bg-slate-200"><Edit size={16}/> 修改成本/數量</button>
                <button onClick={onSell} className="bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 hover:bg-indigo-100"><Coins size={16}/> 賣出資產</button>
            </div>
            <button onClick={handleSave} className={`${styles.btnPrimary} w-full`}>儲存價格設定</button>
        </div></div>
    );
};

// --- Add Dividend (Enhanced with DRIP Lots) ---
export const AddDividendModal = ({ userId, groupId, platforms, holdings, people, onClose }: any) => {
    const [holdingId, setHoldingId] = useState(holdings[0]?.id || '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<'cash'|'drip'>('cash');
    const holding = holdings.find((h:any) => h.id === holdingId);
    const platform = platforms.find((p:any) => p.id === holding?.platformId);

    const handleSave = async () => {
        if(!holding || !amount) return;
        const val = parseFloat(amount);
        const batch = writeBatch(db);
        const dateTs = Timestamp.fromDate(new Date(date));
        
        // Find payer (Me)
        const peopleRef = collection(db, getCollectionPath(userId, groupId, 'people'));
        const peopleSnap = await getDocs(query(peopleRef, where('isMe', '==', true)));
        const payerId = !peopleSnap.empty ? peopleSnap.docs[0].id : people[0].id;

        if (type === 'drip') {
            // DRIP: Calculate shares, Add Lot, Update Holding
            // 'val' here is Total Dividend Amount (Cash Value)
            const price = holding.manualPrice || holding.currentPrice;
            const newShares = val / price;
            
            // 1. Create Lot
            const lotRef = doc(collection(db, getCollectionPath(userId, null, 'holdings'), holding.id, 'lots'));
            batch.set(lotRef, {
                date: dateTs,
                quantity: newShares,
                remainingQuantity: newShares,
                costPerShare: price,
                currency: holding.currency,
                note: 'DRIP'
            });

            // 2. Update Holding
            const newTotalQty = holding.quantity + newShares;
            const newAvgCost = ((holding.quantity * holding.avgCost) + val) / newTotalQty;
            batch.update(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), {
                quantity: newTotalQty,
                avgCost: newAvgCost
            });

            // 3. Transaction
            const transRef = doc(collection(db, getCollectionPath(userId, groupId, 'transactions')));
            batch.set(transRef, {
                date: dateTs,
                description: `股息再投入: ${holding.symbol} (${fmt(newShares, 4)}股)`,
                category: '投資收益',
                type: 'income',
                totalAmount: val,
                currency: holding.currency,
                payers: {[payerId]: val},
                splitDetails: {[payerId]: val},
                note: 'DRIP'
            });

        } else {
            // Cash: Add to Platform, Add Transaction
            if (platform) {
                batch.update(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), {
                    balance: increment(val)
                });
            }
            const transRef = doc(collection(db, getCollectionPath(userId, groupId, 'transactions')));
            batch.set(transRef, {
                date: dateTs,
                description: `現金股利: ${holding.symbol}`,
                category: '投資收益',
                type: 'income',
                totalAmount: val,
                currency: holding.currency,
                payers: {[payerId]: val},
                splitDetails: {[payerId]: val}
            });
        }
        
        await batch.commit();
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">領取股息</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={()=>setType('cash')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='cash'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>現金 (Cash)</button>
                <button onClick={()=>setType('drip')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='drip'?'bg-white shadow text-blue-600':'text-slate-400'}`}>再投入 (DRIP)</button>
            </div>
            <div className="space-y-4">
                <div><label className={styles.label}>標的</label><select className={styles.input} value={holdingId} onChange={e=>setHoldingId(e.target.value)}>{holdings.map((h:any)=><option key={h.id} value={h.id}>{h.symbol}</option>)}</select></div>
                <div><label className={styles.label}>股息總金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} /></div>
                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e=>setDate(e.target.value)} /></div>
                <button onClick={handleSave} className={styles.btnPrimary}>確認</button>
            </div>
        </div></div>
    );
};

// --- Missing Modals Implementation ---

export const AddAccountModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [currency, setCurrency] = useState(editData?.currency || 'TWD');
    const [initialBalance, setInitialBalance] = useState(editData?.initialBalance?.toString() || '0');
    const handleSave = async () => {
         const data = { name, currency, initialBalance: parseFloat(initialBalance) || 0 };
         if(editData) await updateDoc(doc(db, getCollectionPath(userId, null, 'accounts'), editData.id), data);
         else await addDoc(collection(db, getCollectionPath(userId, null, 'accounts')), data);
         onClose();
    };
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData?'編輯帳戶':'新增銀行帳戶'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e=>setName(e.target.value)}/></div>
                <div className="grid grid-cols-2 gap-3">
                     <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e=>setCurrency(e.target.value)}><option>TWD</option><option>USD</option><option>JPY</option></select></div>
                     <div><label className={styles.label}>初始餘額</label><input type="number" className={styles.input} value={initialBalance} onChange={e=>setInitialBalance(e.target.value)}/></div>
                </div>
                <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    );
};

export const AddCardModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [billingDay, setBillingDay] = useState(editData?.billingDay?.toString() || '1');
    const handleSave = async () => {
         const data = { name, billingDay: parseInt(billingDay) };
         if(editData) await updateDoc(doc(db, getCollectionPath(userId, null, 'creditCards'), editData.id), data);
         else await addDoc(collection(db, getCollectionPath(userId, null, 'creditCards')), data);
         onClose();
    };
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData?'編輯信用卡':'新增信用卡'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e=>setName(e.target.value)}/></div>
                <div><label className={styles.label}>結帳日 (每月幾號)</label><input type="number" min="1" max="31" className={styles.input} value={billingDay} onChange={e=>setBillingDay(e.target.value)}/></div>
                <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    );
};

export const EditAssetModal = ({ holding, userId, onClose, onDelete }: any) => {
    const [qty, setQty] = useState(holding.quantity.toString());
    const [avgCost, setAvgCost] = useState(holding.avgCost.toString());
    const handleSave = async () => {
         await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), {
             quantity: parseFloat(qty),
             avgCost: parseFloat(avgCost)
         });
         onClose();
    };
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">編輯資產: {holding.symbol}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>持有數量</label><input type="number" className={styles.input} value={qty} onChange={e=>setQty(e.target.value)}/></div>
                <div><label className={styles.label}>平均成本</label><input type="number" className={styles.input} value={avgCost} onChange={e=>setAvgCost(e.target.value)}/></div>
                <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
                <button onClick={()=>onDelete(holding)} className="w-full text-red-500 text-sm font-bold mt-2">刪除此資產</button>
            </div>
        </div></div>
    );
};

export const TransferModal = ({ userId, accounts, onClose }: any) => {
    const [fromId, setFromId] = useState(accounts[0]?.id || '');
    const [toId, setToId] = useState(accounts.length>1 ? accounts[1].id : '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const handleSave = async () => {
        if(!fromId || !toId || !amount || fromId === toId) return;
        const val = parseFloat(amount);
        const batch = writeBatch(db);
        const logsRef = collection(db, getCollectionPath(userId, null, 'bankLogs'));
        const dateTs = Timestamp.fromDate(new Date(date));
        batch.set(doc(logsRef), { accountId: fromId, type: 'out', amount: val, date: dateTs, description: '轉帳轉出' });
        batch.set(doc(logsRef), { accountId: toId, type: 'in', amount: val, date: dateTs, description: '轉帳轉入' });
        await batch.commit();
        onClose();
    };
    return (
         <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">內部轉帳</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>轉出帳戶</label><select className={styles.input} value={fromId} onChange={e=>setFromId(e.target.value)}>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    <div><label className={styles.label}>轉入帳戶</label><select className={styles.input} value={toId} onChange={e=>setToId(e.target.value)}>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                </div>
                <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)}/></div>
                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e=>setDate(e.target.value)}/></div>
                <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認轉帳</button></div>
            </div>
         </div></div>
    );
};

export const BankDetailModal = ({ userId, account, logs, onClose, onImport }: any) => {
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">{account.name} 明細</h3><button onClick={onClose}><X size={20}/></button></div>
            <div className="mb-4 flex justify-between items-center">
                <div className="text-2xl font-bold font-mono">${account.currentBalance?.toLocaleString()}</div>
                <button onClick={onImport} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Upload size={14}/> 匯入 CSV</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.sort((a:any,b:any)=>b.date.seconds-a.date.seconds).map((l:any)=>(
                    <div key={l.id} className="flex justify-between items-center p-2 border-b">
                        <div><div className="font-bold text-sm">{l.description}</div><div className="text-xs text-slate-400">{new Date(l.date.seconds*1000).toLocaleDateString()}</div></div>
                        <div className={`font-bold font-mono ${l.type==='in'?'text-emerald-600':'text-slate-700'}`}>{l.type==='in'?'+':'-'}{l.amount.toLocaleString()}</div>
                    </div>
                ))}
                {logs.length===0 && <div className="text-center text-slate-400 text-xs py-4">無交易紀錄</div>}
            </div>
        </div></div>
    );
};

export const CardDetailModal = ({ userId, card, cardLogs, allCardLogs, transactions, onClose, groups, currentGroupId }: any) => {
    return (
        <div className={styles.overlay}><div className={styles.content}>
             <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">{card.name} 帳單</h3><button onClick={onClose}><X size={20}/></button></div>
             <div className="space-y-2 max-h-60 overflow-y-auto">
                {cardLogs.sort((a:any,b:any)=>b.date.seconds-a.date.seconds).map((l:any)=>(
                    <div key={l.id} className="flex justify-between items-center p-2 border-b">
                        <div><div className="font-bold text-sm">{l.description}</div><div className="text-xs text-slate-400">{new Date(l.date.seconds*1000).toLocaleDateString()}</div></div>
                        <div className="font-bold font-mono text-slate-700">-{l.amount.toLocaleString()}</div>
                    </div>
                ))}
                {cardLogs.length===0 && <div className="text-center text-slate-400 text-xs py-4">無刷卡紀錄</div>}
             </div>
        </div></div>
    );
};

export const AIAssistantModal = ({ onClose, contextData }: any) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{role:'model', text:'你好！我是您的財務助理。有關您的資產或記帳問題都可以問我。'}]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSend = async () => {
        if(!input) return;
        const userMsg = input;
        setMessages(p=>[...p, {role:'user', text:userMsg}]);
        setInput('');
        setLoading(true);
        try {
            const context = `User Net Worth: ${contextData.totalNetWorth}. Holdings: ${contextData.holdings.length}. Transactions: ${contextData.transactions.length}.`;
            const prompt = `Context: ${context}. User Question: ${userMsg}. Answer in Traditional Chinese, be helpful and concise.`;
            const res = await callGemini(prompt);
            setMessages(p=>[...p, {role:'model', text: res || 'Error'}]);
        } catch(e) { setMessages(p=>[...p, {role:'model', text: 'Sorry, AI error.'}]); }
        setLoading(false);
    };
    return (
        <div className={styles.overlay}><div className={`${styles.content} h-[600px] flex flex-col`}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-indigo-600"/> AI 助理</h3><button onClick={onClose}><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 bg-slate-50 rounded-xl">
                {messages.map((m,i)=>(<div key={i} className={`p-3 rounded-xl text-sm max-w-[80%] ${m.role==='user'?'bg-indigo-600 text-white self-end ml-auto':'bg-white text-slate-700 shadow-sm'}`}>{m.text}</div>))}
                {loading && <div className="p-3 bg-white rounded-xl shadow-sm w-fit"><Loader2 className="animate-spin" size={16}/></div>}
            </div>
            <div className="flex gap-2"><input className={styles.input} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()} placeholder="輸入問題..."/><button onClick={handleSend} disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl"><Send size={20}/></button></div>
        </div></div>
    );
};

export const AIBatchImportModal = ({ onClose }: any) => {
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">智能匯入</h3><button onClick={onClose}><X size={20}/></button></div>
            <div className="text-center py-8 text-slate-500">功能開發中 (Mock)</div>
        </div></div>
    );
};
