
import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Wallet, Calendar, PieChart, Edit, RefreshCw, Building2, DollarSign, Link2, Sparkles, Users, Search, Settings, ArrowUpRight, ArrowDownRight, Trash2, ArrowRightLeft, Receipt, Repeat, CreditCard, Goal, FileSpreadsheet, Coins, Scale } from 'lucide-react';
import { AssetHolding, Transaction, BankAccount, CreditCardInfo, Person, BankTransaction, CreditCardLog, Platform } from '../types';
import { ExpensePieChart } from './Charts';

// --- Portfolio View ---
export const PortfolioView = ({ holdings, platforms, onAddPlatform, onManagePlatform, onManageCash, onAddAsset, onSell, onEdit, onUpdatePrices, onDividend, onRebalance, baseCurrency, rates, convert, CURRENCY_SYMBOLS }: any) => {
   const groupedData = useMemo(() => {
       const map: Record<string, AssetHolding[]> = {};
       platforms.forEach((p: Platform) => map[p.id] = []);
       map['other'] = [];
       holdings.forEach((h: AssetHolding) => { if(h.platformId && map[h.platformId]) map[h.platformId].push(h); else map['other'].push(h); });
       return map;
   }, [holdings, platforms]);
   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2"> <h3 className="font-bold text-lg text-slate-800">投資組合</h3> <button onClick={onManagePlatform} className="text-slate-300 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><Settings size={16}/></button> </div>
            <div className="flex gap-2"> 
                <button onClick={onRebalance} className="bg-white border border-indigo-200 text-indigo-600 p-2 rounded-lg shadow-sm hover:bg-indigo-50 active:scale-95 transition-all" title="再平衡分析"><Scale size={16}/></button>
                <button onClick={onUpdatePrices} className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 transition-all" title="更新股價"><RefreshCw size={16}/></button> 
                <button onClick={onDividend} className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-100" title="領取股利"><Coins size={14}/> 股利</button> 
                <button onClick={onAddPlatform} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-slate-200"><Building2 size={14}/> 平台</button> 
                <button onClick={onAddAsset} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-700 transition-colors"><Plus size={14}/> 資產</button> 
            </div>
         </div>
         {platforms.length === 0 && holdings.length === 0 && ( <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl"><div className="text-slate-400 font-medium">尚無投資平台或資產</div></div> )}
         {platforms.map((p: Platform) => {
             const assets = groupedData[p.id] || [];
             const assetsVal = assets.reduce((sum, h) => sum + (h.quantity * (h.manualPrice ?? h.currentPrice)), 0);
             const totalValNative = p.balance + assetsVal;
             const totalValBase = convert(totalValNative, p.currency, baseCurrency, rates);
             const pieData = [ ...assets.map(h => ({ name: h.symbol, value: h.quantity * (h.manualPrice ?? h.currentPrice) })), { name: '現金', value: p.balance } ].filter(x => x.value > 0);
             return (
                 <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                     <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-start"> <div> <div className="font-bold text-slate-800 flex items-center gap-2 text-base">{p.name} <span className="text-[10px] bg-slate-200 px-1.5 rounded text-slate-600">{p.currency}</span></div> <div className="text-xs text-slate-400 mt-1">總值 (估算): {CURRENCY_SYMBOLS[baseCurrency]}{Math.round(totalValBase).toLocaleString()}</div> </div> <button onClick={() => onManageCash(p)} className="bg-white border border-emerald-200 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1"><DollarSign size={10}/> 現金: {p.balance.toLocaleString()}</button> </div>
                     {pieData.length > 0 && ( <div className="h-32 w-full bg-white border-b border-slate-50"> <ExpensePieChart data={pieData} /> </div> )}
                     <div> {assets.length === 0 ? <div className="p-4 text-center text-xs text-slate-300">此平台尚無持倉</div> : assets.map((h: AssetHolding) => { 
                         const displayPrice = h.manualPrice ?? h.currentPrice;
                         const pnlPercent = h.avgCost > 0 ? ((displayPrice - h.avgCost) / h.avgCost) * 100 : 0; 
                         const pnlValue = (displayPrice - h.avgCost) * h.quantity; 
                         return ( <div key={h.id} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onEdit(h)}> <div> <div className="font-bold text-slate-800 flex items-center gap-2"> {h.symbol} <span className={`text-[9px] px-1 rounded font-bold ${h.type==='crypto'?'bg-orange-100 text-orange-600':'bg-blue-100 text-blue-600'}`}>{h.type==='crypto'?'C':'S'}</span> </div> <div className="text-xs text-slate-400 mt-0.5">{h.quantity} • Avg {h.avgCost}</div> </div> <div className="flex items-center gap-4"> <div className="text-right"> <div className="font-bold text-slate-800 text-sm flex items-center justify-end gap-1">{displayPrice} <span className="text-[10px] font-normal text-slate-400">{h.currency}</span> {h.manualPrice && <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" title="手動報價"></span>}</div> <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${pnlPercent>=0?'text-emerald-600':'text-red-500'}`}> <span>{pnlPercent>=0?'+':''}{Math.round(pnlValue).toLocaleString()}</span> <span className="opacity-70">({pnlPercent.toFixed(1)}%)</span> </div> </div> <button onClick={(e) => { e.stopPropagation(); onSell(h); }} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-100">賣出</button> </div> </div> ); })} </div>
                 </div>
             )
         })}
         {groupedData['other']?.length > 0 && ( <div className="bg-slate-100 rounded-2xl border border-slate-200 p-4 opacity-70"> <h4 className="font-bold text-slate-500 text-xs mb-2 uppercase">未分類資產</h4> {groupedData['other'].map((h: AssetHolding) => ( <div key={h.id} className="flex justify-between items-center bg-white p-3 rounded-xl mb-2" onClick={()=>onEdit(h)}> <div className="font-bold text-sm">{h.symbol}</div> <button onClick={(e) => { e.stopPropagation(); onSell(h); }} className="text-xs bg-slate-200 px-2 py-1 rounded">賣出</button> </div> ))} </div> )}
      </div>
   );
};

// --- Ledger View ---
export const LedgerView = ({ transactions, categories, people, onAdd, onBatchAdd, currentGroupId, userId, onDelete, onEdit, cardLogs, onManageRecurring }: any) => {
   const [viewMode, setViewMode] = useState<'list' | 'stats' | 'debts' | 'budget'>('list'); 
   const [searchTerm, setSearchTerm] = useState('');
   const [timeRange, setTimeRange] = useState<'week' | 'month' | 'lastMonth' | 'year' | 'custom'>('month');
   const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
   const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
   const [statsFilter, setStatsFilter] = useState<string>('all'); // 'all' or personId
   
   const linkedIds = useMemo(() => new Set(cardLogs.filter((c:any) => c.isReconciled && c.linkedTransactionId).map((c:any) => c.linkedTransactionId)), [cardLogs]);

   const myPersonId = useMemo(() => {
       return people.find((p: any) => p.uid === userId || p.isMe)?.id;
   }, [people, userId]);

   const getDateRange = () => {
      const now = new Date();
      let start = new Date();
      let end = new Date();
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      switch(timeRange) {
         case 'week': {
             const day = now.getDay();
             const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
             start.setDate(diff);
             end.setDate(diff + 6);
             break;
         }
         case 'month': {
             start.setDate(1);
             end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
             break;
         }
         case 'lastMonth': {
             start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
             end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
             break;
         }
         case 'year': {
             start = new Date(now.getFullYear(), 0, 1);
             end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
             break;
         }
         case 'custom': {
             if(customStart) start = new Date(customStart);
             if(customEnd) end = new Date(customEnd);
             end.setHours(23,59,59,999);
             break;
         }
      }
      return { start, end };
   };

   const { start: filterStart, end: filterEnd } = getDateRange();

   const filtered = transactions.filter((t: any) => {
       const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.includes(searchTerm);
       
       if (viewMode === 'stats') {
           if(!t.date?.seconds) return false;
           const d = new Date(t.date.seconds * 1000);
           return d >= filterStart && d <= filterEnd;
       }

       return matchSearch;
   }).sort((a:any,b:any) => (b.date?.seconds||0) - (a.date?.seconds||0));

   const groupedTransactions = useMemo(() => {
       const groups: Record<string, any[]> = {};
       filtered.forEach((t:any) => {
           const d = t.date?.seconds ? new Date(t.date.seconds*1000) : new Date();
           const key = `${d.getFullYear()}年${d.getMonth()+1}月`;
           if(!groups[key]) groups[key] = [];
           groups[key].push(t);
       });
       return groups;
   }, [filtered, viewMode]);

   const debtData = useMemo(() => {
       const balances: Record<string, number> = {};
       people.forEach((p:any) => balances[p.id] = 0);
       transactions.forEach((t:any) => {
           if(t.type === 'expense') {
               Object.entries(t.payers).forEach(([pid, amount]:any) => { balances[pid] = (balances[pid] || 0) + amount; });
               Object.entries(t.splitDetails).forEach(([pid, amount]:any) => { balances[pid] = (balances[pid] || 0) - amount; });
           }
       });
       return Object.entries(balances).map(([id, amount]) => ({ person: people.find((p:any)=>p.id===id), amount })).sort((a,b) => b.amount - a.amount);
   }, [transactions, people]);

   const budgetData = useMemo(() => {
       const now = new Date();
       const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
       const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
       const monthlyExpenses: Record<string, number> = {};
       transactions.forEach((t:any) => {
           if(t.type !== 'expense') return;
           const d = t.date?.seconds ? new Date(t.date.seconds*1000) : new Date(0);
           if(d >= startOfMonth && d <= endOfMonth) {
               monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.totalAmount;
           }
       });
       return categories.filter((c:any) => c.type === 'expense' && c.budgetLimit && c.budgetLimit > 0).map((c:any) => ({ ...c, spent: monthlyExpenses[c.name] || 0 })).sort((a:any,b:any) => (b.spent / b.budgetLimit) - (a.spent / a.budgetLimit));
   }, [transactions, categories]);

   const statsData = useMemo(() => {
       const catMap: any = {}, memberMap: any = {};
       let totalExp = 0, totalInc = 0;
       
       filtered.forEach((t: any) => { 
          if (statsFilter === 'all') {
              if(t.type==='expense') { 
                 catMap[t.category]=(catMap[t.category]||0)+t.totalAmount; 
                 totalExp += t.totalAmount;
                 Object.entries(t.payers).forEach(([pid, amt]:any)=>memberMap[pid]=(memberMap[pid]||0)+amt); 
              } else {
                 totalInc += t.totalAmount;
              }
          } else {
              // Individual stats based on split share
              const myShare = t.splitDetails?.[statsFilter] || 0;
              if (myShare > 0) {
                  if (t.type === 'expense') {
                      catMap[t.category] = (catMap[t.category] || 0) + myShare;
                      totalExp += myShare;
                  } else {
                      totalInc += myShare;
                  }
              }
          }
       });
       
       return { 
          catChart: Object.entries(catMap).map(([name,value]:any)=>({name,value})).sort((a:any,b:any)=>b.value-a.value), 
          memChart: Object.entries(memberMap).map(([pid,value]:any)=>({name:people.find((p:any)=>p.id===pid)?.name||'Unknown',value})).sort((a:any,b:any)=>b.value-a.value),
          totalExp, totalInc
       };
   }, [filtered, people, statsFilter]);

   return (
      <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-20">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2"><div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Users size={16}/></div><div><h3 className="font-bold text-sm">{currentGroupId===userId?'個人帳本':'群組帳本'}</h3></div></div>
               <div className="flex gap-2">
                   <button onClick={onManageRecurring} className="text-indigo-600 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors" title="固定收支"><Repeat size={16}/></button>
                   <button onClick={onBatchAdd} className="text-indigo-600 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1" title="匯入發票/CSV"><FileSpreadsheet size={16}/></button>
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                       <button onClick={()=>setViewMode('list')} className={`p-1.5 rounded ${viewMode==='list'?'bg-white shadow text-slate-800':'text-slate-400'}`}><Calendar size={14}/></button>
                       <button onClick={()=>setViewMode('debts')} className={`p-1.5 rounded ${viewMode==='debts'?'bg-white shadow text-slate-800':'text-slate-400'}`}><Receipt size={14}/></button>
                       <button onClick={()=>setViewMode('budget')} className={`p-1.5 rounded ${viewMode==='budget'?'bg-white shadow text-slate-800':'text-slate-400'}`}><Goal size={14}/></button>
                       <button onClick={()=>setViewMode('stats')} className={`p-1.5 rounded ${viewMode==='stats'?'bg-white shadow text-slate-800':'text-slate-400'}`}><PieChart size={14}/></button>
                   </div>
                   <button onClick={onAdd} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> 記一筆</button>
               </div>
            </div>
            {viewMode==='list' && <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input placeholder="搜尋..." className="w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2 text-sm outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
            {viewMode==='stats' && (
               <div className="flex flex-col gap-2 pt-1">
                  <div className="flex flex-wrap gap-2">
                      {['week', 'month', 'lastMonth', 'year', 'custom'].map((r:any) => (
                         <button key={r} onClick={()=>setTimeRange(r)} className={`px-3 py-1 rounded-full text-xs font-bold border ${timeRange===r?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-500 border-slate-200'}`}>
                            {r==='week'?'本週':r==='month'?'本月':r==='lastMonth'?'上月':r==='year'?'今年':r==='custom'?'自訂':''}
                         </button>
                      ))}
                  </div>
                  {timeRange === 'custom' && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <input type="date" className="flex-1 bg-white border rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" value={customStart} onChange={e=>setCustomStart(e.target.value)}/>
                          <span className="text-slate-400 text-xs">至</span>
                          <input type="date" className="flex-1 bg-white border rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}/>
                      </div>
                  )}
               </div>
            )}
         </div>
         
         {viewMode === 'list' && (
             <div className="space-y-4">
                {Object.keys(groupedTransactions).length === 0 ? <div className="text-center py-12 text-slate-400 text-sm">無紀錄</div> : Object.entries(groupedTransactions).map(([month, list]) => (
                   <div key={month}>
                       <div className="text-xs font-bold text-slate-400 mb-2 ml-1">{month}</div>
                       <div className="space-y-2">
                           {(list as any[]).map((t: any) => {
                               const myShare = myPersonId && t.type === 'expense' ? t.splitDetails?.[myPersonId] : 0;
                               return (
                                   <div key={t.id} className="bg-white px-4 py-3 rounded-xl border border-slate-100 flex justify-between items-center group">
                                      <div className="flex gap-3 items-center">
                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${t.type==='income'?'bg-emerald-500':'bg-blue-500'} relative`}>
                                             {t.category?.[0]}
                                             {linkedIds.has(t.id) && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border shadow-sm"><Link2 size={10} className="text-indigo-600"/></div>}
                                         </div>
                                         <div><div className="font-bold text-slate-800 text-sm">{t.description}</div><div className="text-[10px] text-slate-400">{t.date?.seconds?new Date(t.date.seconds*1000).toLocaleDateString():''} • {t.category} {t.isRecurring && '(自動)'}</div></div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <div className="text-right">
                                             <div className={`font-bold font-mono ${t.type==='income'?'text-emerald-600':'text-slate-800'}`}>
                                                 {t.type==='income'?'+':''}{t.totalAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">$</span>
                                             </div>
                                             {myShare > 0 && (
                                                 <div className="text-xs text-indigo-600 font-bold mt-0.5">
                                                     <span className="text-[10px] text-slate-400 font-normal mr-1">自付</span>
                                                     {Math.round(myShare).toLocaleString()}
                                                 </div>
                                             )}
                                         </div>
                                         <div className="flex flex-col gap-1">
                                            <button onClick={()=>onEdit(t)} className="text-slate-300 hover:text-indigo-500 p-1"><Edit size={14}/></button>
                                            <button onClick={()=>onDelete(t.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                         </div>
                                      </div>
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                ))}
             </div>
         )}

         {viewMode === 'stats' && (
             <div className="space-y-6">
                 <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={()=>setStatsFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${statsFilter==='all'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-500 border-slate-200'}`}>全體</button>
                    {people.map((p: any) => (
                        <button key={p.id} onClick={()=>setStatsFilter(p.id)} className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${statsFilter===p.id?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-500 border-slate-200'}`}>{p.name}</button>
                    ))}
                 </div>
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64">
                     <h3 className="font-bold text-slate-700 text-sm mb-2">{statsFilter==='all'?'全體':'個人'}收支比例</h3>
                     <ExpensePieChart data={statsData.catChart}/>
                 </div>
                 <div className="flex gap-3">
                     <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100">
                         <div className="text-xs text-slate-400">{statsFilter==='all'?'總支出':'個人負擔'}</div>
                         <div className="text-xl font-bold text-red-500">${statsData.totalExp.toLocaleString()}</div>
                     </div>
                     <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100">
                         <div className="text-xs text-slate-400">{statsFilter==='all'?'總收入':'個人收入'}</div>
                         <div className="text-xl font-bold text-emerald-600">${statsData.totalInc.toLocaleString()}</div>
                     </div>
                 </div>
                 {statsFilter === 'all' && (
                     <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 h-64">
                         <h3 className="font-bold text-slate-700 text-sm mb-2">成員付款統計</h3>
                         <ExpensePieChart data={statsData.memChart}/>
                     </div>
                 )}
             </div>
         )}

         {viewMode === 'budget' && (
            <div className="space-y-4">
               <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                   <h4 className="font-bold text-indigo-900 mb-1">本月預算追蹤</h4>
                   <p className="text-xs text-indigo-600">設定分類預算可協助您控制花費。請至「設定 &gt; 分類」新增或修改預算。</p>
               </div>
               {budgetData.length === 0 ? (
                   <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                       尚未設定任何預算<br/>
                       <span className="text-xs mt-2 block">請至設定頁面為分類添加預算金額</span>
                   </div>
               ) : (
                   budgetData.map((item: any) => {
                       const percent = Math.min((item.spent / item.budgetLimit) * 100, 100);
                       const isOver = item.spent > item.budgetLimit;
                       const isWarning = !isOver && percent > 80;
                       let barColor = 'bg-emerald-500';
                       if(isOver) barColor = 'bg-red-500';
                       else if(isWarning) barColor = 'bg-amber-500';
                       return (
                           <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                               <div className="flex justify-between items-end mb-2">
                                   <div className="font-bold text-slate-800">{item.name}</div>
                                   <div className="text-xs font-bold">
                                       <span className={isOver ? 'text-red-500' : 'text-slate-700'}>${item.spent.toLocaleString()}</span>
                                       <span className="text-slate-400 mx-1">/</span>
                                       <span className="text-slate-500">${item.budgetLimit.toLocaleString()}</span>
                                   </div>
                               </div>
                               <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full ${barColor} transition-all duration-500`} style={{width: `${percent}%`}}/>
                               </div>
                               <div className="flex justify-between mt-1.5">
                                   <div className="text-[10px] text-slate-400">{Math.round(percent)}% 已使用</div>
                                   {isOver && <div className="text-[10px] font-bold text-red-500">超支 ${Math.round(item.spent - item.budgetLimit).toLocaleString()}</div>}
                                   {!isOver && <div className="text-[10px] font-bold text-emerald-600">剩餘 ${Math.round(item.budgetLimit - item.spent).toLocaleString()}</div>}
                               </div>
                           </div>
                       );
                   })
               )}
            </div>
         )}

         {viewMode === 'debts' && (
            <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                    <h4 className="font-bold text-indigo-900 mb-2">群組結算餘額</h4>
                    <p className="text-xs text-indigo-600">正數(+)代表別人欠你錢，負數(-)代表你欠別人錢</p>
                </div>
                {debtData.map((d: any) => {
                    if(!d.person) return null;
                    return (
                        <div key={d.person.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">{d.person.name[0]}</div>
                                 <div className="font-bold text-slate-800">{d.person.name}</div>
                             </div>
                             <div className={`font-bold text-lg font-mono ${d.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                 {d.amount > 0 ? '+' : ''}{Math.round(d.amount)}
                             </div>
                        </div>
                    )
                })}
            </div>
         )}
      </div>
   );
};

// --- Cash View ---
export const CashView = ({ accounts, creditCards, onTransfer, onAddAccount, onManageAccount, onAddCard, onManageCard, onViewAccount, onViewCard }: any) => {
   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
         <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="font-bold text-lg text-slate-800">銀行帳戶</h3>
               <div className="flex gap-2">
                  <button onClick={onTransfer} className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50"><ArrowRightLeft size={16}/></button>
                  <button onClick={onManageAccount} className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50"><Settings size={16}/></button>
                  <button onClick={onAddAccount} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> 新增</button>
               </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
               {accounts.map((acc: any) => (
                  <div key={acc.id} onClick={() => onViewAccount(acc)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all">
                     <div className="flex justify-between items-center">
                        <div className="font-bold text-slate-700">{acc.name}</div>
                        <div className="font-mono font-bold text-lg">${acc.currentBalance?.toLocaleString()}</div>
                     </div>
                     <div className="text-xs text-slate-400 mt-1">{acc.currency}</div>
                  </div>
               ))}
               {accounts.length === 0 && <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed text-slate-400 text-sm">尚無帳戶</div>}
            </div>
         </div>

         <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="font-bold text-lg text-slate-800">信用卡</h3>
               <div className="flex gap-2">
                   <button onClick={onManageCard} className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50"><Settings size={16}/></button>
                   <button onClick={onAddCard} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> 新增</button>
               </div>
            </div>
            <div className="space-y-3">
               {creditCards.map((card: any) => (
                  <div key={card.id} onClick={() => onViewCard(card)} className="bg-gradient-to-br from-slate-700 to-slate-900 p-5 rounded-xl text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100}/></div>
                     <div className="relative z-10">
                         <div className="font-bold text-lg mb-6">{card.name}</div>
                         <div className="flex justify-between items-end">
                            <div className="text-xs text-slate-300">結帳日: 每月 {card.billingDay} 號</div>
                            <div className="text-xs bg-white/20 px-2 py-1 rounded backdrop-blur-sm">查看明細</div>
                         </div>
                     </div>
                  </div>
               ))}
                {creditCards.length === 0 && <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed text-slate-400 text-sm">尚無信用卡</div>}
            </div>
         </div>
      </div>
   )
}
