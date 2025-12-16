"use client";
import Link from 'next/link';
import Reveal from '../ui/Reveal';
import { REGISTRATION_STEPS } from '../../../lib/constants'; // شلت SUPPORT_WHATSAPP عشان هنكتبه يدوي

const Steps = ({ theme, isDarkMode }) => {
  return (
      <section className={`py-20 px-6 ${isDarkMode ? 'bg-[#0F172A]' : 'bg-white'}`}>
         <Reveal direction="up">
            <div className="max-w-5xl mx-auto text-center">
                <h2 className={`text-4xl font-black mb-16 ${theme.textMain}`}>ابدأ رحلتك في 3 خطوات 🚀</h2>
                
                <div className="relative grid md:grid-cols-3 gap-12">
                    <div className={`hidden md:block absolute top-12 left-0 w-full h-1 border-t-2 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`} style={{ zIndex: 0 }}></div>

                    {REGISTRATION_STEPS.map((s,i) => (
                        <div key={i} className="relative z-10 group">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-4xl font-black text-white mb-6 shadow-lg shadow-blue-500/30 ring-8 ring-opacity-50 transition transform group-hover:scale-110 group-hover:rotate-6 ring-white dark:ring-slate-800">
                                {s.n}
                            </div>
                            <h3 className={`font-bold text-2xl mb-3 ${theme.textMain}`}>{s.t}</h3>
                            <p className={`text-sm ${theme.textSec}`}>{s.d}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-16">
                    {/* 👇 التعديل هنا: حطيت رقمك مباشرة */}
                    <a 
                        href="https://wa.me/201100588901" 
                        target="_blank" 
                        className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-full font-bold transition transform hover:scale-105 hover:bg-emerald-600 shadow-lg shadow-emerald-500/40"
                    >
                        <span>واجهت مشكلة؟ تواصل مع الدعم</span>
                        <span className="text-xl">🛠️</span>
                    </a>
                </div>
            </div>
         </Reveal>
      </section>
  );
};

export default Steps;