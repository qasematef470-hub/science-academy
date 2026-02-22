'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updatePassword, sendEmailVerification } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation'; // تم دمج useSearchParams هنا
import Link from 'next/link';
import NotificationBell from '../ui/NotificationBell';

import {
    getStudentDashboardData,
    getAllCourses,
    enrollStudent,
    cancelCourseRequest
} from "@/app/actions/student";

import { getCourseMaterials } from "@/app/actions/admin";
import CertificateModal from '@/app/components/CertificateModal';
import jsPDF from 'jspdf';

// 🎨 مكون الدورق المتحرك
const BubblingFlask = ({ isDark }) => (
    <div className="absolute bottom-10 left-10 opacity-10 pointer-events-none hidden lg:block">
        <div className="relative w-32 h-40">
            <div className="absolute left-1/2 bottom-full w-4 h-4 bg-blue-400 rounded-full animate-bubble opacity-0" style={{ animationDelay: '0s', left: '40%' }}></div>
            <div className="absolute left-1/2 bottom-full w-2 h-2 bg-purple-400 rounded-full animate-bubble opacity-0" style={{ animationDelay: '1s', left: '60%' }}></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-full h-full ${isDark ? 'text-blue-500' : 'text-blue-700'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 21a1.5 1.5 0 001.5-1.5v-4.243a1.5 1.5 0 00-.44-1.06L14 7.657V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3.657L3.44 14.197A1.5 1.5 0 003 15.257V19.5a1.5 1.5 0 001.5 1.5h15z" />
            </svg>
        </div>
        <style jsx>{`
      @keyframes bubble {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        50% { opacity: 0.8; }
        100% { transform: translateY(-100px) scale(1.2); opacity: 0; }
      }
      .animate-bubble { animation: bubble 3s infinite ease-in; }
    `}</style>
    </div>
);

function DashboardContent() {
    const router = useRouter();

    // --- States ---
    const [data, setData] = useState(null);
    const [suggestedCourses, setSuggestedCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [isDark, setIsDark] = useState(true);
    const [emailVerified, setEmailVerified] = useState(true);
    const [viewCourseModal, setViewCourseModal] = useState(null);
    const [certificateData, setCertificateData] = useState(null);

    // Modals States
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [currentMaterials, setCurrentMaterials] = useState({ name: '', list: [] });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showActivationModal, setShowActivationModal] = useState(false);
    const [activationData, setActivationData] = useState(null);
    const [confirmSubModal, setConfirmSubModal] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('center');
    const [submittingEnroll, setSubmittingEnroll] = useState(false);

    // --- Logic Functions ---
    // --- Logic Functions (تم تحسينها لمعالجة الأخطاء) ---
    const fetchData = async (uid) => {
        try {
            console.log("Start fetching data for:", uid); // 🛠️ للتجربة

            const dashboardRes = await getStudentDashboardData(uid);
            const allCoursesRes = await getAllCourses();

            if (dashboardRes?.success) {
                setData(dashboardRes.data);
                const u = dashboardRes.data.user;

                // منطق المواد المقترحة
                if (allCoursesRes?.success) {
                    const myEnrolledIds = dashboardRes.data.courses.map(c => c.courseId);
                    const smartSuggestions = allCoursesRes.data.filter(course => {
                        if (myEnrolledIds.includes(course.id)) return false;
                        const isGeneralCourse = !course.university && !course.college;
                        if (isGeneralCourse) return true;
                        if (u?.isVacationMode) return false;
                        return (course.university === u?.university && course.college === u?.college && course.year === u?.year && course.section === u?.section);
                    });
                    setSuggestedCourses(smartSuggestions);
                }
            } else {
                console.error("Dashboard data failed:", dashboardRes);
            }
        } catch (error) {
            console.error("❌ Error inside fetchData:", error);
        } finally {
            // 🔥 ده أهم سطر: هيوقف التحميل سواء البيانات جت أو لأ
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login');
                return;
            }

            setEmailVerified(user.emailVerified);

            // نده دالة جلب البيانات
            await fetchData(user.uid);

            // مراقبة وتحديث الثيم
            const checkTheme = () => {
                const isDarkClass = document.documentElement.classList.contains('dark');
                const savedTheme = localStorage.getItem('theme') === 'dark';
                setIsDark(isDarkClass || savedTheme);
            };
            checkTheme();
            const observer = new MutationObserver(checkTheme);
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

            return () => observer.disconnect();
        });

        return () => unsubscribe();
    }, []);

    // --- Handlers ---
    const handleResendVerification = async () => {
        try { await sendEmailVerification(auth.currentUser); alert("✅ تم إرسال رابط التفعيل!"); } catch (e) { alert("❌ خطأ: " + e.message); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) return alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        try { await updatePassword(auth.currentUser, newPassword); alert("✅ تم تغيير كلمة المرور بنجاح"); setShowPasswordModal(false); setNewPassword(""); }
        catch (err) { alert("❌ خطأ: سجل دخولك مرة تانية عشان نغير الباسورد لأمان حسابك."); }
    };

    const handleInitiateSubscribe = (course) => {
        setConfirmSubModal(course);
        setSelectedPaymentMethod(course.paymentMethods === 'cash' ? 'cash' : 'center');
    };

    const handleConfirmSubscription = async () => {
        if (!confirmSubModal) return; setSubmittingEnroll(true);
        const res = await enrollStudent(auth.currentUser.uid, confirmSubModal.id, selectedPaymentMethod);
        if (res.success) { alert("✅ تم إرسال طلب الاشتراك!"); await fetchData(auth.currentUser.uid); setConfirmSubModal(null); }
        else alert("❌ خطأ: " + res.message);
        setSubmittingEnroll(false);
    };

    const handleOpenMaterials = async (courseId, courseName) => {
        setCurrentMaterials({ name: courseName, list: [] }); setShowMaterialsModal(true);
        const res = await getCourseMaterials(courseId);
        if (res.success) setCurrentMaterials({ name: courseName, list: res.data });
    };

    const startExam = (courseId) => { if (confirm("هل أنت مستعد لبدء الامتحان؟ ⏱️")) router.push(`/exam/${courseId}`); };

    const handleCancelRequest = async (courseId) => {
        if (!confirm("إلغاء طلب الاشتراك؟")) return;
        const res = await cancelCourseRequest(auth.currentUser.uid, courseId);
        if (res.success) fetchData(auth.currentUser.uid);
    };

    // 🔥 إضافة الدالة المفقودة لفتح مودال التفعيل
    const handleOpenActivation = (course) => {
        setActivationData(course);
        setShowActivationModal(true);
    };

    const handleDownloadCertificate = async (result, courseName) => {
        const fullCourseData = data?.courses?.find(c => c.courseId === result.courseId);
        let examTopics = fullCourseData?.section || "General Assessment";
        try {
            const configRef = doc(db, 'exam_configs', result.courseId);
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                const cfg = configSnap.data();
                examTopics = cfg.lectureNames?.join(' + ') || cfg.examTitle || examTopics;
            }
        } catch (e) { }
        setCertificateData({
            studentName: data?.user?.name || "Student",
            courseName: courseName,
            instructorName: fullCourseData?.instructorName || "Science Academy",
            topics: examTopics, score: result.score, total: result.total, date: result.submittedAt
        });
    };

    const getCardStyle = (type, isRevision) => {
        if (type === 'revision' || isRevision) return { border: 'border-l-4 border-orange-500', badge: 'bg-orange-500/10 text-orange-500' };
        if (type === 'summer') return { border: 'border-l-4 border-cyan-500', badge: 'bg-cyan-500/10 text-cyan-500' };
        return { border: 'border-l-4 border-blue-500', badge: 'bg-blue-500/10 text-blue-500' };
    };

    // --- 🔥 START: New Logic for Level Calculation ---
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'home';

    // 🔄 مزامنة التاب مع السايدبار
    useEffect(() => { setActiveTab(view); }, [view]);

    // 📊 حساب الإحصائيات الحقيقية من النتائج
    const totalScore = data?.results?.reduce((acc, res) => acc + (Number(res.score) || 0), 0) || 0;
    const totalPossible = data?.results?.reduce((acc, res) => acc + (Number(res.total) || 0), 0) || 0;
    const avgPercent = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    const getLevelInfo = (pct) => {
        if (pct >= 90) return { label: 'أسطوري 👑', color: 'bg-emerald-500' };
        if (pct >= 75) return { label: 'متميز ⭐', color: 'bg-blue-500' };
        if (pct >= 50) return { label: 'جيد 👍', color: 'bg-yellow-500' };
        return { label: 'محتاج شد حيل 🦾', color: 'bg-red-500' };
    };
    const level = getLevelInfo(avgPercent);
    // --- END: New Logic ---

    // 🎨 مكون كارت الدورة (Premium Course Card)
    // status: 'active' | 'pending' | 'not-enrolled'
    const CourseCard = ({ course, status = 'not-enrolled' }) => {
        const isActive = status === 'active';
        const isPending = status === 'pending';

        return (
            <div className={`group relative flex flex-col rounded-[2rem] overflow-hidden border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${isDark ? 'bg-[#0f121a] border-white/5 hover:border-blue-500/40' : 'bg-white border-gray-100 ring-1 ring-gray-100'}`}>

                {/* 1. صورة الكورس */}
                <div className="relative aspect-video overflow-hidden rounded-t-[2rem]">
                    {course.image ? (
                        <img src={course.image} alt={course.name || course.courseName} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-6xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>📚</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Status / Price Badge */}
                    <div className="absolute top-4 right-4">
                        {isActive ? (
                            <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-lg bg-emerald-500/90 text-white">✓ مفعل</span>
                        ) : isPending ? (
                            <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-lg bg-amber-500/90 text-white">⏳ قيد المراجعة</span>
                        ) : (
                            <span className="bg-blue-600/90 backdrop-blur-md text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg">
                                {course.price > 0 ? `${course.price} ج.م` : 'مجاني'}
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. التفاصيل */}
                <div className="p-6 flex flex-col flex-1">
                    <h4 className={`text-xl font-black mb-2 line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {course.name || course.courseName}
                    </h4>

                    {/* Instructor */}
                    <div className="flex items-center gap-2 mb-6">
                        <img
                            src={course.instructorImage || '/assets/images/logo.png'}
                            alt="instructor"
                            className="w-6 h-6 rounded-full border border-blue-500/30 object-cover"
                        />
                        <span className="text-xs text-gray-500 font-bold">{course.instructorName || 'أكاديمية العلوم'}</span>
                    </div>

                    {/* 🧠 Smart Buttons */}
                    <div className="mt-auto space-y-3">

                        {/* A — Active: single big CTA */}
                        {isActive && (
                            <button
                                onClick={() => router.push(`/dashboard/course/${course.courseId}`)}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                بدء المذاكرة 🚀
                            </button>
                        )}

                        {/* B — Pending: Activate + Cancel */}
                        {isPending && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => router.push(`/dashboard/course/${course.courseId}`)}
                                        className={`py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                    >
                                        نظرة عامة 👁️
                                    </button>
                                    <button
                                        onClick={() => handleOpenActivation(course)}
                                        className="py-3 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        تفعيل الاشتراك 🔓
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleCancelRequest(course.courseId)}
                                    className="w-full py-2 text-xs text-red-500/70 hover:text-red-500 font-bold transition flex items-center justify-center gap-1"
                                >
                                    ✕ إلغاء طلب الاشتراك
                                </button>
                            </>
                        )}

                        {/* C — Not Enrolled: Overview + Subscribe */}
                        {!isActive && !isPending && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => router.push(`/dashboard/course/${course.id}`)}
                                    className={`py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                                >
                                    نظرة عامة 👁️
                                </button>
                                <button
                                    onClick={() => handleInitiateSubscribe(course)}
                                    className="py-3 rounded-2xl font-black text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    الاشتراك الآن 🔥
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ⏳ تعديل شاشة التحميل: خليناها شفافة عشان متعملش شاشة بيضاء وسط الثيم الأسود
    if (loading) return (
        <div className="flex items-center justify-center w-full min-h-[70vh]">
            <div className="relative flex flex-col items-center gap-4">
                {/* الدائرة المتحركة */}
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                {/* نص صغير يطمن الطالب */}
                <p className="text-gray-500 text-xs font-bold animate-pulse">جاري تجهيز مكتبتك...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in pb-20 relative">

            {/* 🔮 مؤثرات خلفية خفيفة جداً */}
            <BubblingFlask isDark={isDark} />
            {/* 📊 كروت الإحصائيات المتجاوبة (تم تعديل المقاسات للموبايل) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">

                {/* كارت المستوى */}
                <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-300 ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white shadow-lg border-gray-100'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">المستوى العام</p>
                            <h4 className="text-xl md:text-2xl font-black mb-3">{level.label}</h4>
                        </div>
                        {/* أيقونة صغيرة للمستوى */}
                        <span className="text-2xl md:text-3xl opacity-80">🎯</span>
                    </div>

                    {/* شريط المستوى */}
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                        <div className={`h-full ${level.color} transition-all duration-1000`} style={{ width: `${avgPercent}%` }}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold text-left" dir="ltr">{avgPercent}% :نسبة التحصيل</p>
                </div>

                {/* كارت المواد */}
                <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-300 ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white shadow-lg border-gray-100'} flex justify-between items-center`}>
                    <div>
                        <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">المواد المشتركة</p>
                        <h4 className="text-2xl md:text-3xl font-black">{data?.courses?.length || 0}</h4>
                    </div>
                    <span className="text-3xl md:text-4xl p-3 bg-blue-500/10 rounded-2xl">📚</span>
                </div>

                {/* كارت الامتحانات */}
                <div className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-300 ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white shadow-lg border-gray-100'} flex justify-between items-center`}>
                    <div>
                        <p className="text-gray-500 text-[10px] md:text-xs font-bold mb-1">امتحانات تمت</p>
                        <h4 className="text-2xl md:text-3xl font-black">{data?.results?.length || 0}</h4>
                    </div>
                    <span className="text-3xl md:text-4xl p-3 bg-purple-500/10 rounded-2xl">📝</span>
                </div>
            </div>
            {/* 🚀 المحتوى المتغير (Dynamic Content) */}
            <div className="min-h-[400px]">

                {/* A. الرئيسية (Home) */}
                {activeTab === 'home' && (
                    <div className="space-y-10 animate-slide-up">
                        <div className="relative rounded-[3rem] p-10 overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-950 to-black border border-white/10 shadow-2xl">
                            <div className="relative z-10 max-w-xl">
                                <h2 className="text-4xl font-black mb-4 leading-tight">جاهز للتفوق يا {data?.user?.name?.split(' ')[0]}؟ 🌟</h2>
                                <p className="text-blue-200/70 font-bold mb-8 text-lg">كل ما تحتاجه من محاضرات، مراجعات، وامتحانات في مكان واحد وبأحدث التقنيات.</p>
                                <div className="flex gap-4">
                                    <button onClick={() => setActiveTab('courses')} className="bg-white text-blue-900 px-8 py-4 rounded-2xl font-black hover:scale-105 transition shadow-xl">ابدأ المذاكرة الآن</button>
                                    <Link href="/study" className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition">تصفح المناهج</Link>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full"></div>
                        </div>

                        {/* المواد المقترحة */}
                        {suggestedCourses.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black flex items-center gap-3"><span className="w-2 h-8 bg-blue-600 rounded-full"></span> مواد قد تهمك 🎓</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {suggestedCourses.map(course => (
                                        <CourseCard key={course.id} course={course} status="not-enrolled" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* B. موادي (Courses) */}
                {activeTab === 'courses' && (
                    <div className="space-y-6 animate-slide-up">
                        <h3 className="text-2xl font-black flex items-center gap-3"><span className="w-2 h-8 bg-indigo-600 rounded-full"></span> مكتبة اشتراكاتك 📖</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {data?.courses?.map((course) => (
                                <CourseCard
                                    key={course.courseId}
                                    course={course}
                                    status={course.status === 'active' ? 'active' : 'pending'}
                                />
                            ))}
                            {data?.courses?.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                    <p className="text-gray-500 font-bold mb-4 text-lg">لسه مشتركتش في أي مواد يا بطل!</p>
                                    <button onClick={() => setActiveTab('home')} className="text-blue-500 underline font-black">اكتشف المواد المتاحة</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* C. نتائجي (Results) */}
                {activeTab === 'results' && (
                    <div className="animate-slide-up space-y-6">
                        <h3 className="text-2xl font-black flex items-center gap-3"><span className="w-2 h-8 bg-emerald-600 rounded-full"></span> سجل التفوق 🏆</h3>
                        <div className={`overflow-hidden rounded-[2.5rem] border ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white shadow-2xl border-gray-100'}`}>
                            <table className="w-full text-right">
                                <thead className={`text-xs font-black uppercase tracking-widest ${isDark ? 'bg-black/40 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                                    <tr>
                                        <th className="p-6">المادة التعليمية</th>
                                        <th className="p-6">الدرجة</th>
                                        <th className="p-6 hidden md:table-cell">التاريخ</th>
                                        <th className="p-6">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                    {data?.results?.map((res) => {
                                        const percent = res.total > 0 ? (res.score / res.total * 100) : 0;
                                        const isPassed = percent >= 50;
                                        const courseName = data.courses.find(c => c.courseId === res.courseId)?.courseName || 'General';
                                        return (
                                            <tr key={res.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-6 font-black">{courseName}</td>
                                                <td className="p-6">
                                                    <span className={`text-lg font-black ${isPassed ? 'text-emerald-500' : 'text-red-500'}`}>{res.score}</span>
                                                    <span className="text-gray-500 text-xs font-bold"> / {res.total}</span>
                                                </td>
                                                <td className="p-6 text-xs text-gray-500 font-bold hidden md:table-cell">{new Date(res.submittedAt).toLocaleDateString('ar-EG')}</td>
                                                <td className="p-6 flex gap-2">
                                                    {res.allowCertificate && isPassed && (
                                                        <button onClick={() => handleDownloadCertificate(res, courseName)} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 hover:scale-105 transition">تحميل الشهادة 🎓</button>
                                                    )}
                                                    {res.allowReview && (
                                                        <button onClick={() => router.push(`/exam/${res.courseId}/review/${res.id}`)} className="bg-blue-600/10 text-blue-500 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition">مراجعة الإجابات 👁️</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {data?.results?.length === 0 && <div className="p-20 text-center text-gray-500 font-bold">لا يوجد نتائج مسجلة حتى الآن.</div>}
                        </div>
                    </div>
                )}

                {/* D. المجتمع (Community) - Placeholder */}
                {activeTab === 'community' && (
                    <div className="animate-slide-up text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                        <div className="text-6xl mb-6">💬</div>
                        <h3 className="text-3xl font-black mb-4">منتدى أكاديمية لوكسر</h3>
                        <p className="text-gray-500 font-bold max-w-md mx-auto">قريباً.. مكان مخصص للنقاش بين الطلاب والمحاضرين، طرح الأسئلة، ومشاركة المعرفة.</p>
                    </div>
                )}

            </div>

            {/* 🛠️ الـ Modals */}

            {/* 1. Modal التفاصيل */}
            {viewCourseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in" dir="rtl">
                    <div className="bg-[#0f121a] w-full max-w-5xl rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative flex flex-col md:flex-row max-h-[90vh]">
                        <button onClick={() => setViewCourseModal(null)} className="absolute top-6 left-6 z-50 w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition border border-white/5 font-black">✕</button>
                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                            <div className="flex gap-2 mb-6">
                                <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">{viewCourseModal.college || "عام"}</span>
                                <span className="bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">{viewCourseModal.price > 0 ? `${viewCourseModal.price} ج.م` : 'مجاني'}</span>
                            </div>
                            <h2 className="text-4xl font-black mb-8 leading-tight">{viewCourseModal.name}</h2>
                            <div className="bg-white/5 rounded-[2rem] p-6 flex items-center gap-6 mb-8 border border-white/5">
                                <img src={viewCourseModal.instructorImage || '/assets/images/logo.png'} className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/20 shadow-xl" />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold mb-1">محاضر المادة</p>
                                    <p className="text-white font-black text-xl">{viewCourseModal.instructorName}</p>
                                </div>
                            </div>
                            <div className="mb-10">
                                <h3 className="text-lg font-black mb-4 flex items-center gap-2"><span>📝</span> تفاصيل المنهج:</h3>
                                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap font-bold">{viewCourseModal.details || "لا يوجد وصف متاح حالياً."}</p>
                            </div>
                            <div className="space-y-4">
                                <button onClick={() => { setViewCourseModal(null); handleInitiateSubscribe(viewCourseModal); }} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95">اشترك الآن في الكورس 🚀</button>
                                {viewCourseModal.contactPhone && (
                                    <a href={`https://wa.me/+2${viewCourseModal.contactPhone}`} target="_blank" className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-lg text-center block transition border border-white/5">تواصل واتساب للدعم</a>
                                )}
                            </div>
                        </div>
                        <div className="hidden md:block w-2/5 relative">
                            {viewCourseModal.image ? <img src={viewCourseModal.image} className="absolute inset-0 w-full h-full object-cover opacity-80" /> : <div className="absolute inset-0 bg-slate-900"></div>}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0f121a] to-transparent"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Modal التفعيل والدفع */}
            {showActivationModal && activationData && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-scale-in" dir="rtl">
                    <div className="w-full max-w-md bg-[#0f121a] rounded-[2.5rem] border border-white/10 shadow-2xl p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600"></div>
                        <div className="text-5xl mb-6">🔒</div>
                        <h3 className="text-2xl font-black mb-2">تفعيل اشتراكك</h3>
                        <p className="text-gray-500 font-bold mb-8">{activationData.courseName}</p>

                        {activationData.paymentMethod !== 'center' ? (
                            <div className="space-y-4 mb-10">
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                                    <span className="text-gray-400 font-bold">المبلغ:</span>
                                    <span className="text-2xl font-black text-emerald-500">{activationData.price} ج.م</span>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-gray-500 font-bold mb-2">رقم فودافون كاش:</p>
                                    <p className="text-2xl font-black text-amber-500 tracking-widest select-all">{activationData.paymentNumber || '-'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 mb-10 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/5">
                                <p className="text-gray-400 font-bold">يرجى التوجه لمقر السنتر لتفعيل الكورس يدوياً.</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            {activationData.contactPhone && (
                                <a href={`https://wa.me/+2${activationData.contactPhone}?text=تفعيل كورس ${activationData.courseName}`} target="_blank" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg transition hover:scale-105">إرسال صورة الإيصال 💬</a>
                            )}
                            <button onClick={() => setShowActivationModal(false)} className="w-full py-4 text-gray-500 font-bold hover:text-white transition">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Modal تأكيد الاشتراك */}
            {confirmSubModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 animate-scale-in" dir="rtl">
                    <div className="w-full max-w-md bg-[#0f121a] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
                        <h3 className="text-2xl font-black mb-6 text-center">تأكيد طلب الاشتراك ✅</h3>
                        <div className="mb-8 text-center">
                            <p className="text-blue-500 font-black text-xl mb-1">{confirmSubModal.name}</p>
                            <p className="text-gray-500 font-bold">السعر: {confirmSubModal.price} ج.م</p>
                        </div>
                        <div className="space-y-3 mb-10">
                            <p className="text-xs text-gray-500 font-black mb-2 text-center uppercase tracking-tighter">اختر طريقة الدفع</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {confirmSubModal.paymentMethods !== 'cash' && (
                                    <button onClick={() => setSelectedPaymentMethod('center')} className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${selectedPaymentMethod === 'center' ? 'border-blue-600 bg-blue-600/10 text-blue-600' : 'border-white/5 text-gray-500'}`}>
                                        <span className="text-2xl">🏢</span> <span className="text-xs font-bold">في السنتر</span>
                                    </button>
                                )}
                                <button onClick={() => setSelectedPaymentMethod('cash')} className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${confirmSubModal.paymentMethods === 'cash' ? 'md:col-span-2' : ''} ${selectedPaymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-600/10 text-emerald-600' : 'border-white/5 text-gray-500'}`}>
                                    <span className="text-2xl">📱</span> <span className="text-xs font-bold">فودافون كاش</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmSubModal(null)} className="flex-1 py-4 text-gray-500 font-bold hover:text-white transition">إلغاء</button>
                            <button onClick={handleConfirmSubscription} disabled={submittingEnroll} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl disabled:opacity-50">{submittingEnroll ? 'جاري التنفيذ...' : 'إرسال الطلب'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Modal الشهادة */}
            {certificateData && (
                <CertificateModal {...certificateData} onClose={() => setCertificateData(null)} />
            )}

            {/* 5. Modal الماتيريال */}
            {showMaterialsModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[130] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                    <div className="w-full max-w-2xl bg-[#0f121a] rounded-[3rem] border border-white/10 p-8 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-xl">محتويات مادة: <span className="text-blue-500">{currentMaterials.name}</span></h3>
                            <button onClick={() => setShowMaterialsModal(false)} className="text-gray-500 hover:text-white text-2xl font-black">✕</button>
                        </div>
                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {currentMaterials.list.length > 0 ? currentMaterials.list.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">{item.type === 'video' ? '📺' : item.type === 'image' ? '🖼️' : '📄'}</span>
                                        <span className="font-black text-sm">{item.title}</span>
                                    </div>
                                    <a href={item.link} target="_blank" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-blue-500 transition">فتح 🔗</a>
                                </div>
                            )) : <div className="text-center py-20 text-gray-500 font-bold border-2 border-dashed border-white/5 rounded-3xl">لا يوجد ملفات مرفوعة لهذا الكورس حالياً.</div>}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function StudentDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center w-full min-h-[70vh]">
                <div className="relative flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-xs font-bold animate-pulse">جاري تحميل المنصة...</p>
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}