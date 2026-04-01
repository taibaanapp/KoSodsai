import React, { useState } from 'react';
import { X, Wallet, Calendar, Save, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => void;
}

export const AddTransactionModal = ({ isOpen, onClose, onSave }: AddTransactionModalProps) => {
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Wallet size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-900">บันทึกรายการบัญชี</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
          onClose();
        }}>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ประเภทรายการ</label>
            <div className="flex p-1 bg-gray-50 rounded-2xl border border-transparent">
              {(['income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t })}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
                    formData.type === t 
                      ? t === 'income' ? "bg-white shadow-sm text-green-600" : "bg-white shadow-sm text-red-600"
                      : "text-gray-400"
                  }`}
                >
                  {t === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                  {t === 'income' ? 'รายรับ' : 'รายจ่าย'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">หมวดหมู่</label>
              <input
                required
                type="text"
                placeholder="เช่น ค่าอาหาร, ขายวัว"
                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">จำนวนเงิน (บาท)</label>
              <input
                required
                type="number"
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">วันที่</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">คำอธิบายเพิ่มเติม</label>
            <textarea
              rows={2}
              placeholder="รายละเอียด..."
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-orange-600 text-white rounded-3xl font-bold text-sm shadow-lg shadow-orange-200 flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95 mt-4"
          >
            <Save size={18} />
            บันทึกรายการ
          </button>
        </form>
      </motion.div>
    </div>
  );
};
