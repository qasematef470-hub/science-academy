'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const email = emailInput.includes('@') ? emailInput : `${emailInput}@science.academy.com`;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.role === 'admin') {
          router.push('/admin'); 
        } else if (userData.role === 'student') {
          router.push('/dashboard'); 
        } else {
          setError('حسابك غير معروف الصلاحية.');
        }
      } else {
        setError('بيانات المستخدم غير موجودة في قاعدة البيانات.');
      }

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      } else {
        setError('حدث خطأ: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4 dir-rtl relative overflow-hidden" dir="rtl">
      
      {/* Background Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="max-w-md w-full space-y-8 bg-[#131B2E] p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        
        <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-3xl font-black text-white">تسجيل الدخول</h2>
            <p className="mt-2 text-sm text-gray-400 font-bold">Science Academy Portal</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">اسم المستخدم</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-[#0B1120] border border-white/10 rounded-xl focus:border-blue-500 outline-none text-right font-bold text-white placeholder-gray-600 transition"
                placeholder="Ex: ahmed2025"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <label className="block text-xs font-bold text-gray-400 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full p-4 bg-[#0B1120] border border-white/10 rounded-xl focus:border-blue-500 outline-none text-right font-bold text-white placeholder-gray-600 pl-10 transition"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="text-red-400 bg-red-500/10 p-3 rounded-lg text-sm text-center font-bold border border-red-500/20">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white ${
              loading ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-900/40'
            } transition-all`}
          >
            {loading ? 'جاري التحقق...' : 'دخول 🚀'}
          </button>

          <div className="text-center mt-4 border-t border-white/5 pt-4">
             <p className="text-sm text-gray-500 font-bold">ليس لديك حساب؟ <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-bold underline">أنشئ حساب جديد</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}