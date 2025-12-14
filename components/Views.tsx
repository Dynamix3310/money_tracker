// Author: Senior Frontend Engineer
// OS support: Web
// Description: View components for Portfolio, Ledger, and Cash tabs

import React, { useMemo } from 'react';
import { 
  PieChart, Wallet, CreditCard, Building2, TrendingUp, DollarSign, 
  ArrowRightLeft, Plus, Edit, Trash2, Repeat, Sparkles, Coins 
} from 'lucide-react';

export const NavBtn = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
    {icon}
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export const PortfolioView = ({ 
  holdings, platforms, onAddPlatform, onManagePlatform, onManageCash, 
  onAddAsset, onUpdatePrices, onEdit, onSell, onDividend, onRebalance,
  baseCurrency, rates, convert, CURRENCY_SYMBOLS 
}: any) => {
  const totalInvested = holdings.reduce((acc: number, h: any) => {
      const price = h.manualPrice ?? h.currentPrice;
      return acc + convert(h.quantity * price, h.currency, baseCurrency, rates);
  }, 0);

  const totalPlatformCash = platforms.reduce((acc: number, p: any) => {
      return acc + convert(p.balance, p.currency, baseCurrency, rates);
  }, 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
         <button onClick={onAddPlatform} className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl shadow-sm border text-sm font-bold text-slate-600 whitespace-nowrap"><Plus size={16}/> 新增平台</button>
         <button onClick={onManagePlatform} className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl shadow-sm border text-sm font-bold text-slate-600 whitespace-nowrap">管理平台</button>
         <button onClick={onAddAsset} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 rounded-xl shadow-sm border border-indigo-600 text-sm font-bold text-white whitespace-nowrap"><Plus size={16}/> 新增資產</button>
         <button onClick={onDividend} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 rounded-xl shadow-sm border border-emerald-500 text-sm font-bold text-white whitespace-nowrap"><Coins size={16}/> 記錄股息</button>
         <button onClick={onRebalance} className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl shadow-sm border text-sm font-bold text-indigo-600 whitespace-nowrap"><ArrowRightLeft size={16}/> 再平衡</button>
         <button onClick={onUpdatePrices} className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl shadow-sm border text-sm font-bold text-slate-600 whitespace-nowrap">更新股價</button>
      </div>

      {platforms.map((p: any) => (
         <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-3">
                     <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Building2 size={20}/></div>
                     <div>
                         <h3 className="font-bold text-slate-800">{p.name}</h3>
                         <div className="text-xs text-slate-400 font-bold">{p.type === 'stock' ? '證券戶' : '交易所'}</div>
                     </div>
                 </div>
                 <div className="text-right cursor-pointer" onClick={() => onManageCash(p)}>
                     <div className="text-sm text-slate-400">現金餘額</div>
                     <div className="font-bold text-slate-700">{CURRENCY_SYMBOLS[p.currency] || p.currency} {p.balance.toLocaleString()}</div>
                 </div>
             </div>
             
             <div className="space-y-3">
                 {holdings.filter((h: any) => h.platformId === p.id).map((h: any) => {
                     const price = h.manualPrice ?? h.currentPrice;
                     const marketValue = h.quantity * price;
                     const profit = marketValue - (h.quantity * h.avgCost);
                     const profitPercent = (profit / (h.quantity * h.avgCost)) * 100;
                     
                     return (
                         <div key={h.id} className="flex justify-between items-center py-2 border-t border-slate-50">
                             <div className="flex items-center gap-3" onClick={() => onEdit(h)}>
                                 <div className={`w-1 h-8 rounded-full ${profit >= 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                 <div>
                                     <div className="font-bold text-slate-800">{h.symbol}</div>
                                     <div className="text-xs text-slate-400">{h.quantity} 股 • 均價 {h.avgCost.toFixed(2)}</div>
                                 </div>
                             </div>
                             <div className="text-right" onClick={() => onSell(h)}>
                                 <div className="font-bold text-slate-800">{CURRENCY_SYMBOLS[h.currency]}{Math.round(marketValue).toLocaleString()}</div>
                                 <div className={`text-xs font-bold ${profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                     {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString()} ({profitPercent.toFixed(1)}%)
                                 </div>
                             </div>
                         </div>
                     );
                 })}
                 {holdings.filter((h: any) => h.platformId === p.id).length === 0 && (
                     <div className="text-center py-4 text-xs text-slate-400">此平台尚無資產</div>
                 )}
             </div>
         </div>
      ))}
    </div>
  );
};

export const LedgerView = ({ 
    transactions, categories, people, cardLogs, onAdd, onEdit, 
    currentGroupId, userId, onDelete, onManageRecurring, onBatchAdd 
}: any) => {
    // Group transactions by date
    const grouped = useMemo(() => {
        const groups: Record<string, any[]> = {};
        transactions.forEach((t: any) => {
            const dateStr = t.date ? new Date(t.date.seconds * 1000).toLocaleDateString() : 'Unknown';
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(t);
        });
        // Sort by date desc
        return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [transactions]);

    const myPersonId = people.find((p: any) => p.isMe)?.id;

    return (
        <div className="space-y-4 pb-24 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex gap-2">
                <button onClick={onManageRecurring} className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
                    <Repeat size={16} className="text-indigo-500" /> 定期收支
                </button>
                <button onClick={onBatchAdd} className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
                    <Sparkles size={16} className="text-amber-500" /> AI 批量記帳
                </button>
            </div>

            {grouped.map(([date, items]) => (
                <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">{date}</span>
                        <span className="text-xs font-bold text-slate-400">
                            -{items.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString()} / 
                            +{items.filter(t => t.type === 'income').reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {items.map((t: any) => {
                            const myShare = t.splitDetails?.[myPersonId] || 0;
                            const category = categories.find((c: any) => c.name === t.category);
                            
                            return (
                                <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                            {t.type === 'expense' ? <TrendingUp size={18} className="rotate-180"/> : <TrendingUp size={18}/>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 truncate">{t.description}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{t.category}</span>
                                                {t.isRecurring && <span className="text-indigo-500 flex items-center gap-0.5"><Repeat size={10}/> 週期</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fragment Start */}
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <div className={`font-bold font-mono ${t.type==='income'?'text-emerald-600':'text-slate-800'}`}>
                                                {t.type==='income'?'+':''}{t.totalAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">{t.currency === 'TWD' ? '' : t.currency}</span>
                                            </div>
                                            {myPersonId && t.payers?.[myPersonId] > 0 && (
                                                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                    我付: {Math.round(t.payers[myPersonId]).toLocaleString()}
                                                </div>
                                            )}
                                            {myShare > 0 && (
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 mr-1">自付</span>
                                                    {Math.round(myShare).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={()=>onEdit(t)} className="text-slate-300 hover:text-indigo-500 p-1"><Edit size={14}/></button>
                                            <button onClick={()=>onDelete(t.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                    {/* Fragment End */}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const CashView = ({ 
    accounts, creditCards, onTransfer, onAddAccount, onManageAccount, 
    onAddCard, onManageCard, onViewAccount, onViewCard 
}: any) => {
    return (
        <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex gap-2">
                <button onClick={onTransfer} className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600">
                    <ArrowRightLeft size={16} /> 轉帳
                </button>
                <button onClick={onAddAccount} className="px-4 py-2 bg-indigo-600 rounded-xl shadow-sm text-white font-bold text-sm">
                    + 帳戶
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-slate-600">銀行帳戶</h3>
                    <button onClick={onManageAccount} className="text-xs text-slate-400 hover:text-indigo-600">管理</button>
                </div>
                {accounts.map((acc: any) => (
                    <div key={acc.id} onClick={() => onViewAccount(acc)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600"><Building2 size={24}/></div>
                            <div>
                                <div className="font-bold text-slate-800">{acc.name}</div>
                                <div className="text-xs text-slate-400 font-mono">****</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-slate-800 text-lg">{acc.currency} {acc.currentBalance.toLocaleString()}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-slate-600">信用卡</h3>
                    <div className="flex gap-2">
                         <button onClick={onManageCard} className="text-xs text-slate-400 hover:text-indigo-600">管理</button>
                         <button onClick={onAddCard} className="text-xs text-indigo-600 font-bold">+ 新卡</button>
                    </div>
                </div>
                {creditCards.map((card: any) => (
                    <div key={card.id} onClick={() => onViewCard(card)} className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="font-bold text-lg">{card.name}</div>
                                <div className="bg-white/20 px-2 py-1 rounded text-xs">結帳日 {card.billingDay} 號</div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="text-slate-400 text-xs">查看帳單紀錄</div>
                                <div className="font-mono text-xl tracking-widest">**** ****</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- End of components/Views.tsx ---
