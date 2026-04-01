import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Zap, Database, ArrowLeft, Calendar } from 'lucide-react';

interface AdminStats {
  dailyStats: {
    date: string;
    activeUsers: number;
    totalTokens: number;
    promptTokens: number;
    responseTokens: number;
  }[];
  totalUsers: number;
  totalTransactions: number;
}

interface AdminDashboardProps {
  userId: string;
  onClose: () => void;
}

export default function AdminDashboard({ userId, onClose }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/stats?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized or error fetching stats');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[200] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-red-500 mb-4">⚠️ {error}</div>
      <button onClick={onClose} className="px-6 py-2 bg-gray-100 rounded-xl">กลับ</button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-50 z-[200] overflow-y-auto pb-20">
      <div className="bg-orange-500 p-6 text-white sticky top-0 z-10 flex items-center gap-4">
        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-black">Admin Dashboard</h1>
          <p className="text-xs opacity-80">Line โคสดใส Monitoring</p>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                <Users size={20} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase">ผู้ใช้ทั้งหมด</span>
            </div>
            <div className="text-2xl font-black text-gray-800">{stats?.totalUsers.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 text-green-500 rounded-xl">
                <Database size={20} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase">รายการทั้งหมด</span>
            </div>
            <div className="text-2xl font-black text-gray-800">{stats?.totalTransactions.toLocaleString()}</div>
          </div>
        </div>

        {/* Token Usage Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <Zap size={20} />
            </div>
            <h2 className="font-black text-gray-800">การใช้ Token รายวัน</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyStats.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 10}} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="totalTokens" fill="#f97316" radius={[4, 4, 0, 0]} name="Tokens" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Users Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
              <Users size={20} />
            </div>
            <h2 className="font-black text-gray-800">ผู้ใช้งาน (Active Users)</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.dailyStats.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 10}} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="activeUsers" stroke="#a855f7" strokeWidth={3} dot={{r: 4}} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h2 className="font-black text-gray-800">รายละเอียดรายวัน</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">วันที่</th>
                  <th className="px-6 py-4">ผู้ใช้</th>
                  <th className="px-6 py-4">Tokens รวม</th>
                  <th className="px-6 py-4">Prompt/Resp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.dailyStats.map((day) => (
                  <tr key={day.date} className="text-sm">
                    <td className="px-6 py-4 font-medium text-gray-600">{day.date}</td>
                    <td className="px-6 py-4 text-gray-800 font-bold">{day.activeUsers}</td>
                    <td className="px-6 py-4 text-orange-600 font-bold">{day.totalTokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {day.promptTokens.toLocaleString()} / {day.responseTokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
