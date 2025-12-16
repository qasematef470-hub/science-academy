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
// 👨‍🏫 بيانات الدكاترة (نفس البيانات)
// ==========================================
const ADMINS_LIST = [
  {
    name: "د. طه علي جميل",
    searchKey: "طه", 
    phone: "01014946210", 
    img: '/assets/images/instructor-taha.jpg',
    role: "Botany & Zoology & Anatomy & Physiology"
  },
  {
    name: "د. عبدالرحمن علي فؤاد",
    searchKey: "عبدالرحمن",
    phone: "01064577084",
    img: '/assets/images/instructor-abdelrahman.jpg',
    role: "Chemistry "
  },
  {
    name: "م. القاسم عاطف شريف",
    searchKey: "القاسم",
    phone: "01100588901",
    img: '/assets/images/instructor-alqasem.jpg',
    role: "Mathematics & CS "
  }
];

// دالة بيانات المحاضر
const getInstructorDetails = (courseInstructorName) => {
    const name = courseInstructorName || "";
    const admin = ADMINS_LIST.find(a => name.includes(a.searchKey));
    
    if (admin) {
        const formattedPhone = `20${admin.phone.substring(1)}`;
        return {
            name: admin.name,
            img: admin.img,
            role: admin.role,
            whatsapp: `https://wa.me/${formattedPhone}`
        };
    }
    return {
        name: name || "Science Academy",
        img: null,
        role: "Senior Instructor",
        whatsapp: "https://wa.me/201014946210"
    };
};

