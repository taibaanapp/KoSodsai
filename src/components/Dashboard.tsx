import React from 'react';
import { TrendingUp, TrendingDown, Beef, Calendar, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Cattle, Transaction } from '../types';
import { cn } from '../lib/utils';

const data = [
  { name: 'ม.ค.', income: 4000, expense: 2400 },
  { name: 'ก.พ.', income: 3000, expense: 1398 },
  { name: 'มี.ค.', income: 2000, expense: 9800 },
  { name: 'เม.ย.', income: 2780, expense: 3908 },
  { name: 'พ.ค.', income: 1890, expense: 4800 },
  { name: 'มิ.ย.', income: 2390, expense: 3800 },
];

interface DashboardProps {
  user: User | null;
  cattle: Cattle[];
  transactions: Transaction[];
}

export const Dashboard = ({ user, cattle, transactions }: DashboardProps) => {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">รายรับ</span>
          </div>
          <p className="text-lg font-bold text-gray-900">฿{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown size={16} />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">รายจ่าย</span>
          </div>
          <p className="text-lg font-bold text-gray-900">฿{totalExpense.toLocaleString()}</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-orange-600 p-6 rounded-3xl shadow-lg shadow-orange-200 text-white relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-xs font-medium opacity-80 uppercase tracking-widest">ยอดคงเหลือสุทธิ</span>
          <h2 className="text-3xl font-black mt-1">฿{balance.toLocaleString()}</h2>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
            <Calendar size={12} />
            สรุปประจำเดือน มีนาคม 2024
          </div>
        </div>
        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-gray-900">สถิติรายรับ-รายจ่าย</h3>
          <button className="text-[10px] font-bold text-orange-600 flex items-center gap-1">
            ดูทั้งหมด <ChevronRight size={12} />
          </button>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="income" stroke="#16a34a" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#dc2626" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cattle Summary */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-gray-900">วัวในฟาร์ม ({cattle.length})</h3>
          <button className="text-[10px] font-bold text-orange-600 flex items-center gap-1">
            จัดการ <ChevronRight size={12} />
          </button>
        </div>
        <div className="space-y-4">
          {cattle.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm text-orange-600">
                  <Beef size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{c.name}</p>
                  <p className="text-[10px] text-gray-500">{c.breed}</p>
                </div>
              </div>
              <div className={cn(
                "px-2 py-1 text-[8px] font-black rounded-full uppercase tracking-widest",
                c.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
              )}>
                {c.status === 'active' ? 'ปกติ' : 'จำหน่าย'}
              </div>
            </div>
          ))}
          {cattle.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-4 italic">ยังไม่มีข้อมูลวัวในระบบ</p>
          )}
        </div>
      </div>
    </div>
  );
};
