"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../ui/BrandLogo';

// 📞 رقمك الشخصي للدعم
const SUPPORT_PHONE = "201100588901"; 

// 👨‍🏫 بيانات التيم الحقيقية (بناءً على الملفات السابقة)
const REAL_TEAM_DATA = [
    { 
        name: 'د/ طه علي جميل', 
        role: 'Botany & Zoology & Anatomy & Physiology', 
        img: '/assets/images/instructor-taha.jpg', 
        link: 'https://wa.me/201014946210' 
    },
    { 
        name: 'د/ عبدالرحمن علي', 
        role: 'Chemistry Specialist', 
        img: '/assets/images/instructor-abdelrahman.jpg', 
        link: 'https://wa.me/201064577084' 
    },
    { 
        name: 'م/ القاسم عاطف', 
        role: 'Math & CS Expert', 
        img: '/assets/images/instructor-alqasem.jpg', 
        link: 'https://wa.me/201100588901' 
    },
];

const Footer = ({ theme, isDarkMode }) => {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <footer className={`pt-16 pb-0 text-center border-t relative z-10 ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}>
         
         {/* المحتوى الرئيسي للفوتر */}
         <div className="max-w-4xl mx-auto px-6 mb-12">
            <div className="flex justify-center mb-6 scale-125"><BrandLogo isDarkMode={isDarkMode} /></div>
            
            <p className={`max-w-md mx-auto mb-8 text-sm leading-relaxed font-bold ${theme.textSec}`}>
                منصة Science Academy.. بوابتك للتفوق في الكليات العملية بأحدث طرق التدريس والمتابعة.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-bold text-slate-500">
                <a href="#" className="hover:text-blue-500 transition">الشروط والأحكام</a>
                <button onClick={() => setShowContact(true)} className="hover:text-blue-500 transition">
                    تواصل معنا
                </button>
                <a href="#" className="hover:text-blue-500 transition">سياسة الخصوصية</a>
            </div>
         </div>

         {/* 👇👇 الشريط السفلي (التعديل المطلوب) 👇👇 */}
         <div className={`py-6 px-4 md:px-10 border-t ${isDarkMode ? 'bg-[#020617] border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
             <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                 
                 {/* 1️⃣ اليمين: المطور (كبير وواضح) */}
                 <div className="flex items-center gap-2 text-sm font-mono order-1">
                     <span className="opacity-60 text-slate-500 font-bold">&lt;Developed By&gt;</span>
                     <a 
                        href="https://www.facebook.com/KasemAtaf?locale=ar_AR" 
                        target="_blank" 
                        className="text-lg md:text-xl font-black bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent hover:scale-110 transition-transform duration-300 cursor-pointer"
                        style={{ fontFamily: '"Fira Code", monospace', textShadow: '0 0 20px rgba(59,130,246,0.3)' }}
                     >
                         Qasem Atef
                     </a>
                     <span className="opacity-60 text-slate-500 font-bold">&lt;/&gt;</span>
                 </div>

                 {/* 2️⃣ المنتصف: لوجو صغير (اختياري عشان التوازن) */}
                 <div className="hidden md:block opacity-30 grayscale hover:grayscale-0 transition duration-500 order-2">
                    <BrandLogo isDarkMode={isDarkMode} size="sm" /> {/* تأكد إن الـ BrandLogo بيقبل تصغير */}
                 </div>

                 {/* 3️⃣ اليسار: الحقوق */}
                 <p className={`text-[10px] md:text-xs font-bold tracking-widest uppercase opacity-60 order-3 ${theme.textSec}`}>
                     All Copy Rights Reserved @2025
                 </p>

             </div>
         </div>

      </footer>

      {/* ✅ مودال أرقام التواصل (بالبيانات الصحيحة) */}
      <AnimatePresence>
        {showContact && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => setShowContact(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
                >
                    <button onClick={() => setShowContact(false)} className="absolute top-4 left-4 w-8 h-8 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition">✕</button>
                    
                    <h3 className={`text-2xl font-black text-center mb-6 ${theme.textMain}`}>📞 تواصل معنا</h3>
                    
                    <div className="space-y-3">
                        {/* الدعم الفني (رقمك) */}
                        <a href={`https://wa.me/${SUPPORT_PHONE}`} target="_blank" className="flex items-center gap-4 p-4 rounded-xl bg-[#25D366] text-white hover:brightness-110 transition shadow-lg shadow-green-500/20">
                            <span className="text-3xl">💬</span>
                            <div>
                                <p className="text-xs font-bold opacity-90">رقم الدعم الفني المباشر</p>
                                <p className="font-black text-xl dir-ltr">{SUPPORT_PHONE}</p>
                            </div>
                        </a>

                        <div className="w-full h-px bg-slate-500/20 my-4"></div>
                        <p className={`text-center text-xs font-bold mb-2 ${theme.textSec}`}>أرقام المحاضرين</p>

                        {/* أرقام المحاضرين (البيانات الحقيقية) */}
                        {REAL_TEAM_DATA.map((member, i) => (
                            <a key={i} href={member.link} target="_blank" className={`flex items-center gap-4 p-3 rounded-xl border transition hover:bg-blue-500/5 hover:border-blue-500/30 ${theme.card}`}>
                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden relative border border-slate-300">
                                    <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-sm ${theme.textMain}`}>{member.name}</p>
                                    <p className="text-xs text-blue-500 font-bold">{member.role}</p>
                                </div>
                                <span className="text-blue-500 text-xl">↗</span>
                            </a>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Footer;