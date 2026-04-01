import React, { useState } from 'react';
import { X, Beef, Calendar, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { Cattle } from '../types';

interface AddCattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cattle: Omit<Cattle, 'id' | 'userId' | 'createdAt'>) => void;
}

export const AddCattleModal = ({ isOpen, onClose, onSave }: AddCattleModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthDate: new Date().toISOString().split('T')[0],
    gender: 'female' as 'male' | 'female',
    status: 'active' as const,
    notes: ''
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
              <Beef size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-900">เพิ่มข้อมูลวัวใหม่</h3>
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
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ชื่อวัว / เบอร์หู</label>
            <input
              required
              type="text"
              placeholder="เช่น บัวบาน, 001"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">สายพันธุ์</label>
            <input
              required
              type="text"
              placeholder="เช่น บราห์มัน, พื้นเมือง"
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">เพศ</label>
              <div className="flex p-1 bg-gray-50 rounded-2xl border border-transparent">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider ${
                      formData.gender === g ? "bg-white shadow-sm text-orange-600" : "text-gray-400"
                    }`}
                  >
                    {g === 'male' ? 'ผู้' : 'เมีย'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">วันเกิด</label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">บันทึกเพิ่มเติม</label>
            <textarea
              rows={3}
              placeholder="รายละเอียดอื่นๆ..."
              className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-orange-600 text-white rounded-3xl font-bold text-sm shadow-lg shadow-orange-200 flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95 mt-4"
          >
            <Save size={18} />
            บันทึกข้อมูล
          </button>
        </form>
      </motion.div>
    </div>
  );
};
