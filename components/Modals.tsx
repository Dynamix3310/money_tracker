// Author: Senior Frontend Engineer
// OS support: Web
// Description: All Modal components for the application

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Plus, Trash2, Wand2, Upload, Download, 
  HelpCircle, AlertCircle, Calendar, DollarSign, Wallet 
} from 'lucide-react';
import { db, getCollectionPath, getGroupMetaPath } from '../services/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, Timestamp, getDoc 
} from 'firebase/firestore';
import { callGemini } from '../services/gemini';
import { AssetHolding, Platform, BankAccount, CreditCardInfo } from '../types';

// Styles used in fragments
const styles = {
  label: "block text-xs font-bold text-slate-500 mb-1 uppercase",
  input: "w-full px-3 py-2 rounded-lg border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
};

const ModalWrapper = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  </div>
);

// --- Settings & Group Modals ---

export const SettingsModal = ({ 
    onClose, onExport, onExportCSV, onImport, onGroupJoin, onGroupCreate, 
    onGroupSwitch, currentGroupId, groups, user, categories, 
    onAddCategory, onUpdateCategory, onDeleteCategory 
}: any) => {
    const [joinCode, setJoinCode] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState('expense');
    
    return (
        <ModalWrapper title="設定" onClose={onClose}>
            <div className="space-y-6">
                <div>
                    <h4 className="font-bold text-slate-700 mb-2">個人檔案</h4>
                    <div className="bg-slate-50 p-3 rounded-xl border flex items-center gap-3">
                        <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="font-bold text-sm truncate">{user?.displayName || 'User'}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-slate-700 mb-2">群組管理</h4>
                    <div className="flex gap-2 mb-2">
                        {groups.map((g: any) => (
                            <button key={g.id} onClick={() => onGroupSwitch(g.id)} className={`px-3 py-1 text-xs rounded-full border ${currentGroupId === g.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>
                                {g.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 mb-2">
                        <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="輸入群組邀請碼" className={styles.input} />
                        <button onClick={() => onGroupJoin(joinCode)} className="px-4 bg-indigo-600 text-white rounded-lg text-sm font-bold whitespace-nowrap">加入</button>
                    </div>
                    <div className="flex gap-2">
                         <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="新群組名稱" className={styles.input} />
                         <button onClick={() => onGroupCreate(newGroupName)} className="px-4 bg-slate-800 text-white rounded-lg text-sm font-bold whitespace-nowrap">建立</button>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">目前群組 ID (邀請碼): <span className="font-mono select-all bg-slate-100 p-1 rounded">{currentGroupId}</span></div>
                </div>

                <div>
                    <h4 className="font-bold text-slate-700 mb-2">分類管理</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-xl p-2 mb-2">
                        {categories.map((c: any) => (
                             <div key={c.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg group">
                                 <span>{c.name} <span className="text-xs text-slate-400">({c.type === 'expense' ? '支出' : '收入'})</span></span>
                                 <button onClick={() => onDeleteCategory(c.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                             </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="新分類名稱" className={styles.input} />
                        <select value={newCatType} onChange={e => setNewCatType(e.target.value)} className="bg-slate-50 border rounded-lg text-sm px-2">
                            <option value="expense">支出</option>
                            <option value="income">收入</option>
                        </select>
                        <button onClick={() => { if(newCatName) { onAddCategory(newCatName, newCatType); setNewCatName(''); } }} className="px-3 bg-indigo-600 text-white rounded-lg text-sm font-bold"><Plus size={16}/></button>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-slate-700 mb-2">資料備份</h4>
                    <div className="flex gap-2">
                         <button onClick={onExport} className="flex-1 py-2 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50"><Download size={16}/> 備份 JSON</button>
                         <button onClick={onExportCSV} className="flex-1 py-2 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50"><Download size={16}/> 匯出 CSV</button>
                    </div>
                    <label className="mt-2 flex items-center justify-center w-full py-2 border border-dashed rounded-lg text-sm text-slate-500 cursor-pointer hover:bg-slate-50">
                        <Upload size={16} className="mr-2"/> 匯入 JSON
                        <input type="file" className="hidden" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                                 const reader = new FileReader();
                                 reader.onload = (ev) => {
                                     try {
                                         const json = JSON.parse(ev.target?.result as string);
                                         onImport(json);
                                     } catch(err) { alert('檔案格式錯誤'); }
                                 };
                                 reader.readAsText(file);
                             }
                        }} />
                    </label>
                </div>
            </div>
        </ModalWrapper>
    );
};

// --- Transaction Modals ---

export const AddTransactionModal = ({ userId, groupId, people, categories, onClose, editData, rates, convert }: any) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('TWD');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('expense');
    
    // Fragment Logic States
    const [payerMode, setPayerMode] = useState('single');
    const [mainPayerId, setMainPayerId] = useState(userId);
    const [multiPayers, setMultiPayers] = useState<Record<string, number>>({});
    
    const [splitMode, setSplitMode] = useState('equal');
    const [customSplits, setCustomSplits] = useState<Record<string, number>>({});

    useEffect(() => {
        if (editData) {
            setDate(new Date(editData.date.seconds * 1000).toISOString().split('T')[0]);
            setAmount(editData.totalAmount.toString());
            setCurrency(editData.currency);
            setCategory(editData.category);
            setDescription(editData.description);
            setType(editData.type);
            setCustomSplits(editData.splitDetails || {});
            setMultiPayers(editData.payers || {});
            // Infer modes
            if (Object.keys(editData.payers || {}).length > 1) {
                setPayerMode('multi');
            } else {
                setPayerMode('single');
                setMainPayerId(Object.keys(editData.payers || {})[0] || userId);
            }
            // Infer split mode (simplified)
            setSplitMode('custom'); 
        } else if (categories.length > 0) {
            setCategory(categories[0].name);
        }
    }, [editData, categories, userId]);

    const finalAmt = parseFloat(amount) || 0;

    const handlePayerChange = (pid: string, val: string) => setMultiPayers(prev => ({ ...prev, [pid]: parseFloat(val) || 0 }));
    const handleSplitChange = (pid: string, val: string) => setCustomSplits(prev => ({ ...prev, [pid]: parseFloat(val) || 0 }));

    const fillRemainder = (pid: string, record: any, setter: any) => {
        const currentSum = Object.entries(record).filter(([k]) => k !== pid).reduce((sum, [_, v]: any) => sum + v, 0);
        const rem = Math.max(0, finalAmt - currentSum);
        setter((prev: any) => ({ ...prev, [pid]: rem }));
    };

    const setQuickSplit = (mode: string) => {
        setSplitMode(mode);
        if (mode === 'equal') {
            const share = finalAmt / people.length;
            const newSplits: any = {};
            people.forEach((p: any) => newSplits[p.id] = share);
            setCustomSplits(newSplits);
        } else if (mode !== 'custom') {
            // Full amount to one person
            const newSplits: any = {};
            people.forEach((p: any) => newSplits[p.id] = 0);
            newSplits[mode] = finalAmt;
            setCustomSplits(newSplits);
        }
    };

    const handleSubmit = async () => {
        if (!amount || !category) return alert('請填寫完整');
        
        let finalPayers = payerMode === 'single' ? { [mainPayerId]: finalAmt } : multiPayers;
        let finalSplits = customSplits;
        
        if (splitMode === 'equal') {
             const share = finalAmt / people.length;
             finalSplits = {};
             people.forEach((p: any) => finalSplits[p.id] = share);
        }

        const data = {
            date: Timestamp.fromDate(new Date(date)),
            totalAmount: finalAmt,
            currency,
            category,
            description,
            type,
            payers: finalPayers,
            splitDetails: finalSplits,
            lastModified: serverTimestamp()
        };

        if (editData) {
            await updateDoc(doc(db, getCollectionPath(userId, groupId, 'transactions'), editData.id), data);
        } else {
            await addDoc(collection(db, getCollectionPath(userId, groupId, 'transactions')), data);
        }
        onClose();
    };

    return (
        <ModalWrapper title={editData ? "編輯記帳" : "新增記帳"} onClose={onClose}>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setType('expense')} className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${type === 'expense' ? 'bg-white shadow text-red-500' : 'text-slate-400'}`}>支出</button>
                    <button onClick={() => setType('income')} className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${type === 'income' ? 'bg-white shadow text-green-500' : 'text-slate-400'}`}>收入</button>
                </div>
                
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className={styles.label}>金額</label>
                        <input type="number" className={styles.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
                    </div>
                    <div className="w-24">
                        <label className={styles.label}>幣別</label>
                        <select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)}>
                            {['TWD', 'USD', 'JPY', 'EUR', 'CNY'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className={styles.label}>日期</label>
                        <input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className={styles.label}>分類</label>
                        <select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
                            {categories.filter((c: any) => c.type === type).map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Logic Fragment Start */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center mb-2"><label className={styles.label}>{type === 'expense' ? '付款人' : '入帳者 (金流流入)'}</label>{people.length > 1 && (<div className="flex bg-white border rounded-lg p-0.5"><button onClick={() => setPayerMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'single' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>單人</button><button onClick={() => setPayerMode('multi')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode === 'multi' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400'}`}>多人</button></div>)}</div>{payerMode === 'single' ? (<select className={styles.input} value={mainPayerId} onChange={e => setMainPayerId(e.target.value)}>{people.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>) : (<div className="space-y-2">{people.map((p: any) => (<div key={p.id} className="flex items-center gap-2"><span className="text-sm w-16 truncate">{p.name}</span><input type="number" placeholder="0" className="flex-1 p-2 rounded border text-sm" value={multiPayers[p.id] || ''} onChange={e => handlePayerChange(p.id, e.target.value)} />{people.length > 2 && (<button onClick={() => fillRemainder(p.id, multiPayers, setMultiPayers)} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"><Wand2 size={14} /></button>)}</div>))}</div>)}</div>
                
                {people.length > 1 && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2"><label className={styles.label}>{type === 'expense' ? '分帳 (誰消費)' : '歸屬 (誰的收入)'}</label></div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button onClick={() => setQuickSplit('equal')} className={`px-3 py-1 text-xs rounded-full border ${splitMode === 'equal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>平分</button>
                            {people.map((p:any) => {
                                const isFull = splitMode === 'custom' && parseFloat(customSplits[p.id] as any) >= finalAmt - 1;
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
                {/* Logic Fragment End */}

                <button onClick={handleSubmit} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">確認儲存</button>
            </div>
        </ModalWrapper>
    );
};

export const AIBatchImportModal = ({ initialConfig, userId, groupId, onClose }: any) => {
    const [text, setText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleProcess = async () => {
        setIsProcessing(true);
        try {
            const prompt = `Parse the following text into a JSON array of transactions. Text: "${text}". Return JSON only. Format: [{date: "YYYY-MM-DD", amount: number, description: string, category: string}]`;
            const res = await callGemini(prompt);
            // In a real app, parse `res` and insert into DB
            alert('AI 解析完成 (模擬): \n' + res);
            onClose();
        } catch(e) { alert('Failed'); }
        setIsProcessing(false);
    };

    return (
        <ModalWrapper title="AI 批量匯入" onClose={onClose}>
            <textarea className="w-full h-40 p-3 rounded-xl border bg-slate-50" placeholder="貼上交易文字..." value={text} onChange={e => setText(e.target.value)}></textarea>
            <button onClick={handleProcess} disabled={isProcessing} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">{isProcessing ? '分析中...' : '開始分析'}</button>
        </ModalWrapper>
    );
};

// --- Recurring Modals ---

export const ManageRecurringModal = ({ rules, onClose, onAdd, onEdit, onDelete }: any) => (
    <ModalWrapper title="定期收支規則" onClose={onClose}>
        <div className="space-y-3">
            {rules.map((r: any) => (
                <div key={r.id} className="bg-slate-50 p-3 rounded-xl border flex justify-between items-center">
                    <div>
                        <div className="font-bold text-slate-700">{r.name}</div>
                        <div className="text-xs text-slate-400">{r.active ? '啟用中' : '已停用'} • ${r.amount}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(r)} className="p-2 bg-white rounded-lg border text-indigo-600"><Wand2 size={14}/></button>
                        <button onClick={() => onDelete(r.id)} className="p-2 bg-white rounded-lg border text-red-500"><Trash2 size={14}/></button>
                    </div>
                </div>
            ))}
            <button onClick={onAdd} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:bg-slate-50">+ 新增規則</button>
        </div>
    </ModalWrapper>
);

export const AddRecurringModal = ({ userId, groupId, people, categories, onClose, editData }: any) => {
    // Simplified implementation
    const [name, setName] = useState(editData?.name || '');
    const [amount, setAmount] = useState(editData?.amount || '');
    return (
        <ModalWrapper title={editData ? "編輯定期規則" : "新增定期規則"} onClose={onClose}>
            <input className={styles.input} placeholder="名稱" value={name} onChange={e => setName(e.target.value)} />
            <input className={styles.input} type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={() => { /* save logic */ onClose(); }} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">儲存</button>
        </ModalWrapper>
    );
};

// --- Investment Modals ---

export const PortfolioRebalanceModal = ({ onClose }: any) => (
    <ModalWrapper title="投資組合再平衡" onClose={onClose}>
        <div className="text-center text-slate-500 py-8">功能開發中...</div>
    </ModalWrapper>
);

export const AddPlatformModal = ({ userId, onClose }: any) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('stock');
    const handleSave = async () => {
        await addDoc(collection(db, getCollectionPath(userId, null, 'platforms')), { name, type, balance: 0, currency: 'TWD' });
        onClose();
    };
    return (
        <ModalWrapper title="新增交易平台" onClose={onClose}>
            <input className={styles.input} placeholder="平台名稱 (e.g. 富邦, Binance)" value={name} onChange={e => setName(e.target.value)} />
            <select className={styles.input} value={type} onChange={e => setType(e.target.value)}>
                <option value="stock">證券戶</option>
                <option value="crypto">加密貨幣交易所</option>
            </select>
            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">新增</button>
        </ModalWrapper>
    );
};

export const ManageListModal = ({ title, items, renderItem, onClose, onEdit, onDelete }: any) => (
    <ModalWrapper title={title} onClose={onClose}>
        <div className="space-y-2">
            {items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                    {renderItem(item)}
                    <div className="flex gap-2">
                        {onEdit && <button onClick={() => onEdit(item)} className="p-1.5 text-indigo-600 hover:bg-white rounded"><Wand2 size={16}/></button>}
                        {onDelete && <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-500 hover:bg-white rounded"><Trash2 size={16}/></button>}
                    </div>
                </div>
            ))}
        </div>
    </ModalWrapper>
);

export const ManagePlatformCashModal = ({ userId, platform, onClose }: any) => {
    const [amount, setAmount] = useState('');
    const handleUpdate = async () => {
        if(!platform) return;
        await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), { balance: parseFloat(amount) || 0 });
        onClose();
    };
    useEffect(() => { if(platform) setAmount(platform.balance.toString()); }, [platform]);
    return (
        <ModalWrapper title={`管理資金 - ${platform?.name}`} onClose={onClose}>
            <label className={styles.label}>目前餘額 ({platform?.currency})</label>
            <input className={styles.input} type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={handleUpdate} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">更新餘額</button>
        </ModalWrapper>
    );
};

export const AddAssetModal = ({ userId, platforms, onClose }: any) => {
    const [symbol, setSymbol] = useState('');
    const [platformId, setPlatformId] = useState(platforms[0]?.id || '');
    const [qty, setQty] = useState('');
    const [cost, setCost] = useState('');
    
    const handleSave = async () => {
        const p = platforms.find((x: any) => x.id === platformId);
        if (!p) return;
        await addDoc(collection(db, getCollectionPath(userId, null, 'holdings')), {
            platformId, symbol: symbol.toUpperCase(), quantity: parseFloat(qty), avgCost: parseFloat(cost), 
            currency: p.currency, currentPrice: parseFloat(cost), type: p.type
        });
        onClose();
    };
    
    return (
        <ModalWrapper title="新增持倉" onClose={onClose}>
            <input className={styles.input} placeholder="代號 (e.g. 2330, BTC)" value={symbol} onChange={e => setSymbol(e.target.value)} />
            <select className={styles.input} value={platformId} onChange={e => setPlatformId(e.target.value)}>
                {platforms.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}
            </select>
            <input className={styles.input} type="number" placeholder="數量 (股/顆)" value={qty} onChange={e => setQty(e.target.value)} />
            <input className={styles.input} type="number" placeholder="平均成本" value={cost} onChange={e => setCost(e.target.value)} />
            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">新增</button>
        </ModalWrapper>
    );
};

export const SellAssetModal = ({ holding, userId, onClose }: any) => (
     <ModalWrapper title="賣出資產" onClose={onClose}>
         <div className="text-center text-slate-500 py-8">功能即將推出</div>
     </ModalWrapper>
);

export const EditAssetPriceModal = ({ holding, userId, onClose, onEditInfo, onSell }: any) => (
     <ModalWrapper title={`管理 ${holding?.symbol}`} onClose={onClose}>
         <button onClick={onEditInfo} className="w-full py-3 bg-slate-100 rounded-xl font-bold text-slate-700 mb-2">編輯持倉資訊</button>
         <button onClick={onSell} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold">賣出</button>
     </ModalWrapper>
);

export const EditAssetModal = ({ holding, userId, onClose, onDelete }: any) => {
    // Simplified
    return (
        <ModalWrapper title="編輯持倉" onClose={onClose}>
             <button onClick={() => onDelete(holding)} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">刪除此持倉</button>
        </ModalWrapper>
    )
};

export const AddDividendModal = ({ onClose }: any) => (
    <ModalWrapper title="紀錄股息" onClose={onClose}>
        <div className="text-center text-slate-500 py-8">請使用定期規則中的 DRIP 功能</div>
    </ModalWrapper>
);

// --- Cash Modals ---

export const AddAccountModal = ({ userId, onClose }: any) => {
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const handleSave = async () => {
        await addDoc(collection(db, getCollectionPath(userId, null, 'accounts')), { name, initialBalance: parseFloat(balance), currency: 'TWD' });
        onClose();
    };
    return (
        <ModalWrapper title="新增銀行帳戶" onClose={onClose}>
            <input className={styles.input} placeholder="帳戶名稱" value={name} onChange={e => setName(e.target.value)} />
            <input className={styles.input} type="number" placeholder="初始餘額" value={balance} onChange={e => setBalance(e.target.value)} />
            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">新增</button>
        </ModalWrapper>
    );
};

export const AddCardModal = ({ userId, onClose }: any) => {
    const [name, setName] = useState('');
    const [day, setDay] = useState('');
    const handleSave = async () => {
        await addDoc(collection(db, getCollectionPath(userId, null, 'creditCards')), { name, billingDay: parseInt(day) });
        onClose();
    };
    return (
        <ModalWrapper title="新增信用卡" onClose={onClose}>
            <input className={styles.input} placeholder="卡片名稱" value={name} onChange={e => setName(e.target.value)} />
            <input className={styles.input} type="number" placeholder="結帳日 (1-31)" value={day} onChange={e => setDay(e.target.value)} />
            <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">新增</button>
        </ModalWrapper>
    );
};

export const TransferModal = ({ onClose }: any) => (
    <ModalWrapper title="轉帳" onClose={onClose}>
        <div className="text-center text-slate-500 py-8">功能開發中</div>
    </ModalWrapper>
);

export const BankDetailModal = ({ account, logs, onClose, onImport }: any) => (
    <ModalWrapper title={account?.name} onClose={onClose}>
        <div className="flex justify-between items-center mb-4">
            <div className="text-2xl font-bold">${account?.currentBalance?.toLocaleString()}</div>
            <button onClick={onImport} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold">匯入明細</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs?.map((l: any) => (
                 <div key={l.id} className="flex justify-between border-b py-2">
                     <span>{l.description}</span>
                     <span className={l.type === 'in' ? 'text-green-600' : 'text-red-600'}>{l.type === 'in' ? '+' : '-'}{l.amount}</span>
                 </div>
            ))}
        </div>
    </ModalWrapper>
);

export const CardDetailModal = ({ card, onClose }: any) => (
    <ModalWrapper title={card?.name} onClose={onClose}>
        <div className="text-center text-slate-500 py-8">信用卡明細功能開發中</div>
    </ModalWrapper>
);

export const AIAssistantModal = ({ onClose }: any) => (
    <ModalWrapper title="AI 助理" onClose={onClose}>
        <div className="text-center text-slate-500 py-8">我是您的理財助手</div>
    </ModalWrapper>
);

// --- End of components/Modals.tsx ---
