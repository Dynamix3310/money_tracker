import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const ExpensePieChart = ({ data }: { data: { name: string, value: number }[] }) => {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-sm">無資料</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          fill="#8884d8"
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
           contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
           formatter={(value: number) => `$${value.toLocaleString()}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const CashFlowBarChart = ({ data }: { data: any[] }) => {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-sm">無資料</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
        <Tooltip 
           cursor={{fill: '#f8fafc'}}
           contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
        />
        <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
        <Bar dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
        <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const NetWorthAreaChart = ({ data }: { data: { label: string, value: number }[] }) => {
   if (data.length < 2) return <div className="h-full flex items-center justify-center text-slate-300 text-xs">累積更多數據以顯示趨勢</div>;
   return (
     <ResponsiveContainer width="100%" height="100%">
       <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
         <defs>
           <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
             <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
             <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
           </linearGradient>
         </defs>
         <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
         <Tooltip contentStyle={{display: 'none'}} />
       </AreaChart>
     </ResponsiveContainer>
   );
};