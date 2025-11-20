
import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { Wallet, TrendingUp, Home, Users, LineChart, Settings, Plus, Loader2, Sparkles, Lock } from 'lucide-react';
import { auth, db, getCollectionPath, getUserProfilePath } from './services/firebase';
import { fetchExchangeRates, fetchCryptoPrice, fetchStockPrice } from './services/api';
import { ADMIN_EMAILS } from './services/gemini';
import { ExpensePieChart, CashFlowBarChart, NetWorthAreaChart } from './components/Charts';
import { SettingsModal, SellAssetModal, AddTransactionModal, AddAssetModal, AddAccountModal, AddCardModal, BankDetailModal, AIAssistantModal, CardDetailModal, TransferModal, EditAssetModal, ConfirmActionModal, AddPlatformModal, ManagePlatformCashModal, ManageListModal, AddRecurringModal, ManageRecurringModal, AIBatchImportModal } from './components/Modals';
import { PortfolioView, LedgerView, CashView } from './components/Views';
import { AssetHolding, Platform, BankAccount, BankTransaction, CreditCardInfo, CreditCardLog, Transaction, Person, Category, RecurringRule, NetWorthHistory } from './types';
import { AuthScreen } from './components/Auth';

const CURRENCY_SYMBOLS: Record<string, string> = { 'TWD': 'NT$', 'USD': '$', 'JPY': '¥', 'EUR': '€', 'CNY': '¥' };
const ALLOWED_CURRENCIES = ['TWD', 'USD', 'JPY'];

const convert = (amount: number, from: string, to: string, rates: Record<string, number>) => {
  const rateFrom = rates[from] || 1; 
  const rateTo = rates[to] || 1;
  return (amount / rateFrom) * rateTo;
};

