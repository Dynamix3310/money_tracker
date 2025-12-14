// Author: Senior Frontend Engineer
// OS support: Web
// Description: Main application component

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';
import { AuthScreen } from './components/Auth';
import { Loader2 } from 'lucide-react';

export default function App() {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!auth) {
         setLoading(false);
         return;
      }
      const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
      return () => unsub();
   }, []);

   if (loading) {
      return (
         <div className="min-h-screen w-full flex items-center justify-center bg-slate-100">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
         </div>
      );
   }

   if (!user) {
      return <AuthScreen />;
   }

   return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
            <h1 className="text-xl font-bold text-slate-800 mb-2">Welcome</h1>
            <p className="text-slate-500 mb-6">{user.email}</p>
            <button 
               onClick={() => auth.signOut()}
               className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
               Sign Out
            </button>
         </div>
      </div>
   );
}

// --- End of App.tsx ---