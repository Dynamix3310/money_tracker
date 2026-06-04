
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, query, orderBy, getDoc, setDoc, increment, where, limit } from 'firebase/firestore';
import { Wallet, TrendingUp, Home, Users, LineChart, Settings, Plus, Loader2, Sparkles, Lock, BellRing, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { auth, db, getCollectionPath, getUserProfilePath } from './services/firebase';
import { fetchExchangeRates, fetchCryptoPrice, fetchStockPrice, getCachedRates } from './services/api';
import { ADMIN_EMAILS } from './services/gemini';
import { ExpensePieChart, CashFlowBarChart, NetWorthAreaChart } from './components/Charts';
import { SettingsModal, SellAssetModal, AddTransactionModal, AddAssetModal, AddAccountModal, AddCardModal, BankDetailModal, AIAssistantModal, CardDetailModal, TransferModal, EditAssetModal, ConfirmActionModal, AddPlatformModal, ManagePlatformCashModal, ManageListModal, AddRecurringModal, ManageRecurringModal, AIBatchImportModal, EditAssetPriceModal, AddDividendModal, PortfolioRebalanceModal } from './components/Modals';
import { PortfolioView, LedgerView, CashView } from './components/Views';
import { AssetHolding, Platform, BankAccount, BankTransaction, CreditCardInfo, CreditCardLog, Transaction, Person, Category, RecurringRule, NetWorthHistory, Group } from './types';
import { AuthScreen } from './components/Auth';

const CURRENCY_SYMBOLS: Record<string, string> = { 'TWD': 'NT$', 'USD': '$', 'JPY': '¥', 'EUR': '€', 'CNY': '¥' };
const ALLOWED_CURRENCIES = ['TWD', 'USD', 'JPY'];

const THEME_COLORS: any = {
   'indigo': { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
   'blue': { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
   'emerald': { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
   'rose': { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
   'amber': { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
   'violet': { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
};

const convert = (amount: number, from: string, to: string, rates: Record<string, number>) => {
   const rateFrom = rates[from] || 1;
   const rateTo = rates[to] || 1;
   return (amount / rateFrom) * rateTo;
};

const safeDate = (dateObj: any) => {
   if (dateObj && typeof dateObj === 'object' && dateObj.seconds) {
      return new Date(dateObj.seconds * 1000).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
   }
   return '';
};

export default function App() {
   const [user, setUser] = useState<User | null>(null);
   const [cachedUid, setCachedUid] = useState<string | null>(() => localStorage.getItem('cached_uid') || null);
   const [showNetWorth, setShowNetWorth] = useState(localStorage.getItem('show_net_worth') !== 'false');
   const toggleNetWorth = () => { const newVal = !showNetWorth; setShowNetWorth(newVal); localStorage.setItem('show_net_worth', String(newVal)); };
   const [currentGroupId, setCurrentGroupId] = useState<string | null>(() => localStorage.getItem('cached_groupId') || null);
   const [userGroups, setUserGroups] = useState<Group[]>([]);
   const [loading, setLoading] = useState(true);
   const [notification, setNotification] = useState<string | null>(null);
   const [dataReady, setDataReady] = useState(false);

   // App State
   const [activeTab, setActiveTab] = useState<'home' | 'invest' | 'ledger' | 'cash'>('home');
   const [baseCurrency, setBaseCurrency] = useState('TWD');
   const [rates, setRates] = useState<Record<string, number>>(() => getCachedRates('TWD') || { 'TWD': 1, 'USD': 0.032, 'JPY': 4.6 });
   const [showAI, setShowAI] = useState(false);
   const [themeColor, setThemeColor] = useState(localStorage.getItem('theme_color') || 'indigo');
   const [chartsReady, setChartsReady] = useState(false); // Used to defer chart rendering
   
   const activeUid = user?.uid || cachedUid;

   // Apply Theme
   useEffect(() => {
      const colors = THEME_COLORS[themeColor] || THEME_COLORS['indigo'];
      const root = document.documentElement;
      Object.entries(colors).forEach(([shade, value]) => {
         root.style.setProperty(`--color-indigo-${shade}`, value as string);
      });
      localStorage.setItem('theme_color', themeColor);
   }, [themeColor]);

   // Modal States
   const [activeModal, setActiveModal] = useState<string | null>(null);
   const [selectedItem, setSelectedItem] = useState<any>(null);
   const [confirmData, setConfirmData] = useState<{ title: string, message: string, action: () => void } | null>(null);

   // Batch Import Context
   const [batchConfig, setBatchConfig] = useState<{ target: 'ledger' | 'bank' | 'card', targetId?: string } | null>(null);

   // Data Loading Helper
   const loadCache = (key: string, defaultVal: any) => { try { const c = localStorage.getItem(key); return c ? JSON.parse(c) : defaultVal; } catch { return defaultVal; } };

   // Data
   const [platforms, setPlatforms] = useState<Platform[]>(() => loadCache('cached_platforms', []));
   const [holdings, setHoldings] = useState<AssetHolding[]>(() => loadCache('cached_holdings', []));
   const [accounts, setAccounts] = useState<BankAccount[]>(() => loadCache('cached_accounts', []));
   const [bankLogs, setBankLogs] = useState<BankTransaction[]>(() => loadCache('cached_bankLogs', []));
   const [creditCards, setCreditCards] = useState<CreditCardInfo[]>(() => loadCache('cached_creditCards', []));
   const [cardLogs, setCardLogs] = useState<CreditCardLog[]>(() => loadCache('cached_cardLogs', []));
   const [historyData, setHistoryData] = useState<NetWorthHistory[]>(() => loadCache('cached_history', []));
   const [transactions, setTransactions] = useState<Transaction[]>(() => loadCache('cached_transactions', []));
   const [people, setPeople] = useState<Person[]>(() => loadCache('cached_people', []));
   const [categories, setCategories] = useState<Category[]>(() => loadCache('cached_categories', []));
   const [recurringRules, setRecurringRules] = useState<RecurringRule[]>(() => loadCache('cached_recurring', []));

   const holdingsRef = useRef<AssetHolding[]>([]);
   useEffect(() => {
      holdingsRef.current = holdings;
   }, [holdings]);

   useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source');
      if (source === 'shortcut-add') {
         setActiveTab('ledger');
         setActiveModal('add-trans');
         setNotification("已透過捷徑快速啟動：記一筆");
         setTimeout(() => setNotification(null), 4000);
         window.history.replaceState({}, '', '/');
      }

      if (!auth) {
         setLoading(false);
         return;
      }
      const unsubscribe = onAuthStateChanged(auth, async (u) => {
         setUser(u);
         if (u) {
            setCachedUid(u.uid);
            localStorage.setItem('cached_uid', u.uid);
         } else {
            setCachedUid(null);
            localStorage.removeItem('cached_uid');
         }
         setLoading(false);
      });
      return unsubscribe;
   }, []);

   useEffect(() => {
      if (!activeUid || !db) return;
      if (!currentGroupId) {
         setCurrentGroupId(activeUid);
         localStorage.setItem('cached_groupId', activeUid);
      }
      const unsubProfile = onSnapshot(doc(db, getUserProfilePath(activeUid)), (docSnap) => {
         if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.currentGroupId) {
               setCurrentGroupId(data.currentGroupId);
               localStorage.setItem('cached_groupId', data.currentGroupId);
            }
         }
      });

      const groupsQuery = query(
         collection(db, 'artifacts/wealthflow-stable-restore/groups'),
         where('members', 'array-contains', activeUid)
      );

      const unsubGroups = onSnapshot(groupsQuery, (snap) => {
         const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Group[];
         setUserGroups(list);
      });

      return () => { unsubProfile(); unsubGroups(); };
   }, [activeUid]);

   useEffect(() => {
      const cached = getCachedRates(baseCurrency);
      if (cached) setRates(cached);
      fetchExchangeRates(baseCurrency).then(r => { if (r) setRates(r); });
   }, [baseCurrency]);

   useEffect(() => {
      if (!activeUid) return;
      const interval = setInterval(() => { updateAssetPrices(false); }, 15 * 60 * 1000);
      const initialTimer = setTimeout(() => updateAssetPrices(false), 15000);
      return () => { clearInterval(interval); clearTimeout(initialTimer); };
   }, [activeUid]);

   useEffect(() => {
      if (!activeUid || recurringRules.length === 0) return;
      const interval = setInterval(() => { checkRecurringRules(); }, 60 * 60 * 1000);
      checkRecurringRules();
      return () => clearInterval(interval);
   }, [recurringRules, activeUid]);

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
                  const holdingRef = doc(db, getCollectionPath(activeUid, null, 'holdings'), rule.linkedHoldingId);
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

                        await updateDoc(holdingRef, {
                           quantity: newQty,
                           avgCost: newAvgCost,
                           currentPrice: price
                        });
                        transDesc = `股息自動再投入 (DRIP): ${h.symbol} (DPS:${dividendPerShare}, 總額:${totalDividendAmount.toFixed(2)} -> 買入${newShares.toFixed(4)}股 @ ${price})`;
                     }
                  }
               } catch (e) { console.error("DRIP Error", e); }
            }

            const newTrans = {
               totalAmount: transactionAmount, description: transDesc, category: rule.category, type: rule.type,
               payers: rule.payers || { [rule.payerId]: transactionAmount },
               splitDetails: rule.splitDetails || { [rule.payerId]: transactionAmount },
               date: Timestamp.fromDate(new Date()), currency: 'TWD', isRecurring: true
            };
            await addDoc(collection(db, getCollectionPath(activeUid, currentGroupId, 'transactions')), newTrans);

            if (rule.linkedPlatformId && shouldUpdateCash) {
               const platformRef = doc(db, getCollectionPath(activeUid, null, 'platforms'), rule.linkedPlatformId);
               await updateDoc(platformRef, { balance: increment(rule.amount) });
            }

            const interval = rule.intervalMonths || 1;
            const nextMonth = new Date(nextDate);
            nextMonth.setMonth(nextMonth.getMonth() + interval);
            await updateDoc(doc(db, getCollectionPath(activeUid, currentGroupId, 'recurring'), rule.id), { nextDate: Timestamp.fromDate(nextMonth) });
         }
      }
   };

   useEffect(() => {
      if (!activeUid || !db) return;
      const privateCols = ['platforms', 'holdings', 'accounts', 'bankLogs', 'creditCards', 'cardLogs', 'history'];
      const privateUnsubs = privateCols.map(c => {
         let q = collection(db, getCollectionPath(activeUid, null, c)) as any;
         if (c === 'history') q = query(q, orderBy('date', 'desc'), limit(20));
         if (c === 'bankLogs' || c === 'cardLogs') q = query(q, orderBy('date', 'desc'));
         return onSnapshot(q, s => {
         const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
         if (c === 'platforms') { setPlatforms(data as Platform[]); try { localStorage.setItem('cached_platforms', JSON.stringify(data)); } catch {} }
         if (c === 'holdings') { setHoldings(data as AssetHolding[]); try { localStorage.setItem('cached_holdings', JSON.stringify(data)); } catch {} }
         if (c === 'accounts') { setAccounts(data as BankAccount[]); try { localStorage.setItem('cached_accounts', JSON.stringify(data)); } catch {} }
         if (c === 'bankLogs') { setBankLogs(data as BankTransaction[]); try { localStorage.setItem('cached_bankLogs', JSON.stringify(data.slice(0, 100))); } catch {} }
         if (c === 'creditCards') { setCreditCards(data as CreditCardInfo[]); try { localStorage.setItem('cached_creditCards', JSON.stringify(data)); } catch {} }
         if (c === 'cardLogs') { setCardLogs(data as CreditCardLog[]); try { localStorage.setItem('cached_cardLogs', JSON.stringify(data.slice(0, 100))); } catch {} }
         if (c === 'history') { setHistoryData((data as NetWorthHistory[]).reverse()); try { localStorage.setItem('cached_history', JSON.stringify(data.slice(-30))); } catch {} }
         });
      });
      return () => { privateUnsubs.forEach(u => u()); };
   }, [activeUid]);

   useEffect(() => {
      if (!activeUid || !db || !currentGroupId) return;
      setDataReady(false);
      let firstResponse = false;

      const groupCols = ['transactions', 'people', 'categories', 'recurring'];
      const groupUnsubs = groupCols.map(c => onSnapshot(c === 'transactions' ? query(collection(db, getCollectionPath(activeUid, currentGroupId, c)), orderBy('date', 'desc'), limit(500)) : collection(db, getCollectionPath(activeUid, currentGroupId, c)), s => {
         const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
         if (c === 'transactions') { setTransactions(data as Transaction[]); try { localStorage.setItem('cached_transactions', JSON.stringify(data.slice(0, 200))); } catch {} }
         if (c === 'people') { setPeople(data as Person[]); try { localStorage.setItem('cached_people', JSON.stringify(data)); } catch {} }
         if (c === 'categories') { setCategories(data as Category[]); try { localStorage.setItem('cached_categories', JSON.stringify(data)); } catch {} }
         if (c === 'recurring') { setRecurringRules(data as RecurringRule[]); try { localStorage.setItem('cached_recurring', JSON.stringify(data)); } catch {} }
         if (!firstResponse) { firstResponse = true; setDataReady(true); }
      }));
      return () => { groupUnsubs.forEach(u => u()); };
   }, [activeUid, currentGroupId]);

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

   useEffect(() => {
      if (!activeUid || totalNetWorth === 0) return;
      const today = new Date().toISOString().split('T')[0];
      const lastEntry = historyData.length > 0 ? historyData[historyData.length - 1] : null;
      const lastDate = lastEntry?.date?.seconds ? new Date(lastEntry.date.seconds * 1000).toISOString().split('T')[0] : '';
      if (lastDate !== today) {
         addDoc(collection(db, getCollectionPath(activeUid, null, 'history')), {
            date: serverTimestamp(),
            amount: totalNetWorth,
            currency: baseCurrency
         });
      }
   }, [activeUid, totalNetWorth, historyData, baseCurrency]);

   const historyChartData = useMemo(() => historyData.map(h => ({ label: safeDate(h.date), value: h.amount })).slice(-14), [historyData]);
   const cashFlowChartData = useMemo(() => getMonthlyCashFlow(transactions, baseCurrency, rates), [transactions, baseCurrency, rates]);

   const updateAssetPrices = async (showFeedback = true) => {
      const currentHoldings = holdingsRef.current;
      if (!currentHoldings.length || !activeUid) return;
      let updated = 0;
      let errors: string[] = [];
      const currentKey = localStorage.getItem('finnhub_key') || '';
      const BATCH_SIZE = 5;
      for (let i = 0; i < currentHoldings.length; i += BATCH_SIZE) {
         const batch = currentHoldings.slice(i, i + BATCH_SIZE);
         await Promise.allSettled(batch.map(async (h) => {
            let price = null;
            if (h.type === 'crypto') price = await fetchCryptoPrice(h.symbol);
            else { price = await fetchStockPrice(h.symbol, currentKey); if (!price) errors.push(h.symbol); }
            if (price) {
               await updateDoc(doc(db, getCollectionPath(activeUid, null, 'holdings'), h.id), { currentPrice: price });
               updated++;
            }
         }));
      }
      if (showFeedback && errors.length > 0) alert(`更新完成，但部分失敗: ${errors.join(', ')}`);
      else if (showFeedback) alert(`成功更新 ${updated} 筆資產價格`);
   };

   const handleImport = async (data: any) => {
      if (!activeUid || !data) return;
      try {
         for (const t of data.transactions || []) await addDoc(collection(db, getCollectionPath(activeUid, currentGroupId, 'transactions')), { ...t, date: t.date?.seconds ? Timestamp.fromDate(new Date(t.date.seconds * 1000)) : serverTimestamp() });
         alert('匯入成功');
      } catch (e) { console.error(e); alert('匯入失敗'); }
   };

   const confirmDelete = (action: () => void, msg: string) => {
      setConfirmData({ title: '確認刪除', message: msg, action: () => { action(); setConfirmData(null); } });
   };

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
         const cats = ['飲食', '交通', '購物', '娛樂', '居住'];
         const catCol = collection(db, getCollectionPath(user.uid, newGroupRef.id, 'categories'));
         for (const c of cats) await addDoc(catCol, { name: c, type: 'expense' });
         await addDoc(catCol, { name: '薪水', type: 'income' });
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

   useEffect(() => {
      if (dataReady) {
         const t = setTimeout(() => setChartsReady(true), 150);
         return () => clearTimeout(t);
      } else {
         setChartsReady(false);
      }
   }, [dataReady]);

   if (!auth) return <div className="h-screen flex items-center justify-center flex-col gap-4 text-slate-600"><div className="text-xl font-bold">Configuration Error</div><div className="text-sm">Firebase API Key not found.</div></div>;
   if (loading && !activeUid) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
   if (!activeUid) return <AuthScreen />;
   if (user && user.email && !ADMIN_EMAILS.includes(user.email)) {
      return (
         <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4"><div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-in zoom-in-95"><div className="mx-auto bg-red-100 p-4 rounded-full w-fit mb-4 text-red-600"><Lock size={32} /></div><h2 className="text-2xl font-bold text-slate-800 mb-2">權限不足</h2><p className="text-slate-500 mb-6 text-sm leading-relaxed">抱歉，此應用程式目前僅限管理員使用。<br />您的帳號 <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">{user.email}</span> 不在允許名單中。</p><button onClick={() => auth.signOut()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">登出帳號</button></div></div>
      );
   }

   return (
      <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
         {notification && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 fade-in"><BellRing size={16} className="text-indigo-400" /> {notification}</div>}
         <header className="bg-slate-900 text-white pb-3 pt-safe z-20 shadow-md relative">
            <div className="px-4 py-3 flex justify-between items-center gap-3">
               <div className="flex items-center gap-2 text-white">
                  <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30"><Wallet size={16} className="text-white" /></div>
               </div>

               <div className="relative flex-1 max-w-[180px]">
                  <select value={currentGroupId || ''} onChange={(e) => handleSwitchGroup(e.target.value)} className="appearance-none bg-slate-800 border border-slate-700 text-white py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold outline-none w-full truncate focus:border-indigo-500 transition-colors text-center">
                     {userGroups.map(g => (<option key={g.id} value={g.id}>{g.name} {g.id === activeUid ? '(個人)' : ''}</option>))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
               </div>

               <div className="flex items-center gap-2">
                  <div className="relative">
                     <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className="appearance-none bg-slate-800 rounded-lg pl-2 pr-6 py-1.5 text-white text-xs outline-none border border-slate-700 focus:border-indigo-500 font-bold min-w-[55px]">
                        {ALLOWED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <ChevronDown size={10} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                  </div>
                  <button onClick={() => setActiveModal('settings')} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-800"><Settings size={18} /></button>
               </div>
            </div>

            <div className="px-4 flex justify-between items-center bg-slate-800/40 mx-4 py-2.5 rounded-xl border border-slate-700/50">
               <div className="text-slate-400 text-xs flex items-center gap-2 font-bold">
                  總資產淨值
                  <button onClick={toggleNetWorth} className="text-slate-500 hover:text-slate-300 transition-colors">
                     {showNetWorth ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
               </div>
               <div className="text-xl font-bold text-white tracking-tight">
                  {showNetWorth ? `${CURRENCY_SYMBOLS[baseCurrency]} ${Math.round(totalNetWorth).toLocaleString()}` : `****`}
               </div>
            </div>
         </header>
         <main className="flex-1 overflow-y-auto pb-24 scroll-smooth bg-slate-50/50">
            <div className="max-w-2xl mx-auto p-4 space-y-6">
               {!dataReady && (
                  <div className="space-y-4 animate-in fade-in">
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                           <Loader2 className="animate-spin text-indigo-500" size={18} />
                           <span className="text-sm font-bold text-slate-500">正在同步資料...</span>
                        </div>
                        <div className="space-y-3">
                           <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4"></div>
                           <div className="h-4 bg-slate-100 rounded-full animate-pulse w-1/2"></div>
                           <div className="h-4 bg-slate-100 rounded-full animate-pulse w-5/6"></div>
                           <div className="h-32 bg-slate-50 rounded-xl animate-pulse mt-4"></div>
                        </div>
                     </div>
                     {activeUid && currentGroupId && people.length > 0 && (
                        <button onClick={() => setActiveModal('add-trans')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all">
                           <Plus size={20} /> 立即記一筆
                        </button>
                     )}
                  </div>
               )}
               {dataReady && activeTab === 'home' && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-4">
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64"><h3 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><LineChart size={16} /> 資產趨勢</h3>{chartsReady ? <NetWorthAreaChart data={historyChartData} /> : <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>}</div>
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64"><h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2"><TrendingUp size={16} /> 收支分析</h3>{chartsReady ? <CashFlowBarChart data={cashFlowChartData} /> : <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>}</div>
                  </div>
               )}
               {dataReady && activeTab === 'invest' && <PortfolioView holdings={holdings} platforms={platforms} onAddPlatform={() => setActiveModal('add-platform')} onManagePlatform={() => setActiveModal('manage-platforms')} onManageCash={(p: any) => { setSelectedItem(p); setActiveModal('manage-cash') }} onAddAsset={() => setActiveModal('add-asset')} onUpdatePrices={() => updateAssetPrices(true)} onEdit={(h: any) => { setSelectedItem(h); setActiveModal('edit-asset-price') }} onSell={(h: any) => { setSelectedItem(h); setActiveModal('sell') }} onDividend={() => setActiveModal('add-dividend')} onRebalance={() => setActiveModal('rebalance')} baseCurrency={baseCurrency} rates={rates} convert={convert} CURRENCY_SYMBOLS={CURRENCY_SYMBOLS} />}
               {dataReady && activeTab === 'ledger' && <LedgerView transactions={transactions} categories={categories} people={people} cardLogs={cardLogs} onAdd={() => setActiveModal('add-trans')} onEdit={(t: any) => { setSelectedItem(t); setActiveModal('edit-trans') }} currentGroupId={currentGroupId} userId={user?.uid} onDelete={(id: string) => confirmDelete(async () => { const t = transactions.find(tx => tx.id === id); if (t?.linkedBankTransactionId) { await deleteDoc(doc(db, getCollectionPath(user!.uid, null, 'bankLogs'), t.linkedBankTransactionId)); } await deleteDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'transactions'), id)); }, '確定刪除此筆記帳資料?')} onManageRecurring={() => setActiveModal('manage-recurring')} onBatchAdd={() => setActiveModal('ai-batch')} />}
               {dataReady && activeTab === 'cash' && <CashView accounts={calculatedAccounts} creditCards={creditCards} onTransfer={() => setActiveModal('transfer')} onAddAccount={() => setActiveModal('add-account')} onManageAccount={() => setActiveModal('manage-accounts')} onAddCard={() => setActiveModal('add-card')} onManageCard={() => setActiveModal('manage-cards')} onViewAccount={(acc: any) => { setSelectedItem(acc); setActiveModal('view-bank') }} onViewCard={(card: any) => { setSelectedItem(card); setActiveModal('view-card') }} />}
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
         {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} onExport={exportData} onExportCSV={exportCSV} onImport={handleImport} onGroupJoin={handleGroupJoin} onGroupCreate={handleCreateGroup} onGroupSwitch={handleSwitchGroup} currentGroupId={currentGroupId} groups={userGroups} user={user} categories={categories} onAddCategory={(name: string, type: string, budget: number) => addDoc(collection(db, getCollectionPath(user!.uid, currentGroupId, 'categories')), { name, type, budgetLimit: budget || 0 })} onUpdateCategory={(id: string, data: any) => updateDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'categories'), id), data)} onDeleteCategory={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'categories'), id)), '確定刪除此分類? (需二次確認)')} currentTheme={themeColor} onSetTheme={setThemeColor} />}
         {(activeModal === 'add-trans' || activeModal === 'edit-trans') && <AddTransactionModal userId={user?.uid} groupId={currentGroupId} people={people} categories={categories} onClose={() => { setActiveModal(null); setSelectedItem(null) }} editData={selectedItem} rates={rates} convert={convert} accounts={calculatedAccounts} />}
         {activeModal === 'ai-batch' && <AIBatchImportModal initialConfig={batchConfig} userId={user?.uid} groupId={currentGroupId} categories={categories} existingTransactions={transactions} accounts={accounts} creditCards={creditCards} existingBankLogs={bankLogs} existingCardLogs={cardLogs} people={people} onClose={() => { setActiveModal(null); setBatchConfig(null); }} />}
         {activeModal === 'manage-recurring' && <ManageRecurringModal rules={recurringRules} onClose={() => setActiveModal(null)} onAdd={() => setActiveModal('add-recurring')} onEdit={(r: any) => { setSelectedItem(r); setActiveModal('add-recurring') }} onDelete={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, currentGroupId, 'recurring'), id)), '確定刪除此固定收支規則?')} />}
         {activeModal === 'add-recurring' && <AddRecurringModal userId={user?.uid} groupId={currentGroupId} people={people} categories={categories} onClose={() => { setActiveModal('manage-recurring'); setSelectedItem(null) }} editData={selectedItem} />}
         {(activeModal === 'add-platform' || activeModal === 'edit-platform') && <AddPlatformModal userId={user?.uid} onClose={() => { setActiveModal(activeModal === 'edit-platform' ? 'manage-platforms' : null); setSelectedItem(null) }} editData={selectedItem} />}
         {activeModal === 'manage-platforms' && <ManageListModal title="管理投資平台" items={platforms} onClose={() => setActiveModal(null)} renderItem={(p: any) => (<div><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.currency} • {p.type}</div></div>)} onEdit={(p: any) => { setSelectedItem(p); setActiveModal('edit-platform') }} onDelete={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, null, 'platforms'), id)), `確定刪除平台? (相關資產需手動整理)`)} />}
         {activeModal === 'manage-cash' && selectedItem && <ManagePlatformCashModal platform={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null) }} />}
         {activeModal === 'add-asset' && <AddAssetModal userId={user?.uid} platforms={platforms} onClose={() => setActiveModal(null)} />}
         {activeModal === 'edit-asset' && selectedItem && <EditAssetModal holding={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null) }} onDelete={(h: any) => confirmDelete(async () => { await deleteDoc(doc(db, getCollectionPath(user!.uid, null, 'holdings'), h.id)); setActiveModal(null) }, '確定刪除此資產? (需二次確認)')} />}
         {activeModal === 'edit-asset-price' && selectedItem && <EditAssetPriceModal holding={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null) }} onEditInfo={() => setActiveModal('edit-asset')} onSell={() => setActiveModal('sell')} />}
         {activeModal === 'sell' && selectedItem && <SellAssetModal holding={selectedItem} userId={user?.uid} onClose={() => { setActiveModal(null); setSelectedItem(null) }} />}
         {activeModal === 'add-dividend' && <AddDividendModal userId={user?.uid} groupId={currentGroupId} platforms={platforms} holdings={holdings} people={people} onClose={() => setActiveModal(null)} />}
         {activeModal === 'rebalance' && <PortfolioRebalanceModal holdings={holdings} platforms={platforms} rates={rates} baseCurrency={baseCurrency} convert={convert} onClose={() => setActiveModal(null)} />}
         {(activeModal === 'add-account' || activeModal === 'edit-account') && <AddAccountModal userId={user?.uid} onClose={() => { setActiveModal(activeModal === 'edit-account' ? 'manage-accounts' : null); setSelectedItem(null) }} editData={selectedItem} />}
         {activeModal === 'manage-accounts' && <ManageListModal title="管理銀行帳戶" items={accounts} onClose={() => setActiveModal(null)} renderItem={(a: any) => (<div><div className="font-bold">{a.name}</div><div className="text-xs text-slate-500">{a.currency}</div></div>)} onEdit={(a: any) => { setSelectedItem(a); setActiveModal('edit-account') }} onDelete={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, null, 'accounts'), id)), `確定刪除此帳戶? (需二次確認)`)} />}
         {(activeModal === 'add-card' || activeModal === 'edit-card') && <AddCardModal userId={user?.uid} onClose={() => { setActiveModal(activeModal === 'edit-card' ? 'manage-cards' : null); setSelectedItem(null) }} editData={selectedItem} />}
         {activeModal === 'manage-cards' && <ManageListModal title="管理信用卡" items={creditCards} onClose={() => setActiveModal(null)} renderItem={(c: any) => (<div><div className="font-bold">{c.name}</div><div className="text-xs text-slate-500">結帳日: {c.billingDay}</div></div>)} onEdit={(c: any) => { setSelectedItem(c); setActiveModal('edit-card') }} onDelete={(id: string) => confirmDelete(async () => await deleteDoc(doc(db, getCollectionPath(user!.uid, null, 'creditCards'), id)), `確定刪除此信用卡? (需二次確認)`)} />}
         {activeModal === 'transfer' && <TransferModal userId={user?.uid} accounts={calculatedAccounts} onClose={() => setActiveModal(null)} />}
         {activeModal === 'view-bank' && selectedItem && <BankDetailModal userId={user?.uid} account={selectedItem} logs={bankLogs.filter(l => l.accountId === selectedItem.id)} onClose={() => { setActiveModal(null); setSelectedItem(null) }} onImport={() => { setBatchConfig({ target: 'bank', targetId: selectedItem.id }); setActiveModal('ai-batch'); }} />}
         {activeModal === 'view-card' && selectedItem && <CardDetailModal userId={user?.uid} card={selectedItem} cardLogs={cardLogs.filter(l => l.cardId === selectedItem.id)} allCardLogs={cardLogs} transactions={transactions} onClose={() => { setActiveModal(null); setSelectedItem(null) }} groups={userGroups} currentGroupId={currentGroupId} />}
         {showAI && <AIAssistantModal onClose={() => setShowAI(false)} contextData={{ totalNetWorth, holdings, transactions }} />}
         {confirmData && <ConfirmActionModal title={confirmData.title} message={confirmData.message} onConfirm={confirmData.action} onCancel={() => setConfirmData(null)} />}
      </div>
   );
}

function NavBtn({ icon, label, active, onClick }: any) {
   return (<button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full ${active ? 'text-emerald-600 scale-105' : 'text-slate-400'}`}><div className={`mb-1 ${active ? '-translate-y-1' : ''}`}>{icon}</div><span className="text-[10px] font-bold">{label}</span></button>)
}

function getMonthlyCashFlow(transactions: any[], baseCurrency: string, rates: any) {
   const now = new Date(); const months = [];
   for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ label: `${d.getMonth() + 1}月`, month: d.getMonth(), year: d.getFullYear(), income: 0, expense: 0 }); }
   transactions.forEach(t => { if (!t.date?.seconds) return; const d = new Date(t.date.seconds * 1000); const m = months.find(mo => mo.month === d.getMonth() && mo.year === d.getFullYear()); if (m) { const val = convert(t.totalAmount, t.currency, baseCurrency, rates); if (t.type === 'income') m.income += val; else m.expense += val; } });
   return months;
}
