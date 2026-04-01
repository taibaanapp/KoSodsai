import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { Beef, LogIn, User as UserIcon, Calendar, Clock, ShieldCheck } from 'lucide-react';

interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl: string;
  firstJoined: string;
  lastLogin: string;
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          
          // Sync with our backend
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

  const handleLogin = () => {
    liff.login();
  };

  const handleLogout = () => {
    liff.logout();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-600 flex flex-col items-center justify-center p-6 text-white">
        <div className="animate-bounce mb-4">
          <Beef size={64} />
        </div>
        <p className="font-bold tracking-widest animate-pulse">LOADING KOSODSAI...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-orange-100/50 border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-orange-500 p-8 text-white text-center relative">
          <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <ShieldCheck size={20} />
          </div>
          <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Beef size={40} className="text-orange-500" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">โคสดใส</h1>
          <p className="text-orange-100 text-xs uppercase tracking-[0.2em] font-bold mt-1">LINE Native Farm Management</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {!profile ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                ยินดีต้อนรับสู่ระบบจัดการฟาร์มวัวอัจฉริยะ<br/>
                กรุณาเข้าสู่ระบบด้วย LINE เพื่อเริ่มใช้งาน
              </p>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-[#06C755] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-100 hover:brightness-95 transition-all active:scale-95"
              >
                <LogIn size={20} />
                LOGIN WITH LINE
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-gray-100">
                <img 
                  src={profile.pictureUrl || 'https://via.placeholder.com/150'} 
                  alt={profile.displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Welcome back,</p>
                  <h2 className="text-xl font-black text-gray-900 truncate">{profile.displayName}</h2>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LINE User ID</p>
                    <p className="text-xs font-mono text-gray-700 truncate max-w-[200px]">{profile.userId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Joined</p>
                    <p className="text-xs font-bold text-gray-700">
                      {new Date(profile.firstJoined).toLocaleDateString('th-TH', { 
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Login</p>
                    <p className="text-xs font-bold text-gray-700">
                      {new Date(profile.lastLogin).toLocaleDateString('th-TH', { 
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full py-3 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
              >
                Logout from System
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Powered by TaibaanApp Team
          </p>
        </div>
      </div>
    </div>
  );
}
