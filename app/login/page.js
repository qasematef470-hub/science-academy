'use client';

import { useState, useEffect, Suspense } from 'react'; 
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogo from '../components/ui/BrandLogo';
import { createSession } from '../auth-action';

function LoginContent() {
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  useEffect(() => {
    document.title = "تسجيل الدخول | Science Academy";
  }, []);
  
  // --- States ---
  const [isDark, setIsDark] = useState(true); // ✅ زرار الثيم
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔄 معالجة الدخول
  const processUserLogin = async (user) => {
    try {
      const idToken = await user.getIdToken();
      await createSession(idToken);

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.isLocked) {
            setError('⛔ هذا الحساب مجمد. يرجى مراجعة الإدارة.');
            setLoading(false);
            setGoogleLoading(false);
            return;
        }
        if (userData.role === 'admin') router.push(redirectPath === '/' ? '/admin' : redirectPath); 
        else if (userData.role === 'student') router.push(redirectPath === '/' ? '/dashboard' : redirectPath); 
        else setError('حسابك غير معروف الصلاحية.');
      } else {
        setError('⚠️ الحساب غير مسجل. يرجى إنشاء حساب جديد.');
      }
    } catch (err) {
      setError('خطأ في المعالجة: ' + err.message);
    } finally {
      setLoading(false);
      setGoogleLoading(false);
    }
  };

  // 📧 دخول بالإيميل
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const email = emailInput.includes('@') ? emailInput : `${emailInput}@science.academy.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await processUserLogin(userCredential.user);
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('بيانات الدخول غير صحيحة.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('تم حظر المحاولات مؤقتاً.');
      } else {
        setError('حدث خطأ: ' + err.message);
      }
      setLoading(false);
    }
  };

  // 🌐 دخول بجوجل
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await processUserLogin(result.user);
    } catch (err) {
      setError("فشل الدخول بجوجل: " + err.message);
      setGoogleLoading(false);
    }
  };

  // 🔑 نسيان كلمة المرور
  const handleForgotPassword = async () => {
    if (!emailInput) {
      setError("⚠️ اكتب البريد الإلكتروني أولاً لاستعادة كلمة المرور.");
      return;
    }
    try {
      const email = emailInput.includes('@') ? emailInput : `${emailInput}@science.academy.com`;
      await sendPasswordResetEmail(auth, email);
      alert(`✅ تم إرسال رابط الاستعادة إلى: ${email}`);
    } catch (err) {
      setError("فشل إرسال الرابط: " + err.message);
    }
  };

  // --- Theme Variables ---
  const inputClass = isDark 
      ? "bg-[#111] border border-white/10 text-white focus:bg-[#151515]" 
      : "bg-white border border-gray-300 text-gray-900 focus:bg-gray-50";

  return (
    <div className={`min-h-screen w-full flex dir-rtl font-sans overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* 🖼️ Right Side: Visual Image */}
      <div className={`hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden ${isDark ? 'bg-[#111]' : 'bg-gray-200'}`}>
          <div className="absolute inset-0 z-0">
             <Image 
                src="/assets/images/singup.png" // ✅ الصورة اللي طلبتها
                alt="Login Visual" 
                fill 
                className="object-cover opacity-60 grayscale hover:grayscale-0 transition duration-700"
             />
             <div className={`absolute inset-0 bg-gradient-to-l from-transparent ${isDark ? 'to-[#050505]' : 'to-gray-50'}`}></div>
          </div>
          
          <div className="relative z-10 text-right p-12 max-w-lg">
               <h1 className="text-6xl font-black mb-6 leading-tight">
                   أهلاً بيك <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-500 to-purple-600">يا بطل من تاني.</span>
               </h1>
               <p className={`text-lg font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                   كمل رحلتك التعليمية.. محاضراتك ومراجعاتك مستنياك.
               </p>
          </div>
      </div>

      {/* 📝 Left Side: The Form (تم التعديل ليتطابق مع Signup) */}
      <div className={`w-full lg:w-1/2 flex flex-col h-screen overflow-y-auto custom-scrollbar relative ${isDark ? 'bg-[#050505]' : 'bg-gray-50'}`}>
          
          <div className="p-8 md:p-12 lg:p-16 max-w-2xl mx-auto w-full">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <Link href="/" className="w-32 cursor-pointer hover:scale-105 transition-transform block">
                    <BrandLogo />
                </Link>

                <div className="flex items-center gap-4">
                     {/* ☀️ زرار الثيم */}
                     <button 
                        onClick={() => setIsDark(!isDark)} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition ${isDark ? 'border-white/20 text-yellow-400 hover:bg-white/10' : 'border-gray-300 text-blue-600 hover:bg-white shadow-sm'}`}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    <Link href="/signup" className={`text-sm font-bold transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>إنشاء حساب جديد ➜</Link>
                </div>
            </div>

            <div className="mb-10">
                <h2 className="text-4xl font-black mb-3">تسجيل الدخول 🔐</h2>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} font-medium`}>ادخل بياناتك عشان توصل للوحة التحكم.</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">

                {/* Username Input */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-500">📧 البريد أو اسم المستخدم</label>
                    <input 
                        type="text" 
                        required
                        placeholder="example@gmail.com" 
                        className={`w-full rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition dir-ltr ${inputClass}`} 
                        value={emailInput} 
                        onChange={(e) => setEmailInput(e.target.value)} 
                    />
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-500">🔑 كلمة المرور</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required
                            placeholder="******" 
                            className={`w-full rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition pl-10 dir-ltr ${inputClass}`} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-[50%] transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition">
                            {showPassword ? '👁️' : '🔒'}
                        </button>
                    </div>
                    {/* Forgot Password */}
                    <div className="flex justify-end">
                        <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-gray-500 hover:text-blue-500 transition">
                            نسيت كلمة المرور؟
                        </button>
                    </div>
                </div>

                {/* Error Box */}
                {error && (
                    <div className="text-red-500 text-sm font-bold text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-shake">
                        ⚠️ {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="space-y-4 pt-2">
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                         {loading ? 'جاري التحقق...' : '🚀 دخول المنصة'}
                    </button>

                    <div className={`relative flex py-2 items-center`}>
                        <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold">أو</span>
                        <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}></div>
                    </div>

                    <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 border ${isDark ? 'bg-white text-gray-900 hover:bg-gray-100 border-white' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}>
                        {googleLoading ? 'جاري الاتصال...' : (
                            <>
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                                <span>الدخول بجوجل (Google)</span>
                            </>
                        )}
                    </button>
                </div>

            </form>
          </div>
      </div>

       {/* ✅ زرار الدعم الفني العائم */}
      <a 
         href="https://wa.me/201100588901" 
         target="_blank" 
         className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center gap-2 font-bold group"
      >
        <span className="text-xl">💬</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">الدعم الفني</span>
      </a>

    </div>
  );
} // 👈👈👈 دي قفلة الدالة القديمة (LoginContent) .. لازم تكون موجودة هنا

// 👇👇 الكود الجديد يتحط بعدها مش جواها
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">جاري التحميل...</div>}>
      <LoginContent />
    </Suspense>
  );
}