const safeDate = (dateObj: any) => {
  if (dateObj && typeof dateObj === 'object' && dateObj.seconds) {
    return new Date(dateObj.seconds * 1000).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'});
  }
  return '';
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState<'home' | 'invest' | 'ledger' | 'cash'>('home');
  const [baseCurrency, setBaseCurrency] = useState('TWD');
  const [rates, setRates] = useState<Record<string, number>>({ 'TWD': 1, 'USD': 0.032, 'JPY': 4.6 });
  const [showAI, setShowAI] = useState(false);
  
  // Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null); 
  const [confirmData, setConfirmData] = useState<{title:string, message:string, action:()=>void} | null>(null);

  // Data
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [holdings, setHoldings] = useState<AssetHolding[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [bankLogs, setBankLogs] = useState<BankTransaction[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardInfo[]>([]);
  const [cardLogs, setCardLogs] = useState<CreditCardLog[]>([]);
  const [historyData, setHistoryData] = useState<NetWorthHistory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  // Safe Check for Firebase Auth
  useEffect(() => {
    if (!auth) {
       setLoading(false);
       return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Listen to User Profile for Group Changes
  useEffect(() => {
      if (!user || !db) return;
      
      // Subscribe to user profile changes to sync currentGroupId
      const unsubProfile = onSnapshot(doc(db, getUserProfilePath(user.uid)), (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.currentGroupId) {
                  setCurrentGroupId(data.currentGroupId);
              }
          } else {
              // Profile doesn't exist (legacy user?), fall back to UID or create one
              setCurrentGroupId(user.uid);
          }
      });

      return () => unsubProfile();
  }, [user]);

  // Auto Fetch Rates
  useEffect(() => {
    fetchExchangeRates(baseCurrency).then(r => { if(r) setRates(r); });
  }, [baseCurrency]);

  // Auto Refresh Stock Prices (Every 15 mins)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      updateAssetPrices(false);
    }, 15 * 60 * 1000);
    setTimeout(() => updateAssetPrices(false), 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Check Recurring Rules
  useEffect(() => {
    if (!user || recurringRules.length === 0) return;
    checkRecurringRules();
  }, [recurringRules, user]);

  const checkRecurringRules = async () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      for(const rule of recurringRules) {
          if(!rule.active || !rule.nextDate) continue;
          const nextDate = new Date(rule.nextDate.seconds * 1000);
          nextDate.setHours(0,0,0,0);

          if (nextDate.getTime() <= today.getTime()) {
              const newTrans = {
                  totalAmount: rule.amount,
                  description: `${rule.name} (自動)`,
                  category: rule.category,
                  type: rule.type,
                  payers: rule.payers || {[rule.payerId]: rule.amount},
                  splitDetails: rule.splitDetails || {[rule.payerId]: rule.amount}, 
                  date: Timestamp.fromDate(new Date()),
                  currency: 'TWD',
                  isRecurring: true
              };
              await addDoc(collection(db, getCollectionPath(user!.uid, currentGroupId, 'transactions')), newTrans);
              const nextMonth = new Date(nextDate);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              await updateDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'recurring')), {
                  nextDate: Timestamp.fromDate(nextMonth)
              });
          }
      }
  };

  // Sync Data
  useEffect(() => {
    if (!user || !db) return;
    
    // Private Data
    const privateCols = ['platforms', 'holdings', 'accounts', 'bankLogs', 'creditCards', 'cardLogs', 'history'];
    const privateUnsubs = privateCols.map(c => onSnapshot(c==='history'?query(collection(db, getCollectionPath(user.uid, null, c)), orderBy('date','asc')):collection(db, getCollectionPath(user.uid, null, c)), s => {
       const data = s.docs.map(d => ({id: d.id, ...d.data()}));
       if(c==='platforms') setPlatforms(data as Platform[]);
       if(c==='holdings') setHoldings(data as AssetHolding[]);
       if(c==='accounts') setAccounts(data as BankAccount[]);
       if(c==='bankLogs') setBankLogs(data as BankTransaction[]);
       if(c==='creditCards') setCreditCards(data as CreditCardInfo[]);
       if(c==='cardLogs') setCardLogs(data as CreditCardLog[]);
       if(c==='history') setHistoryData(data as NetWorthHistory[]);
    }));

    // Group Data
    let groupUnsubs: any[] = [];
    if (currentGroupId) {
        const groupId = currentGroupId;
        const groupCols = ['transactions', 'people', 'categories', 'recurring'];
        
        groupUnsubs = groupCols.map(c => onSnapshot(collection(db, getCollectionPath(user.uid, groupId, c)), s => {
           const data = s.docs.map(d => ({id: d.id, ...d.data()}));
           if(c==='transactions') setTransactions(data as Transaction[]);
           if(c==='people') { 
             setPeople(data as Person[]); 
           }
           if(c==='categories') { setCategories(data as Category[]); }
           if(c==='recurring') setRecurringRules(data as RecurringRule[]);
        }));
    }

    return () => { [...privateUnsubs, ...groupUnsubs].forEach(u => u()); };
  }, [user, currentGroupId]);

  // Logic
  const calculatedAccounts = useMemo(() => accounts.map(acc => { 
     const logs = bankLogs.filter(l => l.accountId === acc.id); 
     const total = logs.reduce((sum, l) => sum + (l.type === 'in' ? l.amount : -l.amount), 0); 
     return { ...acc, currentBalance: (acc.initialBalance || 0) + total }; 
  }), [accounts, bankLogs]);

  const totalNetWorth = useMemo(() => { 
     const investVal = holdings.reduce((acc, h) => acc + convert(h.quantity * h.currentPrice, h.currency, baseCurrency, rates), 0); 
     const platformCashVal = platforms.reduce((acc, p) => acc + convert(p.balance, p.currency, baseCurrency, rates), 0);
     const cashVal = calculatedAccounts.reduce((acc, a) => acc + convert(a.currentBalance || 0, a.currency, baseCurrency, rates), 0); 
     return investVal + platformCashVal + cashVal; 
  }, [holdings, platforms, calculatedAccounts, baseCurrency, rates]);

  const updateAssetPrices = async (showFeedback = true) => {
     if(!holdings.length || !user) return;
     let updated = 0;
     let errors = [];
     const currentKey = localStorage.getItem('finnhub_key') || ''; 
     for(const h of holdings) {
        let price = null;
        if(h.type === 'crypto') price = await fetchCryptoPrice(h.symbol);
        else { price = await fetchStockPrice(h.symbol, currentKey); if(!price) errors.push(h.symbol); }
        if(price) { await updateDoc(doc(db, getCollectionPath(user.uid, null, 'holdings'), h.id), { currentPrice: price }); updated++; }
     }
     if(showFeedback && errors.length > 0) alert(`更新完成，但部分失敗: ${errors.join(', ')}`);
     else if(showFeedback) alert(`成功更新 ${updated} 筆資產價格`);
  };

  const handleImport = async (data: any) => {
     if(!user || !data) return;
     try {
       for(const t of data.transactions || []) await addDoc(collection(db, getCollectionPath(user.uid, currentGroupId, 'transactions')), {...t, date: t.date?.seconds ? Timestamp.fromDate(new Date(t.date.seconds*1000)) : serverTimestamp()});
       alert('匯入成功');
     } catch(e) { console.error(e); alert('匯入失敗'); }
  };

  const confirmDelete = (action: () => void, msg: string) => {
     setConfirmData({ title: '確認刪除', message: msg, action: () => { action(); setConfirmData(null); } });
  };

  const handleSellAsset = async (price: number, qty: number) => {
     if(!selectedItem || !user) return;
     const item = selectedItem;
     if (qty >= item.quantity) await deleteDoc(doc(db, getCollectionPath(user.uid, null, 'holdings'), item.id));
     else await updateDoc(doc(db, getCollectionPath(user.uid, null, 'holdings'), item.id), { quantity: item.quantity - qty });
     
     const totalReturn = price * qty;
     const platform = platforms.find(p => p.id === item.platformId);
     if(platform) await updateDoc(doc(db, getCollectionPath(user.uid, null, 'platforms'), platform.id), { balance: platform.balance + totalReturn });
     setSelectedItem(null); setActiveModal(null);
  };

  const exportData = () => {
     const data = { meta: { generated: new Date() }, holdings, accounts, transactions, bankLogs, creditCards, people };
     const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a'); a.href = url; a.download = `backup.json`; a.click();
  };

  const exportCSV = () => {
      if(transactions.length === 0) { alert('無交易資料可匯出'); return; }
      const headers = ['Date', 'Description', 'Category', 'Type', 'Total Amount', 'Currency', 'Note'];
      const rows = transactions.map(t => {
          const d = t.date?.seconds ? new Date(t.date.seconds*1000).toISOString().split('T')[0] : '';
          return [d, t.description, t.category, t.type, t.totalAmount, t.currency, t.isRecurring?'Recurring':''];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `transactions_export.csv`; a.click();
  };

  const handleGroupJoin = async (newGroupId: string) => {
      if (!user) return;
      if (!newGroupId) return;

      try {
          // 1. Add user to the target group's people list
          const peopleCol = collection(db, getCollectionPath(user.uid, newGroupId, 'people'));
          // Check if already exists? Firestore allows duplicates, but let's just add
          await addDoc(peopleCol, {
              name: user.displayName || user.email?.split('@')[0] || 'Member',
              isMe: false, // Relative to group owner? No, in this app 'isMe' is UI flag. 
              // Ideally we match UID. 
              uid: user.uid,
              email: user.email
          });

          // 2. Update User Profile to point to this group
          await updateDoc(doc(db, getUserProfilePath(user.uid)), {
              currentGroupId: newGroupId
          });
          
          alert('成功切換群組！');
          setActiveModal(null);
      } catch (e) {
          console.error(e);
          alert('加入群組失敗，請檢查邀請碼是否正確');
      }
  };

  // Main Render Logic
  if (!auth) return <div className="h-screen flex items-center justify-center flex-col gap-4 text-slate-600"><div className="text-xl font-bold">Configuration Error</div><div className="text-sm">Firebase API Key not found in environment variables.</div></div>;
  
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  if (!user) {
      return <AuthScreen />;
  }

  // ACCESS CONTROL BLOCK
  // If the logged-in user is NOT an admin, block the entire application view.
  // This prevents usage of Firebase (Data), Finnhub (Stocks), and Gemini (AI).
  if (user.email && !ADMIN_EMAILS.includes(user.email)) {
      return (
         <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-in zoom-in-95">
               <div className="mx-auto bg-red-100 p-4 rounded-full w-fit mb-4 text-red-600">
                  <Lock size={32} />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 mb-2">權限不足</h2>
               <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                  抱歉，此應用程式目前僅限管理員使用。<br/>
                  您的帳號 <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">{user.email}</span> 不在允許名單中。
               </p>
               <button 
                  onClick={() => auth.signOut()}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
               >
                  登出帳號
               </button>
            </div>
         </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
      <header className="bg-slate-900 text-white pb-2 pt-safe z-20 shadow-md">
         <div className="px-4 py-2 flex justify-between items-center text-xs text-slate-400 border-b border-slate-800">
             <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500">{currentGroupId === user.uid ? '個人帳本' : '群組帳本'}</span>
                <select value={baseCurrency} onChange={e=>setBaseCurrency(e.target.value)} className="bg-slate-800 rounded px-2 py-0.5 text-white text-xs outline-none">
                   {ALLOWED_CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <button onClick={()=>setActiveModal('settings')}><Settings size={14}/></button>
         </div>
         <div className="px-6 py-5"><div className="text-slate-400 text-xs mb-1">總資產淨值 ({baseCurrency})</div><div className="text-3xl font-bold text-white">{CURRENCY_SYMBOLS[baseCurrency]} {Math.round(totalNetWorth).toLocaleString()}</div></div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth bg-slate-50/50">
         <div className="max-w-2xl mx-auto p-4 space-y-6">
            {activeTab === 'home' && (
               <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64"><h3 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><LineChart size={16}/> 資產趨勢</h3><NetWorthAreaChart data={historyData.map(h=>({label:safeDate(h.date),value:h.amount})).slice(-14)}/></div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64"><h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2"><TrendingUp size={16}/> 收支分析</h3><CashFlowBarChart data={getMonthlyCashFlow(transactions, baseCurrency, rates)}/></div>
               </div>
            )}
            {activeTab === 'invest' && <PortfolioView holdings={holdings} platforms={platforms} onAddPlatform={()=>setActiveModal('add-platform')} onManagePlatform={()=>setActiveModal('manage-platforms')} onManageCash={(p:any)=>{setSelectedItem(p);setActiveModal('manage-cash')}} onAddAsset={()=>setActiveModal('add-asset')} onUpdatePrices={() => updateAssetPrices(true)} onEdit={(h:any)=>{setSelectedItem(h);setActiveModal('edit-asset')}} onSell={(h:any)=>{setSelectedItem(h);setActiveModal('sell')}} baseCurrency={baseCurrency} rates={rates} convert={convert} CURRENCY_SYMBOLS={CURRENCY_SYMBOLS}/>}
            {activeTab === 'ledger' && <LedgerView transactions={transactions} categories={categories} people={people} cardLogs={cardLogs} onAdd={()=>setActiveModal('add-trans')} onEdit={(t:any)=>{setSelectedItem(t);setActiveModal('edit-trans')}} currentGroupId={currentGroupId} userId={user?.uid} onDelete={(id:string)=>confirmDelete(async()=>await deleteDoc(doc(db,getCollectionPath(user!.uid,currentGroupId,'transactions'),id)), '確定刪除此筆記帳資料?')} onManageRecurring={()=>setActiveModal('manage-recurring')} onBatchAdd={()=>setActiveModal('ai-batch')} />}
            {activeTab === 'cash' && <CashView accounts={calculatedAccounts} creditCards={creditCards} onTransfer={()=>setActiveModal('transfer')} onAddAccount={()=>setActiveModal('add-account')} onManageAccount={()=>setActiveModal('manage-accounts')} onAddCard={()=>setActiveModal('add-card')} onManageCard={()=>setActiveModal('manage-cards')} onViewAccount={(acc:any)=>{setSelectedItem(acc);setActiveModal('view-bank')}} onViewCard={(card:any)=>{setSelectedItem(card);setActiveModal('view-card')}}/>}
         </div>
      </main>

      <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-40">
         <button onClick={()=>setShowAI(true)} className="bg-white text-indigo-600 p-3 rounded-full shadow-lg border"><Sparkles size={20}/></button>
         {activeTab==='home' && <button onClick={()=>setActiveModal('add-trans')} className="bg-indigo-600 text-white p-4 rounded-full shadow-xl"><Plus size={24}/></button>}
      </div>

      <nav className="bg-white/95 backdrop-blur-md border-t fixed bottom-0 w-full pb-safe z-30 shadow">
         <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
            <NavBtn icon={<Home size={20}/>} label="總覽" active={activeTab==='home'} onClick={()=>setActiveTab('home')}/>
            <NavBtn icon={<TrendingUp size={20}/>} label="投資" active={activeTab==='invest'} onClick={()=>setActiveTab('invest')}/>
            <NavBtn icon={<Users size={20}/>} label="記帳" active={activeTab==='ledger'} onClick={()=>setActiveTab('ledger')}/>
            <NavBtn icon={<Wallet size={20}/>} label="資金" active={activeTab==='cash'} onClick={()=>setActiveTab('cash')}/>
         </div>
      </nav>

      {/* Modals */}
      {activeModal === 'settings' && <SettingsModal onClose={()=>setActiveModal(null)} onExport={exportData} onExportCSV={exportCSV} onImport={handleImport} onGroupJoin={handleGroupJoin} currentGroupId={currentGroupId} categories={categories} onAddCategory={(name:string,type:string, budget:number)=>addDoc(collection(db,getCollectionPath(user!.uid,currentGroupId,'categories')),{name,type, budgetLimit: budget||0})} onDeleteCategory={(id:string)=>confirmDelete(async()=>await deleteDoc(doc(db,getCollectionPath(user!.uid,currentGroupId,'categories'),id)), '確定刪除此分類? (需二次確認)')}/>}
      {(activeModal === 'add-trans' || activeModal === 'edit-trans') && <AddTransactionModal userId={user?.uid} groupId={currentGroupId} people={people} categories={categories} onClose={()=>{setActiveModal(null);setSelectedItem(null)}} editData={selectedItem} />}
      
      {activeModal === 'ai-batch' && <AIBatchImportModal userId={user?.uid} groupId={currentGroupId} categories={categories} existingTransactions={transactions} accounts={accounts} creditCards={creditCards} existingBankLogs={bankLogs} existingCardLogs={cardLogs} people={people} onClose={()=>setActiveModal(null)} />}

      {/* Recurring Modals */}
      {activeModal === 'manage-recurring' && <ManageRecurringModal rules={recurringRules} onClose={()=>setActiveModal(null)} onAdd={()=>setActiveModal('add-recurring')} onEdit={(r:any)=>{setSelectedItem(r);setActiveModal('add-recurring')}} onDelete={(id:string)=>confirmDelete(async()=>await deleteDoc(doc(db,getCollectionPath(user!.uid,currentGroupId,'recurring'),id)), '確定刪除此固定收支規則?')} />}
      {activeModal === 'add-recurring' && <AddRecurringModal userId={user?.uid} groupId={currentGroupId} people={people} categories={categories} onClose={()=>{setActiveModal('manage-recurring');setSelectedItem(null)}} editData={selectedItem} />}

      {/* Investment Modals */}
      {(activeModal === 'add-platform' || activeModal === 'edit-platform') && <AddPlatformModal userId={user?.uid} onClose={()=>{setActiveModal(activeModal==='edit-platform'?'manage-platforms':null);setSelectedItem(null)}} editData={selectedItem} />}
      {activeModal === 'manage-platforms' && <ManageListModal title="管理投資平台" items={platforms} onClose={()=>setActiveModal(null)} renderItem={(p:any)=>(<div><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.currency} • {p.type}</div></div>)} onEdit={(p:any)=>{setSelectedItem(p);setActiveModal('edit-platform')}} onDelete={(id:string)=>confirmDelete(async()=>await deleteDoc(doc(db,getCollectionPath(user!.uid,null,'platforms'),id)), `確定刪除平台? (相關資產需手動整理)`)} />}
      {activeModal === 'manage-cash' && selectedItem && <ManagePlatformCashModal platform={selectedItem} userId={user?.uid} onClose={()=>{setActiveModal(null);setSelectedItem(null)}} />}
      {activeModal === 'add-asset' && <AddAssetModal userId={user?.uid} platforms={platforms} onClose={()=>setActiveModal(null)} />}
      {activeModal === 'edit-asset' && selectedItem && <EditAssetModal holding={selectedItem} userId={user?.uid} onClose={()=>{setActiveModal(null);setSelectedItem(null)}} onDelete={(h:any)=>confirmDelete(async()=>{await deleteDoc(doc(db,getCollectionPath(user!.uid,null,'holdings'),h.id));setActiveModal(null)}, '確定刪除此資產? (需二次確認)')} />}
      {activeModal === 'sell' && selectedItem && <SellAssetModal holding={selectedItem} onClose={()=>{setActiveModal(null);setSelectedItem(null)}} onConfirm={handleSellAsset} />}
      
      {/* Bank & Card Modals */}
      {(activeModal === 'add-account' || activeModal === 'edit-account') && <AddAccountModal userId={user?.uid} onClose={()=>{setActiveModal(activeModal==='edit-account'?'manage-accounts':null);setSelectedItem(null)}} editData={selectedItem} />}
      {activeModal === 'manage-accounts' && <ManageListModal title="管理銀行帳戶" items={accounts} onClose={()=>setActiveModal(null)} renderItem={(a:any)=>(<div><div className="font-bold">{a.name}</div><div className="text-xs text-slate-500">{a.currency}</div></div>)} onEdit={(a:any)=>{setSelectedItem(a);setActiveModal('edit-account')}} onDelete={(id:string)=>confirmDelete(async()=>await deleteDoc(doc(db,getCollectionPath(user!.uid,null,'accounts'),id)), `確定刪除此帳戶? (需二次確認)`)} />}
      
      {(activeModal === 'add-card' || activeModal === 'edit-card') && <AddCardModal userId={user?.uid} onClose={()=>{setActiveModal(activeModal==='edit-card'?'manage-cards':null);setSelectedItem(null)}} editData={selectedItem} />}
      {activeModal === 'manage-cards' && <ManageListModal title="管理信用卡" items={creditCards} onClose={()=>setActiveModal(null)} renderItem={(c:any)=>(<div><div className="font-bold">{c.name}</div><div className="text-xs text-slate-500">結帳日: {c.billingDay}</div></div>)} onEdit={(c:any)=>{setSelectedItem(c);setActiveModal('edit-card')}} onDelete={(id:string)=>confirmDelete(async()=>await deleteDoc(doc(db,getCollectionPath(user!.uid,null,'creditCards'),id)), `確定刪除此信用卡? (需二次確認)`)} />}

      {activeModal === 'transfer' && <TransferModal userId={user?.uid} accounts={calculatedAccounts} onClose={()=>setActiveModal(null)} />}
      {activeModal === 'view-bank' && selectedItem && <BankDetailModal userId={user?.uid} account={selectedItem} logs={bankLogs.filter(l=>l.accountId===selectedItem.id)} onClose={()=>{setActiveModal(null);setSelectedItem(null)}} />}
      {activeModal === 'view-card' && selectedItem && <CardDetailModal userId={user?.uid} card={selectedItem} cardLogs={cardLogs.filter(l=>l.cardId===selectedItem.id)} allCardLogs={cardLogs} transactions={transactions} onClose={()=>{setActiveModal(null);setSelectedItem(null)}} />}
      {showAI && <AIAssistantModal onClose={()=>setShowAI(false)} contextData={{totalNetWorth, holdings, transactions}} />}
      {confirmData && <ConfirmActionModal title={confirmData.title} message={confirmData.message} onConfirm={confirmData.action} onCancel={()=>setConfirmData(null)} />}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: any) {
   return (<button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full ${active?'text-emerald-600 scale-105':'text-slate-400'}`}><div className={`mb-1 ${active?'-translate-y-1':''}`}>{icon}</div><span className="text-[10px] font-bold">{label}</span></button>)
}

function getMonthlyCashFlow(transactions: any[], baseCurrency: string, rates: any) {
    const now = new Date(); const months = [];
    for(let i=5; i>=0; i--) { const d = new Date(now.getFullYear(), now.getMonth()-i, 1); months.push({ label: `${d.getMonth()+1}月`, month: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0 }); }
    transactions.forEach(t => { if(!t.date?.seconds) return; const d = new Date(t.date.seconds*1000); const m = months.find(mo => mo.month===d.getMonth() && mo.year===d.getFullYear()); if(m) { const val = convert(t.totalAmount, t.currency, baseCurrency, rates); if(t.type==='income') m.income+=val; else m.expense+=val; } });
    return months;
}
