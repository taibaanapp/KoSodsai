import React, { useState } from 'react';
import { Plus, Search, Wallet, ArrowUpRight, ArrowDownLeft, Filter, Calendar } from 'lucide-react';
import { Transaction } from '../types';
import { cn } from '../lib/utils';

interface FinanceListProps {
  transactions: Transaction[];
  onAdd: () => void;
}

export const FinanceList = ({ transactions, onAdd }: FinanceListProps) => {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTransactions = transactions.filter(t => 
    filter === 'all' ? true : t.type === filter
  );

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider",
              filter === f ? "bg-orange-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            {f === 'all' ? 'ทั้งหมด' : f === 'income' ? 'รายรับ' : 'รายจ่าย'}
          </button>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={onAdd}
        className="w-full py-4 bg-orange-600 text-white rounded-3xl font-bold text-sm shadow-lg shadow-orange-200 flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95"
      >
        <Plus size={18} />
        บันทึกรายการใหม่
      </button>

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTransactions.map((t) => (
          <div key={t.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-orange-200 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                t.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              )}>
                {t.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{t.category}</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">{t.description || 'ไม่มีคำอธิบาย'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-sm font-black",
                t.type === 'income' ? "text-green-600" : "text-red-600"
              )}>
                {t.type === 'income' ? '+' : '-'} ฿{t.amount.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[8px] text-gray-400 mt-1 justify-end font-bold uppercase tracking-widest">
                <Calendar size={8} />
                {new Date(t.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Wallet size={32} />
            </div>
            <p className="text-xs text-gray-400 italic">ยังไม่มีรายการบันทึก</p>
          </div>
        )}
      </div>
    </div>
  );
};
