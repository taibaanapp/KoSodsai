import React from 'react';
import { Beef, CheckCircle2, Globe, MessageSquare } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-orange-100/50 p-10 border border-gray-100 text-center relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
        
        <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
          <Beef size={48} strokeWidth={2.5} />
        </div>

        <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
          โคสดใส <span className="text-orange-500">KoSodsai</span>
        </h1>
        
        <p className="text-gray-500 text-sm mb-10 leading-relaxed">
          ระบบจัดการฟาร์มวัวอัจฉริยะ<br />
          <span className="font-medium">Messaging API Status:</span> <span className="text-green-600 font-bold">Online</span>
        </p>

        <div className="space-y-4 mb-10">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Webhook Endpoint</p>
              <p className="text-[10px] text-gray-500 font-mono">/api/webhook</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Messaging API</p>
              <p className="text-[10px] text-gray-500">Echo Mode Active</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Deployment</p>
              <p className="text-[10px] text-gray-500">Railway Production</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-50">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Powered by TaibaanApp Team
          </p>
        </div>
      </div>
    </div>
  );
}
