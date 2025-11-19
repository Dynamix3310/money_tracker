
import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Wallet, Calendar, CheckCircle, Circle, Trash2, Users, Search, Settings, ArrowUpRight, ArrowDownRight, PieChart, Edit, RefreshCw, Coins, Building2, ArrowRightLeft, DollarSign, Link2, Repeat, Sparkles, Filter } from 'lucide-react';
import { AssetHolding, Transaction, BankAccount, CreditCardInfo, Person, BankTransaction, CreditCardLog, Platform } from '../types';
import { ExpensePieChart } from './Charts';

// --- Portfolio View (Platform Cards with Cash & Pie) ---
export const PortfolioView = ({ holdings, platforms, onAddPlatform, onManagePlatform, onManageCash, onAddAsset, onSell, onEdit, onUpdatePrices, baseCurrency, rates, convert, CURRENCY_SYMBOLS }: any) => {
   
   // Group assets by platform
   const groupedData = useMemo(() => {
       const map: Record<string, AssetHolding[]> = {};
       platforms.forEach((p: Platform) => map[p.id] = []);
       map['other'] = []; // For legacy or unassigned
       
       holdings.forEach((h: AssetHolding) => {
           if(h.platformId && map[h.platformId]) map[h.platformId].push(h);
           else map['other'].push(h);
       });
       return map;
   }, [holdings, platforms]);

   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
               <h3 className="font-bold text-lg text-slate-800">投資組合</h3>
               <button onClick={onManagePlatform} className="text-slate-300 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><Settings size={16}/></button>
            </div>
            <div className="flex gap-2">
               <button onClick={onUpdatePrices} className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 transition-all"><RefreshCw size={16}/></button>
               <button onClick={onAddPlatform} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-slate-200"><Building2 size={14}/> 平台</button>
               <button onClick={onAddAsset} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-700 transition-colors"><Plus size={14}/> 資產</button>
            </div>
         </div>

         {platforms.length === 0 && holdings.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl"><div className="text-slate-400 font-medium">尚無投資平台或資產</div></div>
         )}

         {/* Platform Cards */}
         {platforms.map((p: Platform) => {
             const assets = groupedData[p.id] || [];
             const assetsVal = assets.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
             const totalValNative = p.balance + assetsVal;
             const totalValBase = convert(totalValNative, p.currency, baseCurrency, rates);
             
             // Pie Data: Assets + Cash
             const pieData = [
                 ...assets.map(h => ({ name: h.symbol, value: h.quantity * h.currentPrice })),
                 { name: '現金', value: p.balance }
             ].filter(x => x.value > 0);

             return (
                 <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                     <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-start">
                         <div>
                             <div className="font-bold text-slate-800 flex items-center gap-2 text-base">{p.name} <span className="text-[10px] bg-slate-200 px-1.5 rounded text-slate-600">{p.currency}</span></div>
                             <div className="text-xs text-slate-400 mt-1">總值 (估算): {CURRENCY_SYMBOLS[baseCurrency]}{Math.round(totalValBase).toLocaleString()}</div>
                         </div>
                         <button onClick={() => onManageCash(p)} className="bg-white border border-emerald-200 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1"><DollarSign size={10}/> 現金: {p.balance.toLocaleString()}</button>
                     </div>
                     
                     {/* Pie Chart Section */}
                     {pieData.length > 0 && (
                        <div className="h-32 w-full bg-white border-b border-slate-50">
                            <ExpensePieChart data={pieData} />
                        </div>
                     )}

                     <div>
                         {assets.length === 0 ? <div className="p-4 text-center text-xs text-slate-300">此平台尚無持倉</div> : assets.map((h: AssetHolding) => {
                             const pnlPercent = h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
                             const pnlValue = (h.currentPrice - h.avgCost) * h.quantity;
                             return (
                                <div key={h.id} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onEdit(h)}>
                                   <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2">
                                         {h.symbol} <span className={`text-[9px] px-1 rounded font-bold ${h.type==='crypto'?'bg-orange-100 text-orange-600':'bg-blue-100 text-blue-600'}`}>{h.type==='crypto'?'C':'S'}</span>
                                      </div>
                                      <div className="text-xs text-slate-400 mt-0.5">{h.quantity} • Avg {h.avgCost}</div>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <div className="text-right">
                                         <div className="font-bold text-slate-800 text-sm">{h.currentPrice} {h.currency}</div>
                                         <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${pnlPercent>=0?'text-emerald-600':'text-red-500'}`}>
                                             <span>{pnlPercent>=0?'+':''}{Math.round(pnlValue).toLocaleString()}</span>
                                             <span className="opacity-70">({pnlPercent.toFixed(1)}%)</span>
                                         </div>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); onSell(h); }} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-100">賣出</button>
                                   </div>
                                </div>
                             );
                         })}
                     </div>
                 </div>
             )
         })}
         
         {/* Legacy/Other Assets */}
         {groupedData['other']?.length > 0 && (
             <div className="bg-slate-100 rounded-2xl border border-slate-200 p-4 opacity-70">
                 <h4 className="font-bold text-slate-500 text-xs mb-2 uppercase">未分類資產</h4>
                 {groupedData['other'].map((h: AssetHolding) => (
                    <div key={h.id} className="flex justify-between items-center bg-white p-3 rounded-xl mb-2" onClick={()=>onEdit(h)}>
                        <div className="font-bold text-sm">{h.symbol}</div>
                        <button onClick={(e) => { e.stopPropagation(); onSell(h); }} className="text-xs bg-slate-200 px-2 py-1 rounded">賣出</button>
                    </div>
                 ))}
             </div>
         )}
      </div>
   );
};

// --- Ledger View (Grouped by Month) ---
export const LedgerView = ({ transactions, people, onAdd, onBatchAdd, currentGroupId, userId, onDelete, onEdit, cardLogs, onManageRecurring }: any) => {
   const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
   const [searchTerm, setSearchTerm] = useState('');
   const [timeRange, setTimeRange] = useState<'week' | 'month' | 'lastMonth' | 'year' | 'custom'>('month');
   const [customStart, setCustomStart] = useState('');
   const [customEnd, setCustomEnd] = useState('');
   
   const linkedIds = useMemo(() => new Set(cardLogs.filter((c:any) => c.isReconciled && c.linkedTransactionId).map((c:any) => c.linkedTransactionId)), [cardLogs]);

   const getDateRange = () => {
      const now = new Date();
      const start = new Date(now);
      const end = new Date(now);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      if (timeRange === 'week') {
         const day = start.getDay() || 7;
         start.setDate(start.getDate() - day + 1); // Monday
      } else if (timeRange === 'month') {
         start.setDate(1);
         end.setMonth(end.getMonth() + 1);
         end.setDate(0);
      } else if (timeRange === 'lastMonth') {
         start.setMonth(start.getMonth() - 1);
         start.setDate(1);
         end.setDate(0); // Last day of prev month
      } else if (timeRange === 'year') {
         start.setMonth(0, 1);
      } else if (timeRange === 'custom') {
         if(customStart) start.setTime(new Date(customStart).getTime());
         if(customEnd) end.setTime(new Date(customEnd + 'T23:59:59').getTime());
      }
      return { start, end };
   };

   const { start: filterStart, end: filterEnd } = getDateRange();

   // Filter logic
   const filtered = transactions.filter((t: any) => {
       const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.includes(searchTerm);
       const d = t.date?.seconds ? new Date(t.date.seconds*1000) : new Date(0);
       
       if (viewMode === 'stats') {
           // Apply date filter only in stats mode (or if desired in list mode too, but usually list is "all history")
           // Let's apply to Stats mode as requested
           return d >= filterStart && d <= filterEnd;
       }
       return matchSearch;
   }).sort((a:any,b:any) => (b.date?.seconds||0) - (a.date?.seconds||0));

   // Group by YYYY-MM (Only for List View)
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

   const statsData = useMemo(() => {
       const catMap: any = {}, memberMap: any = {};
       let totalExp = 0, totalInc = 0;
       filtered.forEach((t: any) => { 
          if(t.type==='expense') { 
             catMap[t.category]=(catMap[t.category]||0)+t.totalAmount; 
             totalExp += t.totalAmount;
             Object.entries(t.payers).forEach(([pid, amt]:any)=>memberMap[pid]=(memberMap[pid]||0)+amt); 
          } else {
             totalInc += t.totalAmount;
          }
       });
       return { 
          catChart: Object.entries(catMap).map(([name,value]:any)=>({name,value})).sort((a:any,b:any)=>b.value-a.value), 
          memChart: Object.entries(memberMap).map(([pid,value]:any)=>({name:people.find((p:any)=>p.id===pid)?.name||'Unknown',value})).sort((a:any,b:any)=>b.value-a.value),
          totalExp, totalInc
       };
   }, [filtered, people]);

   return (
      <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-20">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2"><div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Users size={16}/></div><div><h3 className="font-bold text-sm">{currentGroupId===userId?'個人帳本':'群組帳本'}</h3></div></div>
               <div className="flex gap-2">
                   <button onClick={onBatchAdd} className="text-indigo-600 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"><Sparkles size={16}/></button>
                   <button onClick={onManageRecurring} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:text-indigo-600"><Repeat size={14}/></button>
                   <div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={()=>setViewMode('list')} className={`p-1.5 rounded ${viewMode==='list'?'bg-white shadow':''}`}><Calendar size={14}/></button><button onClick={()=>setViewMode('stats')} className={`p-1.5 rounded ${viewMode==='stats'?'bg-white shadow':''}`}><PieChart size={14}/></button></div>
                   <button onClick={onAdd} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> 記一筆</button>
               </div>
            </div>
            {viewMode==='list' && <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input placeholder="搜尋..." className="w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2 text-sm outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
            
            {viewMode==='stats' && (
               <div className="flex flex-wrap gap-2 pt-1">
                  {['week', 'month', 'lastMonth', 'year'].map((r:any) => (
                     <button key={r} onClick={()=>setTimeRange(r)} className={`px-3 py-1 rounded-full text-xs font-bold border ${timeRange===r?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-500 border-slate-200'}`}>
                        {r==='week'?'本週':r==='month'?'本月':r==='lastMonth'?'上個月':'今年'}
                     </button>
                  ))}
                  <button onClick={()=>setTimeRange('custom')} className={`px-3 py-1 rounded-full text-xs font-bold border ${timeRange==='custom'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-500 border-slate-200'}`}>自訂</button>
               </div>
            )}
            {viewMode === 'stats' && timeRange === 'custom' && (
               <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2">
                  <input type="date" className="bg-slate-50 border rounded px-2 py-1 text-xs" value={customStart} onChange={e=>setCustomStart(e.target.value)}/>
                  <span className="text-slate-400">-</span>
                  <input type="date" className="bg-slate-50 border rounded px-2 py-1 text-xs" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}/>
               </div>
            )}
         </div>
         
         {viewMode === 'list' ? (
             <div className="space-y-4">
                {Object.keys(groupedTransactions).length === 0 ? <div className="text-center py-12 text-slate-400 text-sm">無紀錄</div> : Object.entries(groupedTransactions).map(([month, list]) => (
                   <div key={month}>
                       <div className="text-xs font-bold text-slate-400 mb-2 ml-1">{month}</div>
                       <div className="space-y-2">
                           {(list as any[]).map((t: any) => (
                               <div key={t.id} className="bg-white px-4 py-3 rounded-xl border border-slate-100 flex justify-between items-center group">
                                  <div className="flex gap-3 items-center">
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${t.type==='income'?'bg-emerald-500':'bg-blue-500'} relative`}>
                                         {t.category?.[0]}
                                         {linkedIds.has(t.id) && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border shadow-sm"><Link2 size={10} className="text-indigo-600"/></div>}
                                     </div>
                                     <div><div className="font-bold text-slate-800 text-sm">{t.description}</div><div className="text-[10px] text-slate-400">{t.date?.seconds?new Date(t.date.seconds*1000).toLocaleDateString():''} • {t.category} {t.isRecurring && '(自動)'}</div></div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <div className={`font-bold font-mono ${t.type==='income'?'text-emerald-600':'text-slate-800'}`}>{t.type==='income'?'+':''}{t.totalAmount} $</div>
                                     <button onClick={()=>onEdit(t)} className="text-slate-300 hover:text-indigo-500 p-1.5"><Edit size={14}/></button>
                                     <button onClick={()=>onDelete(t.id)} className="text-slate-300 hover:text-red-500 p-1.5"><Trash2 size={14}/></button>
                                  </div>
                               </div>
                           ))}
                       </div>
                   </div>
                ))}
             </div>
         ) : (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <div className="text-xs text-red-400 font-bold mb-1">總支出</div>
                        <div className="text-xl font-bold text-red-600">${statsData.totalExp.toLocaleString()}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <div className="text-xs text-emerald-400 font-bold mb-1">總收入</div>
                        <div className="text-xl font-bold text-emerald-600">${statsData.totalInc.toLocaleString()}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border h-64"><h4 className="font-bold text-sm mb-2">分類統計</h4><ExpensePieChart data={statsData.catChart}/></div>
                <div className="bg-white p-4 rounded-2xl border h-64"><h4 className="font-bold text-sm mb-2">成員統計</h4><ExpensePieChart data={statsData.memChart}/></div>
             </div>
         )}
      </div>
   )
}

// --- Cash View ---
export const CashView = ({ accounts, creditCards, onAddAccount, onAddCard, onManageAccount, onManageCard, onViewAccount, onViewCard, onTransfer }: any) => {
   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
         <section>
            <div className="flex justify-between items-center mb-3 px-1">
               <div className="flex items-center gap-2">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Wallet size={18}/> 銀行與現金</h3>
                   <button onClick={onManageAccount} className="text-slate-300 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><Settings size={16}/></button>
               </div>
               <div className="flex gap-2">
                  <button onClick={onTransfer} className="text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><ArrowRightLeft size={12}/> 轉帳</button>
                  <button onClick={onAddAccount} className="text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={12}/> 新增</button>
               </div>
            </div>
            <div className="space-y-3">
               {accounts.length===0 && <div className="text-center text-slate-400 py-6 border-2 border-dashed rounded-xl">尚無帳戶</div>}
               {accounts.map((a: any) => (
                  <div key={a.id} onClick={() => onViewAccount(a)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.99]">
                     <div className="flex gap-4 items-center">
                        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Wallet size={20}/></div>
                        <div><div className="font-bold text-slate-800 text-base">{a.name}</div><div className="text-[10px] bg-slate-100 px-1.5 rounded mt-1 w-fit">{a.currency}</div></div>
                     </div>
                     <div className="text-right"><div className="font-bold font-mono text-lg">${a.currentBalance?.toLocaleString()}</div><div className="text-[10px] text-emerald-600">明細 &gt;</div></div>
                  </div>
               ))}
            </div>
         </section>

         <section>
            <div className="flex justify-between items-center mb-3 px-1">
               <div className="flex items-center gap-2">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Calendar size={18}/> 信用卡</h3>
                   <button onClick={onManageCard} className="text-slate-300 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><Settings size={16}/></button>
               </div>
               <button onClick={onAddCard} className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={12}/> 新增</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {creditCards.map((c: any) => (
                  <div key={c.id} onClick={() => onViewCard(c)} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer active:scale-[0.98]">
                     <div className="absolute right-0 top-0 p-8 bg-white/5 rounded-full blur-3xl w-32 h-32"></div>
                     <div className="relative z-10">
                        <div className="flex justify-between"><div className="text-[10px] font-bold text-slate-400 tracking-widest">CARD</div><div className="bg-white/20 p-1 rounded"><CreditCardInfoIcon size={12} /></div></div>
                        <div className="font-bold text-lg mb-6 mt-2">{c.name}</div>
                        <div className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg w-fit">結帳日: <span className="text-white font-bold">{c.billingDay}</span></div>
                     </div>
                  </div>
               ))}
            </div>
         </section>
      </div>
   )
}
function CreditCardInfoIcon({size}:{size:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg> }
