"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Reveal from '../ui/Reveal';

const featuresData = [
  {
    icon: "🎥",
    title: "جودة 4K كريستال",
    desc: "محاضرات اونلاين بأعلى جوده لضمان وضوح الشرح وكأنك في القاعة.",
    colSpan: "md:col-span-2", // كارت عريض
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: "🧠",
    title: "بنك أسئلة ذكي",
    desc: "آلاف الأسئلة المتدرجة في الصعوبة للتدريب على نظام الامتحانات الحديث.",
    colSpan: "md:col-span-1",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: "📈",
    title: "متابعة دورية",
    desc: "تقارير مستوى دورية تصل لولي الأمر والطالب لمعرفة نقاط القوة والضعف.",
    colSpan: "md:col-span-1",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: "💬",
    title: "دعم فني 24/7",
    desc: "فريق كامل جاهز للرد على استفساراتك وحل أي مشكلة تواجهك في ثواني.",
    colSpan: "md:col-span-2", // كارت عريض
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: "🏆",
    title: "تكريم الأوائل",
    desc: "جوائز وشهادات تقدير للمتفوقين في كل امتحان شامل.",
    colSpan: "md:col-span-1",
    color: "from-yellow-500 to-amber-500"
  },
  {
    icon: "📱",
    title: "تطبيق موبايل",
    desc: "قريباً عشان تذاكر من موبايلك في أي وقت وأي مكان بتجربة مستخدم سلسة وسريعة.",
    colSpan: "md:col-span-1", // كارت عادي
    color: "from-indigo-500 to-violet-500"
  }
];

const Features = ({ theme, isDarkMode }) => {
  return (
    <section id="features" className={`py-24 relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A]' : 'bg-gray-50'}`}>
      
      {/* خلفية جمالية خفيفة */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className={`absolute top-20 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-200'}`}></div>
          <div className={`absolute bottom-20 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 ${isDarkMode ? 'bg-purple-600' : 'bg-purple-200'}`}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* العنوان */}
        <div className="text-center mb-16">
          <Reveal>
            <span className="text-blue-500 font-bold tracking-wider text-sm uppercase mb-2 block">لماذا تختارنا؟</span>
            <h2 className={`text-4xl md:text-5xl font-black mb-4 ${theme.textMain}`}>
              مش مجرد منصة، دي <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">منظومة نجاح</span>
            </h2>
            <p className={`max-w-2xl mx-auto text-lg ${theme.textSec}`}>
              جمعنالك كل الأدوات اللي محتاجها عشان تذاكر بذكاء، توفر وقتك، وتضمن أعلى الدرجات.
            </p>
          </Reveal>
        </div>

        {/* الشبكة (Bento Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuresData.map((feature, index) => (
            <Reveal key={index} delay={index * 0.1} className={feature.colSpan}>
              <motion.div 
                whileHover={{ y: -5 }}
                className={`group h-full p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden
                  ${isDarkMode 
                    ? 'bg-[#1E293B]/50 border-slate-700 hover:bg-[#1E293B] hover:border-slate-600' 
                    : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5'}
                `}
              >
                {/* تأثير الإضاءة الخلفية عند الهوفر */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${feature.color}`}></div>

                <div className="relative z-10 flex flex-col h-full">
                  {/* الأيقونة */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 bg-gradient-to-br ${feature.color} text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>

                  {/* النصوص */}
                  <h3 className={`text-2xl font-bold mb-3 ${theme.textMain}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-base leading-relaxed ${theme.textSec} group-hover:text-opacity-100 transition-colors`}>
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;