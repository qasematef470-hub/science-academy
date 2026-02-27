'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { logout } from '@/app/actions/auth'; // 1. Import logout action
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import NotificationBell from '../ui/NotificationBell';
import { useSearchParams } from 'next/navigation';

function DashboardLayoutInner({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    // --- States ---
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // للموبايل
    const [isCollapsed, setIsCollapsed] = useState(false);     // للكمبيوتر (تصغير وتكبير)
    const [isDarkMode, setIsDarkMode] = useState(true);        // وضع الإضاءة
    const [studentName, setStudentName] = useState('');
    // --- استبدل السطر الحالي بهذا الكود ---
    const searchParams = useSearchParams();
    const viewParam = searchParams.get('view');
    // ذكاء اصطناعي لتحديد التاب النشط: لو في صفحة كورس، اعتبر التاب هو 'courses'
    const currentTab = pathname.includes('/dashboard/course/') ? 'courses' : (viewParam || 'home');

    // 🔐 مراقبة حالة تسجيل الدخول وجلب الاسم من Firestore
    useEffect(() => {
        let isMounted = true;
        // 🛡️ Safety fallback timer for layout loading in case auth or fetch hangs
        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 10000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const isCoursePage = pathname.includes('/dashboard/course/');

            if (!user) {
                if (isMounted) { setAuthorized(isCoursePage); setLoading(false); }
                if (!isCoursePage) router.replace('/login');
            } else {
                if (!user.emailVerified) {
                    if (isMounted) setLoading(false);
                    router.replace('/verify-email');
                } else {
                    // Start by authorizing and showing content immediately
                    if (isMounted) {
                        setAuthorized(true);
                        setStudentName(user.displayName || 'طالب');
                    }

                    // جلب اسم الطالب الحقيقي من الداتابيز without blocking loading
                    try {
                        let timeoutId;
                        const timeoutPromise = new Promise((_, reject) => {
                            timeoutId = setTimeout(() => reject(new Error('timeout')), 5000);
                        });
                        const fetchPromise = getDoc(doc(db, 'users', user.uid));
                        const userDoc = await Promise.race([
                            fetchPromise.finally(() => clearTimeout(timeoutId)),
                            timeoutPromise
                        ]).catch(err => ({ exists: () => false })); // Absorb timeout error silently

                        if (userDoc.exists()) {
                            setStudentName(userDoc.data().name || user.displayName || 'طالب');
                        }
                    } catch (e) {
                        console.error('Failed to fetch user doc:', e);
                    } finally {
                        if (isMounted) setLoading(false);
                        clearTimeout(safetyTimer);
                    }
                }
            }
        });

        // استعادة وضع الإضاءة من الذاكرة
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');

        return () => {
            isMounted = false;
            unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, [router]);

    // تبديل وضع الإضاءة
    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
        if (newTheme) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };
    // دالة الخروج الآمن
    const handleLogout = async () => {
        setLoading(true);
        try {
            await signOut(auth);
            localStorage.clear();
            sessionStorage.clear();
            document.cookie = "firebaseToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            await logout();
        } catch (error) {
            console.error("Logout Error:", error);
        } finally {
            window.location.href = '/login';
        }
    };
    const isActive = (path) => pathname === path;

    // --- استبدل بلوك التحميل الحالي بهذا ---
    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${isDarkMode ? 'bg-[#050505]' : 'bg-white'}`}>
                <div className="relative flex flex-col items-center gap-6">
                    {/* لوجو خفي في الخلفية */}
                    <div className="absolute inset-0 w-24 h-24 bg-blue-600/10 blur-3xl rounded-full animate-pulse"></div>
                    <div className="w-14 h-14 border-[3px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] animate-pulse ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Science Academy
                    </p>
                </div>
            </div>
        );
    }

    if (!authorized) return null;

    return (
        <div className={`min-h-screen flex flex-row-reverse overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-gray-50 text-slate-900'}`} dir="rtl">

            {/* 1️⃣ القائمة الجانبية (Sidebar) - بتدخل وتخرج (Collapsible) */}
            <aside className={`fixed inset-y-0 right-0 z-50 transition-all duration-300 border-l 
                ${isDarkMode ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-200'} 
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} 
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>

                <div className="h-full flex flex-col p-4 relative">

                    {/* زرار التصغير/التكبير (للكمبيوتر فقط) */}
                    {/* زرار التحكم في القائمة (ثلاث خطوط) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden lg:flex absolute -left-4 top-8 w-9 h-9 rounded-xl items-center justify-center border transition-all hover:scale-110 shadow-xl z-50
                        ${isDarkMode ? 'bg-[#1a1d26] border-white/10 text-white' : 'bg-white border-gray-200 text-blue-600'}`}
                        title={isCollapsed ? "توسيع" : "تصغير"}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="transition-transform duration-300">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    {/* اللوجو (Logo) */}
                    {/* اللوجو (Logo) - الضغط عليه يوديك للرئيسية */}
                    <Link href="/" className={`mb-10 flex flex-col items-center transition-all hover:opacity-80 ${isCollapsed ? 'px-0' : 'px-2'}`}>
                        <Image
                            src="/assets/images/logo.png"
                            alt="Science Academy"
                            width={isCollapsed ? 40 : 70}
                            height={isCollapsed ? 40 : 70}
                            className="rounded-xl shadow-lg shadow-blue-500/10"
                        />
                        {!isCollapsed && (
                            <div className="mt-3 text-center">
                                <div className="text-xl font-black text-blue-500 tracking-tighter leading-none">Science Academy</div>
                            </div>
                        )}
                    </Link>

                    {/* روابط التنقل */}
                    <nav className="flex-1 space-y-2">
                        {[
                            { name: 'الرئيسية', icon: '🚀', tab: 'home' },
                            { name: 'موادي الدراسية', icon: '📚', tab: 'courses' },
                            { name: 'نتائج الاختبارات', icon: '🏆', tab: 'results' },
                            { name: 'بنك الأسئلة', icon: '🧠', tab: 'bank' },
                            { name: 'المجتمع (المنتدى)', icon: '💬', tab: 'community' },
                        ].map((item) => {
                            // التحقق هل التاب ده هو اللي شغال حالياً؟
                            const active = currentTab === item.tab;

                            return (
                                <Link
                                    key={item.tab}
                                    href={item.tab === 'home' ? '/dashboard' : `/dashboard?view=${item.tab}`}
                                    className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all font-bold text-sm group relative
                                ${active
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <span className={`text-xl transition-transform group-hover:scale-110 ${active ? 'filter-none' : 'grayscale opacity-70'}`}>
                                        {item.icon}
                                    </span>

                                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}

                                    {/* تلميح التولتيب عند التصغير (Tooltip) */}
                                    {isCollapsed && (
                                        <div className="absolute right-full mr-4 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-[100] shadow-xl">
                                            {item.name}
                                        </div>
                                    )}

                                    {/* علامة نشطة صغيرة بجانب الزرار */}
                                    {active && !isCollapsed && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* تسجيل الخروج */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 p-3.5 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm group w-full"
                    >
                        {/* أيقونة خروج عشان لو القائمة مقفولة */}
                        <span className="text-xl">🚪</span>
                        {!isCollapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* 2️⃣ المنطقة الأساسية (Main Content) */}
            <div className={`flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 ${isCollapsed ? 'lg:mr-20' : 'lg:mr-64'}`}>

                {/* الشريط العلوي (Top Header) */}
                <header className={`h-20 backdrop-blur-xl border-b flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-40 transition-colors
                    ${isDarkMode ? 'bg-[#050505]/60 border-white/5' : 'bg-white/70 border-gray-200'}`}>

                    <div className="flex items-center gap-4">
                        {/* زرار المنيو للموبايل */}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`lg:hidden p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                            {isSidebarOpen ? '✕' : '☰'}
                        </button>

                        <div className="flex flex-col">
                            {studentName ? (
                                <>
                                    <h2 className="font-black text-lg">أهلاً، {studentName.split(' ')[0]}! 👋</h2>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>طالب في Science Academy</p>
                                </>
                            ) : (
                                <h2 className="font-black text-lg">مرحباً بك خـلال تصفحك! 👋</h2>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* زرار تبديل الثيم (Dark/Light) */}
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-xl border transition-all hover:scale-110
                            ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400' : 'bg-gray-100 border-gray-200 text-blue-600'}`}
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>

                        {studentName ? (
                            <>
                                {/* جرس الإشعارات */}
                                <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                                    <NotificationBell />
                                </div>

                                {/* صورة/أفاتار الطالب */}
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white shadow-lg border ${isDarkMode ? 'border-white/10' : 'border-blue-200'}`}>
                                    {studentName[0]?.toUpperCase() || 'S'}
                                </div>
                            </>
                        ) : (
                            <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all">
                                تسجيل الدخول
                            </Link>
                        )}
                    </div>
                </header>

                {/* الصفحة الداخلية */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-0 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Backdrop للموبايل */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"></div>
            )}
        </div>
    );
}

export default function DashboardLayout({ children }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="w-14 h-14 border-[3px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        }>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
    );
}