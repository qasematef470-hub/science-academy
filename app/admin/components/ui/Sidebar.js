'use client';
import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link'; // 👈 1. ضفنا دي

// الأيقونات (زي ما هي)
const Icons = {
    Home: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    Users: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Book: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    Folder: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>,
    Megaphone: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
    Chart: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>,
    Trophy: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>,
    Cog: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Logout: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Bolt: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
};

export default function Sidebar({ activeTab, setActiveTab, isSidebarOpen, adminData, pendingCount = 0 }) {
  const isDarkMode = typeof window !== 'undefined' ? localStorage.getItem('theme') === 'dark' : true;
  const theme = {
    sidebar: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    hover: isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100',
    accent: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
  };

  const navItems = [
    { id: 'students', label: 'الطلاب', icon: <Icons.Users /> },
    { id: 'questions', label: 'بنك الأسئلة', icon: <Icons.Folder /> },
    { id: 'admin-tools', label: 'بنك الأسئلة المتقدم', icon: <Icons.Bolt /> },
    { id: 'materials', label: 'المحتوى', icon: <Icons.Book /> },
    { id: 'announcements', label: 'الإعلانات', icon: <Icons.Megaphone /> },
    { id: 'results', label: 'النتائج', icon: <Icons.Chart /> },
    { id: 'leaderboard', label: 'لوحة الشرف', icon: <Icons.Trophy /> },
    { id: 'courses', label: 'إدارة الكورسات', icon: <Icons.Home /> },
    { id: 'settings', label: 'الإعدادات', icon: <Icons.Cog /> }
  ];

  return (
    <aside className={`fixed top-0 right-0 h-full z-40 transition-all duration-300 flex flex-col shadow-xl border-l ${isSidebarOpen ? 'w-64' : 'w-20'} ${theme.sidebar}`}>
        <div className={`h-16 flex items-center border-b border-gray-700/10 transition-all ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'}`}>
            {isSidebarOpen ? (
                <div className="flex items-center gap-2 font-bold text-xl animate-fade-in">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm">A</span>
                    <span>لوحة التحكم</span>
                </div>
            ) : (
                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">A</span>
            )}
        </div>

        {/* 🆕 زرار العودة للموقع الرئيسي */}
        <div className="p-3">
             <Link href="/" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all duration-200 text-green-500 hover:bg-green-500/10 ${!isSidebarOpen && 'justify-center'}`} title="العودة للموقع">
                <span>🌐</span>
                {isSidebarOpen && <span>الموقع الرئيسي</span>}
             </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 
                    ${activeTab === item.id 
                        ? `${theme.accent} shadow-md` 
                        : `${theme.textSec} ${theme.hover}`
                    } ${!isSidebarOpen && 'justify-center'}`}
                    title={!isSidebarOpen ? item.label : ''}
                >
                    {item.icon}
                    {isSidebarOpen && <span className="animate-fade-in">{item.label}</span>}
                    {item.id === 'students' && pendingCount > 0 && (
                        <span className={`bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse ${!isSidebarOpen ? 'absolute top-2 right-2' : 'mr-auto'}`}>
                            {pendingCount}
                        </span>
                    )}
                </button>
            ))}
        </nav>

        <div className={`p-4 border-t border-gray-700/10`}>
             {/* ... (باقي كود البروفايل والخروج زي ما هو) ... */}
            {isSidebarOpen ? (
                <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 animate-fade-in ${theme.card}`}>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        {adminData?.name ? adminData.name[0] : 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${theme.textMain}`}>{adminData?.name}</p>
                        <p className={`text-xs truncate ${theme.textSec}`}>Admin</p>
                    </div>
                </div>
            ) : (
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-4">
                    {adminData?.name ? adminData.name[0] : 'A'}
                </div>
            )}
            <button onClick={() => signOut(auth)} className={`w-full flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-bold ${!isSidebarOpen && 'h-10 w-10 mx-auto'}`}>
               <Icons.Logout /> {isSidebarOpen && "خروج"}
            </button>
        </div>
    </aside>
  );
}