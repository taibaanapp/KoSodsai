import React from 'react';
import { History, Calendar, Beef, Wallet, ChevronRight } from 'lucide-react';
import { Cattle, Transaction } from '../types';
import { cn } from '../lib/utils';

interface HistoryListProps {
  cattle: Cattle[];
  transactions: Transaction[];
}

export const HistoryList = ({ cattle, transactions }: HistoryListProps) => {
  // Combine and sort by date
  const allEvents = [
    ...cattle.map(c => ({ type: 'cattle', date: c.createdAt, data: c })),
    ...transactions.map(t => ({ type: 'finance', date: t.createdAt, data: t }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-6">ประวัติกิจกรรมล่าสุด</h3>
        <div className="space-y-8 relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100"></div>

          {allEvents.map((event, idx) => (
            <div key={idx} className="relative pl-10">
              {/* Dot */}
              <div className={cn(
                "absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10",
                event.type === 'cattle' ? "bg-orange-500" : "bg-blue-500"
              )}></div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {new Date(event.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-sm hover:border-orange-100 border border-transparent transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl text-white",
                      event.type === 'cattle' ? "bg-orange-500" : "bg-blue-500"
                    )}>
                      {event.type === 'cattle' ? <Beef size={14} /> : <Wallet size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {event.type === 'cattle' 
                          ? `เพิ่มวัวใหม่: ${(event.data as Cattle).name}` 
                          : `บันทึก${(event.data as Transaction).type === 'income' ? 'รายรับ' : 'รายจ่าย'}: ${(event.data as Transaction).category}`
                        }
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {event.type === 'cattle' 
                          ? (event.data as Cattle).breed 
                          : `฿${(event.data as Transaction).amount.toLocaleString()}`
                        }
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            </div>
          ))}

          {allEvents.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <History size={32} />
              </div>
              <p className="text-xs text-gray-400 italic">ยังไม่มีประวัติกิจกรรม</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
