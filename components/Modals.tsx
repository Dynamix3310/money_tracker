
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Download, Share2, Trash2, Camera, Loader2, ArrowUpRight, ArrowDownRight, Sparkles, Send, CheckCircle, Circle, Link as LinkIcon, Link2, Upload, ArrowRightLeft, Save, RefreshCw, Building2, Wallet, Landmark, Edit, Key, Settings, Repeat, AlertCircle, FileText, Image as ImageIcon, CreditCard, Copy, LogOut, Users, Split, Calculator, Wand2, PlusIcon, FileSpreadsheet, AlertTriangle, CheckSquare, Square, DollarSign, Clock, Calendar } from 'lucide-react';
import { RecurringRule, Person, Category, AssetHolding, Platform, CreditCardLog, Transaction, ChatMessage, BankAccount } from '../types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db, getCollectionPath, auth } from '../services/firebase';
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
export const SettingsModal = ({ onClose, onExport, onExportCSV, onImport, currentGroupId, categories, onAddCategory, onDeleteCategory, onGroupJoin }: any) => {
    const [activeTab, setActiveTab] = useState('general');
    const [newCat, setNewCat] = useState('');
    const [catType, setCatType] = useState<'expense' | 'income'>('expense');
    const [newCatBudget, setNewCatBudget] = useState('');

    const [finnhubKey, setFinnhubKey] = useState(localStorage.getItem('finnhub_key') || '');
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('user_gemini_key') || '');

    const [joinId, setJoinId] = useState('');

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
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'general' ? 'bg-white shadow' : 'text-slate-400'}`}>一般 / 群組</button>
                    <button onClick={() => setActiveTab('keys')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'keys' ? 'bg-white shadow' : 'text-slate-400'}`}>API 金鑰</button>
                    <button onClick={() => setActiveTab('category')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'category' ? 'bg-white shadow' : 'text-slate-400'}`}>分類與預算</button>
                </div>

                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><Users size={16} /> 多人記帳群組</div>
                            <div className="mb-4">
                                <label className={styles.label}>您的邀請碼 (Group ID)</label>
                                <div className="flex gap-2">
                                    <div className="bg-white border px-3 py-2 rounded-lg text-sm font-mono flex-1 truncate select-all">{currentGroupId}</div>
                                    <button onClick={() => navigator.clipboard.writeText(currentGroupId)} className="bg-indigo-200 text-indigo-700 p-2 rounded-lg"><Copy size={16} /></button>
                                </div>
                                <p className="text-[10px] text-indigo-600 mt-1">將此代碼分享給他人，對方即可加入您的帳本。</p>
                            </div>

                            <div className="border-t border-indigo-200 pt-4">
                                <label className={styles.label}>加入其他群組</label>
                                <div className="flex gap-2">
                                    <input
                                        placeholder="輸入對方邀請碼"
                                        className={`${styles.input} py-2 text-sm`}
                                        value={joinId}
                                        onChange={e => setJoinId(e.target.value)}
                                    />
                                    <button onClick={() => onGroupJoin(joinId)} className="bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm whitespace-nowrap">
                                        加入
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={onExport} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200">
                                <Download size={16} /> 備份 (JSON)
                            </button>
                            <button onClick={onExportCSV} className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 border border-emerald-100">
                                <FileSpreadsheet size={16} /> 匯出 Excel
                            </button>
                        </div>

                        <button onClick={onImport} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200">
                            <Upload size={16} /> 匯入備份 (JSON)
                        </button>

                        <button onClick={() => { auth.signOut(); onClose(); }} className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                            <LogOut size={18} /> 登出帳號
                        </button>
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

// --- Transactions ---
export const AddTransactionModal = ({ userId, groupId, people, categories, onClose, editData }: any) => {
    const [type, setType] = useState<'expense' | 'income'>(editData?.type || 'expense');
    const [amount, setAmount] = useState(editData?.totalAmount?.toString() || '');
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

    const totalAmountVal = parseFloat(String(amount)) || 0;
    const payerSum = payerMode === 'single' ? totalAmountVal : Object.values(multiPayers).reduce((acc: number, val) => acc + (parseFloat(val as string) || 0), 0);
    const splitSum = splitMode === 'equal' ? totalAmountVal : Object.values(customSplits).reduce((acc: number, val) => acc + (parseFloat(val as string) || 0), 0);
    const isValidPayer = Math.abs(payerSum - totalAmountVal) < 1;
    const isValidSplit = Math.abs(splitSum - totalAmountVal) < 1;

    const fillRemainder = (id: string, currentMap: Record<string, string>, setMap: Function) => {
        if (totalAmountVal <= 0) return;
        const otherSum = Object.entries(currentMap).filter(([k, v]) => k !== id).reduce((acc: number, [k, v]) => acc + (parseFloat(v as string) || 0), 0);
        const remainder = Math.max(0, totalAmountVal - otherSum);
        setMap({ ...currentMap, [id]: Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(1) });
    };

    const handlePayerChange = (id: string, val: string) => {
        const newMap = { ...multiPayers, [id]: val };
        if (people.length === 2 && totalAmountVal > 0) {
            const other = people.find((p: any) => p.id !== id);
            if (other) {
                const remainder = Math.max(0, totalAmountVal - (parseFloat(val) || 0));
                newMap[other.id] = Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(1);
            }
        }
        setMultiPayers(newMap);
    };

    const handleSplitChange = (id: string, val: string) => {
        const newMap = { ...customSplits, [id]: val };
        if (people.length === 2 && totalAmountVal > 0) {
            const other = people.find((p: any) => p.id !== id);
            if (other) {
                const remainder = Math.max(0, totalAmountVal - (parseFloat(val) || 0));
                newMap[other.id] = Number.isInteger(remainder) ? remainder.toString() : remainder.toFixed(1);
            }
        }
        setCustomSplits(newMap);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setLoadingAI(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const prompt = `Analyze receipt. Extract totalAmount, date(YYYY-MM-DD), description, category from list: ${currentCats.map((c: any) => c.name).join(',')}. Return JSON.`;
                const resultText = await callGemini(prompt, reader.result as string);
                const json = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, ''));
                if (json.totalAmount) setAmount(json.totalAmount);
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
            if (!isValidPayer) { alert(`付款金額總和 (${payerSum}) 不等於總金額 (${totalAmountVal})`); return; }
            if (!isValidSplit) { alert(`分帳金額總和 (${splitSum}) 不等於總金額 (${totalAmountVal})`); return; }
        }
        const finalAmt = totalAmountVal;
        let payers: Record<string, number> = {};
        if (payerMode === 'single') payers[mainPayerId] = finalAmt;
        else Object.entries(multiPayers).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) payers[pid] = parseFloat(val as string); });

        let splits: Record<string, number> = {};
        if (splitMode === 'equal') { const splitAmt = finalAmt / (people.length || 1); people.forEach((p: any) => splits[p.id] = splitAmt); }
        else Object.entries(customSplits).forEach(([pid, val]) => { if (parseFloat(val as string) > 0) splits[pid] = parseFloat(val as string); });

        const data = { totalAmount: finalAmt, description, category, type, payers, splitDetails: splits, date: Timestamp.fromDate(new Date(date)), currency: 'TWD' };
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

                    <div><label className={styles.label}>金額</label><input type="number" placeholder="0" className="text-4xl font-bold w-full text-center border-b pb-2 outline-none bg-transparent" value={amount} onChange={e => setAmount(e.target.value)} /></div>

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
                                    <div className={`text-xs text-right font-bold ${isValidPayer ? 'text-emerald-500' : 'text-red-500'}`}>合計: {Math.round(payerSum)} / 目標: {totalAmountVal}</div>
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
                                <div className="text-center text-xs text-slate-500 py-2 bg-white rounded-lg border border-dashed">每人負擔約 <span className="font-bold text-indigo-600">${(totalAmountVal / people.length).toFixed(1)}</span></div>
                            ) : (
                                <div className="space-y-2">
                                    {people.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={customSplits[p.id] || ''} onChange={e => handleSplitChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, customSplits, setCustomSplits)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>
                                    ))}
                                    <div className={`text-xs text-right font-bold ${isValidSplit ? 'text-emerald-500' : 'text-red-500'}`}>合計: {Math.round(splitSum)} / 目標: {totalAmountVal}</div>
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

export const CardDetailModal = ({ userId, card, cardLogs, transactions, allCardLogs, onClose }: any) => {
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
    const globalUsedIds = allCardLogs.filter((cl: any) => cl.id !== linkLog?.id && cl.linkedTransactionId).map((cl: any) => cl.linkedTransactionId);
    const availableTrans = transactions.filter((t: any) => !globalUsedIds.includes(t.id)).slice(0, 30);
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
    return (<div className={styles.overlay}> {linkLog ? (<div className={styles.content}> <div className="flex justify-between items-center mb-4"><h3 className="font-bold">連結記帳資料</h3><button onClick={() => setLinkLog(null)}><X /></button></div> <div className="space-y-2 max-h-80 overflow-y-auto"> {availableTrans.map((t: any) => (<div key={t.id} onClick={() => linkTrans(t.id)} className="bg-white p-3 border rounded-xl hover:border-indigo-500 cursor-pointer flex justify-between"> <div> <div className="font-bold text-sm">{t.description}</div> <div className="text-xs text-slate-400 font-bold text-indigo-500">{t.date?.seconds ? new Date(t.date.seconds * 1000).toLocaleDateString() : ''}</div> </div> <div className="font-bold">${t.totalAmount}</div> </div>))} </div> </div>) : (<div className={`${styles.content} h-[85vh]`}> <div className="flex justify-between items-center mb-4"> <div><h3 className="font-bold text-xl">{card.name}</h3><div className="text-xs text-slate-500">結帳日: 每月 {card.billingDay} 號</div></div> <button onClick={onClose}><X /></button> </div> <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-4"> <button onClick={prevCycle} className="p-1 hover:bg-white rounded">◀</button> <div className="text-xs font-bold text-slate-600">{currentCycleStart.toLocaleDateString()} ~ {currentCycleEnd.toLocaleDateString()}</div> <button onClick={nextCycle} className="p-1 hover:bg-white rounded">▶</button> </div> <button onClick={() => { setShowAddLog(!showAddLog); setEditingId(null); setAmt(''); setDesc(''); }} className="w-full py-2 mb-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm">{showAddLog && !editingId ? '隱藏新增' : '+ 新增刷卡紀錄'}</button> {showAddLog && (<div className="bg-slate-50 p-4 rounded-xl border mb-4 space-y-2 animate-in slide-in-from-bottom-4"> <div className="text-xs font-bold text-indigo-500 mb-1">{editingId ? '編輯紀錄' : '新增紀錄'}</div> <div className="flex gap-2"> <div className="flex-1"><label className={styles.label}>日期</label><input type="date" className="w-full p-2 rounded border text-sm" value={date} onChange={e => setDate(e.target.value)} /></div> <div className="flex-1"><label className={styles.label}>金額</label><input type="number" className="w-full p-2 rounded border text-sm" value={amt} onChange={e => setAmt(e.target.value)} /></div> </div> <div><label className={styles.label}>說明</label><div className="flex gap-2"><input className="flex-1 p-2 rounded border text-sm" value={desc} onChange={e => setDesc(e.target.value)} /><button onClick={handleSaveLog} className="bg-indigo-600 text-white px-4 rounded text-xs font-bold">{editingId ? '更新' : '存'}</button></div></div> </div>)} <div className="space-y-2 max-h-[50vh] overflow-y-auto"> {viewLogs.length === 0 && <div className="text-center text-slate-400 py-4">此週期無紀錄</div>} {viewLogs.map((log: any) => { const linkedT = transactions.find((t: any) => t.id === log.linkedTransactionId); return (<div key={log.id} className={`p-3 rounded-xl border ${log.isReconciled ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200'}`}> <div className="flex justify-between items-center mb-1"> <div className="flex items-center gap-2"> <button onClick={async () => { await updateDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), log.id), { isReconciled: !log.isReconciled }) }}>{log.isReconciled ? <CheckCircle size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-300" />}</button> <span className={`text-sm font-bold ${log.isReconciled ? 'text-slate-400 line-through' : ''}`}>{log.description}</span> </div> <div className="font-bold font-mono">${log.amount}</div> </div> <div className="flex justify-between items-center pl-7"> <div className="text-[10px] text-slate-400">{new Date((log.date.seconds as number) * 1000).toLocaleDateString()}</div> <div className="flex items-center gap-2"> {!log.isReconciled && <button onClick={() => setLinkLog(log)} className="text-[10px] flex gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold"><LinkIcon size={10} /> 連結</button>} {log.isReconciled && linkedT && <span className="text-[10px] text-emerald-600 flex gap-1 bg-emerald-50 px-2 py-1 rounded"><Link2 size={10} /> {linkedT.description}</span>} <button onClick={() => handleEditClick(log)} className="text-slate-400 hover:text-indigo-600"><Edit size={12} /></button> <button onClick={() => handleDeleteClick(log.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={12} /></button> </div> </div> </div>) })} </div> </div>)} </div>)
}

