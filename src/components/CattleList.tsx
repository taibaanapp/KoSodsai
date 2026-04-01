import React, { useState } from 'react';
import { Plus, Search, Beef, Calendar, ChevronRight, Filter } from 'lucide-react';
import { Cattle } from '../types';
import { cn } from '../lib/utils';

interface CattleListProps {
  cattle: Cattle[];
  onAdd: () => void;
}

export const CattleList = ({ cattle, onAdd }: CattleListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCattle = cattle.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อวัว หรือสายพันธุ์..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-orange-600 transition-colors">
          <Filter size={18} />
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={onAdd}
        className="w-full py-4 bg-orange-600 text-white rounded-3xl font-bold text-sm shadow-lg shadow-orange-200 flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95"
      >
        <Plus size={18} />
        เพิ่มข้อมูลวัวใหม่
      </button>

      {/* Cattle List */}
      <div className="space-y-4">
        {filteredCattle.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-orange-200 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <Beef size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{c.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.breed}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    c.gender === 'male' ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                  )}>
                    {c.gender === 'male' ? 'พ่อพันธุ์' : 'แม่พันธุ์'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                <Calendar size={10} />
                {new Date(c.birthDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
              <ChevronRight size={16} className="text-gray-300 ml-auto" />
            </div>
          </div>
        ))}
        {filteredCattle.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Beef size={32} />
            </div>
            <p className="text-xs text-gray-400 italic">ไม่พบข้อมูลวัวที่ค้นหา</p>
          </div>
        )}
      </div>
    </div>
  );
};
