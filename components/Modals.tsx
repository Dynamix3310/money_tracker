
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

// --- Settings ---
export const SettingsModal = ({ onClose, onExport, onExportCSV, onImport, currentGroupId, groups, user, categories: rawCategories, onAddCategory, onDeleteCategory, onUpdateCategory, onGroupJoin, onGroupCreate, onGroupSwitch, currentTheme, onSetTheme }: any) => {
    const [activeTab, setActiveTab] = useState('ledger');
    const [newCat, setNewCat] = useState('');
    const [catType, setCatType] = useState<'expense' | 'income'>('expense');
    const [newCatBudget, setNewCatBudget] = useState('');
    const [finnhubKey, setFinnhubKey] = useState(localStorage.getItem('finnhub_key') || '');
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('user_gemini_key') || '');
    const [joinId, setJoinId] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editingBudget, setEditingBudget] = useState('');

    const categories = useMemo(() => [...rawCategories].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)), [rawCategories]);

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newCats = [...categories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCats.length) return;

        // Swap
        const temp = newCats[index];
        newCats[index] = newCats[targetIndex];
        newCats[targetIndex] = temp;

        // Update both orders
        // Use index as order
        onUpdateCategory(newCats[index].id, { order: index });
        onUpdateCategory(newCats[targetIndex].id, { order: targetIndex });

        // Optimize: Update all to ensure consistency if needed, but swapping two should be enough if list is contiguous
        // To be safe, let's just update the two swapped items with their new array indices
    };

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
                    <button onClick={() => setActiveTab('appearance')} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'appearance' ? 'bg-white shadow' : 'text-slate-400'}`}>外觀</button>
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
                                        {g.id === currentGroupId && <CheckCircle size={16} className="text-indigo-600" />}
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
                {activeTab === 'appearance' && (
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>主題色系</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'indigo', name: '經典藍紫', color: '#4f46e5' },
                                    { id: 'blue', name: '海洋藍', color: '#2563eb' },
                                    { id: 'emerald', name: '翡翠綠', color: '#059669' },
                                    { id: 'rose', name: '玫瑰紅', color: '#e11d48' },
                                    { id: 'amber', name: '琥珀黃', color: '#d97706' },
                                    { id: 'violet', name: '皇室紫', color: '#7c3aed' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => onSetTheme(t.id)}
                                        className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${currentTheme === t.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: t.color }}></div>
                                        <span className={`text-xs font-bold ${currentTheme === t.id ? 'text-indigo-900' : 'text-slate-500'}`}>{t.name}</span>
                                    </button>
                                ))}
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
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {categories.map((c: Category, idx: number) => (
                                <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0"><ArrowUpRight size={10} className="-rotate-45" /></button>
                                                <button onClick={() => handleMove(idx, 'down')} disabled={idx === categories.length - 1} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0"><ArrowDownRight size={10} className="-rotate-45" /></button>
                                            </div>
                                            <span className="text-sm font-bold flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${c.type === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>{c.name}</span>
                                        </div>
                                        <div className="pl-6 mt-1">
                                            {editingCatId === c.id ? (
                                                <div className="flex gap-2 items-center">
                                                    <input type="number" className="border rounded px-2 py-1 text-xs w-24" value={editingBudget} onChange={e => setEditingBudget(e.target.value)} placeholder="預算" />
                                                    <button onClick={() => { onUpdateCategory(c.id, { budgetLimit: parseFloat(editingBudget) || 0 }); setEditingCatId(null); }} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">OK</button>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-400 flex items-center gap-2" onClick={() => { setEditingCatId(c.id); setEditingBudget(c.budgetLimit?.toString() || ''); }}>
                                                    預算: ${c.budgetLimit?.toLocaleString() || 0} <Edit size={10} className="text-slate-300 hover:text-indigo-600 cursor-pointer" />
                                                </div>
                                            )}
                                        </div>
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
            const prompt = `As a financial advisor, analyze this portfolio rebalancing need. Currency: ${baseCurrency}. Total Value: ${Math.round(calcData.total)}. Stock: ${calcData.stock.pct.toFixed(1)}% (Target ${targets.stock}%), Crypto: ${calcData.crypto.pct.toFixed(1)}% (Target ${targets.crypto}%), Cash: ${calcData.cash.pct.toFixed(1)}% (Target ${targets.cash}%). Holdings: ${holdings.map((h: any) => `${h.symbol} (${h.type})`).join(', ')}. Provide a concise trade plan in Traditional Chinese.`;
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
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl flex items-center gap-2"><Scale className="text-indigo-600" /> 再平衡</h3><button onClick={onClose}><X size={20} /></button></div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase">配置目標 (總和: <span className={totalPercent !== 100 ? 'text-red-500' : 'text-emerald-600'}>{totalPercent}%</span>)</h4>
                {renderRow('股票', calcData.stock, targets.stock, (v: number) => setTargets(p => ({ ...p, stock: v })))}
                {renderRow('加密貨幣', calcData.crypto, targets.crypto, (v: number) => setTargets(p => ({ ...p, crypto: v })))}
                {renderRow('現金', calcData.cash, targets.cash, (v: number) => setTargets(p => ({ ...p, cash: v })))}
            </div>
            {totalPercent === 100 && (<><button onClick={handleAIAnalysis} disabled={loadingAi} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 mb-4">{loadingAi ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} AI 建議</button>{aiAdvice && <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-sm text-slate-700 whitespace-pre-wrap">{aiAdvice}</div>}</>)}
        </div></div>
    );
};

// --- AddTransactionModal (With Auto-Balancing) ---
export const AddTransactionModal = ({ userId, groupId, people, categories, onClose, editData, rates, convert }: any) => {
    const [type, setType] = useState<'expense' | 'income'>(editData?.type || 'expense');
    const [amount, setAmount] = useState(editData?.sourceAmount?.toString() || editData?.totalAmount?.toString() || '');
    const [currency, setCurrency] = useState(editData?.sourceCurrency || editData?.currency || 'TWD');
    const [description, setDescription] = useState(editData?.description || '');
    const [category, setCategory] = useState(editData?.category || '');
    const [date, setDate] = useState(editData?.date?.seconds ? new Date(editData.date.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [payerMode, setPayerMode] = useState<'single' | 'multi'>('single');
    const [splitMode, setSplitMode] = useState<'equal' | 'custom' | 'single'>('single');
    const [isRecurring, setIsRecurring] = useState(false);
    const [mainPayerId, setMainPayerId] = useState(editData ? Object.keys(editData.payers)[0] : (people.find((p: any) => p.isMe || p.uid === auth.currentUser?.uid)?.id || people[0]?.id || ''));
    const [singleSplitPayerId, setSingleSplitPayerId] = useState(editData ? Object.keys(editData.splitDetails).find(k => editData.splitDetails[k] > 0) || '' : ''); // Who pays 100% in single split mode
    const [multiPayers, setMultiPayers] = useState<Record<string, string>>(editData && Object.keys(editData.payers).length > 1 ? Object.fromEntries(Object.entries(editData.payers).map(([k, v]: any) => [k, v.toString()])) : {});
    const [customSplits, setCustomSplits] = useState<Record<string, string>>(editData && editData.splitDetails ? Object.fromEntries(Object.entries(editData.splitDetails).map(([k, v]: any) => [k, v.toString()])) : {});
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => { if (editData) { if (Object.keys(editData.payers).length > 1) setPayerMode('multi'); const values: number[] = Object.values(editData.splitDetails); if (values.length > 0 && (Math.max(...values) - Math.min(...values) > 1)) setSplitMode('custom'); } }, []);
    const currentCats = useMemo(() => categories.filter((c: any) => c.type === type).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)), [categories, type]);
    useEffect(() => { if (currentCats.length > 0 && !category) setCategory(currentCats[0].name); }, [type, categories]);

    const rawAmount = parseFloat(amount) || 0;
    const convertedAmount = useMemo(() => (currency === 'TWD' || !rates) ? rawAmount : convert(rawAmount, currency, 'TWD', rates), [rawAmount, currency, rates, convert]);
    const finalAmt = convertedAmount;
    const payerSum = payerMode === 'single' ? finalAmt : Object.values(multiPayers).reduce((acc: number, val: any) => acc + (parseFloat(val as string) || 0), 0);
    const splitSum = splitMode === 'equal' ? finalAmt : Object.values(customSplits).reduce((acc: number, val: any) => acc + (parseFloat(val as string) || 0), 0);
    const fillRemainder = (id: string, currentMap: Record<string, string>, setMap: Function) => { if (finalAmt <= 0) return; const otherSum = Object.entries(currentMap).filter(([k, v]) => k !== id).reduce((acc: number, [k, v]) => acc + (parseFloat(v as string) || 0), 0); const remainder = Math.max(0, finalAmt - otherSum); setMap({ ...currentMap, [id]: Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(2) }); };

    // Auto-balance for 2 people
    const handlePayerChange = (id: string, val: string) => {
        const newMap = { ...multiPayers, [id]: val };
        if (people.length === 2 && finalAmt > 0) {
            const other = people.find((p: any) => p.id !== id);
            if (other) {
                const valNum = parseFloat(val) || 0;
                const remainder = Math.max(0, finalAmt - valNum);
                newMap[other.id] = Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(2);
            }
        }
        setMultiPayers(newMap);
    };

    const handleSplitChange = (id: string, val: string) => {
        const newMap = { ...customSplits, [id]: val };
        if (people.length === 2 && finalAmt > 0) {
            const other = people.find((p: any) => p.id !== id);
            if (other) {
                const valNum = parseFloat(val) || 0;
                const remainder = Math.max(0, finalAmt - valNum);
                newMap[other.id] = Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(2);
            }
        }
        setCustomSplits(newMap);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setLoadingAI(true); const reader = new FileReader(); reader.onloadend = async () => { try { const prompt = `Analyze receipt. Extract totalAmount, currency, date, description, category. Return JSON.`; const resultText = await callGemini(prompt, reader.result as string); const json = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '')); if (json.totalAmount) setAmount(json.totalAmount); if (json.currency) setCurrency(json.currency); if (json.description) setDescription(json.description); if (json.category) setCategory(json.category); if (json.date) setDate(json.date); } catch (err) { alert("AI Error"); } finally { setLoadingAI(false); } }; reader.readAsDataURL(file); };
    const handleSave = async () => {
        if (!amount || !description) return;
        if (type === 'expense' && (Math.abs(payerSum - finalAmt) > 1 || Math.abs(splitSum - finalAmt) > 1 && splitMode !== 'single')) { alert('金額不符'); return; }

        let payers: any = {};
        let splits: any = {};

        if (type === 'income') {
            // Income Logic: Assigned to specific person (Earner)
            // Use mainPayerId as the "Earner"
            payers[mainPayerId] = finalAmt;
            splits[mainPayerId] = finalAmt; // Also assign split to them so it balances
        } else {
            // Expense Logic
            if (payerMode === 'single') payers[mainPayerId] = finalAmt;
            else Object.entries(multiPayers).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) payers[pid] = parseFloat(val as string); });

            if (splitMode === 'equal') {
                const splitAmt = finalAmt / (people.length || 1);
                people.forEach((p: any) => splits[p.id] = splitAmt);
            } else if (splitMode === 'single') {
                const target = singleSplitPayerId || people[0]?.id;
                splits[target] = finalAmt;
            } else {
                Object.entries(customSplits).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) splits[pid] = parseFloat(val as string); });
            }
        }

        const data = { totalAmount: finalAmt, description, category, type, payers, splitDetails: splits, date: Timestamp.fromDate(new Date(date)), currency: 'TWD', sourceAmount: parseFloat(amount), sourceCurrency: currency, exchangeRate: currency === 'TWD' ? 1 : (finalAmt / parseFloat(amount)) };
        const col = collection(db, getCollectionPath(userId, groupId, 'transactions'));
        if (editData) await updateDoc(doc(col, editData.id), data);
        else await addDoc(col, data);

        if (isRecurring && !editData) {
            const nm = new Date(date); nm.setMonth(nm.getMonth() + 1);
            await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), { name: description, amount: finalAmt, type, category, payerId: mainPayerId, payers, splitDetails: splits, frequency: 'monthly', active: true, nextDate: Timestamp.fromDate(nm) });
        }
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl">{editData ? '編輯' : '記一筆'}</h3>{!editData && <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">{loadingAI ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} AI <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loadingAI} /></label>}</div>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>支出</button><button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'income' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>收入</button></div>
                <div><label className={styles.label}>金額</label><div className="flex gap-2 items-center"><select className="bg-slate-100 rounded-lg p-2 text-sm font-bold outline-none" value={currency} onChange={e => setCurrency(e.target.value)}><option value="TWD">TWD</option><option value="USD">USD</option><option value="JPY">JPY</option></select><input type="number" className="text-3xl font-bold w-full text-right border-b pb-2 outline-none bg-transparent" value={amount} onChange={e => setAmount(e.target.value)} /></div>{currency !== 'TWD' && amount && <div className="text-right text-xs text-slate-400 mt-1 font-bold">≈ NT$ {Math.round(convertedAmount).toLocaleString()}</div>}</div>
                {type === 'expense' && (<div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-2"><label className={styles.label}>付款人</label>{people.length > 1 && (<div className="flex bg-white border rounded-lg p-0.5"><button onClick={() => setPayerMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'single' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>單人</button><button onClick={() => setPayerMode('multi')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'multi' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>多人</button></div>)}</div>{payerMode === 'single' ? (<select className={styles.input} value={mainPayerId} onChange={e => setMainPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={multiPayers[p.id] || ''} onChange={e => handlePayerChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, multiPayers, setMultiPayers)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}</div>)}
                {type === 'income' && (<div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><label className={styles.label}>收入歸屬 (誰賺的?)</label><select className={styles.input} value={mainPayerId} onChange={e => setMainPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}
                {type === 'expense' && people.length > 1 && (<div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-2"><label className={styles.label}>分帳</label><div className="flex bg-white border rounded-lg p-0.5"><button onClick={() => setSplitMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'single' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>單人</button><button onClick={() => setSplitMode('custom')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'custom' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>自訂</button><button onClick={() => setSplitMode('equal')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode === 'equal' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>平分</button></div></div>{splitMode === 'equal' ? (<div className="text-center text-xs text-slate-500 py-2">每人約 <span className="font-bold text-indigo-600">${(finalAmt / people.length).toFixed(1)}</span></div>) : splitMode === 'single' ? (<select className={styles.input} value={singleSplitPayerId || people[0]?.id} onChange={e => setSingleSplitPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={customSplits[p.id] || ''} onChange={e => handleSplitChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, customSplits, setCustomSplits)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}</div>)}
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
    const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
    const handleSave = async () => {
        if (!amount) return;
        const newBal = type === 'deposit' ? platform.balance + parseFloat(amount) : platform.balance - parseFloat(amount);
        await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), { balance: newBal });
        onClose();
    };
    return (<div className={styles.overlay}><div className={styles.content}><h3 className="font-bold text-xl mb-4">{platform.name} 現金管理</h3><div className="flex bg-slate-100 p-1 rounded-xl mb-4"><button onClick={() => setType('deposit')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'deposit' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>入金</button><button onClick={() => setType('withdraw')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'withdraw' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>出金</button></div><div className="mb-4"><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} autoFocus /></div><div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認</button></div></div></div>);
};

// --- Add Asset Modal (Enhanced with Lots) ---
export const AddAssetModal = ({ userId, platforms, onClose }: any) => {
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [platformId, setPlatformId] = useState(platforms[0]?.id || '');
    const [type, setType] = useState<'stock' | 'crypto'>('stock');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [deductCash, setDeductCash] = useState(true);

    const handleSave = async () => {
        if (!symbol || !quantity || !cost || !platformId) return;
        const qtyNum = parseFloat(quantity);
        const costNum = parseFloat(cost);
        const totalCost = qtyNum * costNum;
        const platform = platforms.find((p: any) => p.id === platformId);
        if (!platform) return;

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
                <div><label className={styles.label}>平台</label><select className={styles.input} value={platformId} onChange={e => setPlatformId(e.target.value)}>{platforms.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}</select></div>
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
    const [mode, setMode] = useState<'fifo' | 'specific'>('fifo');
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
            const sumLots = fetchedLots.reduce((acc, l: any) => acc + l.remainingQuantity, 0);
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
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">賣出 {holding.symbol}</h3><button onClick={onClose}><X /></button></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className={styles.label}>賣出單價 ({holding.currency})</label><input type="number" className={styles.input} value={price} onChange={e => setPrice(parseFloat(e.target.value))} /></div>
                <div>
                    <label className={styles.label}>賣出模式</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => { setMode('fifo'); setLotSelection({}); }} className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'fifo' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>FIFO (先進先出)</button>
                        <button onClick={() => { setMode('specific'); setLotSelection({}); }} className={`flex-1 py-2 text-xs font-bold rounded-lg ${mode === 'specific' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>指定批次</button>
                    </div>
                </div>
            </div>

            {mode === 'fifo' && (
                <div className="mb-4"><label className={styles.label}>賣出總數量 (持有: {fmt(holding.quantity)})</label><input type="number" className={styles.input} value={sellQty} onChange={e => setSellQty(e.target.value)} placeholder="輸入數量" /></div>
            )}

            <div className="max-h-48 overflow-y-auto border rounded-xl mb-4">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600"><tr><th className="p-2">買入日期</th><th className="p-2">成本</th><th className="p-2">剩餘</th><th className="p-2">賣出</th></tr></thead>
                    <tbody>
                        {loadingLots ? <tr><td colSpan={4} className="p-4 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr> : lots.map(lot => (
                            <tr key={lot.id} className="border-b last:border-0">
                                <td className="p-2 text-slate-500">{lot.id === 'legacy' ? 'Legacy' : new Date(lot.date.seconds * 1000).toLocaleDateString()}</td>
                                <td className="p-2">{fmt(lot.costPerShare)}</td>
                                <td className="p-2">{fmt(lot.remainingQuantity, 4)}</td>
                                <td className="p-2">
                                    {mode === 'fifo' ? (
                                        <span className={lotSelection[lot.id] > 0 ? 'font-bold text-indigo-600' : 'text-slate-300'}>{fmt(lotSelection[lot.id] || 0, 4)}</span>
                                    ) : (
                                        <input type="number" className="w-16 border rounded p-1 text-right" value={lotSelection[lot.id] || ''} onChange={e => setLotSelection({ ...lotSelection, [lot.id]: parseFloat(e.target.value) })} />
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

            <button onClick={handleConfirm} disabled={submitting || analysis.totalSellQty <= 0} className={`${styles.btnPrimary} w-full`}>{submitting ? <Loader2 className="animate-spin" /> : '確認賣出'}</button>
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
                <button onClick={onClose}><X size={20} /></button>
            </div>
            <div className="mb-6"><label className={styles.label}>手動報價 ({holding.currency})</label><input type="number" placeholder="自動" className={styles.input} value={manualPrice} onChange={e => setManualPrice(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={onEditInfo} className="bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 hover:bg-slate-200"><Edit size={16} /> 修改成本/數量</button>
                <button onClick={onSell} className="bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-1 hover:bg-indigo-100"><Coins size={16} /> 賣出資產</button>
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
    const [frequency, setFrequency] = useState<'once' | '1' | '3' | '6' | '12'>('once');
    const [type, setType] = useState<'cash' | 'drip'>('cash');
    const [addTransaction, setAddTransaction] = useState(true);

    const holding = holdings.find((h: any) => h.id === holdingId);
    const platform = platforms.find((p: any) => p.id === holding?.platformId);
    const currentPrice = holding ? (holding.manualPrice || holding.currentPrice) : 0;

    // Calculation for preview
    const heldShares = holding ? Math.floor(holding.quantity) : 0;
    const dps = parseFloat(amount) || 0;
    const totalDividend = type === 'drip' ? (heldShares * dps) : dps;
    const dripShares = (type === 'drip' && totalDividend && currentPrice > 0) ? totalDividend / currentPrice : 0;

    const handleSave = async () => {
        if (!holding || !amount) return;
        const val = parseFloat(amount); // This is Total Amount for Cash, or DPS for DRIP
        const batch = writeBatch(db);
        const dateTs = Timestamp.fromDate(new Date(date));

        // Find payer (Me)
        const peopleRef = collection(db, getCollectionPath(userId, groupId, 'people'));
        const peopleSnap = await getDocs(query(peopleRef, where('isMe', '==', true)));
        const payerId = !peopleSnap.empty ? peopleSnap.docs[0].id : people[0].id;

        if (type === 'drip') {
            // DRIP LOGIC
            if (frequency === 'once') {
                // Immediate Execution
                if (!currentPrice || currentPrice <= 0) { alert('無法取得股價'); return; }

                // 1. Create Lot
                const lotRef = doc(collection(db, getCollectionPath(userId, null, 'holdings'), holding.id, 'lots'));
                batch.set(lotRef, {
                    date: dateTs,
                    quantity: dripShares,
                    remainingQuantity: dripShares,
                    costPerShare: currentPrice,
                    currency: holding.currency,
                    note: 'DRIP'
                });

                // 2. Update Holding
                const newTotalQty = holding.quantity + dripShares;
                const newAvgCost = ((holding.quantity * holding.avgCost) + totalDividend) / newTotalQty;
                batch.update(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), {
                    quantity: newTotalQty,
                    avgCost: newAvgCost
                });

                // 3. Transaction
                if (addTransaction) {
                    const transRef = doc(collection(db, getCollectionPath(userId, groupId, 'transactions')));
                    batch.set(transRef, {
                        date: dateTs,
                        description: `股息再投入: ${holding.symbol} (${fmt(dripShares, 4)}股)`,
                        category: '投資收益',
                        type: 'income',
                        totalAmount: totalDividend,
                        currency: holding.currency,
                        payers: { [payerId]: totalDividend },
                        splitDetails: { [payerId]: totalDividend },
                        note: `DPS: ${val}`
                    });
                }
            } else {
                // Recurring Rule for DRIP
                const interval = parseInt(frequency);
                const nextDate = new Date(date);
                const ruleData = {
                    name: `DRIP: ${holding.symbol}`,
                    amount: val, // DPS
                    type: 'income',
                    category: '投資收益',
                    payerId: payerId,
                    frequency: 'custom',
                    intervalMonths: interval,
                    isDRIP: true,
                    linkedHoldingId: holding.id,
                    active: true,
                    nextDate: Timestamp.fromDate(nextDate),
                    payers: { [payerId]: val },
                    splitDetails: { [payerId]: val }
                };
                await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), ruleData);
            }

        } else {
            // CASH LOGIC
            if (frequency === 'once') {
                if (platform) {
                    batch.update(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), {
                        balance: increment(val)
                    });
                }
                if (addTransaction) {
                    const transRef = doc(collection(db, getCollectionPath(userId, groupId, 'transactions')));
                    batch.set(transRef, {
                        date: dateTs,
                        description: `現金股利: ${holding.symbol}`,
                        category: '投資收益',
                        type: 'income',
                        totalAmount: val,
                        currency: holding.currency,
                        payers: { [payerId]: val },
                        splitDetails: { [payerId]: val }
                    });
                }
            } else {
                // Recurring Rule for Cash
                const interval = parseInt(frequency);
                const nextDate = new Date(date);
                const ruleData = {
                    name: `股利: ${holding.symbol}`,
                    amount: val, // Total Amount
                    type: 'income',
                    category: '投資收益',
                    payerId: payerId,
                    frequency: 'custom',
                    intervalMonths: interval,
                    linkedPlatformId: platform.id,
                    active: true,
                    nextDate: Timestamp.fromDate(nextDate),
                    payers: { [payerId]: val },
                    splitDetails: { [payerId]: val }
                };
                await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), ruleData);
            }
        }

        await batch.commit();
        onClose();
    };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">領取股息</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={() => setType('cash')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'cash' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>現金 (Cash)</button>
                <button onClick={() => setType('drip')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'drip' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>再投入 (DRIP)</button>
            </div>
            <div className="space-y-4">
                <div><label className={styles.label}>標的</label><select className={styles.input} value={holdingId} onChange={e => setHoldingId(e.target.value)}>{holdings.map((h: any) => <option key={h.id} value={h.id}>{h.symbol}</option>)}</select></div>
                <div>
                    <label className={styles.label}>
                        {type === 'drip' ? `每股股息 (DPS)` : `股息總金額`} ({platform?.currency})
                    </label>
                    <input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    {type === 'drip' && holding && amount && (
                        <div className="text-xs bg-slate-50 p-2 rounded mt-1 text-slate-600 space-y-1">
                            <div>持有股數 (整數): {heldShares}</div>
                            <div>預估總額: {fmt(totalDividend)}</div>
                            <div className="font-bold text-indigo-600">預估買入: {fmt(dripShares, 4)} 股 (@ {currentPrice})</div>
                        </div>
                    )}
                </div>

                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} /></div>

                <div>
                    <label className={styles.label}>頻率</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setFrequency('once')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === 'once' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>單次</button>
                        <button onClick={() => setFrequency('1')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '1' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每月</button>
                        <button onClick={() => setFrequency('3')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '3' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每季</button>
                        <button onClick={() => setFrequency('6')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '6' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每半年</button>
                        <button onClick={() => setFrequency('12')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '12' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每年</button>
                    </div>
                </div>

                {frequency === 'once' && (
                    <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <input type="checkbox" id="addTrans" checked={addTransaction} onChange={e => setAddTransaction(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        <label htmlFor="addTrans" className="text-sm font-bold text-indigo-700 cursor-pointer select-none">同步新增至記帳紀錄</label>
                    </div>
                )}

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
        if (editData) await updateDoc(doc(db, getCollectionPath(userId, null, 'accounts'), editData.id), data);
        else await addDoc(collection(db, getCollectionPath(userId, null, 'accounts')), data);
        onClose();
    };
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData ? '編輯帳戶' : '新增銀行帳戶'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}><option>TWD</option><option>USD</option><option>JPY</option></select></div>
                    <div><label className={styles.label}>初始餘額</label><input type="number" className={styles.input} value={initialBalance} onChange={e => setInitialBalance(e.target.value)} /></div>
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
        if (editData) await updateDoc(doc(db, getCollectionPath(userId, null, 'creditCards'), editData.id), data);
        else await addDoc(collection(db, getCollectionPath(userId, null, 'creditCards')), data);
        onClose();
    };
    return (
        <div className={styles.overlay}><div className={styles.content}>
            <h3 className="font-bold text-xl mb-4">{editData ? '編輯信用卡' : '新增信用卡'}</h3>
            <div className="space-y-4">
                <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} /></div>
                <div><label className={styles.label}>結帳日 (每月幾號)</label><input type="number" min="1" max="31" className={styles.input} value={billingDay} onChange={e => setBillingDay(e.target.value)} /></div>
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
                <div><label className={styles.label}>持有數量</label><input type="number" className={styles.input} value={qty} onChange={e => setQty(e.target.value)} /></div>
                <div><label className={styles.label}>平均成本</label><input type="number" className={styles.input} value={avgCost} onChange={e => setAvgCost(e.target.value)} /></div>
                <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
                <button onClick={() => onDelete(holding)} className="w-full text-red-500 text-sm font-bold mt-2">刪除此資產</button>
            </div>
        </div></div>
    );
};

export const TransferModal = ({ userId, accounts, onClose }: any) => {
    const [fromId, setFromId] = useState(accounts[0]?.id || '');
    const [toId, setToId] = useState(accounts.length > 1 ? accounts[1].id : '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const handleSave = async () => {
        if (!fromId || !toId || !amount || fromId === toId) return;
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
                    <div><label className={styles.label}>轉出帳戶</label><select className={styles.input} value={fromId} onChange={e => setFromId(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    <div><label className={styles.label}>轉入帳戶</label><select className={styles.input} value={toId} onChange={e => setToId(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                </div>
                <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="flex gap-3"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認轉帳</button></div>
            </div>
        </div></div>
    );
};

export const BankDetailModal = ({ userId, account, logs, onClose, onImport }: any) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'in' | 'out'>('out');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = async () => {
        if (!amount) return;
        await addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), {
            accountId: account.id,
            type,
            amount: parseFloat(amount),
            date: Timestamp.fromDate(new Date(date)),
            description: desc || (type === 'in' ? '存款' : '提款')
        });
        setAmount(''); setDesc('');
    };
    const handleDelete = async (id: string) => { if (confirm('確定刪除此紀錄?')) await deleteDoc(doc(db, getCollectionPath(userId, null, 'bankLogs'), id)); };
    const handleExport = () => {
        if (logs.length === 0) { alert('無資料可匯出'); return; }
        const headers = ['Date', 'Type', 'Amount', 'Description', 'Account'];
        const rows = logs.map((l: any) => {
            const d = l.date?.seconds ? new Date(l.date.seconds * 1000).toISOString().split('T')[0] : '';
            return [d, l.type, l.amount, l.description, account.name];
        });
        const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${account.name}_logs.csv`; a.click();
    };

    const groupedLogs = logs.sort((a: any, b: any) => (Number(b.date?.seconds) || 0) - (Number(a.date?.seconds) || 0)).reduce((acc: any, log: any) => {
        const d = log.date?.seconds ? new Date(Number(log.date.seconds) * 1000) : new Date();
        const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(log);
        return acc;
    }, {});
    const sortedMonths = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a, 'zh-TW', { numeric: true }));

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl">{account.name}</h3>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-full" title="匯出"><Download size={18} /></button>
                        <button onClick={onImport} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-full" title="匯入"><Upload size={18} /></button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X size={20} /></button>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl mb-4 text-center"> <div className="text-xs text-slate-400">目前餘額</div> <div className="text-3xl font-bold text-slate-800">${account.currentBalance?.toLocaleString()}</div> </div>
                <div className="flex flex-col gap-2 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-indigo-600 mb-1">新增流水帳</div>
                    <div className="flex gap-2">
                        <select className="w-24 rounded-lg border px-2 bg-slate-50 text-sm h-9" value={type} onChange={(e: any) => setType(e.target.value)}><option value="out">支出</option><option value="in">收入</option></select>
                        <input type="date" className="flex-1 rounded-lg border px-3 text-sm h-9" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <input placeholder="金額" type="number" className="w-24 rounded-lg border px-3 text-sm h-9" value={amount} onChange={e => setAmount(e.target.value)} />
                        <input placeholder="備註" className="flex-1 rounded-lg border px-3 text-sm h-9" value={desc} onChange={e => setDesc(e.target.value)} />
                        <button onClick={handleSave} className="bg-indigo-600 text-white px-4 rounded-lg font-bold text-sm h-9">存</button>
                    </div>
                </div>
                <div className="space-y-0 max-h-[40vh] overflow-y-auto border rounded-xl border-slate-100">
                    {logs.length === 0 && <div className="text-center text-slate-300 py-8">無紀錄</div>}
                    {sortedMonths.map((month: any) => (
                        <div key={month}>
                            <div className="sticky top-0 bg-slate-50 py-1.5 px-3 border-b border-slate-100 text-xs font-bold text-slate-500 z-10 flex justify-between items-center">
                                <span>{month}</span>
                            </div>
                            <div className="bg-white">
                                {groupedLogs[month].map((l: any) => (
                                    <div key={l.id} className="flex justify-between items-center p-3 border-b last:border-0 border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div> <div className="font-bold text-sm text-slate-700">{l.description}</div> <div className="text-xs text-slate-400">{l.date?.seconds ? new Date(Number(l.date.seconds) * 1000).toLocaleDateString() : ''}</div> </div>
                                        <div className="flex items-center gap-3"> <div className={`font-bold ${l.type === 'in' ? 'text-emerald-600' : 'text-slate-800'}`}>{l.type === 'in' ? '+' : ''}{l.amount.toLocaleString()}</div> <button onClick={() => handleDelete(l.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button> </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export const CardDetailModal = ({ userId, card, cardLogs, allCardLogs, transactions, onClose, groups, currentGroupId }: any) => {
    const [showAddLog, setShowAddLog] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [amt, setAmt] = useState('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [linkLog, setLinkLog] = useState<CreditCardLog | null>(null);
    const today = new Date();
    const billingDay = card.billingDay;
    let cycleStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (today.getDate() < billingDay) cycleStart.setMonth(cycleStart.getMonth() - 1);
    const [viewStart, setViewStart] = useState(cycleStart.toISOString().split('T')[0]);
    const currentCycleStart = new Date(viewStart);
    const currentCycleEnd = new Date(currentCycleStart); currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1); currentCycleEnd.setDate(currentCycleEnd.getDate() - 1);
    const prevCycle = () => { const d = new Date(viewStart); d.setMonth(d.getMonth() - 1); setViewStart(d.toISOString().split('T')[0]); };
    const nextCycle = () => { const d = new Date(viewStart); d.setMonth(d.getMonth() + 1); setViewStart(d.toISOString().split('T')[0]); };

    // Sort and Filter Transactions for Linking
    const availableTrans = useMemo(() => {
        if (!linkLog) return [];

        const logDate = linkLog.date?.seconds ? new Date(linkLog.date.seconds * 1000).toISOString().split('T')[0] : '';
        const logAmount = linkLog.amount;

        // 1. Filter: Exclude transactions already linked to OTHER logs (but include if we were re-linking - though UI currently doesn't support re-link flow directly without unlinking first)
        const globalUsedIds = allCardLogs.filter((cl: any) => cl.id !== linkLog.id && cl.linkedTransactionId).map((cl: any) => cl.linkedTransactionId);

        // Use ALL transactions (no slice limit) that aren't used elsewhere
        let candidates = transactions.filter((t: any) => !globalUsedIds.includes(t.id));

        // 2. Sort: Priority (Amount/Date Match) > Time (Newest First)
        return candidates.sort((a: any, b: any) => {
            const aDate = a.date?.seconds ? new Date(a.date.seconds * 1000).toISOString().split('T')[0] : '';
            const bDate = b.date?.seconds ? new Date(b.date.seconds * 1000).toISOString().split('T')[0] : '';

            let scoreA = 0;
            // High Priority: Amount matches (allow tiny float diff)
            if (Math.abs(a.totalAmount - logAmount) < 0.1) scoreA += 20;
            // Medium Priority: Date matches exactly
            if (aDate === logDate) scoreA += 10;

            let scoreB = 0;
            if (Math.abs(b.totalAmount - logAmount) < 0.1) scoreB += 20;
            if (bDate === logDate) scoreB += 10;

            if (scoreA !== scoreB) {
                return scoreB - scoreA; // Highest score first
            }

            // Fallback: Chronological Descending (Newest first)
            return (b.date?.seconds || 0) - (a.date?.seconds || 0);
        });
    }, [transactions, allCardLogs, linkLog]);

    const viewLogs = cardLogs.filter((l: any) => {
        if (!l.date?.seconds) return false;
        const d = new Date(Number(l.date.seconds) * 1000);
        return d.getTime() >= currentCycleStart.getTime() && d.getTime() <= currentCycleEnd.getTime();
    }).sort((a: any, b: any) => (Number(b.date?.seconds) || 0) - (Number(a.date?.seconds) || 0));
    const handleSaveLog = async () => {
        if (!amt || !desc) return;
        const col = collection(db, getCollectionPath(userId, null, 'cardLogs'));
        const payload = { cardId: card.id, amount: parseFloat(amt), description: desc, date: Timestamp.fromDate(new Date(date)) };
        if (editingId) { await updateDoc(doc(col, editingId), payload); setEditingId(null); } else { await addDoc(col, { ...payload, isReconciled: false }); }
        setAmt(''); setDesc(''); setShowAddLog(false);
    };
    const handleEditClick = (log: any) => { setEditingId(log.id); setAmt(log.amount.toString()); setDesc(log.description); setDate(new Date((log.date.seconds as number) * 1000).toISOString().split('T')[0]); setShowAddLog(true); };
    const handleDeleteClick = async (id: string) => { if (window.confirm('確定要刪除此筆刷卡紀錄嗎？(需二次確認)')) { await deleteDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), id)); if (editingId === id) { setShowAddLog(false); setEditingId(null); } } };
    const linkTrans = async (transId: string) => { if (!linkLog) return; await updateDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), linkLog.id), { isReconciled: true, linkedTransactionId: transId }); setLinkLog(null); }

    return (<div className={styles.overlay}> {linkLog ? (<div className={styles.content}>
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">連結記帳資料 (對帳)</h3><button onClick={() => setLinkLog(null)}><X /></button></div>
        <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-indigo-100">
            <div className="text-xs text-slate-500 mb-1">正在為此筆刷卡紀錄尋找對應記帳：</div>
            <div className="font-bold text-indigo-700 flex justify-between">
                <span>{linkLog.description}</span>
                <span>${linkLog.amount}</span>
            </div>
            <div className="text-xs text-slate-400 text-right">{new Date((linkLog.date.seconds as number) * 1000).toLocaleDateString()}</div>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableTrans.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">無可連結的記帳資料</div>}
            {availableTrans.map((t: any) => {
                const isAmountMatch = Math.abs(t.totalAmount - linkLog.amount) < 0.1;
                return (
                    <div key={t.id} onClick={() => linkTrans(t.id)} className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center transition-all ${isAmountMatch ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400' : 'bg-white border-slate-100 hover:border-indigo-400'}`}>
                        <div>
                            <div className="font-bold text-sm flex items-center gap-2">
                                {t.description}
                                {isAmountMatch && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full">金額相符</span>}
                            </div>
                            <div className="text-xs text-slate-400 font-bold">{t.date?.seconds ? new Date(t.date.seconds * 1000).toLocaleDateString() : ''}</div>
                        </div>
                        <div className={`font-bold ${isAmountMatch ? 'text-emerald-600' : 'text-slate-700'}`}>${t.totalAmount}</div>
                    </div>
                )
            })}
        </div>
    </div>) : (<div className={`${styles.content} h-[85vh]`}> <div className="flex justify-between items-center mb-4"> <div><h3 className="font-bold text-xl">{card.name}</h3><div className="text-xs text-slate-500">結帳日: 每月 {card.billingDay} 號</div></div> <button onClick={onClose}><X /></button> </div> <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-4"> <button onClick={prevCycle} className="p-1 hover:bg-white rounded">◀</button> <div className="text-xs font-bold text-slate-600">{currentCycleStart.toLocaleDateString()} ~ {currentCycleEnd.toLocaleDateString()}</div> <button onClick={nextCycle} className="p-1 hover:bg-white rounded">▶</button> </div> <button onClick={() => { setShowAddLog(!showAddLog); setEditingId(null); setAmt(''); setDesc(''); }} className="w-full py-2 mb-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm">{showAddLog && !editingId ? '隱藏新增' : '+ 新增刷卡紀錄'}</button> {showAddLog && (<div className="bg-slate-50 p-4 rounded-xl border mb-4 space-y-2 animate-in slide-in-from-bottom-4"> <div className="text-xs font-bold text-indigo-500 mb-1">{editingId ? '編輯紀錄' : '新增紀錄'}</div> <div className="flex gap-2"> <div className="flex-1"><label className={styles.label}>日期</label><input type="date" className="w-full p-2 rounded border text-sm" value={date} onChange={e => setDate(e.target.value)} /></div> <div className="flex-1"><label className={styles.label}>金額</label><input type="number" className="w-full p-2 rounded border text-sm" value={amt} onChange={e => setAmt(e.target.value)} /></div> </div> <div><label className={styles.label}>說明</label><div className="flex gap-2"><input className="flex-1 p-2 rounded border text-sm" value={desc} onChange={e => setDesc(e.target.value)} /><button onClick={handleSaveLog} className="bg-indigo-600 text-white px-4 rounded text-xs font-bold">{editingId ? '更新' : '存'}</button></div></div> </div>)} <div className="space-y-2 max-h-[50vh] overflow-y-auto"> {viewLogs.length === 0 && <div className="text-center text-slate-400 py-4">此週期無紀錄</div>} {viewLogs.map((log: any) => { const linkedT = transactions.find((t: any) => t.id === log.linkedTransactionId); return (<div key={log.id} className={`p-3 rounded-xl border ${log.isReconciled ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200'}`}> <div className="flex justify-between items-center mb-1"> <div className="flex items-center gap-2"> <button onClick={async () => { await updateDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), log.id), { isReconciled: !log.isReconciled }) }}>{log.isReconciled ? <CheckCircle size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-300" />}</button> <span className={`text-sm font-bold ${log.isReconciled ? 'text-slate-400 line-through' : ''}`}>{log.description}</span> </div> <div className="font-bold font-mono">${log.amount}</div> </div> <div className="flex justify-between items-center pl-7"> <div className="text-[10px] text-slate-400">{new Date((log.date.seconds as number) * 1000).toLocaleDateString()}</div> <div className="flex items-center gap-2"> {!log.isReconciled && <button onClick={() => setLinkLog(log)} className="text-[10px] flex gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold"><LinkIcon size={10} /> 連結</button>} {log.isReconciled && linkedT && <span className="text-[10px] text-emerald-600 flex gap-1 bg-emerald-50 px-2 py-1 rounded"><Link2 size={10} /> {linkedT.description}</span>} <button onClick={() => handleEditClick(log)} className="text-slate-400 hover:text-indigo-600"><Edit size={12} /></button> <button onClick={() => handleDeleteClick(log.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={12} /></button> </div> </div> </div>) })} </div> </div>)} </div>)
}

