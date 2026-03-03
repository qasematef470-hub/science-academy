'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useParams } from 'next/navigation';
import { getCourseDetails, getStudentCourseProgress, getStudentDashboardData, startVideoSession, enrollStudent } from '@/app/actions/student';
import Link from 'next/link';

export default function CoursePlayerPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const [studentData, setStudentData] = useState(null);
    const [progressData, setProgressData] = useState({ views: {}, sessions: {}, exams: {} });
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState(null);
    const [activeModuleIndex, setActiveModuleIndex] = useState(0);
    const [activeLesson, setActiveLesson] = useState(null);
    const [activeLessonIndex, setActiveLessonIndex] = useState(-1);
    const [error, setError] = useState(null);
    const [isDark, setIsDark] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const watermarkRef = useRef(null);
    const videoContainerRef = useRef(null);
    const [startingSession, setStartingSession] = useState(false);
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
    const [submittingEnroll, setSubmittingEnroll] = useState(false);

    const fetchCourseData = useCallback(async (uid) => {
        try {
            setLoading(true);
            const [res, progressRes, dashRes] = await Promise.all([
                getCourseDetails(courseId, uid),
                uid ? getStudentCourseProgress(uid, courseId) : Promise.resolve({ success: true, data: { views: {}, sessions: {}, exams: {} } }),
                uid ? getStudentDashboardData(uid) : Promise.resolve({ success: true, data: { user: null } })
            ]);

            if (res.success) {
                setCourse(res.data);
                if (progressRes.success) {
                    setProgressData(progressRes.data);
                }
                if (dashRes.success) {
                    setStudentData(dashRes.data.user);
                }
                if (res.data.modules?.length > 0) {
                    const firstMod = res.data.modules.find(m => m.lessons?.length > 0) || res.data.modules[0];
                    setActiveModuleIndex(res.data.modules.indexOf(firstMod));
                }
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError("حدث خطأ في جلب البيانات");
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    // 🔐 مراقبة تسجيل الدخول
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            fetchCourseData(user?.uid || null);
        });
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) setIsDark(savedTheme === 'dark');
        return () => unsubscribe();
    }, [fetchCourseData, router]);

    // 🛡️ حماية المحتوى (منع النسخ والطباعة)
    useEffect(() => {
        const preventActions = (e) => {
            if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u')) {
                e.preventDefault();
                alert("🔒 غير مسموح بالتحميل أو الطباعة");
            }
        };
        const preventRightClick = (e) => e.preventDefault();
        window.addEventListener('keydown', preventActions);
        window.addEventListener('contextmenu', preventRightClick);
        return () => {
            window.removeEventListener('keydown', preventActions);
            window.removeEventListener('contextmenu', preventRightClick);
        };
    }, []);

    // 🛡️ مراقبة التلاعب بالعلامة المائية (MutationObserver)
    useEffect(() => {
        if (!videoContainerRef.current || !watermarkRef.current) return;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const removedNodes = Array.from(mutation.removedNodes);
                    if (removedNodes.includes(watermarkRef.current)) {
                        alert("⚠️ Security Warning: Watermark tampering detected!");
                        window.location.reload();
                    }
                }
                if (mutation.type === 'attributes' && mutation.target === watermarkRef.current) {
                    const style = window.getComputedStyle(watermarkRef.current);
                    if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden') {
                        alert("⚠️ Security Warning: Watermark tampering detected!");
                        window.location.reload();
                    }
                }
            });
        });
        observer.observe(videoContainerRef.current, { childList: true });
        observer.observe(watermarkRef.current, {
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden']
        });
        return () => observer.disconnect();
    }, [activeLesson, isFullscreen]);

    // 🔑 Helper: Generate a unique, index-based key for view tracking
    const getLessonKey = (mIdx, lIdx) => `mod${mIdx}_les${lIdx}`;

    const handleLessonSelect = (lesson, mIdx, lIdx) => {
        setActiveLesson(lesson);
        setActiveModuleIndex(mIdx);
        setActiveLessonIndex(lIdx);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 💳 Subscription modal handlers
    const handleOpenSubscribe = () => {
        setSelectedPaymentMethod(course?.paymentMethods === 'cash' ? 'cash' : 'center');
        setShowSubscribeModal(true);
    };

    const handleConfirmSubscription = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid || !course) return;
        setSubmittingEnroll(true);
        const res = await enrollStudent(uid, course.id, selectedPaymentMethod);
        if (res.success) {
            alert("✅ تم إرسال طلب الاشتراك!");
            setShowSubscribeModal(false);
            fetchCourseData(uid);
        } else {
            alert("❌ خطأ: " + res.message);
        }
        setSubmittingEnroll(false);
    };

    // 🔒 Custom fullscreen handler (Cross-Browser Support)
    const toggleFullscreen = () => {
        const elem = videoContainerRef.current;
        if (!elem) return;
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
            if (elem.requestFullscreen) { elem.requestFullscreen().catch(err => console.error(err)); }
            else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); }
            else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
        } else {
            if (document.exitFullscreen) { document.exitFullscreen(); }
            else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
            else if (document.msExitFullscreen) { document.msExitFullscreen(); }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement));
        };
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(event => document.addEventListener(event, handleFullscreenChange));
        return () => events.forEach(event => document.removeEventListener(event, handleFullscreenChange));
    }, []);

    // 🔒 دالة تحويل الروابط
    const getProtectedUrl = (url) => {
        if (!url) return null;
        if (url.includes('mediadelivery.net')) return url;
        if (url.includes('drive.google.com')) return url.replace('/view', '/preview').replace('?usp=sharing', '');
        if (url.includes('watch?v=') || url.includes('youtu.be/')) {
            let id = "";
            if (url.includes('watch?v=')) id = url.split('v=')[1].split('&')[0];
            else id = url.split('/').pop();
            return `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1`;
        }
        return url;
    };

    // ==========================================================
    // 🧠 60% Rule: Prerequisite Curriculum Parser
    // ==========================================================
    const parsedCurriculum = useMemo(() => {
        if (!course || !course.modules || !progressData) return [];

        let lastExamPassed = true;
        let lastExamName = null;
        let lastExamPassScore = 0;

        return course.modules.map(module => {
            const parsedLessons = (module.lessons || []).map(lesson => {
                // Determine if this lesson is locked by a previous exam
                const isPrerequisiteLocked = lesson.isFree ? false : !lastExamPassed;
                const lockedReason = isPrerequisiteLocked
                    ? `يجب عليك تخطي امتحان [${lastExamName}] بنسبة ${lastExamPassScore}% لفتح هذا المحتوى`
                    : null;

                // If this lesson is an exam itself, it determines the lock status for SUBSEQUENT lessons
                // Note: Even if an exam is locked, we still calculate its own passing status for subsequent lessons.
                // But logically, if it's locked, it wasn't passed.
                if (lesson.type === 'exam' && lesson.examId) {
                    const examStats = progressData.exams[lesson.examId];
                    lastExamPassed = examStats ? examStats.isPassed : false;
                    lastExamName = lesson.title;
                    // Support legacy exams that might not have a passScore properly stored in the lesson object
                    lastExamPassScore = examStats?.passScore || lesson.passScore || 50;
                }

                return {
                    ...lesson,
                    isPrerequisiteLocked,
                    lockedReason
                };
            });

            return {
                ...module,
                lessons: parsedLessons
            };
        });
    }, [course, progressData]);

    // ==========================================================
    // 🎟️ Start Video Session Handler (1-Hour Ticket)
    // ==========================================================
    const handleStartSession = async (lessonKey) => {
        const uid = auth.currentUser?.uid || studentData?.uid;
        if (!uid || startingSession) return;

        setStartingSession(true);
        try {
            const res = await startVideoSession(uid, courseId, lessonKey);
            if (res.success) {
                // Update local state so the video reveals instantly
                setProgressData(prev => ({
                    ...prev,
                    views: {
                        ...(prev?.views || {}),
                        [lessonKey]: res.alreadyActive
                            ? (prev?.views?.[lessonKey] || 0)
                            : (prev?.views?.[lessonKey] || 0) + 1
                    },
                    sessions: {
                        ...(prev?.sessions || {}),
                        [lessonKey]: res.expiresAt
                    }
                }));
            } else {
                alert('❌ حدث خطأ: ' + (res.message || 'حاول مرة أخرى'));
            }
        } catch (err) {
            console.error('Session start error:', err);
            alert('❌ حدث خطأ في الاتصال بالسيرفر');
        } finally {
            setStartingSession(false);
        }
    };

    if (loading) return (
        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-[#050505] min-h-screen">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse text-gray-500 font-bold">جاري تحميل المنهج...</p>
        </div>
    );

    if (error) return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4 bg-[#050505] min-h-screen">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-2xl font-black text-red-500 mb-4">{error}</h2>
            <Link href="/dashboard" className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">العودة للرئيسية</Link>
        </div>
    );

    // ─── Helper: Lesson type icon ───────────────────────────────────────────────
    const getLessonIcon = (type, isLocked) => {
        if (isLocked) return '🔒';
        if (type === 'video') return '▶';
        if (type === 'pdf') return '📄';
        return '📝';
    };

    return (
        <div className="animate-fade-in pb-20" dir="rtl">

            {/* ══════════════════════════════════════════════════════════════════
                🟢  SECTION 1 – HERO HEADER (Green Banner)
            ══════════════════════════════════════════════════════════════════ */}
            <div className="relative w-full bg-emerald-600 rounded-[0rem] md:rounded-[2.5rem] p-6 md:p-10 mb-0 md:mb-10 overflow-hidden shadow-xl md:shadow-2xl -mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full">
                {/* ✨ Decorative blobs */}
                <div className="absolute top-0 left-0 w-full h-full bg-black/10 pointer-events-none"></div>
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-[-30px] left-[20%] w-40 h-40 bg-black/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-5">

                    {/* Right: Title + Description + Stats */}
                    <div className="flex-1 space-y-3 text-right">
                        <h1 className="text-2xl md:text-5xl font-black text-white leading-tight tracking-tight">
                            {course?.name}
                        </h1>
                        <p className="text-emerald-100 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
                            {course?.details || course?.description || 'كورس تعليمي شامل'}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                            <div className="flex items-center gap-2 bg-black/20 pr-2 pl-4 py-1.5 rounded-full">
                                <img
                                    src={course?.instructorImage || '/assets/images/logo.png'}
                                    className="w-7 h-7 rounded-full border border-white/30 object-cover"
                                    alt=""
                                />
                                <span className="font-bold text-white text-xs">{course?.instructorName}</span>
                            </div>
                            <div className="h-4 w-[1px] bg-white/30"></div>
                            <div className="bg-black/20 text-white/90 text-xs font-bold px-3 py-1.5 rounded-full">
                                📂 {course?.modules?.length || 0} محاضرات
                            </div>
                            <div className="bg-black/20 text-white/90 text-xs font-bold px-3 py-1.5 rounded-full">
                                🎥 {course?.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} الملحقات
                            </div>
                        </div>
                    </div>

                    {/* Left: Back Button */}
                    <div className="flex-shrink-0">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm border border-white/20"
                        >
                            <span>←</span>
                            <span>العودة للرئيسيه</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start mt-6 md:mt-0">

                {/* ══════════════════════════════════════════════════════════════════
                    📋  SECTION 4 – STICKY COURSE CARD (Left sidebar on desktop)
                ══════════════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-4 order-1 lg:order-2 lg:sticky lg:top-4">
                    <div className={`rounded-[2rem] md:rounded-[3rem] overflow-hidden border shadow-xl md:shadow-2xl ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100'} h-fit`}>

                        {/* 🖼️ Course Image */}
                        <div className="aspect-video relative overflow-hidden group">
                            <img
                                src={course?.image || '/assets/images/placeholder.jpg'}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            {course?.price && (
                                <div className="absolute bottom-4 right-4 bg-emerald-500 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-lg border border-white/20 backdrop-blur-md">
                                    {course?.price} ج.م
                                </div>
                            )}
                        </div>

                        <div className="p-5 md:p-7 space-y-5 relative">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none"></div>

                            {/* Subscribe Button */}
                            <div className="text-center relative z-10">
                                {course?.isLocked ? (
                                    <button
                                        onClick={handleOpenSubscribe}
                                        className="w-full py-3.5 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 border-b-4 transition-all bg-red-600 border-red-800 hover:bg-red-500 active:border-b-0 active:translate-y-1 text-white"
                                    >
                                        <span>🔓</span>
                                        <span>اشترك الآن للوصول</span>
                                    </button>
                                ) : (
                                    <div className="bg-emerald-500 text-white py-3.5 rounded-xl font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all">
                                        <span>✅</span>
                                        <span>اشتراك مفعل</span>
                                    </div>
                                )}
                            </div>

                            {/* Course Details */}
                            <div className="space-y-2 relative z-10">
                                <div className="flex justify-between items-center text-xs md:text-sm p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <span className="text-gray-500 font-bold flex items-center gap-2">
                                        <span className="text-blue-400">📂</span>المحاضرات:
                                    </span>
                                    <span className="font-black">{course?.modules?.length || 0} محاضرات </span>
                                </div>
                                <div className="flex justify-between items-center text-xs md:text-sm p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <span className="text-gray-500 font-bold flex items-center gap-2">
                                        <span className="text-purple-400">🎥</span>الملحقات:
                                    </span>
                                    <span className="font-black">{course?.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} ملحق </span>
                                </div>
                            </div>

                            {/* Instructor */}
                            <div className="pt-4 border-t border-white/5 flex items-center gap-4 relative z-10">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-full"></div>
                                    <img
                                        src={course?.instructorImage || '/assets/images/logo.png'}
                                        className="w-12 h-12 rounded-2xl object-cover border border-white/10 relative z-10"
                                        alt=""
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5">محاضر الكورس:</p>
                                    <h3 className="font-black text-sm md:text-base leading-tight">{course?.instructorName}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    🎬  SECTION 3 – MAIN PLAYER AREA + SECTION 2 – ACCORDION
                ══════════════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-8 space-y-6 md:space-y-8 order-2 lg:order-1">

                    {/* ─── Smart Player: shown only when a lesson is selected ─── */}
                    {activeLesson && (
                        (course?.isLocked && !activeLesson.isFree) ? (
                            /* 🔒 Locked Content Card */
                            <div className={`rounded-[2rem] md:rounded-[3rem] overflow-hidden border ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100'} shadow-2xl animate-fade-in`}>
                                <div className="py-20 px-8 flex flex-col items-center justify-center text-center gap-6">
                                    <div className="w-24 h-24 rounded-[2rem] bg-red-500/10 flex items-center justify-center">
                                        <span className="text-6xl">🔒</span>
                                    </div>
                                    <div className="space-y-3 max-w-md">
                                        <h3 className="text-2xl font-black">هذا المحتوى متاح للمشتركين فقط</h3>
                                        <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            اشترك الآن للوصول الفوري لجميع المحاضرات والملفات والامتحانات.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenSubscribe}
                                        className="bg-red-600 hover:bg-red-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center gap-3"
                                    >
                                        <span>🚀</span>
                                        <span>اشترك الآن</span>
                                    </button>
                                </div>
                            </div>
                        ) : activeLesson.isPrerequisiteLocked ? (
                            /* 🔒 Prerequisite Locked Content Card */
                            <div className={`rounded-[2rem] md:rounded-[3rem] overflow-hidden border ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100'} shadow-2xl animate-fade-in`}>
                                <div className="py-20 px-8 flex flex-col items-center justify-center text-center gap-6">
                                    <div className="w-24 h-24 rounded-[2rem] bg-amber-500/10 flex items-center justify-center">
                                        <span className="text-6xl">🔒</span>
                                    </div>
                                    <div className="space-y-3 max-w-md">
                                        <h3 className="text-2xl font-black text-amber-500">محتوى مغلق</h3>
                                        <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {activeLesson.lockedReason || "يجب عليك اجتياز الامتحانات السابقة لفتح هذا المحتوى"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (() => {
                            if (activeLesson.type === 'video') {
                                const lessonKey = getLessonKey(activeModuleIndex, activeLessonIndex);
                                const maxViews = Number(activeLesson.maxViews) || 3;
                                const currentViews = Number(progressData?.views?.[lessonKey]) || 0;
                                const viewsLeft = maxViews - currentViews;
                                const sessionExpiry = progressData?.sessions?.[lessonKey] || 0;
                                const isSessionActive = Date.now() < sessionExpiry;

                                // 🚫 Case A: No views left AND no active session
                                if (viewsLeft <= 0 && !isSessionActive) {
                                    return (
                                        <div className="aspect-video bg-black flex flex-col items-center justify-center text-center p-8 border border-red-500/20 rounded-[2rem] md:rounded-[3rem] relative overflow-hidden shadow-2xl">
                                            <div className="absolute inset-0 bg-red-500/5"></div>
                                            <span className="text-6xl md:text-8xl mb-4 grayscale opacity-80">🚫</span>
                                            <h3 className="text-xl md:text-2xl font-black text-red-500 mb-2">عذراً، انتهت المشاهدات المتاحة لك</h3>
                                            <p className="text-gray-400 font-bold text-sm">لقد استنفدت الحد الأقصى لمشاهدة هذه المحاضرة.</p>
                                        </div>
                                    );
                                }

                                // 🎟️ Case B: Has views left but NO active session → Show Start Card
                                if (!isSessionActive) {
                                    return (
                                        <div className={`rounded-[2rem] md:rounded-[3rem] overflow-hidden border ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100'} shadow-2xl animate-fade-in`}>
                                            <div className="relative py-16 md:py-20 px-6 md:px-10 flex flex-col items-center justify-center text-center gap-6 overflow-hidden">
                                                {/* ✨ Decorative background effects */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-blue-500/[0.02] to-purple-500/[0.03] pointer-events-none"></div>
                                                <div className="absolute top-[-80px] right-[-60px] w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                                <div className="absolute bottom-[-60px] left-[-40px] w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                                                {/* 🎟️ Icon */}
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full scale-150"></div>
                                                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-blue-500/10 flex items-center justify-center border border-emerald-500/20 relative z-10">
                                                        <span className="text-5xl md:text-6xl">🎟️</span>
                                                    </div>
                                                </div>

                                                {/* Text */}
                                                <div className="space-y-3 max-w-lg relative z-10">
                                                    <h3 className="text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                                                        جلسة مشاهدة جديدة
                                                    </h3>
                                                    <p className={`text-sm md:text-base font-bold leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        لديك <span className="text-emerald-400 font-black">{viewsLeft}</span> مشاهدات متبقية.
                                                        ببدء المشاهدة سيتم خصم محاولة وسيظل الفيديو متاحاً لك بحرية لمدة
                                                        <span className="text-blue-400 font-black"> ساعة واحدة (60 دقيقة)</span>.
                                                    </p>
                                                </div>

                                                {/* CTA Button */}
                                                <button
                                                    onClick={() => handleStartSession(lessonKey)}
                                                    disabled={startingSession}
                                                    className="relative z-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-3 text-base md:text-lg border-b-4 border-emerald-700 disabled:border-gray-600 active:border-b-0 active:translate-y-1"
                                                >
                                                    {startingSession ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            <span>جاري فتح الجلسة... ⏳</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>▶️</span>
                                                            <span>تأكيد وبدء المشاهدة</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Subtle info */}
                                                <p className="text-[11px] text-gray-600 font-bold relative z-10">
                                                    💡 يمكنك إغلاق الصفحة والعودة خلال الساعة دون خصم مشاهدة إضافية
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                            }
                            // 🎬 Case C: Active session (or non-video lesson) → Show player
                            return (
                                <div className={`rounded-[2rem] md:rounded-[3rem] overflow-hidden border ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100'} shadow-2xl animate-fade-in`}>

                                    {/* ── VIDEO PLAYER ── */}
                                    {activeLesson.type === 'video' && (
                                        <div ref={videoContainerRef} className="aspect-video bg-black flex items-center justify-center relative overflow-hidden group">
                                            {/* 🛡️ Top Shield: blocks YouTube logo/share bar */}
                                            <div className="absolute top-0 left-0 w-full h-[60px] z-20 bg-transparent cursor-default"></div>
                                            {/* 🛡️ Bottom-right Shield: blocks YouTube logo link */}
                                            <div className="absolute bottom-0 right-0 w-[100px] h-[50px] z-20 bg-transparent cursor-default"></div>

                                            {activeLesson.link ? (
                                                <iframe
                                                    src={getProtectedUrl(activeLesson.link)}
                                                    className="w-full h-full absolute inset-0 border-none"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <div className="text-center space-y-4">
                                                    <span className="text-6xl">🚧</span>
                                                    <p className="text-gray-500 font-black">هذا الفيديو غير متوفر حالياً</p>
                                                </div>
                                            )}

                                            {/* 🎬 Custom Fullscreen Button */}
                                            <button
                                                onClick={toggleFullscreen}
                                                className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto z-[2147483646]"
                                                title={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
                                            >
                                                {isFullscreen ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                    </svg>
                                                )}
                                            </button>

                                            {/* 🔒 Watermark – MUST stay after iframe in DOM */}
                                            <div
                                                ref={watermarkRef}
                                                className="absolute inset-0 pointer-events-none select-none"
                                                style={{ zIndex: 2147483647, transform: 'translateZ(0)', willChange: 'transform', position: 'absolute' }}
                                            >
                                                <div className="absolute inset-0 opacity-[0.25] overflow-hidden flex items-center justify-center">
                                                    <div className="w-full h-full flex flex-wrap content-center justify-center gap-16 p-8 rotate-[-25deg] scale-150">
                                                        {Array(20).fill(0).map((_, i) => (
                                                            <div key={i} className="font-black text-base md:text-xl whitespace-nowrap" style={{ color: '#000', textShadow: '0 0 3px #fff, 0 0 6px #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff', WebkitTextStroke: '1px rgba(255,255,255,0.8)', mixBlendMode: 'darken' }}>
                                                                {studentData?.name} • {studentData?.phone}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="absolute top-6 right-6 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-white/30 shadow-2xl">
                                                    <p className="text-white font-bold text-xs md:text-sm" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                                        {studentData?.name} | {studentData?.phone}
                                                    </p>
                                                </div>
                                                <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-white/30 shadow-2xl">
                                                    <p className="text-white font-bold text-xs md:text-sm" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                                        Science Academy ⚡
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── VIDEO LESSON DETAILS PANEL ── */}
                                    {activeLesson.type === 'video' && (
                                        <div className="mx-4 mb-4 mt-0 bg-[#11141c] rounded-2xl border border-white/5 divide-y divide-white/5 text-right" dir="rtl">
                                            {/* Row 1: Description */}
                                            <div className="flex items-start gap-3 px-5 py-3.5">
                                                <span className="text-base shrink-0 mt-0.5">🔴</span>
                                                <span className="text-gray-300 font-bold text-sm min-w-[130px] shrink-0">الوصف :</span>
                                                <span className="text-blue-300 font-medium text-sm leading-relaxed">{activeLesson.description || 'لا يوجد وصف'}</span>
                                            </div>
                                            {/* Row 2: Duration (Conditional) */}
                                            {activeLesson.duration && (
                                                <div className="flex items-center gap-3 px-5 py-3.5">
                                                    <span className="text-base shrink-0">⏱️</span>
                                                    <span className="text-gray-300 font-bold text-sm min-w-[130px] shrink-0">مدة الفيديو :</span>
                                                    <span className="text-white font-semibold text-sm">{activeLesson.duration} دقيقة</span>
                                                </div>
                                            )}
                                            {/* Row 3: Views remaining + Session status */}
                                            <div className="flex items-center gap-3 px-5 py-3.5">
                                                <span className="text-base shrink-0">🔒</span>
                                                <span className="text-gray-300 font-bold text-sm min-w-[130px] shrink-0">عدد المشاهدات المتبقية ليك :</span>
                                                <span className={`font-semibold text-sm ${Math.max(0, (Number(activeLesson.maxViews) || 3) - (Number(progressData?.views?.[getLessonKey(activeModuleIndex, activeLessonIndex)]) || 0)) === 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                                    {Math.max(0, (Number(activeLesson.maxViews) || 3) - (Number(progressData?.views?.[getLessonKey(activeModuleIndex, activeLessonIndex)]) || 0))} مشاهدات
                                                </span>
                                                {Date.now() < (progressData?.sessions?.[getLessonKey(activeModuleIndex, activeLessonIndex)] || 0) && (
                                                    <span className="text-emerald-400 text-xs font-black bg-emerald-400/10 px-2.5 py-1 rounded-full animate-pulse mr-auto">
                                                        🔓 جلسة المشاهدة مفتوحة الآن
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── PDF VIEWER ── */}
                                    {activeLesson.type === 'pdf' && (
                                        <div className="py-10 px-4 text-center space-y-4">
                                            <div className="w-20 h-20 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center text-5xl mx-auto">📄</div>
                                            <h2 className="text-2xl font-black">{activeLesson.title}</h2>
                                            {activeLesson.link ? (
                                                <div className="w-full h-[600px] relative bg-[#1a1d26] rounded-2xl overflow-hidden mt-4">
                                                    <div className="absolute top-0 left-0 w-full h-[60px] z-[9999] bg-transparent"></div>
                                                    <iframe
                                                        src={`${getProtectedUrl(activeLesson.link)}#toolbar=0&navpanes=0`}
                                                        className="w-full h-full border-none absolute inset-0"
                                                    />
                                                    {/* 🔒 PDF Watermark */}
                                                    <div
                                                        ref={watermarkRef}
                                                        className="absolute inset-0 pointer-events-none select-none"
                                                        style={{ zIndex: 2147483647, transform: 'translateZ(0)', willChange: 'transform', position: 'absolute' }}
                                                    >
                                                        <div className="absolute inset-0 opacity-[0.25] overflow-hidden flex items-center justify-center">
                                                            <div className="w-full h-full flex flex-wrap content-center justify-center gap-16 p-8 rotate-[-25deg] scale-150">
                                                                {Array(20).fill(0).map((_, i) => (
                                                                    <div key={i} className="font-black text-base md:text-xl whitespace-nowrap" style={{ color: '#000', textShadow: '0 0 3px #fff, 0 0 6px #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff', WebkitTextStroke: '1px rgba(255,255,255,0.8)', mixBlendMode: 'darken' }}>
                                                                        {studentData?.name} • {studentData?.phone}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-white/30 shadow-2xl">
                                                            <p className="text-white font-bold text-xs md:text-sm" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                                                {studentData?.name} | {studentData?.phone}
                                                            </p>
                                                        </div>
                                                        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-white/30 shadow-2xl">
                                                            <p className="text-white font-bold text-xs md:text-sm" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                                                Science Academy ⚡
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-amber-500 font-bold bg-amber-500/5 p-4 rounded-xl inline-block">المحتوى قادم قريباً</p>
                                            )}
                                        </div>
                                    )}

                                    {/* ── EXAM START CARD ── */}
                                    {activeLesson.type === 'exam' && (
                                        <div className="p-6 md:p-10 space-y-6">
                                            {/* Header */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-3xl shrink-0">📝</div>
                                                <div>
                                                    <p className="text-xs text-gray-500 font-bold mb-0.5">امتحان المحاضرة</p>
                                                    <h2 className="text-xl md:text-2xl font-black leading-tight">{activeLesson.title}</h2>
                                                </div>
                                            </div>

                                            {/* ── Stats Row: 3 colored dots (Min / Avg / Max) ── */}
                                            <div className={`rounded-2xl p-4 md:p-5 space-y-3 ${isDark ? 'bg-[#151820] border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                                                {/* Row 1 */}
                                                <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15] shrink-0"></span>
                                                        <span className="text-gray-400 font-bold">نسبة النجاح المطلوبة :</span>
                                                        <span className="font-black text-yellow-400">{activeLesson.passScore || 50} %</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444] shrink-0"></span>
                                                        <span className="text-gray-400 font-bold">متوسط نتائجك :</span>
                                                        <span className="font-black text-red-400">{progressData.exams[activeLesson.examId]?.averageScore || 0} %</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6] shrink-0"></span>
                                                        <span className="text-gray-400 font-bold">أعلى نتيجة لك :</span>
                                                        <span className="font-black text-blue-400">{progressData.exams[activeLesson.examId]?.highestScore || 0} %</span>
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-white/5"></div>

                                                {/* Row 2: Attempts info */}
                                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs md:text-sm">
                                                    <div className="flex items-center gap-2 text-gray-400 font-bold">
                                                        <span className="text-emerald-400">●</span>
                                                        المحاولات المكتملة :
                                                        <span className="text-white font-black">{progressData.exams[activeLesson.examId]?.attemptsFinished || 0} مرة</span>
                                                        <span className="text-gray-600">-</span>
                                                        المحاولات المتبقية :
                                                        <span className={`font-black ${(progressData.exams[activeLesson.examId]?.remainingAttempts || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {progressData.exams[activeLesson.examId]?.remainingAttempts ?? '—'} مرة
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Exam Meta Info */}
                                            <div className={`rounded-2xl p-4 md:p-5 space-y-2.5 text-xs md:text-sm ${isDark ? 'bg-[#151820] border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                                                {activeLesson.description && (
                                                    <div className="flex items-start gap-2 text-gray-400">
                                                        <span className="text-emerald-400 mt-0.5">📋</span>
                                                        <span className="font-bold">الوصف: <span className="text-gray-300">{activeLesson.description}</span></span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <span className="text-purple-400">🕐</span>
                                                    <span className="font-bold">مدة الامتحان: <span className="text-gray-300">{activeLesson.duration || '—'}</span></span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 p-4 bg-black/20 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-yellow-400 text-lg">🔑</span>
                                                        <span className="font-bold text-gray-300">كود الدخول: </span>
                                                        <span className="text-yellow-500 font-mono font-black tracking-wider text-base">{activeLesson.examId || 'لم يتم اضافة امتحان بعد'}</span>
                                                    </div>
                                                    {activeLesson.examId && (
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(activeLesson.examId); alert("تم نسخ الكود بنجاح"); }}
                                                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                        >
                                                            📋 نسخ الكود
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Start Button */}
                                            <button
                                                onClick={() => {
                                                    // 🔒 التحقق من وجود كود الامتحان قبل التوجيه
                                                    if (!activeLesson.examId) {
                                                        alert("عذراً، لم يقم المحاضر بتحديد كود لهذا الامتحان بعد.");
                                                        return;
                                                    }
                                                    router.push(`/exam/${course.id}?examId=${activeLesson.examId}`);
                                                }}
                                                className="inline-block bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
                                            >
                                                ⚡ ابدأ الاختبار الآن
                                            </button>
                                        </div>
                                    )}

                                    {/* ─── Slim Title Bar (below all player types) ─── */}
                                    {(activeLesson.type === 'video' || activeLesson.type === 'pdf') && (
                                        <div className={`px-5 py-3.5 border-t flex items-center justify-between gap-4 ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}`} dir="rtl">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full shrink-0">
                                                    {activeLesson.type === 'video' ? '▶ فيديو' : '📄 ملف PDF'}
                                                </span>
                                                <h3 className="font-black text-white text-sm md:text-base truncate">{activeLesson.title}</h3>
                                                <span className="text-[10px] text-gray-600 font-bold animate-pulse shrink-0">● جاري المشاهدة</span>
                                            </div>
                                            <button className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors shrink-0">
                                                ❤️
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    )}

                    {/* ══════════════════════════════════════════════════════════════════
                        📚  SECTION 2 – ACCORDION (Course Content List)
                    ══════════════════════════════════════════════════════════════════ */}
                    <div className={`rounded-[2rem] md:rounded-[3rem] overflow-hidden border ${isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100'} shadow-xl`}>
                        {/* Header */}
                        <div className="p-5 md:p-7 border-b border-white/5">
                            <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">
                                <span className="text-emerald-500">📚</span>
                                محتوى الكورس
                            </h3>
                        </div>

                        {/* Module List */}
                        <div className="p-3 md:p-5 space-y-2">
                            {parsedCurriculum.map((mod, idx) => {
                                const isOpen = activeModuleIndex === idx;
                                return (
                                    <div key={idx} className="overflow-hidden rounded-2xl border border-white/5">
                                        {/* Module Header Button */}
                                        <button
                                            onClick={() => {
                                                if (isOpen) {
                                                    setActiveModuleIndex(-1);
                                                } else {
                                                    setActiveModuleIndex(idx);
                                                    const firstLesson = mod.lessons?.[0];
                                                    if (firstLesson) {
                                                        setActiveLesson(firstLesson);
                                                        setActiveLessonIndex(0);
                                                    }
                                                }
                                            }}
                                            className={`w-full p-4 flex items-center justify-between font-bold text-right transition-all duration-300 ${isOpen
                                                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/30'
                                                : 'bg-[#1a1d26] text-gray-300 hover:bg-[#1e2230]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${isOpen ? 'bg-white/25 text-white' : 'bg-emerald-600/30 text-emerald-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm md:text-base">{mod.title}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOpen ? 'bg-white/20 text-white/80' : 'bg-white/5 text-gray-500'}`}>
                                                    {mod.lessons?.length || 0} درس
                                                </span>
                                            </div>
                                            <span className={`transition-transform duration-300 text-lg ${isOpen ? 'rotate-180 text-white' : 'text-gray-500'}`}>▼</span>
                                        </button>

                                        {/* Lessons List (collapsible) */}
                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="bg-[#151820] border-t border-white/5 p-2 space-y-1">
                                                {mod.lessons?.map((lesson, lIdx) => {
                                                    const isActive = activeModuleIndex === idx && activeLessonIndex === lIdx;
                                                    const icon = getLessonIcon(lesson.type, (course?.isLocked && !lesson.isFree) || lesson.isPrerequisiteLocked);
                                                    return (
                                                        <button
                                                            key={lIdx}
                                                            onClick={() => handleLessonSelect(lesson, idx, lIdx)}
                                                            className={`w-full p-3 md:p-4 flex items-center gap-3 rounded-xl transition-all text-right border-r-2 ${isActive
                                                                ? 'bg-[#0d1117] border-r-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.07)] border-t border-b border-l border-emerald-500/10'
                                                                : 'hover:bg-white/5 border-r-transparent border border-transparent hover:border-white/5'
                                                                }`}
                                                        >
                                                            {/* Type Icon (left in RTL) */}
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-colors ${isActive
                                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                                : lesson.isPrerequisiteLocked || (course?.isLocked && !lesson.isFree)
                                                                    ? 'bg-amber-500/10 text-amber-500'
                                                                    : lesson.type === 'pdf'
                                                                        ? 'bg-red-500/10 text-red-400'
                                                                        : lesson.type === 'exam'
                                                                            ? 'bg-blue-500/10 text-blue-400'
                                                                            : 'bg-gray-800 text-gray-400'
                                                                }`}>
                                                                {icon}
                                                            </div>

                                                            {/* Lesson Info */}
                                                            <div className="flex-1 min-w-0 text-right">
                                                                <p className={`flex items-center gap-2 text-xs md:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                                                    <span className="truncate">{lesson.title}</span>
                                                                    {lesson.isFree && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full shrink-0">✨ مجاني</span>}
                                                                </p>
                                                                {lesson.description && (
                                                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{lesson.description}</p>
                                                                )}
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-gray-600'}`}>
                                                                        {lesson.type === 'video' ? 'فيديو' : lesson.type === 'pdf' ? 'ملف PDF' : 'امتحان'}
                                                                    </p>
                                                                    {lesson.duration && (
                                                                        <p className="text-[10px] text-gray-600">⏱️ {lesson.duration}</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Active indicator dot */}
                                                            <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-gray-700'}`}></div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                💳 Subscription Confirmation Modal
            ═══════════════════════════════════════════════ */}
            {showSubscribeModal && course && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 animate-scale-in" dir="rtl">
                    <div className="w-full max-w-md bg-[#0f121a] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
                        <h3 className="text-2xl font-black mb-6 text-center">تأكيد طلب الاشتراك ✅</h3>
                        <div className="mb-8 text-center">
                            <p className="text-blue-500 font-black text-xl mb-1">{course.name}</p>
                            <p className="text-gray-500 font-bold">السعر: {course.price} ج.م</p>
                        </div>
                        <div className="space-y-3 mb-10">
                            <p className="text-xs text-gray-500 font-black mb-2 text-center uppercase tracking-tighter">اختر طريقة الدفع</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {course.paymentMethods !== 'cash' && (
                                    <button onClick={() => setSelectedPaymentMethod('center')} className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${selectedPaymentMethod === 'center' ? 'border-blue-600 bg-blue-600/10 text-blue-600' : 'border-white/5 text-gray-500'}`}>
                                        <span className="text-2xl">🏢</span> <span className="text-xs font-bold">في السنتر</span>
                                    </button>
                                )}
                                <button onClick={() => setSelectedPaymentMethod('cash')} className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${course.paymentMethods === 'cash' ? 'md:col-span-2' : ''} ${selectedPaymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-600/10 text-emerald-600' : 'border-white/5 text-gray-500'}`}>
                                    <span className="text-2xl">📱</span> <span className="text-xs font-bold">فودافون كاش</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowSubscribeModal(false)} className="flex-1 py-4 text-gray-500 font-bold hover:text-white transition">إلغاء</button>
                            <button onClick={handleConfirmSubscription} disabled={submittingEnroll} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl disabled:opacity-50">{submittingEnroll ? 'جاري التنفيذ...' : 'إرسال الطلب'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}