// Author: Senior Frontend Engineer
// OS support: Web
// Description: Main Application Component

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auth, db, getCollectionPath, getUserProfilePath } from './services/firebase';
import { 
  onSnapshot, doc, query, collection, where, orderBy, 
  addDoc, updateDoc, deleteDoc, getDoc, increment, 
  serverTimestamp, Timestamp, limit
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Loader2, Lock, BellRing, Wallet, Settings, ChevronDown, 
  LineChart, TrendingUp, Plus, Sparkles, Home, Users
} from 'lucide-react';
import { AuthScreen } from './components/Auth';
import { NetWorthAreaChart, CashFlowBarChart } from './components/Charts';
import { 
  SettingsModal, AddTransactionModal, PortfolioRebalanceModal, AddRecurringModal, AIBatchImportModal,
  AddPlatformModal, ManagePlatformCashModal, AddAssetModal, SellAssetModal, EditAssetPriceModal,
  AddDividendModal, AddAccountModal, AddCardModal, EditAssetModal, TransferModal,
  BankDetailModal, CardDetailModal, AIAssistantModal
} from './components/Modals';
import { PortfolioView, LedgerView, CashView, NavBtn } from './components/Views';
import { fetchExchangeRates, fetchCryptoPrice, fetchStockPrice } from './services/api';
import { ADMIN_EMAILS } from './services/gemini';
import { 
  AssetHolding, Platform, BankAccount, BankTransaction, CreditCardInfo, 
  CreditCardLog, NetWorthHistory, Transaction, Person, Category, 
  RecurringRule, Group, UserProfile 
} from './types';

// Constants
const ALLOWED_CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'CNY'];
const CURRENCY_SYMBOLS: Record<string, string> = { TWD: 'NT$', USD: '$', JPY: '¥', EUR: '€', CNY: '¥' };

const safeDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return `${date.getMonth()+1}/${date.getDate()}`;
};

const convert = (amount: number, from: string, to: string, rates: Record<string, number>) => {
    if (from === to) return amount;
    if (!rates || !rates[from]) return amount;
    return amount / rates[from];
};

const getMonthlyCashFlow = (transactions: Transaction[], baseCurrency: string, rates: any) => {
    const now = new Date();
    const result = [];
    for(let i=5; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = `${d.getMonth()+1}月`;
        const monthlyTrans = transactions.filter(t => {
            if(!t.date) return false;
            const td = new Date(t.date.seconds * 1000);
            return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
        });
        const income = monthlyTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.totalAmount, 0);
        const expense = monthlyTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.totalAmount, 0);
        result.push({ label, income, expense });
    }
    return result;
};

