"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../components/ui/BrandLogo';
import Reveal from '../components/ui/Reveal';
import { getAllCourses } from '@/app/actions/student';

// ==========================================
// 👨‍🏫 بيانات المدربين
// ==========================================
const ADMINS_LIST = [
  {
    name: "د. طه علي جميل",
    searchKey: "طه", 
    phone: "01014946210", 
    img: '/assets/images/instructor-taha.jpg',
    role: "Biology & languages"
  },
  {
    name: "د. عبدالرحمن علي فؤاد",
    searchKey: "عبدالرحمن",
    phone: "01064577084",
    img: '/assets/images/instructor-abdelrahman.jpg',
    role: "Chemistry & Soft Skills"
  },
  {
    name: "م. القاسم عاطف شريف",
    searchKey: "القاسم",
    phone: "01100588901",
    img: '/assets/images/instructor-alqasem.jpg',
    role: "Programming & Tech"
  }
];

const getInstructorDetails = (courseInstructorName) => {
    const name = courseInstructorName || "";
    const admin = ADMINS_LIST.find(a => name.includes(a.searchKey));
    if (admin) {
        return { name: admin.name, img: admin.img, role: admin.role, whatsapp: `https://wa.me/20${admin.phone.substring(1)}` };
    }
    return { name: name || "Science Academy", img: null, role: "Skill Instructor", whatsapp: "https://wa.me/201014946210" };
};

// ==========================================
// 🌊 خلفية الصيف (Tropical Particles) ☀️
// ==========================================
const SummerParticles = ({ isDark }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;
    let particles = [];

    // 🎨 ألوان استوائية (فيروزي، أصفر، وردي)
    const particleColors = isDark 
        ? ['rgba(20, 184, 166, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(244, 63, 94, 0.7)'] // Teal, Yellow, Rose
        : ['rgba(45, 212, 191, 0.5)', 'rgba(250, 204, 21, 0.5)', 'rgba(251, 113, 133, 0.5)'];

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];
      const particleCount = width < 768 ? 30 : 60;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          size: Math.random() * 4 + 2, // حجم أكبر شوية (Bubbles)
          color: particleColors[Math.floor(Math.random() * particleColors.length)]
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-60 pointer-events-none" />;
};

