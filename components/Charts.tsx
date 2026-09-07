import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, ComposedChart, Line, ReferenceLine
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
          isAnimationActive={false}
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

// 收支長條 + 獨秀指數折線 (右軸)。指數 = 我的能力收入 / 我的生活成本，1.0 代表剛好打平。
export const CashFlowBarChart = ({ data }: { data: any[] }) => {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-sm">無資料</div>;
  const indexValues = data.map(d => d.soloIndex).filter((v: any) => typeof v === 'number');
  const hasIndex = indexValues.length > 0;
  const maxIndex = hasIndex ? Math.max(1.5, ...indexValues) : 1.5;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: hasIndex ? 0 : 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
        {hasIndex && <YAxis yAxisId="right" orientation="right" width={34} domain={[0, maxIndex]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#8b5cf6'}} tickFormatter={(v: number) => v.toFixed(1)} />}
        <Tooltip 
           cursor={{fill: '#f8fafc'}}
           contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
           formatter={(value: number, name: string) => name === '獨秀指數' ? [value.toFixed(2), name] : [`$${Math.round(value).toLocaleString()}`, name]}
        />
        <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
        <Bar yAxisId="left" dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} isAnimationActive={false} />
        <Bar yAxisId="left" dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} isAnimationActive={false} />
        {hasIndex && <ReferenceLine yAxisId="right" y={1} stroke="#c4b5fd" strokeDasharray="4 4" />}
        {hasIndex && <Line yAxisId="right" type="monotone" dataKey="soloIndex" name="獨秀指數" stroke="#8b5cf6" strokeWidth={2} dot={{r: 3, fill: '#8b5cf6'}} connectNulls={false} isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export const NetWorthAreaChart = ({ data }: { data: { label: string, value: number }[] }) => {
   if (data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 text-xs">無資料</div>;
   const chartData = data.length === 1 ? [data[0], data[0]] : data;
   return (
     <ResponsiveContainer width="100%" height="100%">
       <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
         <defs>
           <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
             <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
             <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
           </linearGradient>
         </defs>
         <XAxis dataKey="label" hide />
         <YAxis domain={['auto', 'auto']} hide />
         <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" isAnimationActive={false} />
         <Tooltip 
           contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
           formatter={(value: number) => `$${value.toLocaleString()}`}
         />
       </AreaChart>
     </ResponsiveContainer>
   );
};