export const AddPlatformModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || '');
    const [type, setType] = useState<'stock' | 'crypto'>(editData?.type || 'stock');
    const [initialCash, setInitialCash] = useState(editData?.balance?.toString() || '0');
    const [currency, setCurrency] = useState(editData?.currency || 'USD');
    const handleSave = async () => { const col = collection(db, getCollectionPath(userId, null, 'platforms')); if (editData) { await updateDoc(doc(col, editData.id), { name, type, currency, balance: parseFloat(initialCash) || 0 }); } else { await addDoc(col, { name, type, balance: parseFloat(initialCash) || 0, currency }); } onClose(); };
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">{editData ? '編輯投資平台' : '新增投資平台'}</h3> <div className="space-y-4"> <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('stock')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'stock' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>證券戶</button><button onClick={() => setType('crypto')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'crypto' ? 'bg-white shadow text-orange-600' : 'text-slate-400'}`}>交易所</button></div> <div><label className={styles.label}>平台名稱</label><input placeholder="例如: Firstrade, 幣安" className={styles.input} value={name} onChange={e => setName(e.target.value)} /></div> <div className="grid grid-cols-2 gap-3"> <div><label className={styles.label}>{editData ? '目前現金餘額' : '初始現金餘額'}</label><input type="number" className={styles.input} value={initialCash} onChange={e => setInitialCash(e.target.value)} /></div> <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}><option>USD</option><option>TWD</option><option>USDT</option><option>JPY</option></select></div> </div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div> </div> </div></div>)
}

