'use client';
import React from 'react';
import NotificationBell from '@/app/ui/NotificationBell';

const Icons = {
    Search: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Moon: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    Sun: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Menu: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
};

export default function Header({ 
  isSidebarOpen, setIsSidebarOpen, 
  searchTerm, setSearchTerm, 
  isDarkMode, toggleTheme, 
  onOpenPassModal 
}) {
  const theme = {
    sidebar: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    hover: isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
  };

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-md border-b bg-opacity-80 px-8 py-4 flex items-center justify-between ${theme.sidebar}`}>
        <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition ${theme.hover} ${theme.textSec}`}>
                <Icons.Menu />
            </button>

            <div className="relative max-w-md w-full">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                   <Icons.Search />
                </span>
                <input 
                    type="text" 
                    placeholder="بحث سريع (طلاب، نتائج...)" 
                    className={`w-full py-2 pr-10 pl-4 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${theme.input}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex items-center gap-4">
             {/* 🔔 إضافة الجرس هنا */}
             <NotificationBell />

             <button onClick={onOpenPassModal} className="text-sm font-medium text-indigo-500 hover:text-indigo-600 hidden md:block">
                تغيير كلمة المرور
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
            <button 
                onClick={toggleTheme} 
                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
                {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
        </div>
    </header>
  );
}