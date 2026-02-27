'use client';
import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { logout } from '@/app/actions/auth';

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
export default function Sidebar({ activeTab, setActiveTab, isSidebarOpen, adminData, pendingCount = 0, onCloseMobile }) {
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
        { id: 'courses', label: 'إدارة الكورسات', icon: <Icons.Home /> }
    ];

    return (
        <aside
            className={`fixed md:sticky top-0 right-0 h-screen z-50 transition-all duration-300 transform 
            ${isSidebarOpen ? 'translate-x-0 w-72 md:w-64' : 'translate-x-full md:translate-x-0 md:w-20'} 
            ${theme.sidebar} flex flex-col shadow-2xl border-l`}
        >
            {/* Header - اللوجو وعنوان اللوحة */}
            <div className={`h-16 flex items-center border-b border-gray-700/10 transition-all ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'}`}>
                {isSidebarOpen ? (
                    <div className="flex items-center gap-2 font-bold text-lg animate-fade-in">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-lg shadow-indigo-500/20">A</span>
                        <span className={theme.textMain}>لوحة التحكم</span>
                    </div>
                ) : (
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">A</span>
                )}
            </div>

            {/* زرار العودة للموقع */}
            <div className="p-3">
                <Link
                    href="/"
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black transition-all duration-200 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 ${!isSidebarOpen && 'justify-center'}`}
                >
                    <span>🌐</span>
                    {isSidebarOpen && <span>الموقع الرئيسي</span>}
                </Link>
            </div>

            {/* روابط التنقل */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (window.innerWidth < 768 && onCloseMobile) onCloseMobile();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative group
                            ${isActive ? `${theme.accent} shadow-lg shadow-indigo-500/20` : `${theme.textSec} ${theme.hover}`} 
                            ${!isSidebarOpen && 'justify-center'}`}
                            title={!isSidebarOpen ? item.label : ''}
                        >
                            <span className={`${isActive ? 'text-white' : 'text-indigo-500'} transition-colors`}>
                                {item.icon}
                            </span>

                            {isSidebarOpen && <span className="truncate">{item.label}</span>}

                            {/* إشعار الطلاب المعلقين */}
                            {item.id === 'students' && pendingCount > 0 && (
                                <span className={`bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse ${!isSidebarOpen ? 'absolute -top-1 -right-1' : 'mr-auto'}`}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* الجزء السفلي - البروفايل والخروج */}
            <div className="p-4 border-t border-gray-700/10 space-y-2">
                {isSidebarOpen ? (
                    <div className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} border border-gray-700/5`}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                            {adminData?.name ? adminData.name[0].toUpperCase() : 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black truncate ${theme.textMain}`}>{adminData?.name}</p>
                            <p className="text-[10px] font-bold text-indigo-500">مدير النظام</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-9 h-9 mx-auto rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black mb-4 shadow-md">
                        {adminData?.name ? adminData.name[0].toUpperCase() : 'A'}
                    </div>
                )}

                <button
                    onClick={async () => {
                        if (!confirm("هل تريد تسجيل الخروج؟")) return;
                        try {
                            await signOut(auth);
                            localStorage.clear();
                            sessionStorage.clear();
                            document.cookie = "firebaseToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            document.cookie = "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                            await logout();
                        } catch (e) {
                            console.error("Logout Error:", e);
                        } finally {
                            window.location.href = '/login';
                        }
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-xs font-black ${!isSidebarOpen && 'justify-center'}`}
                >
                    <Icons.Logout /> {isSidebarOpen && "تسجيل الخروج"}
                </button>
            </div>
        </aside>
    );
}