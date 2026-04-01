/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  setDoc, 
  doc,
  getDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CattleList } from './components/CattleList';
import { FinanceList } from './components/FinanceList';
import { HistoryList } from './components/HistoryList';
import { AddCattleModal } from './components/AddCattleModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { initLiff, logout } from './lib/line';
import { User, Cattle, Transaction } from './types';
import { Beef, LogIn } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Modals
  const [isAddCattleOpen, setIsAddCattleOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  // Real Data
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 1. Initialize LIFF
  useEffect(() => {
    const setupLiff = async () => {
      const liffInstance = await initLiff();
      if (liffInstance) {
        setIsLiffReady(true);
        const profile = await liffInstance.getProfile();
        setUser({
          id: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });
      }
    };
    setupLiff();
  }, []);

  // 2. Initialize Firebase Auth (Anonymous for now to satisfy rules)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthReady(true);
      } else {
        signInAnonymously(auth).catch(err => console.error("Auth error", err));
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Sync User Profile to Firestore
  useEffect(() => {
    if (isAuthReady && user) {
      const syncUser = async () => {
        try {
          const userRef = doc(db, 'users', auth.currentUser!.uid);
          await setDoc(userRef, {
            displayName: user.displayName,
            pictureUrl: user.pictureUrl || null,
            lineUserId: user.id,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing user", error);
        }
      };
      syncUser();
    }
  }, [isAuthReady, user]);

  // 4. Real-time Listeners
  useEffect(() => {
    if (!isAuthReady || !auth.currentUser) return;

    const cattleQuery = query(
      collection(db, 'cattle'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeCattle = onSnapshot(cattleQuery, (snapshot) => {
      const cattleData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cattle[];
      setCattle(cattleData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cattle');
    });

    const txQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubscribeCattle();
      unsubscribeTx();
    };
  }, [isAuthReady]);

  const handleAddCattle = async (newCattle: Omit<Cattle, 'id' | 'userId' | 'createdAt'>) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'cattle'), {
        ...newCattle,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cattle');
    }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newTx,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  if (!isLiffReady && import.meta.env.VITE_LIFF_ID) {
    return (
      <div className="min-h-screen bg-orange-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border-4 border-white/30">
          <Beef size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-black mb-2">โคสดใส</h1>
        <p className="text-sm opacity-80 mb-8">กำลังเตรียมความพร้อมระบบจัดการฟาร์ม...</p>
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white w-1/3 animate-[loading_1.5s_infinite_ease-in-out]"></div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  if (!user && !import.meta.env.VITE_LIFF_ID) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Beef size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">ยินดีต้อนรับสู่ โคสดใส</h2>
          <p className="text-xs text-gray-500 mb-8">กรุณาเข้าสู่ระบบผ่าน LINE เพื่อเริ่มจัดการฟาร์มของคุณ</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-[#06C755] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-100 hover:brightness-95 transition-all active:scale-95"
          >
            <LogIn size={20} />
            เข้าสู่ระบบด้วย LINE
          </button>
          <p className="mt-6 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Powered by KoSodsai Team</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={logout}>
      {activeTab === 'dashboard' && <Dashboard user={user} cattle={cattle} transactions={transactions} />}
      {activeTab === 'cattle' && <CattleList cattle={cattle} onAdd={() => setIsAddCattleOpen(true)} />}
      {activeTab === 'finance' && <FinanceList transactions={transactions} onAdd={() => setIsAddTransactionOpen(true)} />}
      {activeTab === 'history' && <HistoryList cattle={cattle} transactions={transactions} />}
      
      <AddCattleModal 
        isOpen={isAddCattleOpen} 
        onClose={() => setIsAddCattleOpen(false)} 
        onSave={handleAddCattle} 
      />
      <AddTransactionModal 
        isOpen={isAddTransactionOpen} 
        onClose={() => setIsAddTransactionOpen(false)} 
        onSave={handleAddTransaction} 
      />
    </Layout>
  );
}
