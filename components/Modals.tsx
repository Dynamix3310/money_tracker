
import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, Trash2, Camera, Loader2, ArrowUpRight, ArrowDownRight, Sparkles, Send, CheckCircle, Circle, Link as LinkIcon, Link2, Upload, ArrowRightLeft, Save, RefreshCw, Building2, Wallet, Landmark, Edit, Key, Settings, Repeat, AlertCircle, FileText, Image as ImageIcon, CreditCard, Copy, LogOut, Users, Split, Calculator } from 'lucide-react';
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
          <button onClick={onClose}><X size={20}/></button>
       </div>
       <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.length === 0 && <div className="text-center text-slate-400 py-8">無資料</div>}
          {items.map((item: any) => (
             <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex-1 overflow-hidden">{renderItem(item)}</div>
                 <div className="flex gap-1 ml-2">
                    <button onClick={()=>onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"><Edit size={16}/></button>
                    <button onClick={()=>onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors"><Trash2 size={16}/></button>
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
            <button onClick={onClose}><X size={20}/></button>
         </div>
         <button onClick={onAdd} className="w-full py-2 mb-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm flex justify-center items-center gap-2"><PlusIcon size={16}/> 新增規則</button>
         <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {rules.length === 0 && <div className="text-center text-slate-400 py-8">無固定收支規則</div>}
            {rules.map((r: any) => (
               <div key={r.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                     <div className="font-bold text-slate-800 text-sm flex items-center gap-2">{r.name} <span className={`text-[10px] px-1.5 rounded ${r.active?'bg-emerald-100 text-emerald-600':'bg-slate-200 text-slate-500'}`}>{r.active?'啟用':'停用'}</span></div>
                     <div className="text-xs text-slate-400">下次: {r.nextDate?.seconds ? new Date(r.nextDate.seconds*1000).toLocaleDateString() : 'N/A'} • ${r.amount}</div>
                  </div>
                  <div className="flex gap-1">
                     <button onClick={()=>onEdit(r)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={16}/></button>
                     <button onClick={()=>onDelete(r.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
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
   const [type, setType] = useState<'expense'|'income'>(editData?.type || 'expense');
   const [category, setCategory] = useState(editData?.category || '');
   const [payerId, setPayerId] = useState(editData?.payerId || (people[0]?.id || ''));
   const [nextDate, setNextDate] = useState(editData?.nextDate?.seconds ? new Date(editData.nextDate.seconds*1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
   const [active, setActive] = useState(editData ? editData.active : true);

   const currentCats = categories.filter((c:any) => c.type === type);
   useEffect(() => { if(currentCats.length > 0 && !category) setCategory(currentCats[0].name); }, [type, categories]);

   const handleSave = async () => {
      if(!name || !amount) return;
      const data = { 
         name, amount: parseFloat(amount), type, category, payerId, 
         frequency: 'monthly', active, 
         nextDate: Timestamp.fromDate(new Date(nextDate)) 
      };
      const col = collection(db, getCollectionPath(userId, groupId, 'recurring'));
      if(editData) await updateDoc(doc(col, editData.id), data);
      else await addDoc(col, data);
      onClose();
   };

   return (
      <div className={styles.overlay}><div className={styles.content}>
         <h3 className="font-bold text-xl mb-4">{editData ? '編輯固定收支' : '新增固定收支 (每月)'}</h3>
         <div className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={()=>setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='expense'?'bg-white shadow text-red-500':'text-slate-400'}`}>支出</button><button onClick={()=>setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='income'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>收入</button></div>
            <div><label className={styles.label}>名稱</label><input className={styles.input} value={name} onChange={e=>setName(e.target.value)} placeholder="例如: 房租"/></div>
            <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)}/></div>
            <div className="grid grid-cols-2 gap-3">
               <div><label className={styles.label}>分類</label><select className={styles.input} value={category} onChange={e=>setCategory(e.target.value)}>{currentCats.map((c:any)=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
               <div><label className={styles.label}>成員</label><select className={styles.input} value={payerId} onChange={e=>setPayerId(e.target.value)}>{people.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            </div>
            <div><label className={styles.label}>下次執行日期</label><input type="date" className={styles.input} value={nextDate} onChange={e=>setNextDate(e.target.value)}/></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="active" checked={active} onChange={e=>setActive(e.target.checked)} className="w-4 h-4"/><label htmlFor="active" className="text-sm font-bold text-slate-600">啟用自動記帳</label></div>
            <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
         </div>
      </div></div>
   )
}

// --- Settings (Updated) ---
export const SettingsModal = ({ onClose, onExport, onImport, currentGroupId, categories, onAddCategory, onDeleteCategory, onGroupJoin }: any) => {
  const [activeTab, setActiveTab] = useState('general');
  const [newCat, setNewCat] = useState('');
  const [catType, setCatType] = useState<'expense'|'income'>('expense');
  
  // Keys
  const [finnhubKey, setFinnhubKey] = useState(localStorage.getItem('finnhub_key') || '');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('user_gemini_key') || '');
  
  // Join Group
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
           <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
           <button onClick={() => setActiveTab('general')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'general' ? 'bg-white shadow' : 'text-slate-400'}`}>一般 / 群組</button>
           <button onClick={() => setActiveTab('keys')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'keys' ? 'bg-white shadow' : 'text-slate-400'}`}>API 金鑰</button>
           <button onClick={() => setActiveTab('category')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeTab === 'category' ? 'bg-white shadow' : 'text-slate-400'}`}>分類</button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><Users size={16}/> 多人記帳群組</div>
                <div className="mb-4">
                    <label className={styles.label}>您的邀請碼 (Group ID)</label>
                    <div className="flex gap-2">
                        <div className="bg-white border px-3 py-2 rounded-lg text-sm font-mono flex-1 truncate select-all">{currentGroupId}</div>
                        <button onClick={() => navigator.clipboard.writeText(currentGroupId)} className="bg-indigo-200 text-indigo-700 p-2 rounded-lg"><Copy size={16}/></button>
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

             <button onClick={() => { auth.signOut(); onClose(); }} className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                <LogOut size={18}/> 登出帳號
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
              <div className="flex gap-2 items-end">
                 <div className="flex-1">
                    <label className={styles.label}>分類名稱</label>
                    <input placeholder="例如: 娛樂" className={`${styles.input} py-2 text-sm`} value={newCat} onChange={e => setNewCat(e.target.value)} />
                 </div>
                 <div>
                     <label className={styles.label}>類型</label>
                     <select className="border rounded-lg px-2 py-2 text-sm h-[38px] bg-white" value={catType} onChange={(e:any)=>setCatType(e.target.value)}><option value="expense">支出</option><option value="income">收入</option></select>
                 </div>
                 <button onClick={()=>{onAddCategory(newCat, catType); setNewCat('');}} className="bg-indigo-600 text-white px-3 py-2 h-[38px] rounded-lg font-bold text-sm mb-[1px]">新增</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                 {categories.map((c: Category) => (
                    <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                       <span className="text-sm font-bold flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${c.type==='expense'?'bg-red-400':'bg-emerald-400'}`}></div>{c.name}</span>
                       <button onClick={()=>onDeleteCategory(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

// --- Transactions (Updated for Advanced Split) ---
export const AddTransactionModal = ({ userId, groupId, people, categories, onClose, editData }: any) => {
   const [type, setType] = useState<'expense'|'income'>(editData?.type || 'expense');
   const [amount, setAmount] = useState(editData?.totalAmount?.toString() || '');
   const [description, setDescription] = useState(editData?.description || '');
   const [category, setCategory] = useState(editData?.category || '');
   const [date, setDate] = useState(editData?.date?.seconds ? new Date(editData.date.seconds*1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
   
   // Split & Payer Mode States
   const [payerMode, setPayerMode] = useState<'single'|'multi'>('single');
   const [splitMode, setSplitMode] = useState<'equal'|'custom'>('equal');
   
   // Data holding for advanced modes
   const [mainPayerId, setMainPayerId] = useState(editData ? Object.keys(editData.payers)[0] : (people.find((p:any)=>p.isMe||p.uid===auth.currentUser?.uid)?.id || people[0]?.id || ''));
   const [multiPayers, setMultiPayers] = useState<Record<string, string>>(
      editData && Object.keys(editData.payers).length > 1 
      ? Object.fromEntries(Object.entries(editData.payers).map(([k,v]:any)=>[k, v.toString()]))
      : {}
   );
   
   const [customSplits, setCustomSplits] = useState<Record<string, string>>(
      editData && editData.splitDetails
      ? Object.fromEntries(Object.entries(editData.splitDetails).map(([k,v]:any)=>[k, v.toString()]))
      : {}
   );

   const [loadingAI, setLoadingAI] = useState(false);
   
   // Determine initial modes based on editData
   useEffect(() => {
      if(editData) {
          if(Object.keys(editData.payers).length > 1) setPayerMode('multi');
          
          // Simple heuristic for equal split: variance is low
          const values: number[] = Object.values(editData.splitDetails);
          if(values.length > 0) {
              const min = Math.min(...values);
              const max = Math.max(...values);
              if(max - min > 1) setSplitMode('custom'); // If difference is more than 1 dollar, treat as custom
          }
      }
   }, []);

   const currentCats = categories.filter((c:any) => c.type === type);
   useEffect(() => { if(currentCats.length > 0 && !category) setCategory(currentCats[0].name); }, [type, categories]);

   // Calculations for validation
   const totalAmountVal = parseFloat(amount) || 0;
   
   const payerSum = payerMode === 'single' ? totalAmountVal : Object.values(multiPayers).reduce((acc, val) => acc + (parseFloat(val as string)||0), 0);
   const splitSum = splitMode === 'equal' ? totalAmountVal : Object.values(customSplits).reduce((acc, val) => acc + (parseFloat(val as string)||0), 0);
   
   const isValidPayer = Math.abs(payerSum - totalAmountVal) < 1;
   const isValidSplit = Math.abs(splitSum - totalAmountVal) < 1;

   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; setLoadingAI(true);
      const reader = new FileReader(); 
      reader.onloadend = async () => {
         try {
            const prompt = `Analyze receipt. Extract totalAmount, date(YYYY-MM-DD), description, category from list: ${currentCats.map((c:any)=>c.name).join(',')}. Return JSON.`;
            const resultText = await callGemini(prompt, reader.result as string);
            const json = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, ''));
            if(json.totalAmount) setAmount(json.totalAmount); 
            if(json.description) setDescription(json.description);
            if(json.category) setCategory(json.category); 
            if(json.date) setDate(json.date);
         } catch (err) { alert("AI 辨識失敗"); } finally { setLoadingAI(false); }
      }; 
      reader.readAsDataURL(file);
   };

   const handleSave = async () => {
      if(!amount || !description) return;
      
      if(type === 'expense') {
        if(!isValidPayer) { alert(`付款金額總和 (${payerSum}) 不等於總金額 (${totalAmountVal})`); return; }
        if(!isValidSplit) { alert(`分帳金額總和 (${splitSum}) 不等於總金額 (${totalAmountVal})`); return; }
      }

      const finalAmt = totalAmountVal;
      
      // Construct Payers
      let payers: Record<string, number> = {};
      if(payerMode === 'single') {
          payers[mainPayerId] = finalAmt;
      } else {
          Object.entries(multiPayers).forEach(([pid, val]) => {
             if(parseFloat(val as string) > 0) payers[pid] = parseFloat(val as string);
          });
      }

      // Construct Splits
      let splits: Record<string, number> = {};
      if(splitMode === 'equal') {
          const splitAmt = finalAmt / (people.length||1);
          people.forEach((p:any) => splits[p.id] = splitAmt);
      } else {
          Object.entries(customSplits).forEach(([pid, val]) => {
             if(parseFloat(val as string) > 0) splits[pid] = parseFloat(val as string);
          });
      }

      const data = { 
          totalAmount: finalAmt, 
          description, 
          category, 
          type, 
          payers, 
          splitDetails: splits, 
          date: Timestamp.fromDate(new Date(date)), 
          currency: 'TWD' 
      };
      
      const col = collection(db, getCollectionPath(userId, groupId, 'transactions'));
      if (editData) await updateDoc(doc(col, editData.id), data);
      else await addDoc(col, data);
      onClose();
   };

   return (
      <div className={styles.overlay}>
         <div className={styles.content}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-xl">{editData ? '編輯交易' : '記一筆'}</h3>
               {!editData && <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                  {loadingAI ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>} AI <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loadingAI}/>
               </label>}
            </div>
            <div className="space-y-4">
               <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={()=>setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='expense'?'bg-white shadow text-red-500':'text-slate-400'}`}>支出</button>
                  <button onClick={()=>setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='income'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>收入</button>
               </div>
               
               <div>
                  <label className={styles.label}>金額</label>
                  <input type="number" placeholder="0" className="text-4xl font-bold w-full text-center border-b pb-2 outline-none bg-transparent" value={amount} onChange={e=>setAmount(e.target.value)} />
               </div>

               {/* Payer Section */}
               {type === 'expense' && (
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <div className="flex justify-between items-center mb-2">
                           <label className={styles.label}>付款人 (誰出的錢?)</label>
                           {people.length > 1 && (
                               <div className="flex bg-white border rounded-lg p-0.5">
                                   <button onClick={()=>setPayerMode('single')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode==='single'?'bg-indigo-50 text-indigo-600 font-bold':'text-slate-400'}`}>單人</button>
                                   <button onClick={()=>setPayerMode('multi')} className={`px-2 py-0.5 text-[10px] rounded-md ${payerMode==='multi'?'bg-indigo-50 text-indigo-600 font-bold':'text-slate-400'}`}>多人</button>
                               </div>
                           )}
                       </div>
                       
                       {payerMode === 'single' ? (
                           <select className={styles.input} value={mainPayerId} onChange={e=>setMainPayerId(e.target.value)}>
                               {people.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                       ) : (
                           <div className="space-y-2">
                               {people.map((p:any) => (
                                   <div key={p.id} className="flex items-center gap-2">
                                       <span className="text-sm w-16 truncate">{p.name}</span>
                                       <input 
                                          type="number" 
                                          placeholder="0" 
                                          className="flex-1 p-2 rounded border text-sm" 
                                          value={multiPayers[p.id] || ''} 
                                          onChange={e=>{setMultiPayers({...multiPayers, [p.id]: e.target.value})}}
                                       />
                                   </div>
                               ))}
                               <div className={`text-xs text-right font-bold ${isValidPayer?'text-emerald-500':'text-red-500'}`}>
                                   合計: {Math.round(payerSum)} / 目標: {totalAmountVal}
                               </div>
                           </div>
                       )}
                   </div>
               )}

               {/* Split Section */}
               {type === 'expense' && people.length > 1 && (
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <div className="flex justify-between items-center mb-2">
                           <label className={styles.label}>分帳方式 (誰該出?)</label>
                           <div className="flex bg-white border rounded-lg p-0.5">
                               <button onClick={()=>setSplitMode('equal')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode==='equal'?'bg-indigo-50 text-indigo-600 font-bold':'text-slate-400'}`}>平分</button>
                               <button onClick={()=>setSplitMode('custom')} className={`px-2 py-0.5 text-[10px] rounded-md ${splitMode==='custom'?'bg-indigo-50 text-indigo-600 font-bold':'text-slate-400'}`}>自訂</button>
                           </div>
                       </div>
                       
                       {splitMode === 'equal' ? (
                           <div className="text-center text-xs text-slate-500 py-2 bg-white rounded-lg border border-dashed">
                               每人負擔約 <span className="font-bold text-indigo-600">${(totalAmountVal / people.length).toFixed(1)}</span>
                           </div>
                       ) : (
                           <div className="space-y-2">
                               {people.map((p:any) => (
                                   <div key={p.id} className="flex items-center gap-2">
                                       <span className="text-sm w-16 truncate">{p.name}</span>
                                       <input 
                                          type="number" 
                                          placeholder="0" 
                                          className="flex-1 p-2 rounded border text-sm" 
                                          value={customSplits[p.id] || ''} 
                                          onChange={e=>{setCustomSplits({...customSplits, [p.id]: e.target.value})}}
                                       />
                                   </div>
                               ))}
                               <div className={`text-xs text-right font-bold ${isValidSplit?'text-emerald-500':'text-red-500'}`}>
                                   合計: {Math.round(splitSum)} / 目標: {totalAmountVal}
                               </div>
                           </div>
                       )}
                   </div>
               )}

               <div><label className={styles.label}>項目說明</label><input placeholder="例如: 午餐" className={styles.input} value={description} onChange={e=>setDescription(e.target.value)} /></div>
               
               <div className="grid grid-cols-2 gap-3">
                  <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e=>setDate(e.target.value)} /></div>
                  <div>
                      <label className={styles.label}>分類</label>
                      <select className={styles.input} value={category} onChange={e=>setCategory(e.target.value)}>
                          {currentCats.map((c:any)=><option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                  </div>
               </div>
               
               <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div>
            </div>
         </div>
      </div>
   )
}

export const CardDetailModal = ({ userId, card, cardLogs, transactions, allCardLogs, onClose }: any) => {
   const [showAddLog, setShowAddLog] = useState(false);
   const [editingId, setEditingId] = useState<string|null>(null);
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
   const prevCycle = () => { const d = new Date(viewStart); d.setMonth(d.getMonth()-1); setViewStart(d.toISOString().split('T')[0]); };
   const nextCycle = () => { const d = new Date(viewStart); d.setMonth(d.getMonth()+1); setViewStart(d.toISOString().split('T')[0]); };
   const globalUsedIds = allCardLogs.filter((cl:any) => cl.id !== linkLog?.id && cl.linkedTransactionId).map((cl:any) => cl.linkedTransactionId);
   const availableTrans = transactions.filter((t:any) => !globalUsedIds.includes(t.id)).slice(0, 30);
   const viewLogs = cardLogs.filter((l:any) => {
      if(!l.date?.seconds) return false;
      const d = new Date(l.date.seconds*1000);
      return d >= currentCycleStart && d <= currentCycleEnd;
   }).sort((a:any,b:any) => b.date.seconds - a.date.seconds);
   const handleSaveLog = async () => {
      if(!amt || !desc) return;
      const col = collection(db, getCollectionPath(userId, null, 'cardLogs'));
      const payload = { cardId: card.id, amount: parseFloat(amt), description: desc, date: Timestamp.fromDate(new Date(date)) };
      if (editingId) { await updateDoc(doc(col, editingId), payload); setEditingId(null); } else { await addDoc(col, { ...payload, isReconciled: false }); }
      setAmt(''); setDesc(''); setShowAddLog(false);
   };
   const handleEditClick = (log: any) => { setEditingId(log.id); setAmt(log.amount.toString()); setDesc(log.description); setDate(new Date(log.date.seconds * 1000).toISOString().split('T')[0]); setShowAddLog(true); };
   const handleDeleteClick = async (id: string) => { if (window.confirm('確定要刪除此筆刷卡紀錄嗎？(需二次確認)')) { await deleteDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), id)); if (editingId === id) { setShowAddLog(false); setEditingId(null); } } };
   const linkTrans = async (transId: string) => { if(!linkLog) return; await updateDoc(doc(db, getCollectionPath(userId, null, 'cardLogs'), linkLog.id), { isReconciled: true, linkedTransactionId: transId }); setLinkLog(null); }
   return ( <div className={styles.overlay}> {linkLog ? ( <div className={styles.content}> <div className="flex justify-between items-center mb-4"><h3 className="font-bold">連結記帳資料</h3><button onClick={()=>setLinkLog(null)}><X/></button></div> <div className="space-y-2 max-h-80 overflow-y-auto"> {availableTrans.map((t:any) => ( <div key={t.id} onClick={() => linkTrans(t.id)} className="bg-white p-3 border rounded-xl hover:border-indigo-500 cursor-pointer flex justify-between"> <div> <div className="font-bold text-sm">{t.description}</div> <div className="text-xs text-slate-400 font-bold text-indigo-500">{t.date?.seconds ? new Date(t.date.seconds*1000).toLocaleDateString() : ''}</div> </div> <div className="font-bold">${t.totalAmount}</div> </div> ))} </div> </div> ) : ( <div className={`${styles.content} h-[85vh]`}> <div className="flex justify-between items-center mb-4"> <div><h3 className="font-bold text-xl">{card.name}</h3><div className="text-xs text-slate-500">結帳日: 每月 {card.billingDay} 號</div></div> <button onClick={onClose}><X/></button> </div> <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl mb-4"> <button onClick={prevCycle} className="p-1 hover:bg-white rounded">◀</button> <div className="text-xs font-bold text-slate-600">{currentCycleStart.toLocaleDateString()} ~ {currentCycleEnd.toLocaleDateString()}</div> <button onClick={nextCycle} className="p-1 hover:bg-white rounded">▶</button> </div> <button onClick={() => { setShowAddLog(!showAddLog); setEditingId(null); setAmt(''); setDesc(''); }} className="w-full py-2 mb-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-bold text-sm">{showAddLog && !editingId ? '隱藏新增' : '+ 新增刷卡紀錄'}</button> {showAddLog && ( <div className="bg-slate-50 p-4 rounded-xl border mb-4 space-y-2 animate-in slide-in-from-bottom-4"> <div className="text-xs font-bold text-indigo-500 mb-1">{editingId ? '編輯紀錄' : '新增紀錄'}</div> <div className="flex gap-2"> <div className="flex-1"><label className={styles.label}>日期</label><input type="date" className="w-full p-2 rounded border text-sm" value={date} onChange={e=>setDate(e.target.value)} /></div> <div className="flex-1"><label className={styles.label}>金額</label><input type="number" className="w-full p-2 rounded border text-sm" value={amt} onChange={e=>setAmt(e.target.value)} /></div> </div> <div><label className={styles.label}>說明</label><div className="flex gap-2"><input className="flex-1 p-2 rounded border text-sm" value={desc} onChange={e=>setDesc(e.target.value)} /><button onClick={handleSaveLog} className="bg-indigo-600 text-white px-4 rounded text-xs font-bold">{editingId ? '更新' : '存'}</button></div></div> </div> )} <div className="space-y-2 max-h-[50vh] overflow-y-auto"> {viewLogs.length === 0 && <div className="text-center text-slate-400 py-4">此週期無紀錄</div>} {viewLogs.map((log:any) => { const linkedT = transactions.find((t:any) => t.id === log.linkedTransactionId); return ( <div key={log.id} className={`p-3 rounded-xl border ${log.isReconciled ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200'}`}> <div className="flex justify-between items-center mb-1"> <div className="flex items-center gap-2"> <button onClick={async()=>{await updateDoc(doc(db,getCollectionPath(userId,null,'cardLogs'),log.id),{isReconciled:!log.isReconciled})}}>{log.isReconciled?<CheckCircle size={18} className="text-emerald-500"/>:<Circle size={18} className="text-slate-300"/>}</button> <span className={`text-sm font-bold ${log.isReconciled?'text-slate-400 line-through':''}`}>{log.description}</span> </div> <div className="font-bold font-mono">${log.amount}</div> </div> <div className="flex justify-between items-center pl-7"> <div className="text-[10px] text-slate-400">{new Date(log.date.seconds*1000).toLocaleDateString()}</div> <div className="flex items-center gap-2"> {!log.isReconciled && <button onClick={()=>setLinkLog(log)} className="text-[10px] flex gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold"><LinkIcon size={10}/> 連結</button>} {log.isReconciled && linkedT && <span className="text-[10px] text-emerald-600 flex gap-1 bg-emerald-50 px-2 py-1 rounded"><Link2 size={10}/> {linkedT.description}</span>} <button onClick={() => handleEditClick(log)} className="text-slate-400 hover:text-indigo-600"><Edit size={12}/></button> <button onClick={() => handleDeleteClick(log.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={12}/></button> </div> </div> </div> ) })} </div> </div> )} </div> )
}

export const AddPlatformModal = ({ userId, onClose, editData }: any) => {
   const [name, setName] = useState(editData?.name || '');
   const [type, setType] = useState<'stock'|'crypto'>(editData?.type || 'stock');
   const [initialCash, setInitialCash] = useState(editData?.balance?.toString() || '0');
   const [currency, setCurrency] = useState(editData?.currency || 'USD');
   const handleSave = async () => { const col = collection(db, getCollectionPath(userId, null, 'platforms')); if (editData) { await updateDoc(doc(col, editData.id), { name, type, currency, balance: parseFloat(initialCash) }); } else { await addDoc(col, { name, type, balance: parseFloat(initialCash)||0, currency }); } onClose(); };
   return ( <div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">{editData ? '編輯投資平台' : '新增投資平台'}</h3> <div className="space-y-4"> <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={()=>setType('stock')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='stock'?'bg-white shadow text-blue-600':'text-slate-400'}`}>證券戶</button><button onClick={()=>setType('crypto')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='crypto'?'bg-white shadow text-orange-600':'text-slate-400'}`}>交易所</button></div> <div><label className={styles.label}>平台名稱</label><input placeholder="例如: Firstrade, 幣安" className={styles.input} value={name} onChange={e=>setName(e.target.value)} /></div> <div className="grid grid-cols-2 gap-3"> <div><label className={styles.label}>{editData ? '目前現金餘額' : '初始現金餘額'}</label><input type="number" className={styles.input} value={initialCash} onChange={e=>setInitialCash(e.target.value)} /></div> <div><label className={styles.label}>幣別</label><select className={styles.input} value={currency} onChange={e=>setCurrency(e.target.value)}><option>USD</option><option>TWD</option><option>USDT</option></select></div> </div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div> </div> </div></div> )
}

export const ManagePlatformCashModal = ({ platform, userId, onClose }: any) => {
   const [amount, setAmount] = useState('');
   const [type, setType] = useState<'deposit'|'withdraw'>('deposit');
   const handleSave = async () => { const val = parseFloat(amount); if(!val) return; const newBal = type === 'deposit' ? platform.balance + val : platform.balance - val; await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platform.id), { balance: newBal }); onClose(); }
   return ( <div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">管理 {platform.name} 現金</h3> <div className="bg-slate-50 p-3 rounded-xl mb-4 text-center"> <div className="text-xs text-slate-400">目前餘額</div> <div className="text-2xl font-bold text-slate-800">{platform.balance.toLocaleString()} {platform.currency}</div> </div> <div className="space-y-4"> <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={()=>setType('deposit')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='deposit'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>入金 (Deposit)</button><button onClick={()=>setType('withdraw')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='withdraw'?'bg-white shadow text-red-600':'text-slate-400'}`}>出金 (Withdraw)</button></div> <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>確認</button></div> </div> </div></div> )
}

export const AddAssetModal = ({ userId, platforms, onClose }: any) => {
   const [symbol, setSymbol] = useState(''); const [qty, setQty] = useState(''); const [cost, setCost] = useState(''); const [platformId, setPlatformId] = useState(platforms[0]?.id || ''); const [type, setType] = useState<'stock'|'crypto'>('stock'); const [deductCash, setDeductCash] = useState(true);
   const handleSave = async () => { if(!symbol || !qty || !cost || !platformId) return; const totalCost = parseFloat(cost) * parseFloat(qty); const platform = platforms.find((p:any) => p.id === platformId); await addDoc(collection(db, getCollectionPath(userId, null, 'holdings')), { symbol: symbol.toUpperCase(), quantity: parseFloat(qty), avgCost: parseFloat(cost), currentPrice: parseFloat(cost), currency: platform?.currency || 'USD', type, platformId }); if(deductCash && platform) { await updateDoc(doc(db, getCollectionPath(userId, null, 'platforms'), platformId), { balance: platform.balance - totalCost }); } onClose(); };
   return ( <div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">新增資產</h3> <div className="space-y-4"> <div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={()=>setType('stock')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='stock'?'bg-white shadow text-blue-600':'text-slate-400'}`}>股票</button><button onClick={()=>setType('crypto')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${type==='crypto'?'bg-white shadow text-orange-600':'text-slate-400'}`}>加密貨幣</button></div> <div> <label className={styles.label}>選擇平台</label> <select className={styles.input} value={platformId} onChange={e=>setPlatformId(e.target.value)}> {platforms.map((p:any) => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)} </select> </div> {platformId && <div className="flex items-center gap-2 px-2"> <input type="checkbox" checked={deductCash} onChange={e=>setDeductCash(e.target.checked)} id="dc" className="w-4 h-4 text-indigo-600 rounded"/> <label htmlFor="dc" className="text-xs text-slate-600 font-bold">從平台現金扣款 (總額: {(parseFloat(cost||'0')*parseFloat(qty||'0')).toFixed(2)})</label> </div>} <div className="grid grid-cols-2 gap-3"> <div><label className={styles.label}>代號</label><input placeholder="AAPL" className={styles.input} value={symbol} onChange={e=>setSymbol(e.target.value)} /></div> <div><label className={styles.label}>數量</label><input type="number" className={styles.input} value={qty} onChange={e=>setQty(e.target.value)} /></div> </div> <div><label className={styles.label}>平均單價 (Cost)</label><input type="number" className={styles.input} value={cost} onChange={e=>setCost(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存</button></div> </div> </div></div> )
}

export const EditAssetModal = ({ holding, userId, onClose, onDelete }: any) => {
   const [qty, setQty] = useState(holding.quantity.toString()); const [price, setPrice] = useState(holding.currentPrice.toString()); const [cost, setCost] = useState(holding.avgCost.toString());
   const handleSave = async () => { await updateDoc(doc(db, getCollectionPath(userId, null, 'holdings'), holding.id), { quantity: parseFloat(qty), currentPrice: parseFloat(price), avgCost: parseFloat(cost) }); onClose(); };
   return ( <div className={styles.overlay}><div className={styles.content}> <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">編輯資產: {holding.symbol}</h3><button onClick={()=>onDelete(holding)} className="text-red-500 p-1 bg-red-50 rounded"><Trash2 size={18}/></button></div> <div className="space-y-4"> <div><label className={styles.label}>目前市價 (手動更新)</label><input type="number" className={styles.input} value={price} onChange={e=>setPrice(e.target.value)} /></div> <div className="grid grid-cols-2 gap-3"> <div><label className={styles.label}>持有數量</label><input type="number" className={styles.input} value={qty} onChange={e=>setQty(e.target.value)} /></div> <div><label className={styles.label}>平均成本</label><input type="number" className={styles.input} value={cost} onChange={e=>setCost(e.target.value)} /></div> </div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}>儲存變更</button></div> </div> </div></div> )
}

export const TransferModal = ({ userId, accounts, onClose }: any) => {
  const [fromId, setFromId] = useState(''); const [toId, setToId] = useState(''); const [amount, setAmount] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const handleTransfer = async () => { if(!fromId || !toId || !amount || fromId === toId) return; const val = parseFloat(amount); const timestamp = Timestamp.fromDate(new Date(date)); const col = collection(db, getCollectionPath(userId, null, 'bankLogs')); await addDoc(col, { accountId: fromId, type: 'out', amount: val, description: `轉帳至 ${accounts.find((a:any)=>a.id===toId)?.name}`, date: timestamp }); await addDoc(col, { accountId: toId, type: 'in', amount: val, description: `來自 ${accounts.find((a:any)=>a.id===fromId)?.name} 轉入`, date: timestamp }); onClose(); }
  return ( <div className={styles.overlay}><div className={styles.content}> <h3 className="font-bold text-xl mb-4">銀行轉帳</h3> <div className="space-y-4"> <div className="flex items-center gap-2"> <select className={styles.input} value={fromId} onChange={e=>setFromId(e.target.value)}><option value="">選擇轉出帳戶</option>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select> <ArrowRightLeft className="text-slate-400" /> <select className={styles.input} value={toId} onChange={e=>setToId(e.target.value)}><option value="">選擇轉入帳戶</option>{accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select> </div> <div><label className={styles.label}>金額</label><input type="number" className={styles.input} value={amount} onChange={e=>setAmount(e.target.value)} /></div> <div><label className={styles.label}>日期</label><input type="date" className={styles.input} value={date} onChange={e=>setDate(e.target.value)} /></div> <div className="flex gap-3 pt-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleTransfer} className={`${styles.btnPrimary} flex-1`}>確認轉帳</button></div> </div> </div></div> )
}

export const BankDetailModal = ({ userId, account, onClose, logs }: any) => {
   const [type, setType] = useState<'in'|'out'>('out'); const [amt, setAmt] = useState(''); const [desc, setDesc] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
   const addLog = async () => { if(!amt) return; await addDoc(collection(db, getCollectionPath(userId, null, 'bankLogs')), { accountId: account.id, type, amount: parseFloat(amt), description: desc || (type==='in'?'存款':'提款'), date: Timestamp.fromDate(new Date(date)) }); setAmt(''); setDesc(''); }
   const deleteLog = async (e: React.MouseEvent, id: string) => { e.stopPropagation(); if(window.confirm('確定要刪除此筆銀行交易紀錄嗎？(需二次確認)')) { await deleteDoc(doc(db, getCollectionPath(userId, null, 'bankLogs'), id)); } }
   const groupedLogs: Record<string, any[]> = {};
   logs.sort((a:any,b:any)=>(b.date?.seconds||0)-(a.date?.seconds||0)).forEach((l:any) => { const d = l.date?.seconds ? new Date(l.date.seconds*1000) : new Date(); const key = `${d.getFullYear()}年${d.getMonth()+1}月`; if(!groupedLogs[key]) groupedLogs[key] = []; groupedLogs[key].push(l); });
   return ( <div className={styles.overlay}> <div className={`${styles.content} h-[80vh]`}> <div className="flex justify-between items-center mb-6"> <div><h3 className="font-bold text-xl text-slate-800">{account.name}</h3><div className="text-sm text-slate-500">餘額: {account.currency} {account.currentBalance?.toLocaleString()}</div></div> <button onClick={onClose}><X size={20}/></button> </div> <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6"> <div className="flex gap-2 mb-3"><button onClick={()=>setType('out')} className={`flex-1 py-2 rounded-md text-sm font-bold ${type==='out'?'bg-white shadow text-red-600':'text-slate-400'}`}>支出</button><button onClick={()=>setType('in')} className={`flex-1 py-2 rounded-md text-sm font-bold ${type==='in'?'bg-white shadow text-emerald-600':'text-slate-400'}`}>存入</button></div> <div className="flex gap-2 mb-2"><div className="w-32"><label className={styles.label}>日期</label><input type="date" className="w-full p-2 rounded border text-sm" value={date} onChange={e=>setDate(e.target.value)}/></div><div className="flex-1"><label className={styles.label}>金額</label><input type="number" className="w-full p-2 rounded border text-sm" value={amt} onChange={e=>setAmt(e.target.value)}/></div></div> <div className="flex gap-2 items-end"><div className="flex-1"><label className={styles.label}>說明</label><input className="w-full p-2 rounded border text-sm" value={desc} onChange={e=>setDesc(e.target.value)}/></div><button onClick={addLog} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-xs h-[38px]">新增</button></div> </div> <div className="space-y-4 max-h-[50vh] overflow-y-auto"> {Object.entries(groupedLogs).map(([month, monthLogs]) => ( <div key={month}> <div className="text-xs font-bold text-slate-400 mb-2 bg-slate-50 p-1 rounded w-fit">{month}</div> <div className="space-y-2"> {monthLogs.map((l:any) => ( <div key={l.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100"> <div className="flex items-center gap-3"> <div className={`p-2 rounded-full ${l.type==='in'?'bg-emerald-100 text-emerald-600':'bg-red-100 text-red-600'}`}>{l.type==='in'?<ArrowDownRight size={14}/>:<ArrowUpRight size={14}/>}</div> <div><div className="font-bold text-slate-700 text-sm">{l.description}</div><div className="text-[10px] text-slate-400">{l.date?.seconds ? new Date(l.date.seconds*1000).toLocaleDateString() : ''}</div></div> </div> <div className="flex items-center gap-3"><div className={`font-bold font-mono ${l.type==='in'?'text-emerald-600':'text-red-600'}`}>{l.type==='in'?'+':''}{l.amount}</div><button onClick={(e)=>deleteLog(e, l.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></div> </div> ))} </div> </div> ))} </div> </div> </div> )
}

export const AddAccountModal = ({userId, onClose, editData}:any) => {
   const [name,setName]=useState(editData?.name || ''); const [bal,setBal]=useState(editData?.initialBalance?.toString() || ''); const [cur,setCur]=useState(editData?.currency || 'TWD');
   const handleSave = async () => { const col = collection(db,getCollectionPath(userId,null,'accounts')); if (editData) { await updateDoc(doc(col, editData.id), { name, currency: cur, initialBalance: parseFloat(bal)||0 }); } else { await addDoc(col,{name,initialBalance:parseFloat(bal)||0,currency:cur,currentBalance:parseFloat(bal)||0}); } onClose(); }
   return <div className={styles.overlay}><div className={styles.content}><h3 className="font-bold text-xl mb-4">{editData ? '編輯帳戶' : '新增帳戶'}</h3><div className="space-y-4"><div><label className={styles.label}>帳戶名稱</label><input placeholder="例如: 中信薪轉" className={styles.input} value={name} onChange={e=>setName(e.target.value)}/></div><div className="flex gap-2"><div className="flex-1"><label className={styles.label}>初始餘額</label><input type="number" className={styles.input} value={bal} onChange={e=>setBal(e.target.value)}/></div><div><label className={styles.label}>幣別</label><select className={styles.input} value={cur} onChange={e=>setCur(e.target.value)}><option>TWD</option><option>USD</option><option>JPY</option></select></div></div><div className="flex gap-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={styles.btnPrimary+" flex-1"}>儲存</button></div></div></div></div>
}

export const AddCardModal = ({userId, onClose, editData}:any) => {
   const [name,setName]=useState(editData?.name || ''); const [day,setDay]=useState(editData?.billingDay?.toString() || '1');
   const handleSave = async () => { const col = collection(db,getCollectionPath(userId,null,'creditCards')); if (editData) { await updateDoc(doc(col, editData.id), { name, billingDay: parseInt(day) }); } else { await addDoc(col,{name,billingDay:parseInt(day)}); } onClose(); }
   return <div className={styles.overlay}><div className={styles.content}><h3 className="font-bold text-xl mb-4">{editData ? '編輯信用卡' : '新增信用卡'}</h3><div className="space-y-4"><div><label className={styles.label}>卡片名稱</label><input className={styles.input} value={name} onChange={e=>setName(e.target.value)}/></div><div><label className={styles.label}>結帳日 (1-31)</label><input type="number" className={styles.input} value={day} onChange={e=>setDay(e.target.value)}/></div><div className="flex gap-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={handleSave} className={styles.btnPrimary+" flex-1"}>儲存</button></div></div></div></div>
}
export const SellAssetModal = ({ holding, onClose, onConfirm }: any) => {
  const [p, setP] = useState(holding.currentPrice.toString()); const [q, setQ] = useState(holding.quantity.toString());
  return <div className={styles.overlay}><div className={styles.content}><h3 className="font-bold text-xl mb-4">賣出資產: {holding.symbol}</h3><div className="space-y-4"><div><label className={styles.label}>賣出單價 ({holding.currency})</label><input className={styles.input} type="number" value={p} onChange={e=>setP(e.target.value)} /></div><div><label className={styles.label}>賣出數量 (最大: {holding.quantity})</label><input className={styles.input} type="number" value={q} onChange={e=>setQ(e.target.value)} /></div><div className="text-xs text-slate-500 bg-slate-100 p-2 rounded">賣出後金額將存回平台現金餘額。</div><div className="flex gap-2"><button onClick={onClose} className={styles.btnSecondary}>取消</button><button onClick={()=>onConfirm(parseFloat(p),parseFloat(q))} className={styles.btnPrimary+" flex-1"}>確認賣出</button></div></div></div></div>
}

export const AIAssistantModal = ({ onClose, contextData }: any) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '您好！我是您的 AI 財務管家。' }]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  const handleSend = async () => { if (!input.trim()) return; const userMsg = input; setMessages(prev => [...prev, { role: 'user', text: userMsg }]); setInput(''); setThinking(true); try { const response = await callGemini(`Context: ${JSON.stringify(contextData)}. User: ${userMsg}. Reply in Traditional Chinese.`); setMessages(prev => [...prev, { role: 'model', text: response }]); } catch (error) { setMessages(prev => [...prev, { role: 'model', text: '連線錯誤' }]); } finally { setThinking(false); } };
  return ( <div className="fixed inset-0 bg-black/60 z-[70] flex flex-col justify-end sm:justify-center sm:items-center"> <div className="bg-white w-full sm:max-w-md sm:rounded-2xl h-[85vh] sm:h-[600px] flex flex-col animate-in slide-in-from-bottom-10 shadow-2xl overflow-hidden"> <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white sm:rounded-t-2xl"> <div className="flex items-center gap-2 font-bold"><Sparkles size={18}/> 財務管家 AI</div> <button onClick={onClose}><X size={20}/></button> </div> <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"> {messages.map((msg, i) => ( <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}> <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{msg.text}</div> </div> ))} {thinking && <div className="text-xs text-slate-400 ml-4">思考中...</div>} </div> <div className="p-3 border-t bg-white flex gap-2"> <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="輸入問題..." className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm" /> <button onClick={handleSend} disabled={thinking} className="p-2 bg-indigo-600 text-white rounded-full"><Send size={18} /></button> </div> </div> </div> )
}

export const AIBatchImportModal = ({ userId, groupId, categories, existingTransactions, existingBankLogs, existingCardLogs, accounts, creditCards, people, onClose }: any) => {
   const [text, setText] = useState('');
   const [loading, setLoading] = useState(false);
   const [parsedItems, setParsedItems] = useState<any[]>([]);
   const [mode, setMode] = useState<'input' | 'review'>('input');
   const [importType, setImportType] = useState<'ledger' | 'bank' | 'card'>('ledger');
   const [targetId, setTargetId] = useState('');
   useEffect(() => { if (importType === 'bank' && accounts.length > 0) setTargetId(accounts[0].id); else if (importType === 'card' && creditCards.length > 0) setTargetId(creditCards[0].id); else setTargetId(''); }, [importType, accounts, creditCards]);
   const checkDuplicates = (items: any[]) => { let pool: any[] = []; if (importType === 'ledger') pool = existingTransactions; else if (importType === 'bank') pool = existingBankLogs.filter((l:any) => l.accountId === targetId); else if (importType === 'card') pool = existingCardLogs.filter((l:any) => l.cardId === targetId); return items.map((item, idx) => { const isDup = pool.some((ex: any) => { const exDate = ex.date?.seconds ? new Date(ex.date.seconds * 1000).toISOString().split('T')[0] : ''; const exAmt = ex.amount || ex.totalAmount || 0; const exDesc = ex.description || ''; const dateMatch = exDate === item.date; const amtMatch = Math.abs(exAmt - parseFloat(item.amount)) < 1; const descMatch = exDesc.includes(item.description.substring(0,5)) || item.description.includes(exDesc.substring(0,5)); return dateMatch && amtMatch && descMatch; }); return { ...item, id: idx, checked: !isDup, isDuplicate: isDup }; }); };
   const handleAIParse = async (imageBase64?: string) => { setLoading(true); try { const catList = categories.map((c:any) => c.name).join(', '); const prompt = ` Parse input (text/image) into JSON array. Today: ${new Date().toISOString().split('T')[0]}. Context: ${importType === 'ledger' ? `Ledger (Cats: ${catList})` : importType === 'bank' ? 'Bank Statement' : 'Credit Card Statement'}. Return JSON Array only. Items: - date (YYYY-MM-DD) - amount (number, positive) - description (string) - type ("expense" or "income") ${importType === 'card' ? '(Usually expense)' : ''} ${importType === 'ledger' ? '- category (String from list or "Other")' : ''} Input: ${text || '(Image)'} `; const result = await callGemini(prompt, imageBase64); const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim(); const json = JSON.parse(cleaned); if (Array.isArray(json)) { setParsedItems(checkDuplicates(json)); setMode('review'); } else { alert('AI 無法辨識內容，請重試'); } } catch (e) { console.error(e); alert('解析失敗，請檢查內容或稍後再試'); } finally { setLoading(false); } };
   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => handleAIParse(reader.result as string); reader.readAsDataURL(file); } };
   const handleSave = async () => { const toAdd = parsedItems.filter(i => i.checked); if (toAdd.length === 0) return; setLoading(true); const payerId = people[0]?.id || 'unknown'; try { if (importType === 'ledger') { const col = collection(db, getCollectionPath(userId, groupId, 'transactions')); for (const item of toAdd) { const finalAmt = parseFloat(item.amount); const splitAmt = finalAmt / (people.length || 1); const splits: any = {}; people.forEach((p:any) => splits[p.id] = splitAmt); await addDoc(col, { date: Timestamp.fromDate(new Date(item.date)), totalAmount: finalAmt, description: item.description, category: item.category || 'Other', type: item.type || 'expense', payers: {[payerId]: finalAmt}, splitDetails: splits, currency: 'TWD' }); } } else if (importType === 'bank') { const col = collection(db, getCollectionPath(userId, null, 'bankLogs')); for (const item of toAdd) { await addDoc(col, { accountId: targetId, type: item.type === 'income' ? 'in' : 'out', amount: parseFloat(item.amount), description: item.description, date: Timestamp.fromDate(new Date(item.date)) }); } } else if (importType === 'card') { const col = collection(db, getCollectionPath(userId, null, 'cardLogs')); for (const item of toAdd) { await addDoc(col, { cardId: targetId, amount: parseFloat(item.amount), description: item.description, date: Timestamp.fromDate(new Date(item.date)), isReconciled: false }); } } } catch(e) { console.error(e); alert("儲存失敗"); } setLoading(false); onClose(); };
   return ( <div className={styles.overlay}> <div className={`${styles.content} w-full max-w-2xl`}> <div className="flex justify-between items-center mb-4"> <h3 className="font-bold text-xl flex items-center gap-2"><Sparkles className="text-indigo-500"/> AI 批量匯入</h3> <button onClick={onClose}><X size={20}/></button> </div> {mode === 'input' ? ( <div className="space-y-4"> <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold"> <button onClick={()=>setImportType('ledger')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 ${importType==='ledger'?'bg-white shadow text-indigo-600':'text-slate-400'}`}><FileText size={14}/> 記帳</button> <button onClick={()=>setImportType('bank')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 ${importType==='bank'?'bg-white shadow text-indigo-600':'text-slate-400'}`}><Landmark size={14}/> 銀行</button> <button onClick={()=>setImportType('card')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 ${importType==='card'?'bg-white shadow text-indigo-600':'text-slate-400'}`}><CreditCard size={14}/> 信用卡</button> </div> {importType === 'bank' && ( <select className={styles.input} value={targetId} onChange={e=>setTargetId(e.target.value)}> {accounts.map((a:any) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)} </select> )} {importType === 'card' && ( <select className={styles.input} value={targetId} onChange={e=>setTargetId(e.target.value)}> {creditCards.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)} </select> )} <textarea className={`${styles.input} h-40 resize-none`} placeholder={importType==='ledger' ? "輸入消費內容，例如：午餐 100, 晚餐 250..." : "貼上交易明細，例如：2023/10/01 轉帳 5000..."} value={text} onChange={e => setText(e.target.value)} /> <div className="grid grid-cols-2 gap-4"> <button onClick={() => handleAIParse()} disabled={!text || loading || (importType!=='ledger' && !targetId)} className={styles.btnPrimary}> {loading ? <Loader2 className="animate-spin"/> : <FileText/>} 解析文字 </button> <label className={`${styles.btnSecondary} cursor-pointer flex items-center justify-center gap-2 ${loading || (importType!=='ledger' && !targetId) ? 'opacity-50 cursor-not-allowed' : ''}`}> {loading ? <Loader2 className="animate-spin"/> : <Camera/>} 拍照/上傳 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loading || (importType!=='ledger' && !targetId)}/> </label> </div> </div> ) : ( <div className="space-y-4"> <div className="flex justify-between items-center"> <div className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded"> 匯入至: {importType==='ledger' ? '記帳本' : importType==='bank' ? accounts.find((a:any)=>a.id===targetId)?.name : creditCards.find((c:any)=>c.id===targetId)?.name} </div> </div> <div className="max-h-[50vh] overflow-y-auto space-y-2"> {parsedItems.map((item, idx) => ( <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${item.isDuplicate ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}> <input type="checkbox" checked={item.checked} onChange={e => { const newItems = [...parsedItems]; newItems[idx].checked = e.target.checked; setParsedItems(newItems); }} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" /> <div className="flex-1 grid grid-cols-12 gap-2 items-center"> <input className="col-span-3 bg-transparent text-sm border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none" value={item.date} onChange={e=>{const n=[...parsedItems];n[idx].date=e.target.value;setParsedItems(n)}} type="date"/> <input className="col-span-4 bg-transparent text-sm font-bold border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none" value={item.description} onChange={e=>{const n=[...parsedItems];n[idx].description=e.target.value;setParsedItems(n)}}/> <div className="col-span-3 flex items-center gap-1"> <span className="text-xs text-slate-400">$</span> <input className="w-full bg-transparent text-sm font-mono font-bold border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none" value={item.amount} onChange={e=>{const n=[...parsedItems];n[idx].amount=e.target.value;setParsedItems(n)}}/> </div> {importType === 'ledger' && <div className="col-span-2 text-xs text-slate-500 bg-white px-1 rounded border text-center truncate">{item.category}</div>} {importType !== 'ledger' && <div className={`col-span-2 text-[10px] text-center px-1 rounded font-bold ${item.type==='income'?'bg-emerald-100 text-emerald-600':'bg-red-100 text-red-500'}`}>{item.type||'expense'}</div>} </div> {item.isDuplicate && ( <div className="group relative"> <AlertCircle size={18} className="text-red-500"/> <div className="absolute right-0 bottom-full mb-2 bg-black text-white text-xs p-2 rounded w-32 hidden group-hover:block">疑似重複資料</div> </div> )} </div> ))} </div> <div className="flex gap-3 pt-2"> <button onClick={() => setMode('input')} className={styles.btnSecondary}>重來</button> <button onClick={handleSave} className={`${styles.btnPrimary} flex-1`}> 儲存選取項目 ({parsedItems.filter(i => i.checked).length}) </button> </div> </div> )} </div> </div> );
}

function PlusIcon({size}:{size:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg> }
