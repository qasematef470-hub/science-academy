"use client"; 

import Link from 'next/link';
import React, { useState } from 'react';

export default function Home() {
  
  // 1. حالات التحكم (التبديل + نافذة التواصل)
  const [activeTab, setActiveTab] = useState('nature'); 
  const [showContactModal, setShowContactModal] = useState(false);

  // 2. بيانات المواد
  const coursesData = {
    nature: [
      { title: 'الرياضيات (Math)', icon: '📐', desc: 'التفاضل، التكامل، والجبر الخطي.', color: 'from-blue-900 to-black', badge: 'Math' },
      { title: 'الكمبيوتر (Computer)', icon: '💻', desc: 'أساسيات البرمجة والخوارزميات.', color: 'from-cyan-900 to-black', badge: 'CS' },
      { title: 'الكيمياء (Chemistry)', icon: '🧪', desc: 'الكيمياء العضوية والتحليلية.', color: 'from-purple-900 to-black', badge: 'Chem' },
      { title: 'علم النبات (Botany)', icon: '🌿', desc: 'فسيولوجيا وتشريح النبات.', color: 'from-green-900 to-black', badge: 'Botany' },
    ],
    bio: [
      { title: 'علم الحيوان (Zoology)', icon: '🦁', desc: 'التشريح وعلم الأنسجة.', color: 'from-orange-900 to-black', badge: 'Zoo' },
      { title: 'علم النبات (Botany)', icon: '🌿', desc: 'فسيولوجيا وتشريح النبات.', color: 'from-green-900 to-black', badge: 'Botany' },
      { title: 'الكيمياء (Chemistry)', icon: '🧪', desc: 'الكيمياء العضوية والتحليلية.', color: 'from-purple-900 to-black', badge: 'Chem' },
      { title: 'الرياضيات (Math)', icon: '📐', desc: 'إحصاء حيوي ورياضيات عامة.', color: 'from-blue-900 to-black', badge: 'Math' },
    ]
  };

  // 3. بيانات الدكاترة (بالأرقام للتواصل)
  const team = [
    { name: 'م/ القاسم عاطف', role: 'Mathematics and Computer', img: '/assets/images/instructor-alqasem.jpg', phone: '01100588901', link: 'https://wa.me/qr/6EQWXKZAPNMOA1' },
    { name: 'د/ طه علي', role: 'Botany and Zoology', img: '/assets/images/instructor-taha.jpg', phone: '01014946210', link: 'https://wa.me/qr/VPILLEDJOSJJD1' },
    { name: 'د/ عبدالرحمن علي', role: 'Chemistry', img: '/assets/images/instructor-abdelrahman.jpg', phone: '01064577084', link: 'https://wa.me/qr/HG3EQYDQYHNGF1' },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden" dir="rtl">
      
      {/* 🌌 خلفية متحركة */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] opacity-30"></div>
      </div>

      {/* 🧭 Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0B1120]/70 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          
          {/* الشعار - تم التعديل لإضافة صورة اللوجو */}
          <div className="flex items-center gap-3">
            {/* اللوجو كصورة */}
            <img 
              src="/logo.png"  // 👈 تأكد إن اللوجو بتاعك اسمه كده في فولدر public
              alt="Logo" 
              className="w-12 h-auto object-contain drop-shadow-lg"
              onError={(e) => { 
                e.target.style.display = 'none'; 
                e.target.nextSibling.style.display = 'flex'; 
              }}
            />
            
            {/* بديل مؤقت يظهر فقط لو الصورة مش موجودة */}
            <div className="hidden w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl items-center justify-center text-white font-black text-xl shadow-lg">
              SA
            </div>

            <span className="font-black text-xl tracking-tight hidden md:block">Science Academy</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-gray-300 hover:text-white transition">
              دخول
            </Link>
            <Link href="/signup" className="bg-white text-[#0B1120] px-6 py-2.5 rounded-full font-black text-sm hover:bg-gray-200 transition shadow-lg hover:shadow-white/20 hover:scale-105 transform duration-200">
              حساب جديد 🚀
            </Link>
          </div>
        </div>
      </nav>

      {/* 🚀 Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-6 text-center">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            المنصة الأقوى لطلاب كلية العلوم
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
            استعد للتفوق في <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
             جميع مجالات العلوم
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            منصة متكاملة تجمع بين الشرح الأكاديمي، بنك الأسئلة الذكي، ونظام امتحانات يحاكي النظام الجامعي بدقة.
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-4 pt-6">
            <Link href="/signup" className="px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg shadow-xl shadow-blue-600/20 hover:scale-105 transition hover:shadow-blue-600/40 flex items-center justify-center gap-2">
              ابدأ المذاكرة الآن ⚡
            </Link>
            <a href="#courses" className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2">
              تصفح المواد 📚
            </a>
          </div>
        </div>
      </section>

      {/* 📊 Stats Section */}
      <section className="border-y border-white/5 bg-black/20 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "+100", label: "طالب جامعي" },
            { num: "3", label: "نخبة المحاضرين" },
            { num: "+3k", label: "سؤال بنك" },
            { num: "100%", label: "ضمان جودة" },
          ].map((stat, idx) => (
            <div key={idx} className="space-y-2 group">
              <h3 className="text-4xl font-black text-white group-hover:text-blue-400 transition">{stat.num}</h3>
              <p className="text-sm font-bold text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 📚 Courses Preview */}
      <section id="courses" className="py-24 px-6 bg-gradient-to-b from-[#0B1120] to-[#131B2E] relative z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">اختر مسارك الدراسي 🎯</h2>
            <p className="text-gray-400">حدد شعبتك لعرض المواد المقررة عليك</p>
            
            <div className="flex justify-center mt-8 gap-4">
                <button 
                    onClick={() => setActiveTab('nature')}
                    className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border ${activeTab === 'nature' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 scale-105' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                >
                    ⚛️ شعبة علوم طبيعية
                </button>
                <button 
                    onClick={() => setActiveTab('bio')}
                    className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border ${activeTab === 'bio' ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-600/30 scale-105' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                >
                    🧬 شعبة بيولوجي
                </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {coursesData[activeTab].map((course, idx) => (
                <Link href="/signup" key={idx} className="group relative overflow-hidden rounded-3xl cursor-pointer border border-white/5 bg-[#131B2E] hover:-translate-y-2 transition-transform duration-300 block">
                    <div className={`absolute inset-0 bg-gradient-to-br ${course.color} opacity-40 group-hover:opacity-60 transition duration-500`}></div>
                    
                    <div className="w-full h-48 flex items-center justify-center relative z-10 group-hover:scale-110 transition duration-700">
                        <span className="text-6xl drop-shadow-2xl">{course.icon}</span>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent relative z-20">
                        <span className="bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold mb-2 inline-block border border-white/10">
                            {course.badge}
                        </span>
                        <h3 className="text-xl font-black text-white mb-1">{course.title}</h3>
                        <p className="text-gray-400 text-xs mb-4 line-clamp-2">{course.desc}</p>
                        
                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-yellow-400 font-bold text-xs">سجل الآن 🚀</span>
                            <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold group-hover:translate-x-[-5px] transition-transform rtl:group-hover:translate-x-[5px]">🡸</span>
                        </div>
                    </div>
                </Link>
            ))}
          </div>

        </div>
      </section>

      {/* 👨‍🏫 Instructors Section (Fixed Images) */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-12 text-white">نخبة المحاضرين 🌟</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
                {team.map((member, idx) => (
                    <div key={idx} className="group bg-[#131B2E] rounded-[2rem] border border-white/5 overflow-hidden hover:border-blue-500/30 transition duration-300 shadow-2xl relative">
                        
                        {/* 🔥 تعديل الصور: إزالة التغبيش وتوسيط الصورة */}
                        <div className="h-80 relative overflow-hidden bg-gray-800">
                             <img 
                                src={member.img} 
                                alt={member.name} 
                                // التغيير هنا: object-center بدل object-top وشيلنا opacity-90
                                className="w-full h-full object-cover object-center transition duration-700 group-hover:scale-105"
                                onError={(e) => { e.target.style.display = 'none'; }}
                             />
                             {/* Fallback Icon */}
                             <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-10 -z-10">👨‍🏫</div>
                             
                             {/* Gradient خفيف جداً من تحت بس عشان الكلام يبان */}
                             <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent opacity-90"></div>
                        </div>
                        
                        <div className="absolute bottom-0 w-full p-6 text-center z-10">
                            <h3 className="font-bold text-2xl text-white mb-1 drop-shadow-md">{member.name}</h3>
                            <p className="text-blue-400 text-sm font-bold bg-blue-900/60 inline-block px-3 py-1 rounded-full backdrop-blur-md border border-blue-500/30">{member.role}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>
      {/* 🌟 CTA Box (مستطيل الاشتراك) */}
      <section className="py-12 px-6 relative z-10">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] p-12 text-center relative overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.3)] group">
          
          {/* تأثيرات الخلفية المتحركة */}
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-20 transition duration-500"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
              جاهز تبدأ رحلة التفوق؟ 🚀
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto font-medium">
              انضم الآن لأكثر من 100 طالب واستمتع بأقوى شرح للمواد العلمية بنظام جامعي حديث.
            </p>
            <Link href="/signup" className="inline-block bg-white text-blue-900 px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 hover:shadow-2xl hover:shadow-white/20 transition duration-300">
              أنشئ حسابك مجاناً
            </Link>
          </div>
        </div>
      </section>
      {/* 🦶 Footer */}
      <footer className="border-t border-white/10 bg-[#050914] pt-12 pb-6 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-500 text-sm">جميع الحقوق محفوظة © {new Date().getFullYear()} Science Academy</p>
            <div className="flex gap-6 text-sm">
              <button onClick={() => setShowContactModal(true)} className="text-gray-400 hover:text-blue-400 transition font-bold">تواصل معنا</button>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition font-bold">سياسة الخصوصية</a>
            </div>
        </div>
      </footer>

      {/* 📞 Contact Modal (Popup) */}
      {showContactModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in px-4">
            <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-8 max-w-md w-full relative shadow-2xl overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-[50px] pointer-events-none"></div>
                
                <h3 className="text-2xl font-black text-white mb-6 text-center">📞 تواصل مع المحاضرين</h3>
                
                <div className="space-y-4">
                    {team.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:border-green-500/30 transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                    {member.name[3]}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{member.name}</p>
                                    <p className="text-[10px] text-gray-400">{member.role}</p>
                                </div>
                            </div>
                            
                            {/* 🔥 الزرار بيفتح اللينك المباشر دلوقتي */}
                            <a 
                                href={member.link}    // 👈 هنا الربط باللينك
                                target="_blank"          
                                rel="noopener noreferrer"
                                className="text-green-400 font-mono font-bold hover:text-green-300 transition dir-ltr text-sm flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20"
                            >
                                تواصل واتساب 💬
                            </a>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => setShowContactModal(false)} 
                    className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition"
                >
                    إغلاق ✕
                </button>
            </div>
        </div>
      )}

    </div>
  );
}