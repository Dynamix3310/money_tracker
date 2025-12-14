// Author: Senior Frontend Engineer
// OS support: Web
// Description: Modal components for various features

import React, { useState, useEffect, useMemo } from 'react';
import { db, getCollectionPath, getUserProfilePath, auth } from '../services/firebase';
import { collection, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { callGemini } from '../services/gemini';
import { 
    X, Users, CheckCircle, Copy, Download, FileSpreadsheet, Upload, LogOut, 
    PlusIcon, ArrowUpRight, ArrowDownRight, Edit, Trash2, Scale, Loader2, 
    Sparkles, Camera, Wand2, Repeat 
} from 'lucide-react';
import { Category, Platform, AssetHolding, Group } from '../types';

const styles = {
  overlay: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
  content: "bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95",
  label: "block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider",
  input: "w-full px-4 py-2.5 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium",
  btnPrimary: "bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30",
  btnSecondary: "bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors"
};

// --- AIBatchImportModal ---
export const AIBatchImportModal = ({ onClose }: any) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-indigo-600"/> AI 批量匯入</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="text-center py-8 text-slate-500">
                    功能開發中...
                </div>
                <button onClick={onClose} className={styles.btnSecondary + " w-full"}>關閉</button>
            </div>
        </div>
    );
};

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
export const SettingsModal = ({ onClose, onExport, onExportCSV, onImport, currentGroupId, groups, user, categories, onAddCategory, onUpdateCategory, onDeleteCategory, onGroupJoin, onGroupCreate, onGroupSwitch }: any) => {
    const [activeTab, setActiveTab] = useState('ledger');
    const [newCat, setNewCat] = useState('');
    const [catType, setCatType] = useState<'expense' | 'income'>('expense');
    const [newCatBudget, setNewCatBudget] = useState('');
    const [finnhubKey, setFinnhubKey] = useState(localStorage.getItem('finnhub_key') || '');
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('user_gemini_key') || '');
    const [joinId, setJoinId] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    
    // Category Editing State
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editBudget, setEditBudget] = useState('');

    const handleSaveKeys = () => {
        localStorage.setItem('finnhub_key', finnhubKey);
        localStorage.setItem('user_gemini_key', geminiKey);
        alert('API Keys 已儲存');
    };

    const handleAddCat = () => {
        const maxOrder = categories.reduce((max: number, c: Category) => Math.max(max, c.order || 0), 0);
        onAddCategory(newCat, catType, parseFloat(newCatBudget), maxOrder + 1);
        setNewCat('');
        setNewCatBudget('');
    };

    const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
        const sorted = [...categories].sort((a: Category, b: Category) => (a.order||0) - (b.order||0));
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sorted.length) return;

        const itemA = sorted[index];
        const itemB = sorted[targetIndex];
        
        const orderA = itemA.order || index;
        const orderB = itemB.order || targetIndex;

        onUpdateCategory(itemA.id, { order: orderB });
        onUpdateCategory(itemB.id, { order: orderA });
    };

    const startEditCategory = (cat: Category) => {
        setEditingCatId(cat.id);
        setEditName(cat.name);
        setEditBudget(cat.budgetLimit?.toString() || '');
    };

    const saveEditCategory = () => {
        if (editingCatId) {
            onUpdateCategory(editingCatId, { 
                name: editName, 
                budgetLimit: parseFloat(editBudget) || 0 
            });
            setEditingCatId(null);
        }
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
                            <div className="flex gap-2 items-end"><div className="flex-1"><label className={styles.label}>每月預算 (可選)</label><input type="number" placeholder="0 = 無限制" className={`${styles.input} py-2 text-sm`} value={newCatBudget} onChange={e => setNewCatBudget(e.target.value)} /></div><button onClick={handleAddCat} className="bg-indigo-600 text-white px-4 py-2 h-[38px] rounded-lg font-bold text-sm mb-[1px] flex items-center gap-1"><PlusIcon size={14} /> 新增</button></div>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {categories.map((c: Category, idx: number) => (
                                <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                    {editingCatId === c.id ? (
                                        <div className="flex-1 flex gap-2 items-center">
                                            <input className="border rounded px-2 py-1 text-sm w-1/3" value={editName} onChange={e => setEditName(e.target.value)} placeholder="名稱" />
                                            <input className="border rounded px-2 py-1 text-sm w-1/3" type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)} placeholder="預算" />
                                            <button onClick={saveEditCategory} className="text-emerald-600 font-bold text-xs">儲存</button>
                                            <button onClick={() => setEditingCatId(null)} className="text-slate-400 text-xs">取消</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <span className="text-sm font-bold flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${c.type === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>{c.name}</span>
                                            {c.budgetLimit && c.budgetLimit > 0 && <div className="text-xs text-slate-400 pl-4">預算: ${c.budgetLimit.toLocaleString()}</div>}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <div className="flex flex-col mr-2">
                                            {idx > 0 && <button onClick={() => handleMoveCategory(idx, 'up')} className="text-slate-400 hover:text-indigo-600"><ArrowUpRight size={12} className="-rotate-45"/></button>}
                                            {idx < categories.length - 1 && <button onClick={() => handleMoveCategory(idx, 'down')} className="text-slate-400 hover:text-indigo-600"><ArrowDownRight size={12} className="-rotate-45"/></button>}
                                        </div>
                                        <button onClick={() => startEditCategory(c)} className="text-slate-300 hover:text-indigo-600 p-1"><Edit size={14} /></button>
                                        <button onClick={() => onDeleteCategory(c.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                    </div>
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
            const prompt = `As a financial advisor, analyze this portfolio rebalancing need. Currency: ${baseCurrency}. Total Value: ${Math.round(calcData.total)}. Stock: ${calcData.stock.pct.toFixed(1)}% (Target ${targets.stock}%), Crypto: ${calcData.crypto.pct.toFixed(1)}% (Target ${targets.crypto}%), Cash: ${calcData.cash.pct.toFixed(1)}% (Target ${targets.cash}%). Holdings: ${holdings.map((h:any) => `${h.symbol} (${h.type})`).join(', ')}. Provide a concise trade plan in Traditional Chinese.`;
            const result = await callGemini(prompt);
            setAiAdvice(result || "AI 無回應");
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

// --- AddTransactionModal (With Auto-Balancing) ---
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

    const setQuickSplit = (targetId: string | 'equal') => {
        if (targetId === 'equal') {
            setSplitMode('equal');
            setCustomSplits({});
        } else {
            setSplitMode('custom');
            const newSplits: any = {};
            people.forEach((p:any) => newSplits[p.id] = p.id === targetId ? finalAmt.toString() : '0');
            setCustomSplits(newSplits);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setLoadingAI(true); const reader = new FileReader(); reader.onloadend = async () => { try { const prompt = `Analyze receipt. Extract totalAmount, currency, date, description, category. Return JSON.`; const resultText = await callGemini(prompt, reader.result as string); if (resultText) { const json = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '')); if (json.totalAmount) setAmount(json.totalAmount); if (json.currency) setCurrency(json.currency); if (json.description) setDescription(json.description); if (json.category) setCategory(json.category); if (json.date) setDate(json.date); } } catch (err) { alert("AI Error"); } finally { setLoadingAI(false); } }; reader.readAsDataURL(file); };
    const handleSave = async () => { if (!amount || !description) return; if (type === 'expense' && (Math.abs(payerSum - finalAmt) > 1 || Math.abs(splitSum - finalAmt) > 1)) { alert('金額不符'); return; } let payers: any = {}; if (payerMode === 'single') payers[mainPayerId] = finalAmt; else Object.entries(multiPayers).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) payers[pid] = parseFloat(val as string); }); let splits: any = {}; if (splitMode === 'equal') { const splitAmt = finalAmt / (people.length || 1); people.forEach((p: any) => splits[p.id] = splitAmt); } else Object.entries(customSplits).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) splits[pid] = parseFloat(val as string); }); const data = { totalAmount: finalAmt, description, category, type, payers, splitDetails: splits, date: Timestamp.fromDate(new Date(date)), currency: 'TWD', sourceAmount: parseFloat(amount), sourceCurrency: currency, exchangeRate: currency === 'TWD' ? 1 : (finalAmt / parseFloat(amount)) }; const col = collection(db, getCollectionPath(userId, groupId, 'transactions')); if (editData) await updateDoc(doc(col, editData.id), data); else await addDoc(col, data); if (isRecurring && !editData) { const nm = new Date(date); nm.setMonth(nm.getMonth() + 1); await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), { name: description, amount: finalAmt, type, category, payerId: mainPayerId, payers, splitDetails: splits, frequency: 'monthly', active: true, nextDate: Timestamp.fromDate(nm) }); } onClose(); };

    return (
        <div className={styles.overlay}><div className={styles.content}>
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl">{editData ? '編輯' : '記一筆'}</h3>{!editData && <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">{loadingAI ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>} AI <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loadingAI}/></label>}</div>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>支出</button><button onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'income' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>收入</button></div>
                <div><label className={styles.label}>金額</label><div className="flex gap-2 items-center"><select className="bg-slate-100 rounded-lg p-2 text-sm font-bold outline-none" value={currency} onChange={e => setCurrency(e.target.value)}><option value="TWD">TWD</option><option value="USD">USD</option><option value="JPY">JPY</option></select><input type="number" className="text-3xl font-bold w-full text-right border-b pb-2 outline-none bg-transparent" value={amount} onChange={e => setAmount(e.target.value)} /></div>{currency !== 'TWD' && amount && <div className="text-right text-xs text-slate-400 mt-1 font-bold">≈ NT$ {Math.round(convertedAmount).toLocaleString()}</div>}</div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-2"><label className={styles.label}>{type === 'expense' ? '付款人' : '入帳者/收入來源'}</label>{people.length > 1 && (<div className="flex bg-white border rounded-lg p-0.5"><button onClick={() => setPayerMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'single' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>單人</button><button onClick={() => setPayerMode('multi')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'multi' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>多人</button></div>)}</div>{payerMode === 'single' ? (<select className={styles.input} value={mainPayerId} onChange={e => setMainPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={multiPayers[p.id] || ''} onChange={e => handlePayerChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, multiPayers, setMultiPayers)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}</div>
                
                {type === 'expense' && people.length > 1 && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2"><label className={styles.label}>分帳</label></div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button onClick={() => setQuickSplit('equal')} className={`px-3 py-1 text-xs rounded-full border ${splitMode === 'equal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>平分</button>
                            {people.map((p:any) => {
                                const isFull = splitMode === 'custom' && parseFloat(customSplits[p.id]) >= finalAmt - 1;
                                return (
                                    <button key={p.id} onClick={() => setQuickSplit(p.id)} className={`px-3 py-1 text-xs rounded-full border ${isFull ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>{p.name}</button>
                                )
                            })}
                            <button onClick={() => setSplitMode('custom')} className={`px-3 py-1 text-xs rounded-full border ${splitMode === 'custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>自訂</button>
                        </div>
                        {splitMode === 'equal' ? (<div className="text-center text-xs text-slate-500 py-2">每人約 <span className="font-bold text-indigo-600">${(finalAmt / people.length).toFixed(1)}</span></div>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={customSplits[p.id] || ''} onChange={e => handleSplitChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, customSplits, setCustomSplits)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}
                    </div>
                )}
                <div><label className={styles.label}>說明</label><input className={styles.input} value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} /></div><div><label className={styles.label}>分類</label><select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>{currentCats.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div></div>
                {!editData && (<div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100"><input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" /><label htmlFor="recurring" className="text-sm font-bold text-indigo-700 flex items-center gap-2"><Repeat size={16} /> 固定收支</label></div>)}
                <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
        </div></div>
    )
}
// --- End of components/Modals.tsx ---