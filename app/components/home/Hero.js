"use client";
import Link from 'next/link';
import Reveal from '../ui/Reveal';

const Hero = ({ theme, isDarkMode }) => {
  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center pt-24 px-6 text-center">
        <Reveal direction="up">
            <div className="max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-500 text-sm font-bold mb-6">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    المنصة رقم #1 لطلاب الكليات العلمية
                </div>
                
                <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-6 ${theme.textMain}`}>
                    ذاكر بذكاء.. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600">
                    وضمن الامتياز
                    </span>
                </h1>
                
                <p className={`text-lg md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed ${theme.textSec}`}>
                    منصة تعليمية متكاملة بتوفرلك شرح ومراجعات وامتحانات أونلاين عشان تضمن التفوق في كليتك.
                </p>

                {/* 👇 هنا التعديل: ضفنا زرار مراجعة الفاينل */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
                    


                    {/* زر ابدأ المذاكرة (الأزرق) */}
                    <Link href="/signup" className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg transition transform hover:scale-105 shadow-lg shadow-blue-600/40">
                    ابدأ المذاكرة الآن 🚀
                    </Link>
                    
                </div>
            </div>
        </Reveal>
      </section>
  );
};

export default Hero;