export const ManagePlatformCashModal = ({ platform, userId, onClose }: any) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
    const handleSave = async () => { const val = parseFloat(String(amount)); if (!val) return; const newBal = type === 'deposit' ? (platform.balance as number) + val : (platform.balance as number) - val; await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), { balance: newBal }); onClose(); }
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">管理 {platform.name} 現金</h3> <div className="bg-slate-50 p-3 rounded-xl mb-4 text-center"> <div className="text-xs text-slate-400">目前餘額</div> <div className="text-2xl font-bold text-slate-800">{platform.balance.toLocaleString()} {platform.currency}</div> </div> <div className="space-y-4"> <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('deposit')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'deposit' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>入金 (Deposit)</button><button onClick={() => setType('withdraw')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'withdraw' ? 'bg-white shadow text-red-600' : 'text-slate-400'}`}>出金 (Withdraw)</button></div> <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認</button></div> </div> </div></div>)
}

export const AddAssetModal = ({ userId, platforms, onClose }: any) => {
    const [symbol, setSymbol] = useState(''); const [qty, setQty] = useState<string>(''); const [cost, setCost] = useState<string>(''); const [platformId, setPlatformId] = useState(platforms[0]?.id || ''); const [type, setType] = useState<'stock' | 'crypto'>('stock'); const [deductCash, setDeductCash] = useState(true);
    const handleSave = async () => {
        if (!symbol || !qty || !cost || !platformId) return;
        const qtyNum = parseFloat(String(qty));
        const costNum = parseFloat(String(cost));
        const totalCost = costNum * qtyNum;
        const platform = platforms.find((p: any) => p.id === platformId);
        await addDoc(collection(db, getCollectionPath(userId, null, 'holdings')), { symbol: symbol.toUpperCase(), quantity: qtyNum, avgCost: costNum, currentPrice: costNum, currency: platform?.currency || 'USD', type, platformId });
        if (deductCash && platform) { await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platformId), { balance: (platform.balance as number) - totalCost }); } onClose();
    };
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">新增資產</h3> <div className="space-y-4"> <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setType('stock')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'stock' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>股票</button><button onClick={() => setType('crypto')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type === 'crypto' ? 'bg-white shadow text-orange-600' : 'text-slate-400'}`}>加密貨幣</button></div> <div> <label className={styles.label}>選擇平台</label> <select className={styles.input} value={platformId} onChange={e => setPlatformId(e.target.value)}> {platforms.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)} </select> </div> {platformId && <div className="flex items-center gap-2 px-2"> <input type="checkbox" checked={deductCash} onChange={e => setDeductCash(e.target.checked)} id="dc" className="w-4 h-4 text-indigo-600 rounded" /> <label htmlFor="dc" className="text-sm font-bold text-slate-600">從平台餘額扣款</label> </div>} <div><label className={styles.label}>代號</label><input placeholder="例如: AAPL, 2330.TW, 7203.T (日股請加 .T)" className={styles.input} value={symbol} onChange={e => setSymbol(e.target.value)} /></div> <div className="grid grid-cols-2 gap-3"> <div><label className={styles.label}>數量</label><input type="number" className={styles.input} value={qty} onChange={e => setQty(e.target.value)} /></div> <div><label className={styles.label}>平均成本 (單價)</label><input type="number" className={styles.input} value={cost} onChange={e => setCost(e.target.value)} /></div> </div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div> </div> </div></div>)
}

