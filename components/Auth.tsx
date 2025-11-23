
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, getCollectionPath, getUserProfilePath, getGroupMetaPath } from '../services/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { Loader2, LogIn, UserPlus, Wallet } from 'lucide-react';

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For registration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Registration Flow
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        
        // Use transaction to enforce user limit and ensure atomicity
        await import('firebase/firestore').then(async ({ runTransaction, doc }) => {
            await runTransaction(db, async (transaction) => {
                // 1. Check User Limit
                const statsRef = doc(db, 'artifacts/wealthflow-stable-restore/metadata/stats');
                const statsSnap = await transaction.get(statsRef);
                
                let currentCount = 0;
                if (statsSnap.exists()) {
                    currentCount = statsSnap.data().userCount || 0;
                }

                if (currentCount >= 20) {
                    throw new Error("Registration limit reached (Max 20 users).");
                }

                // 2. Prepare Data
                const newGroupId = doc(collection(db, 'artifacts/wealthflow-stable-restore/groups')).id;
                const groupRef = doc(db, 'artifacts/wealthflow-stable-restore/groups', newGroupId);
                const userProfileRef = doc(db, getUserProfilePath(user.uid));
                
                // 3. Writes
                // Increment counter
                transaction.set(statsRef, { userCount: currentCount + 1 }, { merge: true });

                // Create Group with members array for security rules
                transaction.set(groupRef, {
                    ownerId: user.uid,
                    createdAt: new Date(),
                    name: `${name || 'User'}的帳本`,
                    members: [user.uid] // Critical for security rules
                });

                // Create User Profile
                transaction.set(userProfileRef, {
                    uid: user.uid,
                    email: user.email,
                    name: name || 'User',
                    currentGroupId: newGroupId
                });

                // Add user to People collection (subcollection needs standard add/set outside transaction or via batched writes, 
                // but transaction is best for the core limit check. 
                // We'll do the subcollections AFTER the transaction to avoid complexity limit, 
                // or we can do them here if we construct paths manually. 
                // For simplicity and safety, let's keep the critical limit check in transaction 
                // and do the rest after, OR include them if we can get refs.)
                
                // Actually, for "members" security to work immediately, the group doc MUST be created here.
                // The subcollections (people, categories) can be created after.
            });

            // 4. Post-Transaction Setup (Subcollections)
            // We need to retrieve the groupId again or pass it out. 
            // Since we generated the ID above, we can't easily get it out of the transaction closure without a ref var.
            // Let's refactor slightly to ensure we have the ID.
        });

        // Refactored Transaction Block to ensure we have groupId
        const newGroupId = doc(collection(db, 'artifacts/wealthflow-stable-restore/groups')).id;
        
        await import('firebase/firestore').then(async ({ runTransaction, doc }) => {
             await runTransaction(db, async (transaction) => {
                const statsRef = doc(db, 'artifacts/wealthflow-stable-restore/metadata/stats');
                const statsSnap = await transaction.get(statsRef);
                const currentCount = statsSnap.exists() ? (statsSnap.data().userCount || 0) : 0;

                if (currentCount >= 20) throw new Error("Registration limit reached (Max 20 users).");

                transaction.set(statsRef, { userCount: currentCount + 1 }, { merge: true });
                
                transaction.set(doc(db, 'artifacts/wealthflow-stable-restore/groups', newGroupId), {
                    ownerId: user.uid,
                    createdAt: new Date(),
                    name: `${name || 'User'}的帳本`,
                    members: [user.uid]
                });

                transaction.set(doc(db, getUserProfilePath(user.uid)), {
                    uid: user.uid,
                    email: user.email,
                    name: name || 'User',
                    currentGroupId: newGroupId
                });
             });
        });

        // 5. Create default subcollections (People, Categories)
        // These don't strictly need to be in the transaction for the user limit logic, 
        // but it's good practice. For now, we do them here.
        const peopleCol = collection(db, getCollectionPath(user.uid, newGroupId, 'people'));
        await addDoc(peopleCol, {
            name: name || '我',
            isMe: true,
            email: user.email,
            uid: user.uid
        });
        
        const cats = ['飲食','交通','購物','娛樂','居住'];
        const catCol = collection(db, getCollectionPath(user.uid, newGroupId, 'categories'));
        for(const c of cats) await addDoc(catCol, { name: c, type: 'expense' });
        await addDoc(catCol, { name: '薪水', type: 'income' });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '驗證失敗，請檢查輸入');
      // If transaction failed but auth created user, we might want to cleanup auth user?
      // For MVP, we'll leave it. The user exists in Auth but has no profile/group, 
      // so App.tsx will likely error or show empty state. 
      // Ideally we should delete the auth user if DB setup fails.
      if (!isLogin && auth.currentUser) {
          await auth.currentUser.delete().catch(console.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
           <div className="bg-indigo-600 p-3 rounded-xl text-white">
              <Wallet size={32} />
           </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {isLogin ? '歡迎回來 WealthFlow' : '建立新帳號'}
        </h2>
        <p className="text-center text-slate-400 text-sm mb-8">
          {isLogin ? '登入以存取您的多人記帳與投資組合' : '開始管理您的財富與共享帳本'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">暱稱</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="在群組中顯示的名字"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">密碼</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin"/> : (isLogin ? <LogIn size={18}/> : <UserPlus size={18}/>)}
            {isLogin ? '登入' : '註冊'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-500 hover:text-indigo-600 font-bold"
          >
            {isLogin ? '還沒有帳號？ 註冊新帳號' : '已經有帳號了？ 登入'}
          </button>
        </div>
      </div>
    </div>
  );
};