// ==========================================
// 🛠️ الأدوات العائمة (Tropical Theme)
// ==========================================
const FloatingTools = ({ isDark, toggleTheme }) => {
    const [showContactMenu, setShowContactMenu] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4 items-end">
            <AnimatePresence>
                {showContactMenu && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`mb-2 p-4 rounded-2xl shadow-2xl border min-w-[250px] ${isDark ? 'bg-[#0f172a] border-teal-500/30' : 'bg-white border-teal-200'}`}
                    >
                        <h4 className={`text-sm font-bold mb-3 text-center ${isDark ? 'text-teal-200' : 'text-gray-700'}`}>مدربين المهارات:</h4>
                        <div className="flex flex-col gap-2">
                            {ADMINS_LIST.map((admin, idx) => (
                                <a 
                                    key={idx}
                                    href={`https://wa.me/20${admin.phone.substring(1)}`}
                                    target="_blank"
                                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-teal-500/10 group
                                    ${isDark ? 'text-gray-200 hover:text-teal-400' : 'text-gray-800 hover:text-teal-600'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-yellow-400 flex items-center justify-center text-white text-sm">
                                       😎
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold">{admin.name}</span>
                                        <span className="text-[10px] opacity-70">{admin.role}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button 
                onClick={() => setShowContactMenu(!showContactMenu)} 
                className="w-14 h-14 bg-gradient-to-r from-teal-500 to-yellow-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform duration-300 relative z-50"
            >
                 {showContactMenu ? <span className="text-xl font-bold">✕</span> : <span className="text-2xl">🌴</span>}
            </button>

            <button onClick={toggleTheme} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border-2 ${isDark ? 'bg-[#0f172a] border-slate-700 text-yellow-400' : 'bg-white border-teal-200 text-teal-600'}`}>
                {isDark ? '☀️' : '🌙'}
            </button>
        </div>
    );
};

// ==========================================
// 🚀 الصفحة الرئيسية (Summer Vacation)
// ==========================================
export default function VacationPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
      document.title = "مسار الاجازه | Science Academy";
    }, []);

  // الفلترة (مبسطة: تصنيف فقط)
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setIsDark(false);

    const fetchCourses = async () => {
      // ✅ جلب كورسات الصيف
      const res = await getAllCourses({ mode: 'summer' });
      if (res.success) {
        setCourses(res.data);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const categories = useMemo(() => {
      const cats = courses.map(c => c.category || c.section || 'عام').filter(Boolean);
      return ['All', ...new Set(cats)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
      if (selectedCategory === 'All') return courses;
      return courses.filter(c => (c.category === selectedCategory) || (c.section === selectedCategory));
  }, [courses, selectedCategory]);

  return (
    <>
       {!isDark && (
        <style jsx global>{`
          .light-mode-active { background-color: #ecfeff !important; color: #134e4a !important; }
          .light-mode-active nav { background-color: rgba(255, 255, 255, 0.9) !important; border-bottom-color: rgba(20, 184, 166, 0.2) !important; }
          .light-mode-active h1 span.text-white { color: #134e4a !important; }
          .light-mode-active p.text-gray-300 { color: #0f766e !important; }
          .light-mode-active .text-white { color: #134e4a !important; } 
          .light-mode-active .group .text-white { color: #134e4a !important; }
          .light-mode-active .card-hover:hover { box-shadow: 0 20px 25px -5px rgba(20, 184, 166, 0.2), 0 10px 10px -5px rgba(20, 184, 166, 0.1); }
        `}</style>
      )}

      <div className={`min-h-screen font-sans selection:bg-teal-500 selection:text-white dir-rtl overflow-x-hidden relative transition-colors duration-500 ${isDark ? 'bg-[#020617] text-white' : 'light-mode-active'}`}>
        
        {/* Navbar */}
        <nav className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-500 ${isDark ? 'bg-black/80 border-teal-900/30' : 'bg-white/90 border-teal-200'}`}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="w-32 relative"><BrandLogo /></div>
              <div className="flex gap-4">
                  <Link href="/" className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition border hover:scale-105 hover:shadow-lg hover:shadow-teal-500/20 bg-gradient-to-r from-teal-500 to-yellow-500 text-white border-transparent">
                      <span>🏠</span> الرئيسية
                  </Link>
              </div>
          </div>
        </nav>

        {/* 🌊 الخلفية */}
        <SummerParticles isDark={isDark} />
        {isDark && (
           <div className="fixed inset-0 pointer-events-none">
                 <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} 
                    transition={{ duration: 6, repeat: Infinity }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-600/10 blur-[150px] rounded-full mix-blend-screen"
                 ></motion.div>
                 <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} 
                    transition={{ duration: 8, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-yellow-600/10 blur-[150px] rounded-full mix-blend-screen"
                 ></motion.div>
                 <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")'}}></div>
           </div>
        )}
        <FloatingTools isDark={isDark} toggleTheme={toggleTheme} />


        <main className="relative z-10 pt-32 pb-40 px-4 md:px-6">
          
          {/* 🔥 Hero Section (Tropical Vibes) */}
          <div className="max-w-5xl mx-auto text-center mb-20 relative">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500/10 to-yellow-500/10 border border-teal-500/30 text-teal-400 px-6 py-2 rounded-full text-xs font-black tracking-widest mb-8 shadow-[0_0_20px_rgba(20,184,166,0.3)] animate-pulse">
                  <span className="text-lg">🍹</span> SUMMER CAMP 2025
              </motion.div>
              
              <Reveal>
                  <h1 className="text-5xl md:text-8xl font-black mb-8 leading-tight">
                      <span className={`block mb-2 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>صيفك السنادي</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-yellow-400 to-rose-400 drop-shadow-[0_0_30px_rgba(20,184,166,0.6)]">بره الصندوق.</span>
                  </h1>
              </Reveal>

              <Reveal delay={0.2}>
                  <p className={`text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-bold border-r-4 border-teal-500 pr-6 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      انسى الملل! 🧊 اتعلم <span className="text-teal-500">لغات</span>، <span className="text-yellow-500">برمجة</span>، وجرافيك.. مهارات هتخليك سابق سنك بسنين، وأنت قاعد في التكييف! 😎
                  </p>
              </Reveal>
          </div>

          {/* 📦 المميزات (بطاقات مبهجة) */}
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-32">
              {[
                  { icon: "🎨", title: "إبداع", desc: "أطلق العنان لخيالك في التصميم والمونتاج.", color: "bg-rose-500/10 text-rose-500" },
                  { icon: "💻", title: "تكنولوجيا", desc: "برمجة، ذكاء اصطناعي، وعالم جديد.", color: "bg-teal-500/10 text-teal-500" },
                  { icon: "🗣️", title: "لغات", desc: "اتكلم بطلاقة واكسر حاجز الخوف.", color: "bg-yellow-500/10 text-yellow-500" }
              ].map((item, idx) => (
                  <Reveal key={idx} delay={idx * 0.1}>
                      <div className={`p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-2 h-full ${isDark ? 'bg-[#0f172a] border-white/5 hover:border-teal-500/50' : 'bg-white border-gray-100 hover:border-teal-200 shadow-xl'}`}>
                          <div className={`text-4xl mb-6 w-16 h-16 rounded-2xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
                          <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                          <p className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
                      </div>
                  </Reveal>
              ))}
          </div>

          {/* 📦 البوكس الزجاجي للفلاتر (The Box) */}
          <div className="sticky top-24 z-40 mb-12">
             <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`p-3 md:p-4 rounded-[2rem] border shadow-2xl backdrop-blur-xl transition-all duration-500 mx-auto w-fit max-w-[95vw] overflow-x-auto custom-scrollbar
                ${isDark ? 'bg-[#0f172a]/80 border-teal-900/30 shadow-black/20 supports-[backdrop-filter]:bg-[#0f172a]/60' : 'bg-white/80 border-white shadow-teal-200/50'}
             `}>
                <div className="flex items-center gap-2">
                    {categories.map((cat, idx) => (
                         <button
                            key={idx}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2
                            ${selectedCategory === cat 
                                ? 'bg-gradient-to-r from-teal-500 to-yellow-500 text-white shadow-lg shadow-teal-500/30 scale-105' 
                                : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-teal-50')}
                            `}
                         >
                             {cat === 'All' && <span>🌈</span>}
                             {cat === 'All' ? 'الكل' : cat}
                         </button>
                     ))}
                </div>
             </motion.div>
          </div>

          {/* Grid الكورسات */}
          <div className="max-w-7xl mx-auto mb-32">
              {loading ? (
                <div className="flex justify-center text-teal-500 font-bold animate-pulse text-xl">جاري تحضير المتعة... 🍹</div>
              ) : filteredCourses.length === 0 ? (
                 <div className={`text-center py-24 rounded-[3rem] border border-dashed flex flex-col items-center justify-center gap-6 ${isDark ? 'bg-white/5 border-teal-900/30' : 'bg-teal-50 border-teal-200'}`}>
                     <span className="text-7xl animate-bounce">🏝️</span>
                     <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>لسه مفيش كورسات هنا</h3>
                     <button onClick={() => setSelectedCategory('All')} className="text-teal-500 font-bold underline text-lg hover:text-teal-400">شوف باقي الأقسام</button>
                 </div>
              ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredCourses.map((course, idx) => (
                          <Reveal key={course.id} delay={idx * 0.1}>
                              <div 
                                  onClick={() => setSelectedCourse(course)}
                                  className={`group relative h-[450px] rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:-translate-y-2 card-hover ${isDark ? 'hover:shadow-teal-900/40' : 'hover:shadow-teal-200'}`}
                              >
                                  {/* صورة الخلفية */}
                                  <div className="absolute inset-0 bg-gray-900">
                                      {course.image ? (
                                          <Image src={course.image} alt={course.name} fill className="object-cover transition duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-900 to-yellow-900">
                                              <span className="text-8xl opacity-30">🎨</span>
                                          </div>
                                      )}
                                  </div>

                                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent opacity-90"></div>

                                  {/* ✅ السعر */}
                                  <div className="absolute top-4 left-4 z-20">
                                      <span className="bg-yellow-500 text-black text-xs font-black px-4 py-2 rounded-full shadow-lg shadow-yellow-500/30">
                                          {course.price && course.price > 0 ? `${course.price} EGP` : 'مجاناً 🔥'}
                                      </span>
                                  </div>

                                  {/* المحتوى */}
                                  <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                                      
                                      <h3 className="text-3xl font-black text-white mb-2 leading-tight drop-shadow-md">{course.name}</h3>

                                      {/* ✅ التصنيف */}
                                      <div className="mb-4">
                                            <span className="inline-block border border-teal-400/30 bg-teal-500/20 backdrop-blur-sm text-teal-200 text-xs font-bold px-3 py-1 rounded-lg">
                                                {course.category || course.section || 'General Skills'}
                                            </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 mb-6">
                                          <span className="text-gray-300 text-sm font-bold">مع:</span>
                                          <span className="text-white text-sm font-bold border-b border-yellow-500 pb-0.5">{course.instructorName}</span>
                                      </div>

                                      <div className="flex items-center gap-2 text-teal-400 font-bold opacity-0 translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                          <span>التفاصيل</span>
                                          <span className="text-xl">🡰</span>
                                      </div>
                                  </div>
                              </div>
                          </Reveal>
                      ))}
                  </div>
              )}
          </div>

           {/* 👣 خطوات الاشتراك */}
           <div className="max-w-5xl mx-auto mb-32">
              <Reveal>
                  <h2 className={`text-3xl font-black text-center mb-16 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>الطريق للـ Level Up 🆙</h2>
                  <div className="grid md:grid-cols-3 gap-8 text-center relative">
                      <div className="hidden md:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-teal-600/30 to-transparent"></div>
                      
                      {[
                          { step: "1", title: "سجل", text: "بضغطة زر واحدة." },
                          { step: "2", title: "اختار", text: "الكورس اللي بيلمع في عينك." },
                          { step: "3", title: "انطلق", text: "عيش التجربة وطبق بإيدك." }
                      ].map((s, i) => (
                          <div key={i} className={`p-8 rounded-3xl border relative group hover:-translate-y-2 transition-transform duration-300 ${isDark ? 'bg-[#0f172a] border-white/5 hover:border-teal-500/50' : 'bg-white border-teal-100 shadow-xl'}`}>
                              <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                                className="w-14 h-14 bg-gradient-to-br from-teal-500 to-yellow-500 rounded-full flex items-center justify-center font-black text-xl absolute -top-7 left-1/2 -translate-x-1/2 border-4 border-[#020617] shadow-lg z-10"
                              >
                                <span className="text-white">{s.step}</span>
                              </motion.div>
                              <h3 className={`text-xl font-bold mt-8 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.title}</h3>
                              <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.text}</p>
                          </div>
                      ))}
                  </div>
              </Reveal>
          </div>
           {/* 💀 CTA Final (بوكس الاشتراك الفيروزي) */}
          <Reveal>
              <div className="max-w-4xl mx-auto rounded-[3rem] overflow-hidden relative shadow-2xl shadow-teal-900/30 group cursor-pointer mb-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-900 to-[#020617] transition-colors group-hover:from-teal-800"></div>
                  
                  {/* زخرفة خلفية خفيفة */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 blur-[80px] rounded-full"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full"></div>

                  <div className="relative z-10 p-12 md:p-16 text-center">
                      <h2 className="text-3xl md:text-5xl font-black text-white mb-6">مستني إيه؟ 😎</h2>
                      <p className="text-white/80 text-lg font-bold mb-10 max-w-2xl mx-auto leading-relaxed">
                          الصيف بيجري.. استغل وقتك واتعلم مهارة تميزك وسط الكل. القرار قرارك!
                      </p>
                      <Link href="/signup" className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500 to-yellow-500 text-white px-8 py-4 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-xl hover:shadow-teal-500/20">
                          <span>🚀</span> احجز مكانك الآن
                      </Link>
                  </div>
              </div>
          </Reveal>
        </main>

        {/* ✅ المودال (فيروزي وأصفر) */}
        {mounted && selectedCourse && createPortal(
              <AnimatePresence>
                  <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 dir-rtl"
                      onClick={() => setSelectedCourse(null)}
                  >
                      <motion.div 
                          initial={{ scale: 0.9, opacity: 0, y: 50 }} 
                          animate={{ scale: 1, opacity: 1, y: 0 }} 
                          exit={{ scale: 0.9, opacity: 0, y: 50 }}
                          onClick={(e) => e.stopPropagation()}
                          className={`relative w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] ${isDark ? 'bg-[#0f172a] border border-teal-900/30' : 'bg-white'}`}
                      >
                          <div className="w-full md:w-5/12 relative bg-gray-900 h-64 md:h-auto shrink-0 group">
                              {selectedCourse.image && (
                                  <Image src={selectedCourse.image} alt={selectedCourse.name} fill className="object-cover opacity-80 group-hover:opacity-100 transition duration-700" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent md:bg-gradient-to-l"></div>
                              <div className="absolute bottom-6 right-6 z-10">
                                   <div className="bg-yellow-500 text-black font-black px-4 py-2 rounded-xl inline-block shadow-lg shadow-yellow-500/50 mb-3 text-lg">
                                      {selectedCourse.price > 0 ? `${selectedCourse.price} جنية` : 'مجاني'}
                                   </div>
                                  <h3 className="text-white text-2xl font-black leading-none drop-shadow-lg">{selectedCourse.name}</h3>
                              </div>
                          </div>

                          <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                              <button onClick={() => setSelectedCourse(null)} className="absolute top-6 left-6 w-10 h-10 bg-gray-500/10 hover:bg-teal-500/20 text-gray-400 hover:text-teal-500 rounded-full flex items-center justify-center transition font-bold z-10">✕</button>

                              <div className="flex-1">
                                  <div className="flex items-center gap-4 mb-8 bg-teal-500/5 p-4 rounded-2xl border border-teal-500/10">
                                      {(() => {
                                          const inst = getInstructorDetails(selectedCourse.instructorName);
                                          return (
                                            <>
                                              <div className="w-16 h-16 rounded-full border-2 border-teal-500 overflow-hidden relative shadow-lg">
                                                {inst.img ? <Image src={inst.img} alt={inst.name} fill className="object-cover" /> : <div className="w-full h-full bg-gray-800 flex items-center justify-center text-2xl">👨‍🏫</div>}
                                              </div>
                                              <div>
                                                  <p className="text-xs font-bold text-teal-500 uppercase tracking-wider">المدرب</p>
                                                  <p className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{inst.name}</p>
                                                  <p className="text-xs text-gray-500 font-bold">{inst.role}</p>
                                              </div>
                                            </>
                                          );
                                      })()}
                                  </div>

                                  <div className="space-y-4">
                                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                          <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>🎨 تفاصيل الكورس:</h4>
                                          <p className={`text-sm leading-7 font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                              {selectedCourse.details || 'تعلم مهارة جديدة، وطبق عملي في مشاريع حقيقية تؤهلك لسوق العمل.'}
                                          </p>
                                      </div>
                                  </div>
                              </div>

                              <div className="grid gap-3 mt-8 pt-8 border-t border-gray-500/20">
                                  {/* ✅ زرار الواتساب */}
                                  <a 
                                    href={`${getInstructorDetails(selectedCourse.instructorName).whatsapp}?text=السلام عليكم، عايز اشترك في كورس: ${selectedCourse.name}`} 
                                    target="_blank" 
                                    className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/20 transition transform hover:-translate-y-1"
                                  >
                                      <span className="text-xl">💬</span> احجز مكانك واتساب
                                  </a>
                                  
                                  {/* ✅ زرار تسجيل الحساب */}
                                  <Link href="/signup" className="w-full py-4 bg-gradient-to-r from-teal-500 to-yellow-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal-600/30 transition transform hover:-translate-y-1">
                                      <span>🚀</span> اشترك الآن
                                  </Link>
                              </div>
                          </div>
                      </motion.div>
                  </motion.div>
              </AnimatePresence>,
              document.body
          )}

      </div>
    </>
  );
}