export default function App() {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
   const [userGroups, setUserGroups] = useState<Group[]>([]);
   
   const [baseCurrency, setBaseCurrency] = useState('TWD');
   const [rates, setRates] = useState<Record<string, number>>({});
   
   // Data States
   const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
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
   
   // UI States
   const [activeTab, setActiveTab] = useState('home');
   const [activeModal, setActiveModal] = useState<string | null>(null);
   const [notification, setNotification] = useState<string | null>(null);
   const [selectedItem, setSelectedItem] = useState<any>(null);
   const [confirmData, setConfirmData] = useState<any>(null);
   const [batchConfig, setBatchConfig] = useState<any>(null);
   const [showAI, setShowAI] = useState(false);
   
   const holdingsRef = useRef<AssetHolding[]>([]);

   useEffect(() => { holdingsRef.current = holdings; }, [holdings]);

   useEffect(() => {
      const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
      return () => unsub();
   }, []);

   useEffect(() => {
      if (!user || !db) return;
      const unsubProfile = onSnapshot(doc(db, getUserProfilePath(user.uid)), (docSnap) => {
         if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.currentGroupId) setCurrentGroupId(data.currentGroupId);
         } else { setCurrentGroupId(user.uid); }
      });
      const groupsQuery = query(collection(db, 'artifacts/wealthflow-stable-restore/groups'), where('members', 'array-contains', user.uid));
      const unsubGroups = onSnapshot(groupsQuery, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Group[];
          setUserGroups(list);
      });
      return () => { unsubProfile(); unsubGroups(); };
   }, [user]);

   useEffect(() => { fetchExchangeRates(baseCurrency).then(r => { if (r) setRates(r); }); }, [baseCurrency]);

   useEffect(() => {
      if (!user) return;
      const interval = setInterval(() => { updateAssetPrices(false); }, 15 * 60 * 1000);
      const initialTimer = setTimeout(() => updateAssetPrices(false), 3000);
      return () => { clearInterval(interval); clearTimeout(initialTimer); };
   }, [user]);

   useEffect(() => {
      if (!user || recurringRules.length === 0) return;
      const interval = setInterval(() => { checkRecurringRules(); }, 60 * 60 * 1000); 
      checkRecurringRules(); 
      return () => clearInterval(interval);
   }, [recurringRules, user]);

   const checkRecurringRules = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apiKey = localStorage.getItem('finnhub_key') || undefined;

      for (const rule of recurringRules) {
         if (!rule.active || !rule.nextDate) continue;
         const nextDate = new Date(rule.nextDate.seconds * 1000);
         nextDate.setHours(0, 0, 0, 0);

         if (nextDate.getTime() <= today.getTime()) {
            let transDesc = `${rule.name} (自動)`;
            let shouldUpdateCash = true;
            let transactionAmount = rule.amount;

            if (rule.isDRIP && rule.linkedHoldingId) {
                shouldUpdateCash = false;
                try {
                    const holdingRef = doc(db, getCollectionPath(user!.uid, null, 'holdings'), rule.linkedHoldingId);
                    const holdingSnap = await getDoc(holdingRef);
                    if (holdingSnap.exists()) {
                        const h = holdingSnap.data() as AssetHolding;
                        const heldShares = Math.floor(h.quantity);
                        const dividendPerShare = rule.amount;
                        const totalDividendAmount = heldShares * dividendPerShare;
                        transactionAmount = totalDividendAmount;
                        let price = h.manualPrice;
                        if (!price) {
                            if (h.type === 'crypto') price = await fetchCryptoPrice(h.symbol);
                            else price = await fetchStockPrice(h.symbol, apiKey);
                        }
                        if (!price || price <= 0) price = h.currentPrice;
                        if (price && price > 0) {
                            const newShares = totalDividendAmount / price;
                            const oldTotalCost = h.quantity * h.avgCost;
                            const newTotalCost = oldTotalCost + totalDividendAmount;
                            const newQty = h.quantity + newShares;
                            const newAvgCost = newTotalCost / newQty;
                            await updateDoc(holdingRef, { quantity: newQty, avgCost: newAvgCost, currentPrice: price });
                            transDesc = `股息自動再投入 (DRIP): ${h.symbol} (DPS:${dividendPerShare}, 總額:${totalDividendAmount.toFixed(2)} -> 買入${newShares.toFixed(4)}股 @ ${price})`;
                        } else { transDesc = `股息再投入異常: ${h.symbol} (無法取得股價)`; }
                    }
                } catch (e) { console.error("DRIP Error", e); }
            }
            const newTrans = {
               totalAmount: transactionAmount, description: transDesc, category: rule.category, type: rule.type,
               payers: rule.payers || { [rule.payerId]: transactionAmount },
               splitDetails: rule.splitDetails || { [rule.payerId]: transactionAmount },
               date: Timestamp.fromDate(new Date()), currency: 'TWD', isRecurring: true
            };
            await addDoc(collection(db, getCollectionPath(user!.uid, currentGroupId, 'transactions')), newTrans);
            if (rule.linkedPlatformId && shouldUpdateCash) {
                const platformRef = doc(db, getCollectionPath(user!.uid, null, 'platforms'), rule.linkedPlatformId);
                await updateDoc(platformRef, { balance: increment(rule.amount) });
            }
            const interval = rule.intervalMonths || 1;
            const nextMonth = new Date(nextDate);
            nextMonth.setMonth(nextMonth.getMonth() + interval);
            await updateDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'recurring'), rule.id), { nextDate: Timestamp.fromDate(nextMonth) });
         }
      }
   };

   useEffect(() => {
      if (!user || !db) return;
      const privateCols = ['platforms', 'holdings', 'accounts', 'bankLogs', 'creditCards', 'cardLogs', 'history'];
      const privateUnsubs = privateCols.map(c => onSnapshot(c === 'history' ? query(collection(db, getCollectionPath(user.uid, null, c)), orderBy('date', 'asc')) : collection(db, getCollectionPath(user.uid, null, c)), s => {
         const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
         if (c === 'platforms') setPlatforms(data as Platform[]);
         if (c === 'holdings') setHoldings(data as AssetHolding[]);
         if (c === 'accounts') setAccounts(data as BankAccount[]);
         if (c === 'bankLogs') setBankLogs(data as BankTransaction[]);
         if (c === 'creditCards') setCreditCards(data as CreditCardInfo[]);
         if (c === 'cardLogs') setCardLogs(data as CreditCardLog[]);
         if (c === 'history') setHistoryData(data as NetWorthHistory[]);
      }));
      let groupUnsubs: any[] = [];
      if (currentGroupId) {
         const groupId = currentGroupId;
         const groupCols = ['transactions', 'people', 'categories', 'recurring'];
         groupUnsubs = groupCols.map(c => onSnapshot(collection(db, getCollectionPath(user.uid, groupId, c)), s => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
            if (c === 'transactions') setTransactions(data as Transaction[]);
            if (c === 'people') setPeople(data as Person[]);
            if (c === 'categories') { const cats = data as Category[]; setCategories(cats.sort((a,b) => (a.order || 0) - (b.order || 0))); }
            if (c === 'recurring') setRecurringRules(data as RecurringRule[]);
         }));
      }
      return () => { [...privateUnsubs, ...groupUnsubs].forEach(u => u()); };
   }, [user, currentGroupId]);

   const calculatedAccounts = useMemo(() => accounts.map(acc => {
      const logs = bankLogs.filter(l => l.accountId === acc.id);
      const total = logs.reduce((sum, l) => sum + (l.type === 'in' ? l.amount : -l.amount), 0);
      return { ...acc, currentBalance: (acc.initialBalance || 0) + total };
   }), [accounts, bankLogs]);

   const totalNetWorth = useMemo(() => {
      const investVal = holdings.reduce((acc, h) => {
          const price = h.manualPrice ?? h.currentPrice;
          return acc + convert(h.quantity * price, h.currency, baseCurrency, rates);
      }, 0);
      const platformCashVal = platforms.reduce((acc, p) => acc + convert(p.balance, p.currency, baseCurrency, rates), 0);
      const cashVal = calculatedAccounts.reduce((acc, a) => acc + convert(a.currentBalance || 0, a.currency, baseCurrency, rates), 0);
      return investVal + platformCashVal + cashVal;
   }, [holdings, platforms, calculatedAccounts, baseCurrency, rates]);

   const updateAssetPrices = async (showFeedback = true) => {
      const currentHoldings = holdingsRef.current;
      if (!currentHoldings.length || !user) return;
      let updated = 0;
      let errors: string[] = [];
      const currentKey = localStorage.getItem('finnhub_key') || '';
      for (const h of currentHoldings) {
         let price = null;
         if (h.type === 'crypto') price = await fetchCryptoPrice(h.symbol);
         else { price = await fetchStockPrice(h.symbol, currentKey); if (!price) errors.push(h.symbol); }
         if (price) { await updateDoc(doc(db, getCollectionPath(user.uid, null, 'holdings'), h.id), { currentPrice: price }); updated++; }
      }
      if (showFeedback && errors.length > 0) alert(`更新完成，但部分失敗: ${errors.join(', ')}`);
      else if (showFeedback) alert(`成功更新 ${updated} 筆資產價格`);
   };

   const handleImport = async (data: any) => {
      if (!user || !data) return;
      try { for (const t of data.transactions || []) await addDoc(collection(db, getCollectionPath(user.uid, currentGroupId, 'transactions')), { ...t, date: t.date?.seconds ? Timestamp.fromDate(new Date(t.date.seconds * 1000)) : serverTimestamp() }); alert('匯入成功'); } catch (e) { console.error(e); alert('匯入失敗'); }
   };

   const confirmDelete = (action: () => void, msg: string) => { setConfirmData({ title: '確認刪除', message: msg, action: () => { action(); setConfirmData(null); } }); };
   const exportData = () => {
      const data = { meta: { generated: new Date() }, holdings, accounts, transactions, bankLogs, creditCards, people };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `backup.json`; a.click();
   };
   const exportCSV = () => {
      if (transactions.length === 0) { alert('無交易資料可匯出'); return; }
      const headers = ['Date', 'Description', 'Category', 'Type', 'Total Amount', 'Currency', 'Note'];
      const rows = transactions.map(t => {
         const d = t.date?.seconds ? new Date(t.date.seconds * 1000).toISOString().split('T')[0] : '';
         return [d, t.description, t.category, t.type, t.totalAmount, t.currency, t.isRecurring ? 'Recurring' : ''];
      });
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `transactions_export.csv`; a.click();
   };

   const handleGroupJoin = async (newGroupId: string) => {
      if (!user || !newGroupId) return;
      try {
         const peopleCol = collection(db, getCollectionPath(user.uid, newGroupId, 'people'));
         await addDoc(peopleCol, { name: user.displayName || user.email?.split('@')[0] || 'Member', isMe: false, uid: user.uid, email: user.email });
         const { arrayUnion } = await import('firebase/firestore');
         const groupRef = doc(db, 'artifacts/wealthflow-stable-restore/groups', newGroupId);
         await updateDoc(groupRef, { members: arrayUnion(user.uid) });
         await updateDoc(doc(db, getUserProfilePath(user.uid)), { currentGroupId: newGroupId });
         alert('成功切換群組！'); setActiveModal(null);
      } catch (e) { console.error(e); alert('加入群組失敗，請檢查邀請碼是否正確'); }
   };

   const handleCreateGroup = async (name: string) => {
       if (!user || !name) return;
       try {
           const groupsCol = collection(db, 'artifacts/wealthflow-stable-restore/groups');
           const newGroupRef = await addDoc(groupsCol, { name: name, ownerId: user.uid, createdAt: serverTimestamp(), members: [user.uid] });
           const cats = ['飲食','交通','購物','娛樂','居住'];
           const catCol = collection(db, getCollectionPath(user.uid, newGroupRef.id, 'categories'));
           for(const c of cats) await addDoc(catCol, { name: c, type: 'expense', order: 0 });
           await addDoc(catCol, { name: '薪水', type: 'income', order: 999 });
           const peopleCol = collection(db, getCollectionPath(user.uid, newGroupRef.id, 'people'));
           await addDoc(peopleCol, { name: user.displayName || user.email?.split('@')[0] || 'Me', isMe: true, uid: user.uid, email: user.email });
           await updateDoc(doc(db, getUserProfilePath(user.uid)), { currentGroupId: newGroupRef.id });
           alert('新帳本建立成功！');
       } catch (e) { console.error(e); alert('建立失敗'); }
   };

   const handleSwitchGroup = async (groupId: string) => {
       if (!user || !groupId) return;
       try { await updateDoc(doc(db, getUserProfilePath(user.uid)), { currentGroupId: groupId }); } catch (e) { console.error("Switch failed", e); }
   };

   if (!auth) return <div className="h-screen flex items-center justify-center flex-col gap-4 text-slate-600"><div className="text-xl font-bold">Configuration Error</div><div className="text-sm">Firebase API Key not found.</div></div>;
   if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
   if (!user) return <AuthScreen />;
   if (user.email && !ADMIN_EMAILS.includes(user.email)) {
      return (
         <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4"><div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-in zoom-in-95"><div className="mx-auto bg-red-100 p-4 rounded-full w-fit mb-4 text-red-600"><Lock size={32} /></div><h2 className="text-2xl font-bold text-slate-800 mb-2">權限不足</h2><p className="text-slate-500 mb-6 text-sm leading-relaxed">抱歉，此應用程式目前僅限管理員使用。<br />您的帳號 <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">{user.email}</span> 不在允許名單中。</p><button onClick={() => auth.signOut()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">登出帳號</button></div></div>
      );
   }

   return (
      <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
         {notification && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 fade-in"><BellRing size={16} className="text-indigo-400" /> {notification}</div>}
         <header className="bg-slate-900 text-white pb-2 pt-safe z-20 shadow-md">
            <div className="px-4 pt-4 pb-2 flex justify-between items-center border-b border-slate-800/50"><div className="flex items-center gap-2.5 text-white"><div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30"><Wallet size={18} className="text-white" /></div><span className="font-bold text-lg tracking-tight">WealthFlow</span></div><button onClick={() => setActiveModal('settings')} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"><Settings size={20} /></button></div>
            <div className="px-4 py-2 flex justify-between items-center text-xs text-slate-400 border-b border-slate-800">
               <div className="flex items-center gap-2 w-full">
                  <div className="relative max-w-[60%]"><select value={currentGroupId || ''} onChange={(e) => handleSwitchGroup(e.target.value)} className="appearance-none bg-slate-800 border border-slate-700 text-white py-1 pl-3 pr-8 rounded-lg text-xs font-bold outline-none w-full truncate focus:border-indigo-500 transition-colors">{userGroups.map(g => (<option key={g.id} value={g.id}>{g.name} {g.id === user.uid ? '(個人)' : ''}</option>))}</select><ChevronDown size={12} className="absolute right-2 top-1.5 text-slate-400 pointer-events-none"/></div>
                  <div className="flex-1"></div>
                  <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className="bg-slate-800 rounded px-2 py-1 text-white text-xs outline-none border border-slate-700 focus:border-indigo-500">{ALLOWED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
               </div>
            </div>
            <div className="px-6 py-5"><div className="text-slate-400 text-xs mb-1 flex items-center gap-1">總資產淨值 ({baseCurrency})</div><div className="text-3xl font-bold text-white tracking-tight">{CURRENCY_SYMBOLS[baseCurrency]} {Math.round(totalNetWorth).toLocaleString()}</div></div>
         </header>
         <main className="flex-1 overflow-y-auto pb-24 scroll-smooth bg-slate-50/50">
            <div className="max-w-2xl mx-auto p-4 space-y-6">
               {activeTab === 'home' && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-4">
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64"><h3 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><LineChart size={16} /> 資產趨勢</h3><NetWorthAreaChart data={historyData.map(h => ({ label: safeDate(h.date), value: h.amount })).slice(-14)} /></div>
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64"><h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2"><TrendingUp size={16} /> 收支分析</h3><CashFlowBarChart data={getMonthlyCashFlow(transactions, baseCurrency, rates)} /></div>
                  </div>
               )}
               {activeTab === 'invest' && <PortfolioView holdings={holdings} platforms={platforms} onAddPlatform={() => setActiveModal('add-platform')} onManagePlatform={() => setActiveModal('manage-platforms')} onManageCash={(p: any) => { setSelectedItem(p); setActiveModal('manage-cash') }} onAddAsset={() => setActiveModal('add-asset')} onUpdatePrices={() => updateAssetPrices(true)} onEdit={(h: any) => { setSelectedItem(h); setActiveModal('edit-asset-price') }} onSell={(h: any) => { setSelectedItem(h); setActiveModal('sell') }} onDividend={() => setActiveModal('add-dividend')} onRebalance={() => setActiveModal('rebalance')} baseCurrency={baseCurrency} rates={rates} convert={convert} CURRENCY_SYMBOLS={CURRENCY_SYMBOLS} />}
               {activeTab === 'ledger' && <LedgerView transactions={transactions} categories={categories} people={people} cardLogs={cardLogs} onAdd={() => setActiveModal('add-trans')} onEdit={(t: any) => { setSelectedItem(t); setActiveModal('edit-trans') }} currentGroupId={currentGroupId} userId={user?.uid} onDelete={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'transactions'), id)), '確定刪除此筆記帳資料?')} onManageRecurring={() => setActiveModal('manage-recurring')} onBatchAdd={() => setActiveModal('ai-batch')} />}
               {activeTab === 'cash' && <CashView accounts={calculatedAccounts} creditCards={creditCards} onTransfer={() => setActiveModal('transfer')} onAddAccount={() => setActiveModal('add-account')} onManageAccount={() => setActiveModal('manage-accounts')} onAddCard={() => setActiveModal('add-card')} onManageCard={() => setActiveModal('manage-cards')} onViewAccount={(acc: any) => { setSelectedItem(acc); setActiveModal('view-bank') }} onViewCard={(card: any) => { setSelectedItem(card); setActiveModal('view-card') }} />}
            </div>
         </main>
         <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-40">
            <button onClick={() => setShowAI(true)} className="bg-white text-indigo-600 p-3 rounded-full shadow-lg border"><Sparkles size={20} /></button>
            {activeTab === 'home' && <button onClick={() => setActiveModal('add-trans')} className="bg-indigo-600 text-white p-4 rounded-full shadow-xl"><Plus size={24} /></button>}
         </div>
         <nav className="bg-white/95 backdrop-blur-md border-t fixed bottom-0 w-full pb-safe z-30 shadow">
            <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
               <NavBtn icon={<Home size={20} />} label="總覽" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
               <NavBtn icon={<TrendingUp size={20} />} label="投資" active={activeTab === 'invest'} onClick={() => setActiveTab('invest')} />
               <NavBtn icon={<Users size={20} />} label="記帳" active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} />
               <NavBtn icon={<Wallet size={20} />} label="資金" active={activeTab === 'cash'} onClick={() => setActiveTab('cash')} />
            </div>
         </nav>
         {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} onExport={exportData} onExportCSV={exportCSV} onImport={handleImport} onGroupJoin={handleGroupJoin} onGroupCreate={handleCreateGroup} onGroupSwitch={handleSwitchGroup} currentGroupId={currentGroupId} groups={userGroups} user={user} categories={categories} onAddCategory={(name: string, type: string, budget: number, order: number) => addDoc(collection(db, getCollectionPath(user!.uid, currentGroupId, 'categories')), { name, type, budgetLimit: budget || 0, order: order || 0 })} onUpdateCategory={(id: string, data: any) => updateDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'categories'), id), data)} onDeleteCategory={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'categories'), id)), '確定刪除此分類? (需二次確認)')} />}
         {(activeModal === 'add-trans' || activeModal === 'edit-trans') && <AddTransactionModal userId={user?.uid} groupId={currentGroupId} people={people} categories={categories} onClose={() => { setActiveModal(null); setSelectedItem(null) }} editData={selectedItem} rates={rates} convert={convert} />}
         {activeModal === 'ai-batch' && <AIBatchImportModal initialConfig={batchConfig} userId={user?.uid} groupId={currentGroupId} categories={categories} existingTransactions={transactions} accounts={accounts} creditCards={creditCards} existingBankLogs={bankLogs} existingCardLogs={cardLogs} people={people} onClose={() => { setActiveModal(null); setBatchConfig(null); }} />}
         {activeModal === 'manage-recurring' && <AddRecurringModal userId={user?.uid} groupId={currentGroupId} people={people} categories={categories} onClose={() => setActiveModal(null)} editData={selectedItem} />}
         {activeModal === 'rebalance' && <PortfolioRebalanceModal holdings={holdings} platforms={platforms} rates={rates} baseCurrency={baseCurrency} convert={convert} onClose={() => setActiveModal(null)} />}
         
         {activeModal === 'add-platform' && <AddPlatformModal userId={user?.uid} onClose={() => setActiveModal(null)} />}
         {activeModal === 'manage-cash' && <ManagePlatformCashModal userId={user?.uid} platform={selectedItem} onClose={() => { setActiveModal(null); setSelectedItem(null); }} />}
         {activeModal === 'add-asset' && <AddAssetModal userId={user?.uid} platforms={platforms} onClose={() => setActiveModal(null)} />}
         {activeModal === 'sell' && <SellAssetModal holding={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null); }} />}
         {activeModal === 'edit-asset-price' && <EditAssetPriceModal holding={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null); }} onEditInfo={() => setActiveModal('edit-asset-info')} onSell={() => setActiveModal('sell')} />}
         {activeModal === 'edit-asset-info' && <EditAssetModal holding={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null); }} onDelete={(h:any) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, null, 'holdings'), h.id)), '確定刪除?')} />}
         {activeModal === 'add-dividend' && <AddDividendModal userId={user?.uid} groupId={currentGroupId} platforms={platforms} holdings={holdings} people={people} onClose={() => setActiveModal(null)} />}
         
         {activeModal === 'add-account' && <AddAccountModal userId={user?.uid} onClose={() => setActiveModal(null)} />}
         {activeModal === 'add-card' && <AddCardModal userId={user?.uid} onClose={() => setActiveModal(null)} />}
         {activeModal === 'transfer' && <TransferModal userId={user?.uid} accounts={accounts} onClose={() => setActiveModal(null)} />}
         {activeModal === 'view-bank' && <BankDetailModal userId={user?.uid} account={selectedItem} logs={bankLogs.filter(l => l.accountId === selectedItem?.id)} onClose={() => { setActiveModal(null); setSelectedItem(null); }} onImport={() => { setBatchConfig({ target: 'bank', targetId: selectedItem?.id }); setActiveModal('ai-batch'); }} />}
         {activeModal === 'view-card' && <CardDetailModal userId={user?.uid} card={selectedItem} cardLogs={cardLogs.filter(l => l.cardId === selectedItem?.id)} allCardLogs={cardLogs} transactions={transactions} onClose={() => { setActiveModal(null); setSelectedItem(null); }} />}
         
         {showAI && <AIAssistantModal onClose={() => setShowAI(false)} contextData={{ totalNetWorth, holdings, transactions }} />}

         {/* Confirm Dialog */}
         {confirmData && (
             <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                 <div className="bg-white p-6 rounded-2xl max-w-sm w-full">
                     <h3 className="font-bold text-lg mb-2">{confirmData.title}</h3>
                     <p className="text-slate-500 text-sm mb-4">{confirmData.message}</p>
                     <div className="flex gap-2 justify-end">
                         <button onClick={() => setConfirmData(null)} className="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-100">取消</button>
                         <button onClick={confirmData.action} className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600">確認</button>
                     </div>
                 </div>
             </div>
         )}
      </div>
   );
}
// --- End of App.tsx ---