export const AIAssistantModal = ({ onClose, contextData }: any) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '你好！我是您的財務助理。有關您的資產或記帳問題都可以問我。' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSend = async () => {
        if (!input) return;
        const userMsg = input;
        setMessages(p => [...p, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);
        try {
            const context = `User Net Worth: ${contextData.totalNetWorth}. Holdings: ${contextData.holdings.length}. Transactions: ${contextData.transactions.length}.`;
            const prompt = `Context: ${context}. User Question: ${userMsg}. Answer in Traditional Chinese, be helpful and concise.`;
            const res = await callGemini(prompt);
            setMessages(p => [...p, { role: 'model', text: res || 'Error' }]);
        } catch (e) { setMessages(p => [...p, { role: 'model', text: 'Sorry, AI error.' }]); }
        setLoading(false);
    };
    return (
        <div className={styles.overlay}><div className={`${styles.content} h-[600px] flex flex-col`}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-indigo-600" /> AI 助理</h3><button onClick={onClose}><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 bg-slate-50 rounded-xl">
                {messages.map((m, i) => (<div key={i} className={`p-3 rounded-xl text-sm max-w-[80%] ${m.role === 'user' ? 'bg-indigo-600 text-white self-end ml-auto' : 'bg-white text-slate-700 shadow-sm'}`}>{m.text}</div>))}
                {loading && <div className="p-3 bg-white rounded-xl shadow-sm w-fit"><Loader2 className="animate-spin" size={16} /></div>}
            </div>
            <div className="flex gap-2"><input className={styles.input} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="輸入問題..." /><button onClick={handleSend} disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl"><Send size={20} /></button></div>
        </div></div>
    );
};

