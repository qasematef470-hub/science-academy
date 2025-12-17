"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../ui/BrandLogo';
// 🔥 استيراد دوال Firebase
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Navbar = ({ isDarkMode, toggleTheme, theme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // 👇 مراقبة حالة التسجيل
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          try {
            const snap = await getDoc(doc(db, 'users', currentUser.uid));
            if(snap.exists()) setUserData(snap.data());
          } catch (e) { console.error("Error fetching user data", e); }
      }
    });
    return () => unsubscribe();
  }, []);

  // 🌙 إعدادات حركة زرار الثيم
  const spring = { type: "spring", stiffness: 700, damping: 30 };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <div className={`w-full max-w-7xl rounded-full px-4 md:px-6 h-16 flex justify-between items-center backdrop-blur-xl border pointer-events-auto transition-all shadow-lg ${theme.nav}`}>
          
          <Link href="/" className="group hover:scale-105 transition duration-300">
             <BrandLogo isDarkMode={isDarkMode} />
          </Link>

          <div className={`hidden md:flex gap-6 lg:gap-8 text-sm font-bold ${theme.textSec}`}>
             {['من نحن', 'المميزات', 'مسارك العلمى'].map((item, i) => (
                <a key={i} href={`#${item === 'من نحن' ? 'about' : item === 'المميزات' ? 'features' : 'courses'}`} className="hover:text-blue-600 transition relative group py-2">
                    {item}
                    <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                </a>
             ))}
          </div>

          <div className="flex items-center gap-3">
            
            {/* 🌙 زرار الثيم المتحرك */}
            <div 
                onClick={toggleTheme} 
                className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 justify-end' : 'bg-blue-200 justify-start'}`}
            >
                <motion.div 
                    layout 
                    transition={spring} 
                    className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs ${isDarkMode ? 'bg-[#0F172A]' : 'bg-white'}`}
                >
                    {isDarkMode ? '🌙' : '☀️'}
                </motion.div>
            </div>

            {user ? (
                <Link href={userData?.role === 'admin' ? '/admin' : '/dashboard'} className="hidden sm:flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-full transition group border border-blue-500/20">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold uppercase">
                        {userData?.name ? userData.name[0] : 'U'}
                    </div>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-400 group-hover:text-white' : 'text-blue-600 group-hover:text-white'}`}>
                        {userData?.name?.split(' ')[0] || 'حسابي'}
                    </span>
                </Link>
            ) : (
                <>
                    <Link href="/login" className={`hidden sm:block text-sm font-bold hover:text-blue-600 transition ${theme.textSec}`}>دخول</Link>
                    <Link href="/signup" className="hidden sm:block bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 transition shadow-lg shadow-blue-500/30">
                      حساب جديد
                    </Link>
                </>
            )}

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`md:hidden text-2xl p-2 rounded-full transition ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className={`absolute top-24 left-4 right-4 p-6 rounded-3xl shadow-2xl border pointer-events-auto md:hidden flex flex-col gap-4 items-center z-50 backdrop-blur-xl ${theme.card}`}
                >
                    {['من نحن', 'المميزات','مسارك العلمى'].map((item, i) => (
                        <a key={i} href={`#${item === 'من نحن' ? 'about' : item === 'المميزات' ? 'features' : 'courses'}`} onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold w-full text-center py-2 rounded-lg hover:bg-blue-500/10 ${theme.textMain}`}>
                            {item}
                        </a>
                    ))}
                    <div className="w-full h-px bg-slate-500/20 my-2"></div>
                    
                    {user ? (
                        <Link 
                            href={userData?.role === 'admin' ? '/admin' : '/dashboard'} 
                            onClick={() => setIsMobileMenuOpen(false)} // نقفل القائمة لما يدوس
                            className="w-full text-center py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20"
                        >
                            {userData?.role === 'admin' ? 'لوحة الأدمن' : `لوحة التحكم (${userData?.name?.split(' ')[0]})`}
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-3 rounded-xl border border-blue-500/30 text-blue-500 font-bold">تسجيل الدخول</Link>
                            <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20">حساب جديد</Link>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    </nav>
  );
};

export default Navbar;