export const EditAssetModal = ({ holding, userId, onClose, onDelete }: any) => {
    const [qty, setQty] = useState(String(holding.quantity)); const [cost, setCost] = useState(String(holding.avgCost));
    const handleSave = async () => { await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), { quantity: parseFloat(String(qty)), avgCost: parseFloat(String(cost)) }); onClose(); };
    return (<div className={styles.overlay}><div className={styles.content}> <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">編輯 {holding.symbol}</h3><button onClick={onDelete} className="text-red-500 p-2 bg-red-50 rounded-lg"><Trash2 size={18} /></button></div> <div className="space-y-4"> <div><label className={styles.label}>數量</label><input type="number" className={styles.input} value={qty} onChange={e => setQty(e.target.value)} /></div> <div><label className={styles.label}>平均成本</label><input type="number" className={styles.input} value={cost} onChange={e => setCost(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>更新</button></div> </div> </div></div>)
}

export const EditAssetPriceModal = ({ holding, userId, onClose, onEditInfo, onSell }: any) => {
    const [manualPrice, setManualPrice] = useState(holding.manualPrice ? String(holding.manualPrice) : '');
    const handleSave = async () => {
        const price = manualPrice ? parseFloat(manualPrice) : null;
        // If price is valid number, update manualPrice. If empty, remove the field (or set null)
        const payload: any = { manualPrice: price };
        if (price === null || isNaN(price)) {
            // To remove a field in Firestore, typically use FieldValue.delete(), but updateDoc with null works for "unsetting" in our logic if we check null
            // Or explicitly delete the field. For simplicity, we set to null and App.tsx checks `manualPrice ?? currentPrice`
            payload.manualPrice = null; 
        }
        await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), payload);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="font-bold text-xl">{holding.symbol}</h3>
                        <div className="text-xs text-slate-400">現價: {holding.currentPrice} {holding.currency} {holding.manualPrice ? '(手動)' : '(自動)'}</div>
                    </div>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className={styles.label}>手動報價設定</label>
                        <div className="text-xs text-slate-400 mb-2">若 API 價格不準確，可在此手動輸入。清空則恢復自動更新。</div>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                placeholder="輸入自訂價格" 
                                className={styles.input} 
                                value={manualPrice} 
                                onChange={e => setManualPrice(e.target.value)} 
                            />
                            <button onClick={handleSave} className="bg-indigo-600 text-white px-4 rounded-xl font-bold text-sm">儲存</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { onClose(); onEditInfo(); }} className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex flex-col items-center justify-center gap-1">
                            <Edit size={18} /> 修改成本/數量
                        </button>
                        <button onClick={() => { onClose(); onSell(); }} className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex flex-col items-center justify-center gap-1">
                            <DollarSign size={18} /> 賣出資產
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AddDividendModal = ({ userId, groupId, platforms, holdings, people, onClose }: any) => {
    const [platformId, setPlatformId] = useState(platforms[0]?.id || '');
    const [assetSymbol, setAssetSymbol] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [frequency, setFrequency] = useState<'once' | '1' | '3' | '6' | '12'>('once');
    const [addTransaction, setAddTransaction] = useState(true);

    const platform = platforms.find((p:any) => p.id === platformId);
    const platformHoldings = holdings.filter((h:any) => h.platformId === platformId);

    const handleSave = async () => {
        if(!platformId || !amount) return;
        const val = parseFloat(amount);
        const payerId = people.find((p: any) => p.isMe || p.uid === userId)?.id || people[0]?.id;
        
        if (frequency === 'once') {
            // 1. One-time Deposit
            const platformRef = doc(db, getCollectionPath(userId, null, 'platforms'), platformId);
            await updateDoc(platformRef, { balance: (platform.balance || 0) + val });

            // 2. Optional: Add Ledger Transaction
            if(addTransaction) {
                const transData = {
                    totalAmount: val,
                    description: `股利收入 (${assetSymbol || 'General'})`,
                    category: '投資收益', // Assuming this category exists or user is okay with auto-creating/using general
                    type: 'income',
                    date: Timestamp.fromDate(new Date(date)),
                    currency: platform?.currency || 'USD',
                    payers: { [payerId]: val },
                    splitDetails: { [payerId]: val }
                };
                await addDoc(collection(db, getCollectionPath(userId, groupId, 'transactions')), transData);
            }
        } else {
            // Recurring Rule
            const interval = parseInt(frequency);
            const nextDate = new Date(date); // First execution date
            // We add a new recurring rule
            const ruleData = {
                name: `股利: ${assetSymbol || 'General'}`,
                amount: val,
                type: 'income',
                category: '投資收益',
                payerId: payerId,
                frequency: 'custom',
                intervalMonths: interval,
                linkedPlatformId: platformId, // This triggers the auto-deposit logic in App.tsx
                active: true,
                nextDate: Timestamp.fromDate(nextDate),
                payers: { [payerId]: val },
                splitDetails: { [payerId]: val }
            };
            await addDoc(collection(db, getCollectionPath(userId, groupId, 'recurring')), ruleData);
        }
        
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <h3 className="font-bold text-xl mb-4">領取股利 / 配息設定</h3>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>入帳平台</label>
                        <select className={styles.input} value={platformId} onChange={e => setPlatformId(e.target.value)}>
                            {platforms.map((p:any) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>標的 (可選)</label>
                        <select className={styles.input} value={assetSymbol} onChange={e => setAssetSymbol(e.target.value)}>
                            <option value="">-- 選擇資產 --</option>
                            {platformHoldings.map((h:any) => <option key={h.id} value={h.symbol}>{h.symbol}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>金額 ({platform?.currency})</label>
                        <input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                        <label className={styles.label}>入帳日期 (或首次執行日)</label>
                        <input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    
                    <div>
                        <label className={styles.label}>領取週期</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setFrequency('once')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === 'once' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>單次領取</button>
                            <button onClick={() => setFrequency('1')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '1' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每月</button>
                            <button onClick={() => setFrequency('3')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '3' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每季 (3月)</button>
                            <button onClick={() => setFrequency('6')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '6' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每半年</button>
                            <button onClick={() => setFrequency('12')} className={`py-2 px-1 text-xs rounded-lg border ${frequency === '12' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>每年</button>
                        </div>
                    </div>

                    {frequency === 'once' && (
                        <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <input type="checkbox" id="addTrans" checked={addTransaction} onChange={e => setAddTransaction(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                            <label htmlFor="addTrans" className="text-sm font-bold text-indigo-700 cursor-pointer select-none">同步新增至記帳 (收入)</label>
                        </div>
                    )}
                    
                    {frequency !== 'once' && (
                        <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 border border-amber-100 flex gap-2">
                            <Clock size={16} className="shrink-0" />
                            設定為固定收支後，系統將在時間到達時自動增加平台餘額並記錄收入。
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className={styles.btnSecondary}>取消</button>
                        <button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認{frequency === 'once' ? '領取' : '設定'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SellAssetModal = ({ holding, onClose, onConfirm }: any) => {
    const [price, setPrice] = useState(holding.currentPrice.toString()); const [qty, setQty] = useState(holding.quantity.toString());
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">賣出 {holding.symbol}</h3> <div className="space-y-4"> <div><label className={styles.label}>賣出價格</label><input type="number" className={styles.input} value={price} onChange={e => setPrice(e.target.value)} /></div> <div><label className={styles.label}>賣出數量 (持有: {holding.quantity})</label><input type="number" className={styles.input} value={qty} onChange={e => setQty(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={() => onConfirm(parseFloat(price) || 0, parseFloat(qty) || 0)} className={`${styles.btnPrimary} flex-1`}>確認賣出</button></div> </div> </div></div>)
}

export const AddAccountModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || ''); const [balance, setBalance] = useState(editData?.initialBalance?.toString() || '0'); const [currency, setCurrency] = useState(editData?.currency || 'TWD');
    const handleSave = async () => { const col = collection(db, getCollectionPath(userId, null, 'accounts')); if (editData) await updateDoc(doc(col, editData.id), { name, initialBalance: parseFloat(balance) || 0, currency }); else await addDoc(col, { name, initialBalance: parseFloat(balance) || 0, currency }); onClose(); };
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">{editData ? '編輯帳戶' : '新增銀行帳戶'}</h3> <div className="space-y-4"> <div><label className={styles.label}>帳戶名稱</label><input placeholder="例如: 中國信託" className={styles.input} value={name} onChange={e => setName(e.target.value)} /></div> <div className="grid grid-cols-2 gap-3"> <div><label className={styles.label}>初始餘額</label><input type="number" className={styles.input} value={balance} onChange={e => setBalance(e.target.value)} /></div> <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}><option>TWD</option><option>USD</option><option>JPY</option></select></div> </div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div> </div> </div></div>)
}

export const AddCardModal = ({ userId, onClose, editData }: any) => {
    const [name, setName] = useState(editData?.name || ''); const [day, setDay] = useState(editData?.billingDay?.toString() || '1');
    const handleSave = async () => { const col = collection(db, getCollectionPath(userId, null, 'creditCards')); if (editData) await updateDoc(doc(col, editData.id), { name, billingDay: parseInt(day) }); else await addDoc(col, { name, billingDay: parseInt(day) }); onClose(); };
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">{editData ? '編輯信用卡' : '新增信用卡'}</h3> <div className="space-y-4"> <div><label className={styles.label}>卡片名稱</label><input placeholder="例如: 台新 GoGo" className={styles.input} value={name} onChange={e => setName(e.target.value)} /></div> <div><label className={styles.label}>結帳日 (每月幾號)</label><input type="number" min="1" max="31" className={styles.input} value={day} onChange={e => setDay(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div> </div> </div></div>)
}

export const TransferModal = ({ userId, accounts, onClose }: any) => {
    const [fromId, setFromId] = useState(accounts[0]?.id || ''); const [toId, setToId] = useState(accounts[1]?.id || ''); const [amount, setAmount] = useState(''); const [desc, setDesc] = useState('轉帳');
    const handleSave = async () => { if (!fromId || !toId || !amount) return; const val = parseFloat(amount); const batch = [addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), { accountId: fromId, type: 'out', amount: val, date: serverTimestamp(), description: `轉出至 ${accounts.find((a: any) => a.id === toId)?.name} - ${desc}` }), addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), { accountId: toId, type: 'in', amount: val, date: serverTimestamp(), description: `由 ${accounts.find((a: any) => a.id === fromId)?.name} 轉入 - ${desc}` })]; await Promise.all(batch); onClose(); };
    return (<div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">轉帳</h3> <div className="space-y-4"> <div className="flex items-center gap-2"> <div className="flex-1"><label className={styles.label}>轉出帳戶</label><select className={styles.input} value={fromId} onChange={e => setFromId(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} (${a.currentBalance})</option>)}</select></div> <ArrowRightLeft className="text-slate-300 mt-4" /> <div className="flex-1"><label className={styles.label}>轉入帳戶</label><select className={styles.input} value={toId} onChange={e => setToId(e.target.value)}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} (${a.currentBalance})</option>)}</select></div> </div> <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} /></div> <div><label className={styles.label}>備註</label><input className={styles.input} value={desc} onChange={e => setDesc(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認轉帳</button></div> </div> </div></div>)
}

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

export const AIAssistantModal = ({ onClose, contextData }: any) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '嗨！我是您的財富助手。關於您的資產、記帳或投資狀況，有什麼我可以幫您的嗎？' }]);
    const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
    const handleSend = async () => { if (!input.trim() || loading) return; const userMsg = input; setInput(''); setMessages(prev => [...prev, { role: 'user', text: userMsg }]); setLoading(true); try { const prompt = `User Data Context: Net Worth: ${contextData.totalNetWorth}, Holdings: ${JSON.stringify(contextData.holdings.map((h: any) => ({ s: h.symbol, q: h.quantity, c: h.avgCost })))}. Recent Trans: ${JSON.stringify(contextData.transactions.slice(0, 5).map((t: any) => ({ d: t.description, a: t.totalAmount })))}. User Question: ${userMsg}. Answer briefly in Traditional Chinese.`; const reply = await callGemini(prompt); setMessages(prev => [...prev, { role: 'model', text: reply }]); } catch (e) { setMessages(prev => [...prev, { role: 'model', text: '抱歉，AI 暫時無法回應。' }]); } finally { setLoading(false); } };
    return (<div className={styles.overlay}><div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col h-[600px] animate-in zoom-in-95"> <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white rounded-t-2xl"> <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} /> AI 財富助手</h3> <button onClick={onClose}><X size={20} /></button> </div> <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}> {messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}> <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-md' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm'}`}> {m.text} </div> </div>))} {loading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl rounded-bl-none border shadow-sm flex gap-1"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div></div></div>} </div> <div className="p-3 bg-white border-t rounded-b-2xl flex gap-2"> <input className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="輸入問題..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} /> <button onClick={handleSend} disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"><Send size={20} /></button> </div> </div></div>)
}

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
            const commonInstruction = `Parse the input into a JSON array. Infer type (expense/income) and category (from: ${categories.map((c: any) => c.name).join(',')}) based on description.`;

            // Special handling for CSV/File inputs which might be Taiwan Cloud Invoices
            const isCSV = mode === 'file' || (mode === 'text' && textInput.includes(','));

            if (target === 'ledger') {
                if (isCSV) {
                    prompt = `Analyze the following CSV/Text data. It is likely Taiwan Cloud Invoice (電子發票) or accounting records. 
                   Columns often include "交易日期" (Date), "賣方名稱" (Seller), "金額" (Amount), "品名" (Item).
                   Ignore header rows.
                   Extract and Map to JSON array:
                   - description: Seller Name or Item Name
                   - amount: Number (remove currency symbols)
                   - date: YYYY-MM-DD (Convert Taiwan year 113 -> 2024)
                   - type: 'expense' (default) or 'income' (if strictly implies income)
                   - category: Choose closest match from [${categories.map((c: any) => c.name).join(', ')}] based on seller/item. (e.g., 7-11 -> 飲食/Daily, Uber -> 交通)
                   `;
                } else {
                    prompt = `Parse the input into a JSON array of transactions. Fields: date (YYYY-MM-DD, default to today), description, amount (number), type (expense/income), category (choose closest from: ${categories.map((c: any) => c.name).join(',')}).`;
                }
            } else if (target === 'bank') {
                prompt = `Parse the input into a JSON array of bank logs. Fields: date (YYYY-MM-DD), description, amount (number), type (in/out). Note: 'in' is deposit/income, 'out' is withdrawal/expense. Infer type from context if possible.`;
            } else if (target === 'card') {
                prompt = `Parse the input into a JSON array of credit card logs. Fields: date (YYYY-MM-DD), description, amount (number). Note: Amount should be positive number.`;
            }

            const contentToAnalyze = mode === 'image' ? imagePreview! : textInput;
            const res = await callGemini(prompt, contentToAnalyze);
            const json = JSON.parse(res.replace(/```json/g, '').replace(/```/g, ''));

            const items = Array.isArray(json) ? json : [json];
            const now = new Date();
            const processed = items.map((it: any) => {
                // Ensure amount is number
                let amt = it.amount;
                if (typeof amt === 'string') {
                    amt = parseFloat(amt.replace(/,/g, ''));
                }
                it.amount = amt || 0;
                
                // Ensure date is string
                if (!it.date) it.date = new Date().toISOString().split('T')[0];

                const isDup = checkDuplicate(it);
                
                // Anomaly Detection
                const isFuture = new Date(it.date) > now;
                const isLarge = it.amount > 100000;
                const isAnomaly = isFuture || isLarge;

                return {
                    ...it,
                    id: Math.random().toString(36).substr(2, 9),
                    selected: !isDup && !isAnomaly, // Deselect anomalies by default
                    isDuplicate: isDup,
                    isAnomaly: isAnomaly
                };
            });
            setParsedItems(processed);
        } catch (e) {
            console.error(e);
            alert('解析失敗，請重試');
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