export const AIBatchImportModal = ({ userId, groupId, categories, existingTransactions, accounts, creditCards, existingBankLogs, existingCardLogs, people, onClose, initialConfig }: any) => {
    const [mode, setMode] = useState<'text' | 'image' | 'file'>('text');
    const [target, setTarget] = useState<'ledger' | 'bank' | 'card'>('ledger');
    const [targetId, setTargetId] = useState('');

    const [textInput, setTextInput] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialConfig) {
            setTarget(initialConfig.target);
            if (initialConfig.targetId) setTargetId(initialConfig.targetId);
        } else {
            if (target === 'bank' && accounts.length > 0) setTargetId(accounts[0].id);
            if (target === 'card' && creditCards.length > 0) setTargetId(creditCards[0].id);
        }
    }, [target, accounts, creditCards, initialConfig]);

    const checkDuplicate = (item: any) => {
        const itemDateStr = item.date;
        const isSameDate = (ts: any, dateStr: string) => {
            if (!ts) return false;
            const d = new Date(ts.seconds * 1000).toISOString().split('T')[0];
            return d === dateStr;
        };

        if (target === 'ledger') {
            return existingTransactions.some((t: any) => isSameDate(t.date, itemDateStr) && Math.abs(t.totalAmount - item.amount) < 1);
        } else if (target === 'bank') {
            return existingBankLogs.some((l: any) => {
                if (l.accountId !== targetId) return false;
                return isSameDate(l.date, itemDateStr) && Math.abs(l.amount - item.amount) < 1;
            });
        } else if (target === 'card') {
            return existingCardLogs.some((l: any) => {
                if (l.cardId !== targetId) return false;
                return isSameDate(l.date, itemDateStr) && Math.abs(l.amount - item.amount) < 1;
            });
        }
        return false;
    };

    const handleAnalyze = async () => {
        if ((mode === 'text' && !textInput) || (mode === 'image' && !imagePreview) || (mode === 'file' && !textInput)) return;
        setLoading(true);
        try {
            let prompt = "";

            let contentToAnalyze = mode === 'image' ? imagePreview! : textInput;

            if (mode !== 'image') {
                contentToAnalyze = contentToAnalyze.replace(/(\d{3})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, (match, y, m, d) => {
                    const year = parseInt(y);
                    if (year < 1911) {
                        return `${year + 1911}-${m}-${d}`;
                    }
                    return match;
                });
            }

            if (target === 'ledger') {
                prompt = `Analyze the following data. It is likely accounting records or invoices.
                   Ignore header rows.
                   Extract and Map to JSON array.
                   RETURN ONLY RAW JSON. NO DESCRIPTION. NO MARKDOWN.
                   - description: Seller Name or Item Name
                   - amount: Number (FIND THE TOTAL/FINAL AMOUNT. Remove currency symbols, handle commas)
                   - date: YYYY-MM-DD (If missing year, use current year ${new Date().getFullYear()})
                   - type: 'expense' (default) or 'income' (if strictly implies income)
                   - category: Choose closest match from [${categories.map((c: any) => c.name).join(', ')}] based on seller/item.
                   `;
            } else if (target === 'bank') {
                prompt = `Parse the input into a JSON array of bank logs. Fields: date (YYYY-MM-DD), description, amount (number), type (in/out). Note: 'in' is deposit/income, 'out' is withdrawal/expense. Infer type from context if possible. (If missing year, use current year ${new Date().getFullYear()}). RETURN ONLY RAW JSON.`;
            } else if (target === 'card') {
                prompt = `Parse the input into a JSON array of credit card logs. Fields: date (YYYY-MM-DD), description, amount (number). Note: Amount should be positive number. (If missing year, use current year ${new Date().getFullYear()}). RETURN ONLY RAW JSON.`;
            }

            const res = await callGemini(prompt, contentToAnalyze);

            // Check for API Error messages
            if (res.includes("權限限制") || res.includes("API Key") || res.includes("系統錯誤") || res.includes("AI 暫時無法回應")) {
                alert(res);
                setLoading(false);
                return;
            }

            let json: any = [];
            try {
                // Robust Parsing: Extract JSON Array or Object
                const jsonMatch = res.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
                if (jsonMatch) {
                    json = JSON.parse(jsonMatch[0]);
                } else {
                    // Fallback cleanup
                    const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
                    json = JSON.parse(clean);
                }
            } catch (e) {
                console.error("JSON Parse Error", e, res);
                alert('解析失敗：AI 回傳格式無法讀取');
                setLoading(false);
                return;
            }

            // Extract Array if wrapped (e.g. { "items": [...] })
            let finalItems = json;
            if (!Array.isArray(json) && typeof json === 'object') {
                const keys = Object.keys(json);
                if (keys.length === 1 && Array.isArray(json[keys[0]])) {
                    finalItems = json[keys[0]];
                }
            }

            const items = Array.isArray(finalItems) ? finalItems : [finalItems];
            const now = new Date();
            const processed = items.map((it: any) => {
                let amt = it.amount;
                // Robust Number Parsing: Remove everything except digits, dots, and minus sign
                if (typeof amt === 'string') {
                    amt = parseFloat(amt.replace(/[^0-9.-]+/g, ''));
                }
                it.amount = amt || 0;

                if (!it.date) it.date = new Date().toISOString().split('T')[0];

                const isDup = checkDuplicate(it);

                const isFuture = new Date(it.date) > now;
                const isLarge = it.amount > 100000;
                const isAnomaly = isFuture || isLarge;

                return {
                    ...it,
                    id: Math.random().toString(36).substr(2, 9),
                    selected: !isDup && !isAnomaly,
                    isDuplicate: isDup,
                    isAnomaly: isAnomaly
                };
            });
            setParsedItems(processed);
        } catch (e) {
            console.error(e);
            alert('系統發生未預期錯誤');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const selected = parsedItems.filter(i => i.selected);
        if (selected.length === 0) return;
        setLoading(true);
        try {
            const batch = [];
            if (target === 'ledger') {
                const col = collection(db, getCollectionPath(userId, groupId, 'transactions'));
                const payerId = people.find((p: any) => p.isMe || p.uid === userId)?.id || people[0]?.id;
                for (const item of selected) {
                    batch.push(addDoc(col, {
                        totalAmount: item.amount,
                        description: item.description,
                        category: item.category || '未分類',
                        type: item.type || 'expense',
                        date: Timestamp.fromDate(new Date(item.date)),
                        currency: 'TWD',
                        payers: { [payerId]: item.amount },
                        splitDetails: { [payerId]: item.amount }
                    }));
                }
            } else if (target === 'bank') {
                const col = collection(db, getCollectionPath(userId, null, 'bankLogs'));
                for (const item of selected) {
                    batch.push(addDoc(col, {
                        accountId: targetId,
                        type: item.type || 'out',
                        amount: item.amount,
                        description: item.description,
                        date: Timestamp.fromDate(new Date(item.date))
                    }));
                }
            } else if (target === 'card') {
                const col = collection(db, getCollectionPath(userId, null, 'cardLogs'));
                for (const item of selected) {
                    batch.push(addDoc(col, {
                        cardId: targetId,
                        amount: item.amount,
                        description: item.description,
                        date: Timestamp.fromDate(new Date(item.date)),
                        isReconciled: false
                    }));
                }
            }
            await Promise.all(batch);
            onClose();
        } catch (e) {
            console.error(e);
            alert('儲存失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setTextInput(event.target.result as string);
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={`${styles.content} max-w-2xl`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-indigo-500" /> AI 批次匯入</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                {parsedItems.length === 0 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>匯入目標</label>
                                <select className={styles.input} value={target} onChange={e => setTarget(e.target.value as any)}>
                                    <option value="ledger">記帳 (Ledger)</option>
                                    <option value="bank">銀行 (Bank)</option>
                                    <option value="card">信用卡 (Card)</option>
                                </select>
                            </div>
                            <div>
                                {target === 'bank' && (
                                    <>
                                        <label className={styles.label}>選擇帳戶</label>
                                        <select className={styles.input} value={targetId} onChange={e => setTargetId(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                                    </>
                                )}
                                {target === 'card' && (
                                    <>
                                        <label className={styles.label}>選擇卡片</label>
                                        <select className={styles.input} value={targetId} onChange={e => setTargetId(e.target.value)}>{creditCards.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setMode('text')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 ${mode === 'text' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><FileText size={16} /> 文字貼上</button>
                            <button onClick={() => setMode('file')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 ${mode === 'file' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><FileSpreadsheet size={16} /> CSV/檔案</button>
                            <button onClick={() => setMode('image')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 ${mode === 'image' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><ImageIcon size={16} /> 圖片掃描</button>
                        </div>

                        {mode === 'text' && (
                            <textarea className="w-full h-40 p-3 border rounded-xl text-sm" placeholder={`貼上文字內容...\n例如: 1/15 午餐 120\n1/15 計程車 250`} value={textInput} onChange={e => setTextInput(e.target.value)}></textarea>
                        )}

                        {mode === 'file' && (
                            <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 flex flex-col items-center justify-center bg-indigo-50/50 relative hover:bg-indigo-50 transition-colors">
                                <FileSpreadsheet size={48} className="text-indigo-400 mb-3" />
                                <div className="text-sm font-bold text-indigo-600 mb-1">上傳 CSV 或純文字檔</div>
                                <div className="text-xs text-slate-400 mb-4">支援台灣雲端發票匯出格式</div>
                                {textInput ? (
                                    <div className="w-full bg-white p-3 rounded border text-xs text-slate-600 max-h-32 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90"></div>
                                        {textInput.slice(0, 200)}...
                                    </div>
                                ) : (
                                    <span className="text-xs bg-white px-3 py-1 rounded-full border shadow-sm text-slate-500">選擇檔案...</span>
                                )}
                                <input type="file" accept=".csv,.txt" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                            </div>
                        )}

                        {mode === 'image' && (
                            <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 relative">
                                {imagePreview ? <img src={imagePreview} className="max-h-40 rounded object-contain" /> : <div className="text-slate-400 text-center"><Camera size={32} className="mx-auto mb-2" /><span className="text-xs">點擊上傳照片</span></div>}
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                            </div>
                        )}
                        <button onClick={handleAnalyze} disabled={loading} className={styles.btnPrimary}>{loading ? <Loader2 className="animate-spin" /> : 'AI 智慧分析'}</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-slate-500">解析結果 ({parsedItems.length} 筆)</div>
                            <button onClick={() => setParsedItems([])} className="text-sm text-indigo-600 font-bold">重新上傳</button>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto space-y-2">
                            {parsedItems.map((item, idx) => (
                                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.isDuplicate ? 'bg-amber-50 border-amber-200' : item.isAnomaly ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                    <button onClick={() => { const newItems = [...parsedItems]; newItems[idx].selected = !newItems[idx].selected; setParsedItems(newItems); }}>
                                        {item.selected ? <CheckSquare className="text-indigo-600" /> : <Square className="text-slate-300" />}
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <input value={item.description} onChange={e => { const n = [...parsedItems]; n[idx].description = e.target.value; setParsedItems(n) }} className="font-bold text-slate-800 text-sm bg-transparent border-b border-transparent focus:border-indigo-300 outline-none w-full" />
                                            <div className="flex items-center gap-1 text-slate-500">
                                                {item.isDuplicate && <span title="重複資料" className="cursor-help"><AlertTriangle size={14} className="text-amber-500" /></span>}
                                                {item.isAnomaly && <span title="數值異常 (大額或未來日期)" className="cursor-help"><AlertCircle size={14} className="text-red-500" /></span>}
                                                <input type="number" value={item.amount} onChange={e => { const n = [...parsedItems]; n[idx].amount = parseFloat(e.target.value); setParsedItems(n) }} className="font-bold text-indigo-600 text-right w-20 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            <input type="date" value={item.date} onChange={e => { const n = [...parsedItems]; n[idx].date = e.target.value; setParsedItems(n) }} className="text-xs text-slate-400 bg-transparent" />
                                            {target === 'ledger' && (<select value={item.category} onChange={e => { const n = [...parsedItems]; n[idx].category = e.target.value; setParsedItems(n) }} className="text-xs bg-slate-100 rounded px-1">{categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>)}
                                            {(target === 'bank' || target === 'ledger') && (<select value={item.type} onChange={e => { const n = [...parsedItems]; n[idx].type = e.target.value; setParsedItems(n) }} className="text-xs bg-slate-100 rounded px-1">{target === 'ledger' ? <><option value="expense">支出</option><option value="income">收入</option></> : <><option value="out">支出</option><option value="in">收入</option></>}</select>)}
                                        </div>
                                    </div>
                                    <button onClick={() => { setParsedItems(parsedItems.filter((_, i) => i !== idx)) }} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSave} disabled={loading} className={styles.btnPrimary}>{loading ? <Loader2 className="animate-spin" /> : `確認匯入 (${parsedItems.filter(i => i.selected).length} 筆)`}</button>
                    </div>
                )}
            </div>
        </div>
    )
}
