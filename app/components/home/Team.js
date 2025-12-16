"use client";
import Image from 'next/image';
import Reveal from '../ui/Reveal';
import { TEAM_DATA } from '../../../lib/constants';

const TeamCard = ({ member, theme }) => {
    return (
        <div className="group relative h-[800px] w-full rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-3">
            
            {/* 1. الصورة الخلفية */}
            <div className="absolute inset-0 bg-gray-900">
                <Image 
                    src={member.img} 
                    alt={member.name} 
                    fill
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
                />
            </div>

            {/* 2. التدرج الأسود من تحت (زي صفحة التسجيل) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90"></div>

            {/* 3. إضاءة المسرح السفلية (تأثير النور الأزرق من تحت) 🌟 */}
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900/40 to-transparent blur-2xl"></div>

            {/* 4. المحتوى */}
            <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col items-center text-center translate-y-2 group-hover:translate-y-0 transition-transform duration-500 z-20">
                
                {/* الاسم */}
                <h3 className="text-3xl font-black text-white mb-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    {member.name}
                </h3>
                
                {/* التخصص */}
                <div className="inline-block px-4 py-1 rounded-full border border-blue-400/30 bg-blue-900/20 backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <span className="text-blue-300 font-bold text-sm tracking-wide uppercase shadow-black drop-shadow-md">
                        {member.role}
                    </span>
                </div>

                {/* زرار الواتساب */}
                <a 
                    href={member.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full py-4 bg-[#25D366] hover:bg-[#1da851] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-green-900/30 transition-all transform hover:scale-105 opacity-80 group-hover:opacity-100"
                >
                    <span className="text-xl">💬</span>
                    <span>تواصل واتساب</span>
                </a>
            </div>

            {/* ✨ 5. الإطار المتوهج (موجود دائماً وبيزيد مع الهوفر) */}
            {/* لاحظ الكلاسات: border-blue-500/30 (ظاهر خفيف) وبيتحول لـ border-blue-400 (قوي) */}
            <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none border-[3px] transition-all duration-500
                border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.2),inset_0_0_20px_rgba(37,99,235,0.1)]
                group-hover:border-blue-400 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.6),inset_0_0_40px_rgba(59,130,246,0.3)]">
            </div>

        </div>
    );
};

const Team = ({ theme, isDarkMode }) => {
  return (
    <section className={`py-32 relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A]' : 'bg-slate-50'}`}>
         
         <div className="max-w-7xl mx-auto px-6 relative z-10">
            <Reveal direction="up">
                <div className="text-center mb-20">
                    <span className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-3 block">
                        OUR EXPERTS
                    </span>
                    <h2 className={`text-4xl md:text-6xl font-black mb-6 ${theme.textMain}`}>
                        نخبة من <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">العمالقة</span> 🌟
                    </h2>
                </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                {TEAM_DATA.map((member, i) => (
                    <Reveal key={i} direction="up" delay={i * 0.2}>
                        <TeamCard member={member} theme={theme} />
                    </Reveal>
                ))}
            </div>
         </div>
      </section>
  );
};

export default Team;