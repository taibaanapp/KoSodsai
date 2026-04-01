import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { Beef, LogIn, User, Calendar, Clock, ShieldCheck, Plus, Trash2, LayoutDashboard, ListOrdered, Home, StickyNote, Save, Sparkles, Milk, Wheat, PlusSquare, ShoppingCart, ChevronDown, BarChart3, History, LogOut, Search, ChevronRight, TrendingUp, TrendingDown, FileText, Settings, X } from 'lucide-react';

interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl: string;
  firstJoined: string;
  lastLogin: string;
}

interface Cow {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  type: string;
  category: string;
  amount: number;
  note: string;
  cowName: string;
  date: string;
}

interface FarmInfo {
  farmName: string;
  ownerName: string;
  location: string;
  contact: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  date: string;
}

type Tab = 'dashboard' | 'transactions' | 'cows' | 'farm' | 'notes' | 'reports' | 'settings';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cows, setCows] = useState<Cow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [farmInfo, setFarmInfo] = useState<FarmInfo>({ farmName: '', ownerName: '', location: '', contact: '' });
  const [notes, setNotes] = useState<Note[]>([]);
  const [aiUsage, setAiUsage] = useState<number>(0);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [newCowName, setNewCowName] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (userId: string) => {
    try {
      const [cowsRes, transRes, farmRes, notesRes, aiRes] = await Promise.all([
        fetch(`/api/cows?userId=${userId}`),
        fetch(`/api/transactions?userId=${userId}`),
        fetch(`/api/farm?userId=${userId}`),
        fetch(`/api/notes?userId=${userId}`),
        fetch(`/api/ai-usage?userId=${userId}`)
      ]);

      if (cowsRes.ok) setCows(await cowsRes.json());
      if (transRes.ok) setTransactions(await transRes.json());
      if (farmRes.ok) setFarmInfo(await farmRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
      if (aiRes.ok) {
        const data = await aiRes.json();
        setAiUsage(data.total);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId) {
          setError("VITE_LIFF_ID is missing in environment variables.");
          setLoading(false);
          return;
        }

        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          const lineProfile = await liff.getProfile();
          
          const response = await fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: lineProfile.userId,
              displayName: lineProfile.displayName,
              pictureUrl: lineProfile.pictureUrl
            })
          });

          if (response.ok) {
            const userData = await response.json();
            setProfile(userData);
            await fetchData(lineProfile.userId);

            // Handle URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const tid = urlParams.get('tid');
            const tab = urlParams.get('tab');

            if (tab === 'transactions') {
              setActiveTab('transactions');
            }

            if (tid) {
              // Fetch transactions first to find the one to edit
              const transRes = await fetch(`/api/transactions?userId=${lineProfile.userId}`);
              if (transRes.ok) {
                const allTrans: Transaction[] = await transRes.ok ? await transRes.json() : [];
                const toEdit = allTrans.find(t => t.id === parseInt(tid));
                if (toEdit) {
                  setEditingTransaction(toEdit);
                  setActiveTab('transactions');
                }
              }
            }
          } else {
            setError("Failed to sync user data with server.");
          }
        }
      } catch (err: any) {
        console.error("LIFF Init Error:", err);
        setError(err.message || "An error occurred during LINE login.");
      } finally {
        setLoading(false);
      }
    };

    initLiff();
  }, []);

  const handleAddCow = async () => {
    if (!newCowName.trim() || !profile) return;
    try {
      const res = await fetch('/api/cows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.userId, name: newCowName.trim() })
      });
      if (res.ok) {
        setNewCowName('');
        await fetchData(profile.userId);
      }
    } catch (err) {
      console.error("Error adding cow:", err);
    }
  };

  const handleDeleteCow = async (id: number) => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/cows/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData(profile.userId);
    } catch (err) {
      console.error("Error deleting cow:", err);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/transactions/${id}?userId=${profile.userId}`, { method: 'DELETE' });
      if (res.ok) await fetchData(profile.userId);
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  };

  const handleUpdateFarm = async () => {
    if (!profile) return;
    try {
      const res = await fetch('/api/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.userId, ...farmInfo })
      });
      if (res.ok) alert("บันทึกข้อมูลฟาร์มแล้ว");
    } catch (err) {
      console.error("Error updating farm:", err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.title.trim() || !profile) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.userId, ...newNote })
      });
      if (res.ok) {
        setNewNote({ title: '', content: '' });
        await fetchData(profile.userId);
      }
    } catch (err) {
      console.error("Error adding note:", err);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData(profile.userId);
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction || !profile) return;
    try {
      const res = await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingTransaction, userId: profile.userId })
      });
      if (res.ok) {
        setEditingTransaction(null);
        await fetchData(profile.userId);
      }
    } catch (err) {
      console.error("Error updating transaction:", err);
    }
  };

  const handleLogin = () => liff.login();
  const handleLogout = () => { liff.logout(); window.location.reload(); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1B4332] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="animate-bounce mb-6"><Beef size={80} /></div>
        <p className="font-black text-xl tracking-widest animate-pulse uppercase font-display">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.type === filter;
    const matchesSearch = t.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.cowName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('ขาย') || lower.includes('sell')) return <ShoppingCart size={32} className="text-orange-600" />;
    if (lower.includes('อาหาร') || lower.includes('feed')) return <Wheat size={32} className="text-yellow-600" />;
    if (lower.includes('ยา') || lower.includes('รักษา') || lower.includes('หมอ')) return <PlusSquare size={32} className="text-green-600" />;
    if (lower.includes('ผสม') || lower.includes('พันธุ์')) return <Beef size={32} className="text-pink-500" />;
    return <Beef size={32} className="text-gray-400" />;
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9F5] font-sans relative pb-32">
      {/* Top Green Accent Background */}
      <div className="h-48 bg-[#1B4332] w-full absolute top-0 left-0 z-0 rounded-b-[3rem]" />

      <div className="max-w-md mx-auto relative z-10 pt-8 px-4">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="text-white">
            <h1 className="text-3xl font-black font-display leading-tight tracking-tight">
              ประวัติฟาร์ม
            </h1>
            <p className="text-[#D8F3DC] font-medium opacity-90">จัดการข้อมูลวัวและรายการบัญชี</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
            {profile?.pictureUrl ? (
              <img 
                src={profile.pictureUrl} 
                alt="โปรไฟล์" 
                className="w-10 h-10 rounded-full border-2 border-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-[#2D6A4F] rounded-full flex items-center justify-center text-white font-bold">
                {profile?.displayName?.charAt(0) || 'ฟ'}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-green-900/10 border border-gray-100 overflow-hidden min-h-[70vh] mb-8">
          
          {activeTab === 'transactions' && (
            <div className="p-6 space-y-6">
              {/* Date Selector */}
              <div className="flex items-center justify-between bg-[#F8F9F5] border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-[#1B4332]" />
                  <span className="text-sm font-bold text-gray-800">1 เม.ย. 2569 – 30 เม.ย. 2569</span>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหารายการ..."
                  className="w-full bg-[#F8F9F5] border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Segmented Control */}
              <div className="flex p-1 bg-[#F8F9F5] rounded-2xl border border-gray-200">
                <button 
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${filter === 'all' ? 'bg-white text-[#1B4332] shadow-md' : 'text-gray-500'}`}
                >
                  ทั้งหมด
                </button>
                <button 
                  onClick={() => setFilter('income')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${filter === 'income' ? 'bg-white text-[#2D6A4F] shadow-md' : 'text-gray-500'}`}
                >
                  รายรับ
                </button>
                <button 
                  onClick={() => setFilter('expense')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${filter === 'expense' ? 'bg-white text-[#A4161A] shadow-md' : 'text-gray-500'}`}
                >
                  รายจ่าย
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-4 pt-2">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <div 
                      key={t.id} 
                      className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-3xl hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => setEditingTransaction(t)}
                    >
                      <div className="w-14 h-14 bg-[#F8F9F5] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        {getCategoryIcon(t.category)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-base">{t.category}</h4>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.cowName}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black font-display ${t.type === 'income' ? 'text-[#2D6A4F]' : 'text-[#A4161A]'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(t.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-[#F8F9F5] rounded-full flex items-center justify-center mx-auto">
                      <Search size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-bold">ไม่พบรายการที่ค้นหา</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 font-display">สรุปภาพรวม</h3>
                <p className="text-sm font-bold text-gray-400">ข้อมูลฟาร์มประจำเดือนนี้</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-[#D8F3DC] p-6 rounded-[2rem] border border-[#B7E4C7] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white rounded-2xl text-[#2D6A4F]">
                      <TrendingUp size={24} />
                    </div>
                    <span className="text-xs font-black text-[#2D6A4F] uppercase tracking-widest">รายรับ</span>
                  </div>
                  <p className="text-sm font-bold text-[#2D6A4F]/70 mb-1">รายรับทั้งหมด</p>
                  <p className="text-4xl font-black text-[#1B4332] font-display">฿{totalIncome.toLocaleString()}</p>
                </div>

                <div className="bg-[#FEE2E2] p-6 rounded-[2rem] border border-[#FECACA] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white rounded-2xl text-[#A4161A]">
                      <TrendingDown size={24} />
                    </div>
                    <span className="text-xs font-black text-[#A4161A] uppercase tracking-widest">รายจ่าย</span>
                  </div>
                  <p className="text-sm font-bold text-[#A4161A]/70 mb-1">รายจ่ายทั้งหมด</p>
                  <p className="text-4xl font-black text-[#7F1D1D] font-display">฿{totalExpense.toLocaleString()}</p>
                </div>

                <div className="bg-[#1B4332] p-8 rounded-[2.5rem] shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-sm font-bold text-white/70 mb-2 uppercase tracking-widest">กำไรสุทธิ</p>
                    <p className="text-5xl font-black font-display">฿{(totalIncome - totalExpense).toLocaleString()}</p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs font-bold">กำไรสุทธิเดือนนี้</span>
                    </div>
                  </div>
                  <BarChart3 size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cows' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900 font-display">วัวในฟาร์ม</h3>
                <button className="bg-[#1B4332] text-white p-3 rounded-2xl shadow-lg shadow-green-900/20">
                  <Plus size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {cows.map(cow => (
                  <div key={cow.id} className="bg-[#F8F9F5] p-5 rounded-[2rem] border border-gray-100 hover:shadow-md transition-all text-center space-y-3">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      <Beef size={32} className="text-[#1B4332]" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg">{cow.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cow.breed || 'ไม่ระบุสายพันธุ์'}</p>
                    </div>
                    <div className="pt-2">
                      <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-[#1B4332] border border-gray-100">
                        {cow.status || 'ปกติ'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'farm' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900 font-display">ข้อมูลฟาร์ม</h3>
                <button onClick={handleUpdateFarm} className="bg-[#1B4332] text-white p-3 rounded-2xl shadow-lg shadow-green-900/20">
                  <Save size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">ชื่อฟาร์ม</label>
                  <input 
                    type="text" 
                    value={farmInfo.farmName} 
                    onChange={e => setFarmInfo({...farmInfo, farmName: e.target.value})} 
                    className="w-full bg-[#F8F9F5] border-2 border-gray-100 rounded-3xl p-5 text-lg font-bold text-gray-900 focus:border-[#1B4332] focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">เจ้าของฟาร์ม</label>
                  <input 
                    type="text" 
                    value={farmInfo.ownerName} 
                    onChange={e => setFarmInfo({...farmInfo, ownerName: e.target.value})} 
                    className="w-full bg-[#F8F9F5] border-2 border-gray-100 rounded-3xl p-5 text-lg font-bold text-gray-900 focus:border-[#1B4332] focus:outline-none transition-all" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900 font-display">บันทึก</h3>
                <button onClick={handleAddNote} className="bg-[#1B4332] text-white p-3 rounded-2xl shadow-lg shadow-green-900/20">
                  <Plus size={20} />
                </button>
              </div>
              
              <div className="bg-[#F8F9F5] p-6 rounded-[2.5rem] space-y-4 border border-gray-100">
                <input 
                  type="text" 
                  value={newNote.title} 
                  onChange={e => setNewNote({...newNote, title: e.target.value})} 
                  placeholder="หัวข้อบันทึก..." 
                  className="w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-[#1B4332]/20" 
                />
                <textarea 
                  value={newNote.content} 
                  onChange={e => setNewNote({...newNote, content: e.target.value})} 
                  placeholder="รายละเอียด..." 
                  className="w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-medium h-32 focus:ring-2 focus:ring-[#1B4332]/20" 
                />
              </div>

              <div className="space-y-4">
                {notes.map(note => (
                  <div key={note.id} className="p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm relative group">
                    <button 
                      onClick={() => handleDeleteNote(note.id)} 
                      className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <h4 className="text-lg font-black text-gray-900 pr-12 leading-tight">{note.title}</h4>
                    <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap font-medium leading-relaxed">{note.content}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Calendar size={12} className="text-gray-300" />
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        {new Date(note.date).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="p-8 space-y-8">
              <h3 className="text-2xl font-black text-gray-900 font-display">รายงาน</h3>
              <div className="space-y-4">
                <div className="bg-[#F8F9F5] p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <FileText size={24} className="text-[#1B4332]" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">รายงานการเจริญเติบโต</p>
                    <p className="text-xs font-bold text-gray-400">ประจำเดือน เมษายน</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto text-gray-300" />
                </div>
                <div className="bg-[#F8F9F5] p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <FileText size={24} className="text-[#1B4332]" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">รายงานค่าอาหารและยา</p>
                    <p className="text-xs font-bold text-gray-400">ประจำเดือน เมษายน</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto text-gray-300" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-8 space-y-8">
              <h3 className="text-2xl font-black text-gray-900 font-display">ตั้งค่า</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-[#F8F9F5] rounded-3xl border border-gray-100">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <User size={24} className="text-[#1B4332]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{profile?.displayName || 'ผู้ใช้งานฟาร์ม'}</p>
                    <p className="text-xs font-bold text-gray-400">จัดการโปรไฟล์</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 bg-red-50 rounded-3xl border border-red-100 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <LogOut size={24} />
                  </div>
                  <p className="font-bold">ออกจากระบบ</p>
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

      {/* Sleek Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8">
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-3 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-[#1B4332] text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={22} />
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${activeTab === 'transactions' ? 'bg-[#1B4332] text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <History size={22} />
          </button>
          <button 
            className="flex flex-col items-center justify-center w-16 h-16 rounded-3xl bg-[#2D6A4F] text-white shadow-xl shadow-green-900/30 -mt-8 border-4 border-[#F8F9F5] hover:scale-110 transition-transform"
          >
            <Plus size={28} />
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${activeTab === 'reports' ? 'bg-[#1B4332] text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <BarChart3 size={22} />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-[#1B4332] text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* Redesigned Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 space-y-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-gray-900 font-display">แก้ไขรายการ</h3>
              <button onClick={() => setEditingTransaction(null)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">จำนวนเงิน (฿)</label>
                <input 
                  type="number" 
                  className="w-full bg-[#F8F9F5] border-2 border-gray-100 rounded-3xl p-6 text-3xl font-black font-display text-[#1B4332] focus:border-[#1B4332] focus:outline-none transition-all"
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({...editingTransaction, amount: Number(e.target.value)})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setEditingTransaction({...editingTransaction, type: 'income'})}
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${editingTransaction.type === 'income' ? 'bg-[#D8F3DC] border-[#2D6A4F] text-[#1B4332]' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  รายรับ
                </button>
                <button 
                  onClick={() => setEditingTransaction({...editingTransaction, type: 'expense'})}
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${editingTransaction.type === 'expense' ? 'bg-[#FEE2E2] border-[#A4161A] text-[#7F1D1D]' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  รายจ่าย
                </button>
              </div>

              <button 
                onClick={handleUpdateTransaction}
                className="w-full bg-[#1B4332] text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-green-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
