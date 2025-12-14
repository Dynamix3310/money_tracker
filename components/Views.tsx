// Author: Senior Frontend Engineer
// OS support: Web
// Description: Main View Components for App Tabs

import React from 'react';
import { Edit, Trash2, Link2, Plus, Repeat } from 'lucide-react';
import { Transaction, Person, Category, AssetHolding, Platform, BankAccount, CreditCardInfo, CreditCardLog } from '../types';

export const NavBtn = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
        <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
    </button>
);

export const PortfolioView = ({ holdings, platforms, onAddPlatform, onManagePlatform, onManageCash, onAddAsset, onUpdatePrices, onEdit, onSell, onDividend, onRebalance, baseCurrency, rates, convert, CURRENCY_SYMBOLS }: any) => {
    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button onClick={onUpdatePrices} className="whitespace-nowrap bg-white text-slate-700 px-4 py-2 rounded-xl shadow-sm border border-slate-100 font-bold text-sm flex items-center gap-2">更新報價</button>
                <button onClick={onRebalance} className="whitespace-nowrap bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl shadow-sm border border-indigo-100 font-bold text-sm flex items-center gap-2">再平衡</button>
                <button onClick={onAddAsset} className="whitespace-nowrap bg-indigo-600 text-white px-4 py-2 rounded-xl shadow font-bold text-sm flex items-center gap-2"><Plus size={16}/> 新增資產</button>
            </div>
            {holdings.length === 0 && platforms.length === 0 ? (
                <div className="text-center py-10 text-slate-400">尚無投資資料</div>
            ) : (
                <div className="space-y-3">
                    {platforms.map((p: Platform) => (
                         <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                 <h3 className="font-bold text-slate-700">{p.name}</h3>
                                 <span className="text-sm font-mono">{CURRENCY_SYMBOLS[p.currency]}{p.balance.toLocaleString()}</span>
                             </div>
                             <div className="text-xs text-slate-400">可用現金</div>
                         </div>
                    ))}
                    {holdings.map((h: AssetHolding) => (
                        <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center" onClick={() => onEdit(h)}>
                            <div>
                                <div className="font-bold text-slate-800">{h.symbol}</div>
                                <div className="text-xs text-slate-500">{h.quantity} 股 • Avg {h.avgCost.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-indigo-600">
                                    {CURRENCY_SYMBOLS[h.currency] || '$'}
                                    {((h.manualPrice ?? h.currentPrice) * h.quantity).toLocaleString()}
                                </div>
                                <div className={`text-xs ${(h.manualPrice ?? h.currentPrice) >= h.avgCost ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {((((h.manualPrice ?? h.currentPrice) - h.avgCost) / h.avgCost) * 100).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const LedgerView = ({ transactions, categories, people, cardLogs, onAdd, onEdit, currentGroupId, userId, onDelete, onManageRecurring, onBatchAdd }: any) => {
    // Logic from the snippet
    const myPersonId = people.find((p: Person) => p.isMe || p.uid === userId)?.id;
    const linkedIds = new Set(cardLogs.map((l: CreditCardLog) => l.linkedTransactionId).filter(Boolean));

    return (
        <div className="space-y-4">
            <div className="flex gap-2 pb-2">
                <button onClick={onManageRecurring} className="flex-1 bg-white text-slate-700 px-3 py-2 rounded-xl shadow-sm border border-slate-100 font-bold text-xs flex items-center justify-center gap-2"><Repeat size={14}/> 固定收支</button>
                <button onClick={onBatchAdd} className="flex-1 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl shadow-sm border border-indigo-100 font-bold text-xs flex items-center justify-center gap-2">AI 批量</button>
            </div>
            
            <div className="space-y-3">
                {transactions.sort((a: Transaction, b: Transaction) => b.date?.seconds - a.date?.seconds).map((t: Transaction) => {
                    const myShare = t.splitDetails && myPersonId ? (t.splitDetails[myPersonId] || 0) : 0;
                    
                    return (
                       <div key={t.id} className="bg-white px-4 py-3 rounded-xl border border-slate-100 flex justify-between items-center group">
                          <div className="flex gap-3 items-center">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${t.type==='income'?'bg-emerald-500':'bg-blue-100 text-blue-600'} relative`}>
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
                                 {myPersonId && t.payers?.[myPersonId] > 0 && (
                                     <div className="text-[10px] text-slate-400">
                                         我付: {Math.round(t.payers[myPersonId]).toLocaleString()}
                                     </div>
                                 )}
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
    );
};

export const CashView = ({ accounts, creditCards, onTransfer, onAddAccount, onManageAccount, onAddCard, onManageCard, onViewAccount, onViewCard }: any) => {
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                 <button onClick={onAddAccount} className="flex-1 bg-white p-3 rounded-xl shadow-sm border text-sm font-bold text-slate-700">新增帳戶</button>
                 <button onClick={onAddCard} className="flex-1 bg-white p-3 rounded-xl shadow-sm border text-sm font-bold text-slate-700">新增信用卡</button>
            </div>
            {accounts.map((a: BankAccount) => (
                <div key={a.id} onClick={() => onViewAccount(a)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="font-bold text-slate-700">{a.name}</div>
                    <div className="font-mono text-xl font-bold mt-1 text-slate-800">{a.currency} {(a.currentBalance || 0).toLocaleString()}</div>
                </div>
            ))}
            {creditCards.map((c: CreditCardInfo) => (
                 <div key={c.id} onClick={() => onViewCard(c)} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 rounded-xl shadow-lg">
                    <div className="font-bold text-sm opacity-80">{c.name}</div>
                    <div className="mt-4 text-xs text-slate-400">結帳日: 每月 {c.billingDay} 號</div>
                </div>
            ))}
        </div>
    );
};
// --- End of components/Views.tsx ---