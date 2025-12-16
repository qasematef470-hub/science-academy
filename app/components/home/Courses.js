'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSystemConfig } from '@/app/actions/auth'; 

// 👇 هنا حط مسارات الصور بتاعتك لما تجهزها
// ممكن تغير الروابط دي لـ '/assets/images/study.jpg' مثلاً
const cardImages = {
    study: "/assets/images/study.jpg", // صورة جامعة/دراسة
    revision: "/assets/images/revision.jpg", // صورة مكتب/مذاكرة
    vacation: "/assets/images/vacation.jpg" // صورة صيف/انطلاق
};

export default function Courses({ theme, isDarkMode }) {
  const [config, setConfig] = useState({ 
    study_mode: true, 
    revision_mode: false, 
    vacation_mode: false 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
        const conf = await getSystemConfig();
        setConfig(prev => ({ ...prev, ...conf }));
        setLoading(false);
    }
    loadConfig();
  }, []);

  // --- تصميم الكارت الاحترافي (صورة + تدرج) ---
  const ModeCard = ({ title, subTitle, image, href, colorFrom, colorTo, isVisible }) => {
    if (!isVisible) return null;
    
    return (
        <Link href={href} className="group relative block w-full h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-indigo-500/30 hover:-translate-y-2">
            
            {/* 1. صورة الخلفية (بتتحرك مع الماوس) */}
            <div className="absolute inset-0 w-full h-full">
                <img 
                    src={image} 
                    alt={title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
            </div>

            {/* 2. طبقة التغميق (Gradient Overlay) */}
            <div className={`absolute inset-0 bg-gradient-to-t ${colorFrom} via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500`}></div>

            {/* 3. المحتوى (الكلام) */}
            <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                {/* خط تزييني */}
                <div className="w-12 h-1 bg-white mb-4 rounded-full transition-all duration-500 group-hover:w-20"></div>
                
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
                    {title}
                </h2>
                <p className="text-gray-200 text-lg font-medium opacity-90 mb-6 line-clamp-2">
                    {subTitle}
                </p>

                {/* زرار وهمي بيظهر أكتر مع الهوفر */}
                <div className="flex items-center gap-2 text-white font-bold opacity-0 translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                    <span>تصفح الكورسات</span>
                    <span className="text-xl">🡰</span>
                </div>
            </div>
        </Link>
    );
  };

  return (
    <section id="courses" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
            {/* عنوان السكشن */}
            <div className="text-center mb-16 animate-fade-in-up">
                <h2 className={`text-4xl md:text-5xl font-extrabold mb-6 ${theme.textMain}`}>
                    اختر مسارك التعليمي
                </h2>
                <p className={`text-xl ${theme.textSec} max-w-2xl mx-auto`}>
                    منصة تعليمية متكاملة مصممة لتناسب كل مراحل رحلتك الدراسية
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    
                    {/* 1. كارت الدراسة */}
                    <ModeCard 
                        title="الدراسة الأكاديمية" 
                        subTitle="محاضرات وشروحات تفصيلية لمناهج كليتك."
                        image={cardImages.study}
                        href="/study"
                        colorFrom="from-indigo-900"
                        isVisible={config.study_mode}
                    />

                    {/* 2. كارت المراجعة */}
                    <ModeCard 
                        title="المراجعة النهائية" 
                        subTitle="معسكرات مكثفة وحل امتحانات لضمان التفوق."
                        image={cardImages.revision}
                        href="/final-revision"
                        colorFrom="from-orange-900"
                        isVisible={config.revision_mode}
                    />

                    {/* 3. كارت الأجازة */}
                    <ModeCard 
                        title="فترة الأجازة" 
                        subTitle="استثمر وقتك في تعلم مهارات جديدة ولغات."
                        image={cardImages.vacation}
                        href="/vacation"
                        colorFrom="from-cyan-900"
                        isVisible={config.vacation_mode}
                    />

                    {/* رسالة لو مفيش ولا مود شغال */}
                    {!config.study_mode && !config.revision_mode && !config.vacation_mode && (
                        <div className={`col-span-full py-16 text-center rounded-[2rem] border-2 border-dashed ${theme.textSec} border-gray-500/30 bg-gray-50/5 dark:bg-slate-800/50`}>
                            <h3 className="text-2xl font-bold mb-2">لا توجد مسارات نشطة حالياً 🛑</h3>
                            <p>يرجى الانتظار حتى يتم فتح باب التسجيل للفصل الدراسي الجديد.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </section>
  );
}