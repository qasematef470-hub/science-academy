"use client";

import React, { useState, useEffect } from 'react';
import Navbar from './components/home/Navbar';
import Hero from './components/home/Hero';
import About from './components/home/About';
import Features from './components/home/Features';
import Courses from './components/home/Courses';
import Steps from './components/home/Steps';
import Team from './components/home/Team';
import Footer from './components/home/Footer';
import FloatingShape from './components/ui/FloatingShape'; 

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F9FAFB]',
    textMain: isDarkMode ? 'text-white' : 'text-[#1E293B]',
    textSec: isDarkMode ? 'text-slate-400' : 'text-[#64748B]',
    card: isDarkMode ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50',
    nav: isDarkMode ? 'bg-[#0F172A]/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm',
  };

  // لمنع الوميض
  if (!mounted) return <div className={`min-h-screen ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F9FAFB]'}`}></div>;

  return (
    <div className={`min-h-screen font-sans dir-rtl transition-colors duration-500 overflow-x-hidden ${theme.bg} ${theme.textMain}`}>
      
      {/* 🌌 الخلفية (The Background Layer) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden h-screen">
        
        {/* 1. الـ Blobs القديمة (اللون الأزرق والبنفسجي) */}
        {isDarkMode && (
            <>
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>
            </>
        )}

        {/* 2. الرموز الطائرة (مع تأثير السكرول) */}
        {/* speed = كل ما الرقم زاد، الرمز هيتحرك أسرع لفوق مع السكرول */}
        <FloatingShape type="flask" speed={1.5} top="15%" left="5%" isDarkMode={isDarkMode} />
        <FloatingShape type="atom" speed={2} top="35%" right="10%" isDarkMode={isDarkMode} />
        <FloatingShape type="code" speed={1.2} top="60%" left="8%" isDarkMode={isDarkMode} />
        <FloatingShape type="dna" speed={2.5} bottom="10%" right="5%" isDarkMode={isDarkMode} isFront={true} />
        <FloatingShape type="pi" speed={1} bottom="40%" left="40%" isDarkMode={isDarkMode} />
        <FloatingShape type="triangle" speed={1.8} top="10%" right="40%" isDarkMode={isDarkMode} />

      </div>

      {/* مكونات الصفحة (فوق الخلفية) */}
      <div className="relative z-10">
          <Navbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} theme={theme} />
          <Hero theme={theme} isDarkMode={isDarkMode} />
          <About theme={theme} isDarkMode={isDarkMode} />
          <Features theme={theme} isDarkMode={isDarkMode} />
          <Courses theme={theme} isDarkMode={isDarkMode} />
          <Steps theme={theme} isDarkMode={isDarkMode} />
          <Team theme={theme} isDarkMode={isDarkMode} />
          <Footer theme={theme} isDarkMode={isDarkMode} />
      </div>

    </div>
  );
}