// ==========================================
// 🌌 خلفية شبكة العلوم (Blue Particles) 🔵
// ==========================================
const ScientificParticles = ({ isDark }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;
    let particles = [];

    // 🎨 الألوان هنا زرقاء (Royal Blue & Cyan)
    const particleColor = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(37, 99, 235, 0.5)';
    const lineColor = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.1)';

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];
      const particleCount = width < 768 ? 35 : 70; // كثافة مناسبة
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4, // حركة أهدأ قليلاً من المراجعة
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = particleColor;
      ctx.strokeStyle = lineColor;

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
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
// 🛠️ الأدوات العائمة (نفس التصميم - لون أزرق)
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
                        className={`mb-2 p-4 rounded-2xl shadow-2xl border min-w-[250px] ${isDark ? 'bg-[#020617] border-blue-900/50' : 'bg-white border-blue-200'}`}
                    >
                        <h4 className={`text-sm font-bold mb-3 text-center ${isDark ? 'text-blue-200' : 'text-gray-700'}`}>تواصل مباشرة مع:</h4>
                        <div className="flex flex-col gap-2">
                            {ADMINS_LIST.map((admin, idx) => (
                                <a 
                                    key={idx}
                                    href={`https://wa.me/20${admin.phone.substring(1)}`}
                                    target="_blank"
                                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-green-500/10 group
                                    ${isDark ? 'text-gray-200 hover:text-green-400' : 'text-gray-800 hover:text-green-600'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/></svg>
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
                className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform duration-300 relative z-50"
            >
                 {showContactMenu ? (
                     <span className="text-xl font-bold">✕</span>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/></svg>
                 )}
            </button>

            <button onClick={toggleTheme} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-blue-200 text-blue-600'}`}>
                {isDark ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
            </button>
        </div>
    );
};

// ==========================================
// 💎 مكون القائمة (Blue Style) 🔵
// ==========================================
const CustomDropdown = ({ label, options, value, onChange, icon, disabled, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-3 px-5 py-3 md:py-4 rounded-2xl font-bold text-xs md:text-sm transition-all duration-300 border shadow-lg min-w-[140px] md:min-w-[180px] justify-between
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-xl cursor-pointer'}
        ${isDark 
          ? 'bg-[#0f172a] border-blue-900/30 text-white hover:border-blue-500/50 shadow-black/50' 
          : 'bg-white border-gray-100 text-gray-800 hover:border-blue-200 shadow-blue-100'}
        ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="truncate max-w-[90px] md:max-w-[110px]">{value || label}</span>
        </div>
        <span className={`text-[10px] transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}>▼</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full mt-2 left-0 w-full min-w-[180px] rounded-2xl border shadow-2xl overflow-hidden z-50 max-h-[250px] overflow-y-auto custom-scrollbar
            ${isDark ? 'bg-[#0f172a] border-blue-900/30' : 'bg-white border-gray-100'}
            `}
          >
            {options.length > 0 ? (
              options.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className={`px-5 py-3 text-sm font-bold cursor-pointer transition-colors flex items-center gap-2 border-b last:border-0
                  ${isDark 
                    ? 'text-gray-300 border-white/5 hover:bg-blue-900/40 hover:text-white' 
                    : 'text-gray-700 border-gray-50 hover:bg-blue-50 hover:text-blue-600'}
                  ${value === opt ? (isDark ? 'bg-blue-900/60 text-white' : 'bg-blue-50 text-blue-600') : ''}
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${value === opt ? 'bg-blue-500' : 'bg-gray-400/30'}`}></span>
                  {opt}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">لا توجد خيارات</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterArrow = ({ isDark }) => (
    <div className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-full border text-[10px] animate-pulse ${isDark ? 'border-blue-900/30 text-gray-600' : 'border-blue-200 text-gray-300'}`}>
        ➜
    </div>
);

// ==========================================
// 🚀 الصفحة الرئيسية (Academic Study)
// ==========================================
export default function StudyPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    document.title = "المسار الاكاديمى| Science Academy";
  }, []);

  // الفلاتر
  const [selectedUni, setSelectedUni] = useState('');
  const [selectedCol, setSelectedCol] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setIsDark(false);

    const fetchCourses = async () => {
      // ✅ جلب الكورسات الأكاديمية (الشرح)
      const res = await getAllCourses({ mode: 'academic' });
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

  // Logic الفلترة
  const availableUniversities = useMemo(() => [...new Set(courses.map(c => c.university).filter(Boolean))], [courses]);
  
  const availableColleges = useMemo(() => {
      let filtered = courses;
      if (selectedUni) filtered = filtered.filter(c => c.university === selectedUni);
      return [...new Set(filtered.map(c => c.college).filter(Boolean))];
  }, [courses, selectedUni]);

  const availableYears = useMemo(() => {
      let filtered = courses;
      if (selectedUni) filtered = filtered.filter(c => c.university === selectedUni);
      if (selectedCol) filtered = filtered.filter(c => c.college === selectedCol);
      return [...new Set(filtered.map(c => c.year).filter(Boolean))];
  }, [courses, selectedUni, selectedCol]);

  const availableSections = useMemo(() => {
      let filtered = courses;
      if (selectedUni) filtered = filtered.filter(c => c.university === selectedUni);
      if (selectedCol) filtered = filtered.filter(c => c.college === selectedCol);
      if (selectedYear) filtered = filtered.filter(c => c.year === selectedYear);
      return [...new Set(filtered.map(c => c.section).filter(Boolean))];
  }, [courses, selectedUni, selectedCol, selectedYear]);

  const filteredCourses = useMemo(() => {
      return courses.filter(c => {
          if (selectedUni && c.university !== selectedUni) return false;
          if (selectedCol && c.college !== selectedCol) return false;
          if (selectedYear && c.year !== selectedYear) return false;
          if (selectedSection && c.section !== selectedSection) return false;
          return true;
      });
  }, [courses, selectedUni, selectedCol, selectedYear, selectedSection]);


  return (
    <>
       {!isDark && (
        <style jsx global>{`
          .light-mode-active { background-color: #f8fafc !important; color: #0f172a !important; }
          .light-mode-active nav { background-color: rgba(255, 255, 255, 0.9) !important; border-bottom-color: rgba(59, 130, 246, 0.1) !important; }
          .light-mode-active h1 span.text-white { color: #0f172a !important; }
          .light-mode-active p.text-gray-300 { color: #475569 !important; }
          .light-mode-active .text-white { color: #0f172a !important; } 
          .light-mode-active .group .text-white { color: #0f172a !important; }
          .light-mode-active .card-hover:hover { box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04); }
        `}</style>
      )}

      <div className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white dir-rtl overflow-x-hidden relative transition-colors duration-500 ${isDark ? 'bg-[#020617] text-white' : 'light-mode-active'}`}>
        
        {/* Navbar */}
        <nav className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-500 ${isDark ? 'bg-black/80 border-blue-900/30' : 'bg-white/90 border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="w-32 relative"><BrandLogo /></div>
              <div className="flex gap-4">
                  <Link href="/" className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition border hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 bg-blue-600 text-white border-blue-600">
                      <span>🏠</span> الرئيسية
                  </Link>
              </div>
          </div>
        </nav>

        {/* 🔵 الجزيئات والخلفية الزرقاء */}
        <ScientificParticles isDark={isDark} />
        {isDark && (
           <div className="fixed inset-0 pointer-events-none">
                 <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen"
                 ></motion.div>
                 <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")'}}></div>
           </div>
        )}
        <FloatingTools isDark={isDark} toggleTheme={toggleTheme} />


        <main className="relative z-10 pt-32 pb-40 px-4 md:px-6">
          
          {/* 🔥 Hero Section (تعديل النصوص فقط، نفس الأنيميشن) */}
          <div className="max-w-5xl mx-auto text-center mb-24 relative">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-black tracking-widest mb-8 shadow-[0_0_20px_rgba(37,99,235,0.5)] animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full animate-ping"></span> ACADEMIC FOCUS 🧿
              </motion.div>
              
              <Reveal>
                  <h1 className="text-5xl md:text-8xl font-black mb-8 leading-tight">
                      <span className={`block mb-2 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>ابني مستقبلك</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 drop-shadow-[0_0_30px_rgba(37,99,235,0.8)] glitch-effect">طوبة طوبة.</span>
                  </h1>
              </Reveal>

              <Reveal delay={0.2}>
                  <p className={`text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-bold border-r-4 border-blue-600 pr-6 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      الدراسة الأكاديمية مش مجرد حفظ.. هنا هتلاقي <span className="text-blue-500">شرح تفصيلي</span> لكل حرف في المنهج، وتأسيس يخليك دكتور في مجالك.
                  </p>
              </Reveal>
          </div>

          {/* 📦 المميزات (بنفس ستايل المراجعة) */}
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-32">
              {[
                  { icon: "🏛️", title: "تأسيس", desc: "شرح المنهج من الصفر حتى الاحتراف." },
                  { icon: "🧠", title: "فهم عميق", desc: "مش بنحفظك، بنفهمك كل معادلة جت منين." },
                  { icon: "📅", title: "متابعة", desc: "امتحانات دورية ومتابعة مستمرة لمستواك." }
              ].map((item, idx) => (
                  <Reveal key={idx} delay={idx * 0.1}>
                      <div className={`p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-2 h-full ${isDark ? 'bg-[#0f172a] border-white/5 hover:border-blue-600/50' : 'bg-white border-gray-100 hover:border-blue-200 shadow-xl'}`}>
                          <div className="text-5xl mb-6 bg-blue-500/10 w-20 h-20 rounded-2xl flex items-center justify-center">{item.icon}</div>
                          <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                          <p className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
                      </div>
                  </Reveal>
              ))}
          </div>

          {/* 📚 قسم الكورسات (نفس الفلاتر والكروت) */}
          <div className="max-w-7xl mx-auto mb-32">
              
              <Reveal>
                  <div className="flex items-center gap-4 mb-8">
                      <div className="h-1 flex-1 bg-gradient-to-l from-blue-600/50 to-transparent"></div>
                      <h2 className={`text-3xl md:text-5xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>المناهج <span className="text-blue-500">المتاحة</span> 📚</h2>
                      <div className="h-1 flex-1 bg-gradient-to-r from-blue-600/50 to-transparent"></div>
                  </div>
              </Reveal>

              {/* 🔍 شريط الفلترة */}
              <div className="sticky top-24 z-40 mb-12">
                 <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`p-3 md:p-4 rounded-[2rem] border shadow-2xl backdrop-blur-xl transition-all duration-500 mx-auto w-fit
                    ${isDark ? 'bg-[#0f172a]/80 border-blue-900/30 shadow-black/20 supports-[backdrop-filter]:bg-[#0f172a]/60' : 'bg-white/80 border-white shadow-blue-200/50'}
                 `}>
                    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                        <CustomDropdown label="الجامعة" value={selectedUni} options={availableUniversities} onChange={(val) => { setSelectedUni(val); setSelectedCol(''); setSelectedYear(''); setSelectedSection(''); }} icon="🏛️" isDark={isDark} />
                        <FilterArrow isDark={isDark} />
                        <CustomDropdown label="الكلية" value={selectedCol} options={availableColleges} onChange={(val) => { setSelectedCol(val); setSelectedYear(''); setSelectedSection(''); }} icon="🎓" disabled={!selectedUni} isDark={isDark} />
                        <FilterArrow isDark={isDark} />
                        <CustomDropdown label="السنة" value={selectedYear} options={availableYears} onChange={(val) => { setSelectedYear(val); setSelectedSection(''); }} icon="📅" disabled={!selectedCol} isDark={isDark} />
                        <FilterArrow isDark={isDark} />
                        <CustomDropdown label="الشعبة" value={selectedSection} options={availableSections} onChange={(val) => setSelectedSection(val)} icon="🔹" disabled={!selectedYear} isDark={isDark} />
                        
                        <AnimatePresence>
                            {(selectedUni || selectedCol) && (
                                <motion.button initial={{ opacity: 0, scale: 0.5, width: 0 }} animate={{ opacity: 1, scale: 1, width: 'auto' }} exit={{ opacity: 0, scale: 0.5, width: 0 }} onClick={() => { setSelectedUni(''); setSelectedCol(''); setSelectedYear(''); setSelectedSection(''); }} className="px-5 py-4 rounded-2xl bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 font-bold text-sm transition-all flex items-center gap-2 group whitespace-nowrap overflow-hidden">
                                    <span className="group-hover:rotate-180 transition-transform duration-300 text-lg">✕</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                 </motion.div>
              </div>

              {/* Grid الكورسات */}
              {loading ? (
                <div className="flex justify-center text-blue-500 font-bold animate-pulse">جاري تحميل المناهج...</div>
              ) : filteredCourses.length === 0 ? (
                 <div className={`text-center py-16 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-white/5 border-blue-900/30' : 'bg-gray-100 border-gray-300'}`}>
                     <span className="text-6xl opacity-50">📂</span>
                     <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>لا توجد كورسات مطابقة للفلاتر</h3>
                     <button onClick={() => { setSelectedUni(''); setSelectedCol(''); setSelectedYear(''); setSelectedSection(''); }} className="text-blue-500 font-bold underline hover:text-blue-400">عرض كل الكورسات</button>
                 </div>
              ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredCourses.map((course, idx) => (
                          <Reveal key={course.id} delay={idx * 0.1}>
                              <div 
                                  onClick={() => setSelectedCourse(course)}
                                  className={`group relative h-[450px] rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:-translate-y-2 card-hover ${isDark ? 'hover:shadow-blue-900/40' : 'hover:shadow-blue-200'}`}
                              >
                                  {/* صورة الخلفية */}
                                  <div className="absolute inset-0 bg-gray-900">
                                      {course.image ? (
                                          <Image src={course.image} alt={course.name} fill className="object-cover transition duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
                                              <span className="text-8xl opacity-20">📖</span>
                                          </div>
                                      )}
                                  </div>

                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>

                                  {/* ✅ السعر */}
                                  <div className="absolute top-4 left-4 z-20">
                                      <span className="bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-lg shadow-emerald-600/30">
                                          {course.price && course.price > 0 ? `${course.price} EGP` : 'FREE'}
                                      </span>
                                  </div>

                                  {/* المحتوى */}
                                  <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                                      
                                      <h3 className="text-3xl font-black text-white mb-2 leading-tight drop-shadow-md">{course.name}</h3>

                                      {/* ✅ الشعبه (Section) */}
                                      {course.section && (
                                        <div className="mb-4">
                                            <span className="inline-block border border-white/30 bg-blue-500/20 backdrop-blur-sm text-blue-100 text-xs font-bold px-3 py-1 rounded-lg">
                                                {course.section}
                                            </span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2 mb-6">
                                          <span className="text-gray-300 text-sm font-bold">بقيادة:</span>
                                          <span className="text-white text-sm font-bold border-b border-blue-500 pb-0.5">{course.instructorName}</span>
                                      </div>

                                      <div className="flex items-center gap-2 text-blue-400 font-bold opacity-0 translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                          <span>استعرض التفاصيل</span>
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
                  <h2 className={`text-3xl font-black text-center mb-16 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>ازاي تبدأ؟ 🤔</h2>
                  <div className="grid md:grid-cols-3 gap-8 text-center relative">
                      <div className="hidden md:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-blue-600/30 to-transparent"></div>
                      
                      {[
                          { step: "1", title: "سجل حساب", text: "اعمل حساب جديد في ثواني." },
                          { step: "2", title: "اختر المادة", text: "دوس على المادة اللي عايز تدرسها." },
                          { step: "3", title: "ابدأ المذاكرة", text: "تواصل واتساب لتفعيل الاشتراك." }
                      ].map((s, i) => (
                          <div key={i} className={`p-8 rounded-3xl border relative group hover:-translate-y-2 transition-transform duration-300 ${isDark ? 'bg-[#111] border-white/5 hover:border-blue-600/50' : 'bg-white border-gray-100 shadow-xl'}`}>
                              <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                                className="w-14 h-14 bg-blue-600 rounded-2xl rotate-45 flex items-center justify-center font-black text-xl absolute -top-7 left-1/2 -translate-x-1/2 border-4 border-[#050505] shadow-[0_0_20px_rgba(37,99,235,0.4)] z-10"
                              >
                                <span className="-rotate-45 text-white">{s.step}</span>
                              </motion.div>
                              <h3 className={`text-xl font-bold mt-8 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.title}</h3>
                              <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.text}</p>
                          </div>
                      ))}
                  </div>
              </Reveal>
          </div>

          {/* 💀 CTA Final (بوكس الاشتراك الأزرق) */}
          <Reveal>
              <div className="max-w-4xl mx-auto rounded-[3rem] overflow-hidden relative shadow-2xl shadow-blue-900/30 group cursor-pointer mb-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-black transition-colors group-hover:from-blue-800"></div>
                  
                  {/* زخرفة خلفية خفيفة */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full"></div>

                  <div className="relative z-10 p-12 md:p-16 text-center">
                      <h2 className="text-3xl md:text-5xl font-black text-white mb-6">جاهز للامتياز؟ 🎓</h2>
                      <p className="text-white/80 text-lg font-bold mb-10 max-w-2xl mx-auto leading-relaxed">
                          بداية طريقك للتفوق بتبدأ بقرار.. متضيعش وقت ومجهود في الحفظ، افهم صح وابني مستقبلك.
                      </p>
                      <Link href="/signup" className="inline-flex items-center gap-3 bg-white text-blue-700 px-8 py-4 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-xl hover:shadow-blue-500/20">
                          <span>📝</span> سجل في الكورس
                      </Link>
                  </div>
              </div>
          </Reveal>
        </main>

        {/* ✅ المودال (نفس تصميم المراجعة بالظبط مع تعديل اللون للأزرق) */}
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
                          className={`relative w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] ${isDark ? 'bg-[#121212] border border-blue-900/30' : 'bg-white'}`}
                      >
                          <div className="w-full md:w-5/12 relative bg-gray-900 h-64 md:h-auto shrink-0 group">
                              {selectedCourse.image && (
                                  <Image src={selectedCourse.image} alt={selectedCourse.name} fill className="object-cover opacity-80 group-hover:opacity-100 transition duration-700" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent md:bg-gradient-to-l"></div>
                              <div className="absolute bottom-6 right-6 z-10">
                                   <div className="bg-emerald-600 text-white font-black px-4 py-2 rounded-xl inline-block shadow-lg shadow-emerald-900/50 mb-3 text-lg">
                                      {selectedCourse.price > 0 ? `${selectedCourse.price} جنية` : 'مجاني'}
                                   </div>
                                  <h3 className="text-white text-2xl font-black leading-none drop-shadow-lg">{selectedCourse.name}</h3>
                              </div>
                          </div>

                          <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                              <button onClick={() => setSelectedCourse(null)} className="absolute top-6 left-6 w-10 h-10 bg-gray-500/10 hover:bg-blue-500/20 text-gray-400 hover:text-blue-500 rounded-full flex items-center justify-center transition font-bold z-10">✕</button>

                              <div className="flex-1">
                                  <div className="flex items-center gap-4 mb-8 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                                      {(() => {
                                          const inst = getInstructorDetails(selectedCourse.instructorName);
                                          return (
                                            <>
                                              <div className="w-16 h-16 rounded-full border-2 border-blue-600 overflow-hidden relative shadow-lg">
                                                {inst.img ? <Image src={inst.img} alt={inst.name} fill className="object-cover" /> : <div className="w-full h-full bg-gray-800 flex items-center justify-center text-2xl">👨‍🏫</div>}
                                              </div>
                                              <div>
                                                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">محاضر المادة</p>
                                                  <p className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{inst.name}</p>
                                                  <p className="text-xs text-gray-500 font-bold">{inst.role}</p>
                                              </div>
                                            </>
                                          );
                                      })()}
                                  </div>

                                  <div className="space-y-4">
                                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                          <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>🏛️ بيانات التخصص:</h4>
                                          <div className="flex flex-wrap gap-2">
                                              <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20">{selectedCourse.university}</span>
                                              <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-bold border border-indigo-500/20">{selectedCourse.college}</span>
                                              <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 text-xs font-bold border border-cyan-500/20">{selectedCourse.year}</span>
                                              {selectedCourse.section && <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-500 text-xs font-bold border border-teal-500/20">{selectedCourse.section}</span>}
                                          </div>
                                      </div>

                                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                          <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>📝 تفاصيل الكورس:</h4>
                                          <p className={`text-sm leading-7 font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                              {selectedCourse.details || 'لا توجد تفاصيل إضافية لهذا الكورس، تواصل مع المحاضر لمعرفة المزيد.'}
                                          </p>
                                      </div>
                                  </div>
                              </div>

                              <div className="grid gap-3 mt-8 pt-8 border-t border-gray-500/20">
                                  {/* ✅ زرار الواتساب */}
                                  <a 
                                    href={`${getInstructorDetails(selectedCourse.instructorName).whatsapp}?text=السلام عليكم، بخصوص كورس: ${selectedCourse.name}`} 
                                    target="_blank" 
                                    className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/20 transition transform hover:-translate-y-1"
                                  >
                                      <span className="text-xl">💬</span> تواصل واتساب مع المحاضر
                                  </a>
                                  
                                  {/* ✅ زرار تسجيل الحساب */}
                                  <Link href="/signup" className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-600/30 transition transform hover:-translate-y-1">
                                      <span>🚀</span> سجل اشتراك (Signup)
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