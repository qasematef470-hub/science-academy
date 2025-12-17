'use client';
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updatePassword, sendEmailVerification } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/app/ui/NotificationBell';

// 🔥 استيراد الدوال من السيرفر (Logic preserved)
import { 
  getStudentDashboardData, 
  getAllCourses, 
  enrollStudent, 
  cancelCourseRequest 
} from "@/app/actions/student";

import { getCourseMaterials } from "@/app/actions/admin";
import CertificateModal from '@/app/components/CertificateModal'; 
import jsPDF from 'jspdf';

// 🎨 مكون الدورق المتحرك (زي ما هو)
const BubblingFlask = ({ isDark }) => (
  <div className="absolute bottom-10 left-10 opacity-20 pointer-events-none hidden lg:block">
    <div className="relative w-32 h-40">
       <div className="absolute left-1/2 bottom-full w-4 h-4 bg-blue-400 rounded-full animate-bubble opacity-0" style={{animationDelay: '0s', left: '40%'}}></div>
       <div className="absolute left-1/2 bottom-full w-2 h-2 bg-purple-400 rounded-full animate-bubble opacity-0" style={{animationDelay: '1s', left: '60%'}}></div>
       
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-full h-full ${isDark ? 'text-blue-500' : 'text-blue-700'} drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]`}>
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 21a1.5 1.5 0 001.5-1.5v-4.243a1.5 1.5 0 00-.44-1.06L14 7.657V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3.657L3.44 14.197A1.5 1.5 0 003 15.257V19.5a1.5 1.5 0 001.5 1.5h15z" />
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13l2 2 4-4" className="opacity-0" />
       </svg>
       <div className="absolute bottom-1 left-2 right-2 h-12 bg-gradient-to-t from-blue-600/50 to-transparent rounded-b-full blur-sm animate-pulse"></div>
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

export default function StudentDashboard() {
  const router = useRouter();
  useEffect(() => {
        document.title = "الطالب | Science Academy";
      }, []);
  
  // --- States (زي ما هي بالظبط) ---
  const [data, setData] = useState(null); 
  const [suggestedCourses, setSuggestedCourses] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [isDark, setIsDark] = useState(true); 
  const [emailVerified, setEmailVerified] = useState(true);
  const [viewCourseModal, setViewCourseModal] = useState(null); // 👈 ده المسئول عن المودال الجديد
  const [certificateData, setCertificateData] = useState(null);


  // Modals States (زي ما هي)
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [currentMaterials, setCurrentMaterials] = useState({ name: '', list: [] });
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ phone: '', parentPhone: '', governorate: '' });
  const [updateLoading, setUpdateLoading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationData, setActivationData] = useState(null);

  const [confirmSubModal, setConfirmSubModal] = useState(null); 
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('center'); 
  const [submittingEnroll, setSubmittingEnroll] = useState(false);

  // --- Logic Functions (ملمسناش سطر هنا) ---
  const fetchData = async (uid) => {
    const dashboardRes = await getStudentDashboardData(uid);
    const allCoursesRes = await getAllCourses();

    if (dashboardRes.success) {
      setData(dashboardRes.data);
      const u = dashboardRes.data.user;

      if (allCoursesRes.success) {
          const myEnrolledIds = dashboardRes.data.courses.map(c => c.courseId);
          const smartSuggestions = allCoursesRes.data.filter(course => {
              if (myEnrolledIds.includes(course.id)) return false;
              const isGeneralCourse = !course.university && !course.college;
              if (isGeneralCourse) return true;
              if (u.isVacationMode) return false;
              const isMatch = (
                  (course.university === u.university) &&
                  (course.college === u.college) &&
                  (course.year === u.year) &&
                  (course.section === u.section)
              );
              return isMatch;
          });
          setSuggestedCourses(smartSuggestions);
      }
    } else {
       if (dashboardRes.isLocked) alert(dashboardRes.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      setEmailVerified(user.emailVerified);
      await fetchData(user.uid);
    });
    return () => unsubscribe();
  }, []);

  // --- Handlers (زي ما هي) ---
  const handleResendVerification = async () => {
    try { await sendEmailVerification(auth.currentUser); alert("✅ تم إرسال رابط التفعيل!"); } catch (e) { alert("❌ خطأ: " + e.message); }
  };

  const handleForceUpdate = async (e) => {
      e.preventDefault(); setUpdateLoading(true);
      try {
          if(!updateForm.phone || !updateForm.parentPhone || !updateForm.governorate) { alert("جميع الحقول مطلوبة!"); setUpdateLoading(false); return; }
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, { phone: updateForm.phone, parentPhone: updateForm.parentPhone, governorate: updateForm.governorate });
          alert("✅ تم تحديث بياناتك بنجاح!"); setShowUpdateModal(false);
      } catch (err) { alert("حدث خطأ: " + err.message); }
      setUpdateLoading(false);
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      if(newPassword.length < 6) return alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      try { await updatePassword(auth.currentUser, newPassword); alert("✅ تم تغيير كلمة المرور بنجاح"); setShowPasswordModal(false); setNewPassword(""); } 
      catch (err) { alert("❌ خطأ: يجب تسجيل الخروج والدخول مرة أخرى لتغيير كلمة المرور."); }
  };

  const handleInitiateSubscribe = (course) => {
      setConfirmSubModal(course);
      if (course.paymentMethods === 'cash') setSelectedPaymentMethod('cash'); else setSelectedPaymentMethod('center');
  };

  const handleConfirmSubscription = async () => {
      if (!confirmSubModal) return; setSubmittingEnroll(true);
      const res = await enrollStudent(auth.currentUser.uid, confirmSubModal.id, selectedPaymentMethod); 
      if(res.success) { alert("✅ تم إرسال طلب الاشتراك بنجاح!"); await fetchData(auth.currentUser.uid); setConfirmSubModal(null); } 
      else { alert("❌ خطأ: " + res.message); }
      setSubmittingEnroll(false);
  };

  const handleOpenMaterials = async (courseId, courseName) => {
      setCurrentMaterials({ name: courseName, list: [] }); setShowMaterialsModal(true);
      const res = await getCourseMaterials(courseId);
      if(res.success) setCurrentMaterials({ name: courseName, list: res.data });
  };

  const startExam = (courseId) => { if (confirm("هل أنت مستعد لبدء الامتحان؟ ⏱️")) router.push(`/exam/${courseId}`); };

  const handleCancelRequest = async (courseId) => {
      if(!confirm("هل أنت متأكد من إلغاء طلب الاشتراك؟")) return;
      const res = await cancelCourseRequest(auth.currentUser.uid, courseId);
      if(res.success) { alert("✅ تم إلغاء الطلب."); fetchData(auth.currentUser.uid); } else { alert("❌ حدث خطأ"); }
  };

  const handleOpenActivation = (course) => { setActivationData(course); setShowActivationModal(true); };

  // 👇 استبدل الدالة القديمة دي بالكود الجديد ده
 const handleDownloadCertificate = async (result, courseName) => {
      // 1. البيانات الأساسية
      const fullCourseData = data?.courses?.find(c => c.courseId === result.courseId);
      
      // القيمة الافتراضية (اسم القسم)
      let examTopics = fullCourseData?.section || "General Assessment";

      try {
          // 2. محاولة جلب البيانات الدقيقة من إعدادات الامتحان
          const configRef = doc(db, 'exam_configs', result.courseId);
          const configSnap = await getDoc(configRef);
          
          if (configSnap.exists()) {
              const cfg = configSnap.data();
              console.log("Exam Config Found:", cfg); // للفحص في الكونسول

              // الأولوية 1: أسماء المحاضرات المختارة
              if (cfg.lectureNames && Array.isArray(cfg.lectureNames) && cfg.lectureNames.length > 0) {
                   examTopics = cfg.lectureNames.join(' + ');
              } 
              // الأولوية 2: عنوان الامتحان (Exam Title)
              else if (cfg.examTitle && cfg.examTitle.trim() !== "") {
                   examTopics = cfg.examTitle;
              }
              // الأولوية 3: أرقام المحاضرات (لو الأسماء مش موجودة)
              else if (cfg.selectedLectures && Array.isArray(cfg.selectedLectures) && cfg.selectedLectures.length > 0) {
                   examTopics = "Lectures: " + cfg.selectedLectures.join(', ');
              }
          }
      } catch (error) {
          console.error("Error fetching exam topics:", error);
      }

      // 3. إرسال البيانات للشهادة
      setCertificateData({
          studentName: data?.user?.name || "Student",
          courseName: courseName,
          instructorName: fullCourseData?.instructorName || "Science Academy",
          topics: examTopics, 
          score: result.score,
          total: result.total,
          date: result.submittedAt
      });
  };
  // --- Theme Styles ---
  const theme = {
      bg: isDark ? 'bg-[#0B1120]' : 'bg-gray-50',
      text: isDark ? 'text-white' : 'text-gray-900',
      textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
      card: isDark ? 'bg-[#131B2E] border-white/5' : 'bg-white border-gray-200 shadow-xl',
      header: isDark ? 'bg-[#0B1120]/80 border-white/5' : 'bg-white/80 border-gray-200',
      input: isDark ? 'bg-black/30 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-200',
      modal: isDark ? 'bg-[#131B2E] border-white/10' : 'bg-white border-gray-200',
      hover: isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100',
  };

  // 👇 دالة مساعدة ستايل الكارت (نفس بتاع الأدمن)
  const getCardStyle = (type, isRevision) => {
    if(type === 'revision' || isRevision) return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700' };
    if(type === 'summer') return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700' };
    return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700' };
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );
  
  return (
    <div className={`min-h-screen font-sans overflow-x-hidden relative transition-colors duration-300 ${theme.bg} ${theme.text}`} dir="rtl">
      
      {/* 🔮 Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] animate-pulse ${isDark ? 'bg-blue-600/10' : 'bg-blue-400/20'}`}></div>
          <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] animate-pulse delay-1000 ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`}></div>
          <BubblingFlask isDark={isDark} />
      </div>

      {/* 📢 Marquee (Announcements) */}
      {data?.announcements?.length > 0 && (
          <div className="bg-blue-600 text-white relative z-40 h-8 flex items-center overflow-hidden shadow-md">
              <div className="animate-marquee whitespace-nowrap flex gap-10 min-w-full px-4">
                  {data.announcements.map((ann, i) => (
                      <span key={i} className="text-xs font-bold">
                          {/* 🔥 التعديل هنا: عشان لو النص اتخزن غلط ميعملش كراش */}
                          🔔 {typeof ann.text === 'object' ? (ann.text.text || "إعلان هام") : ann.text}
                      </span>
                  ))}
              </div>
          </div>
      )}
      {/* ⚠️ Email Verification Banner */}
      {!emailVerified && (
        <div className="bg-orange-500 text-white p-2 text-center text-xs font-bold relative z-50">
            ⚠️ حسابك غير مفعل! يرجى التحقق من بريدك الإلكتروني. 
            <button onClick={handleResendVerification} className="underline mr-2 hover:text-black">إعادة الإرسال</button>
        </div>
      )}

      {/* 🏠 Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-300 ${theme.header}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/" className={`w-10 h-10 rounded-xl flex items-center justify-center transition border ${theme.card} ${theme.hover}`} title="الرئيسية">🏠</Link>
                <div>
                    <h1 className="font-black text-lg md:text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                        أهلاً، {data?.user?.name?.split(' ')[0]} 👋
                    </h1>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 {/* 🔔 إضافة الجرس هنا */}
                 <div className={`rounded-full flex items-center justify-center transition border ${theme.card} ${theme.hover}`}>
                    <NotificationBell />
                 </div>

                 <button onClick={() => setIsDark(!isDark)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition border ${theme.card} ${theme.hover}`}>
                    {isDark ? '☀️' : '🌙'}
                 </button>
                 <button onClick={() => setShowPasswordModal(true)} className={`hidden md:flex px-4 py-2 rounded-xl text-xs font-bold transition border gap-2 ${theme.card} ${theme.hover} ${theme.textMuted}`}>
                    🔒 كلمة المرور
                </button>
                <button onClick={() => signOut(auth)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition border border-red-500/20">
                    خروج
                </button>
            </div>
        </div>
      </header>

      {/* 🕹️ Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar / Mobile Tabs */}
        <div className="lg:col-span-1 space-y-4">
            <div className={`backdrop-blur-sm border p-2 rounded-3xl flex lg:flex-col gap-2 sticky top-24 transition-colors overflow-x-auto no-scrollbar ${theme.card}`}>
                {[
                    { id: 'home', icon: '🚀', label: 'الرئيسية' },
                    { id: 'courses', icon: '📚', label: 'موادي' },
                    { id: 'results', icon: '🏆', label: 'نتائجي' }
                ].map((tab) => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[100px] lg:min-w-0 p-4 rounded-2xl flex items-center justify-center lg:justify-start gap-3 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]' : `${theme.hover} ${theme.textMuted}`}`}
                    >
                        <span>{tab.icon}</span> <span className="font-bold">{tab.label}</span>
                    </button>
                ))}
                <div className="lg:hidden flex gap-2 min-w-[100px]">
                    <button onClick={() => setShowPasswordModal(true)} className={`flex-1 p-3 rounded-xl ${theme.hover} ${theme.textMuted} text-xs font-bold border whitespace-nowrap ${theme.card.split(' ')[1]}`}>🔒 الباسورد</button>
                </div>
            </div>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-3 min-h-[500px]">
            
            {activeTab === 'home' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-white/10 text-white">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-2">
                                {data?.user?.isVacationMode ? "أجازة سعيدة ومفيدة! 🏖️" : "جاهز للتفوق؟ 🌟"}
                            </h2>
                            <p className="text-blue-200 mb-6 max-w-lg text-sm leading-relaxed">
                                {data?.user?.isVacationMode 
                                    ? "طور مهاراتك واستغل وقتك صح في الأجازة."
                                    : data?.user?.college 
                                        ? `زميلنا في ${data.user.college}، شد حيلك!` 
                                        : 'رحلة الألف ميل تبدأ بخطوة. ذاكر، امتحن، وحقق حلمك معانا!'}
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setActiveTab('courses')} className="bg-white text-blue-900 px-6 py-3 rounded-xl font-black hover:bg-blue-50 transition shadow-lg">المحاضرات 📺</button>
                                <button onClick={() => router.push('/')} className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition backdrop-blur-md">الصفحة الرئيسية 🌐</button>
                            </div>
                        </div>
                    </div>

                    {/* 🆕 المواد المقترحة (بتصميم الأدمن) */}
                    {suggestedCourses.length > 0 ? (
                        <div className="animate-slide-up">
                             <h3 className={`font-bold text-xl flex items-center gap-2 mb-4 ${theme.text}`}>
                                <span className="w-1.5 h-6 bg-green-500 rounded-full block"></span>
                                مواد متاحة لك {data?.user?.isVacationMode ? "للأجازة 🏖️" : "في تخصصك 🎓"}
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {suggestedCourses.map(course => (
                                    <div key={course.id} className="group relative bg-[#0f172a] rounded-3xl overflow-hidden border border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 flex flex-col">
                                        {/* الصورة */}
                                        <div className="relative h-48 w-full overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent z-10" />
                                            {course.image ? (
                                                <img src={course.image} alt={course.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl">📚</div>
                                            )}
                                            <span className="absolute top-4 right-4 z-20 bg-green-500 text-black font-black text-xs px-3 py-1.5 rounded-full shadow-lg">
                                                {course.price > 0 ? `${course.price} ج.م` : 'مجاني'}
                                            </span>
                                        </div>
                                        {/* التفاصيل */}
                                        <div className="p-6 flex-1 flex flex-col relative z-20">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                                        {course.section || "عام"}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-blue-400 transition-colors">
                                                    {course.name}
                                                </h3>
                                                {/* كود عرض المحاضر في الكارت */}
                                                <div className="flex items-center gap-2 mb-4">
                                                    {/* الصورة الصغيرة */}
                                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600">
                                                        {course.instructorImage ? (
                                                            <img src={course.instructorImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs">👨‍🏫</span>
                                                        )}
                                                    </div>
                                                    {/* الاسم */}
                                                    <span className="text-sm text-slate-400 font-bold">
                                                        {course.instructorName || "Science Academy"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => setViewCourseModal(course)} className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg mt-4 flex items-center justify-center gap-2">
                                             عرض التفاصيل ⬅️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className={`p-6 border border-dashed rounded-3xl text-center ${theme.textMuted}`}>
                             {data?.user?.isVacationMode 
                                ? "لا توجد كورسات أجازة متاحة حالياً. انتظرنا قريباً! 🕒"
                                : "لا توجد مواد متاحة لدفعتك حالياً. تأكد من بياناتك أو تواصل مع الدعم. 🛠️"}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'courses' && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black">مكتبة الكورسات</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        {data?.courses?.length > 0 ? data?.courses?.map((course) => {
                             const styles = getCardStyle(course.type, course.isRevision);
                             return (
                                <div key={course.courseId} className={`relative overflow-hidden rounded-3xl border p-6 flex flex-col justify-between min-h-[200px] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${course.status === 'active' ? theme.card + ' border-blue-500/20' : theme.card + ' opacity-80 grayscale'}`}>
                                    
                                    <div className="flex items-start gap-4 mb-4">
                                         {/* 🖼️ عرض الصورة للكورسات المشتركة */}
                                         <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden shrink-0">
                                            {course.image ? (
                                                <img src={course.image} alt={course.courseName} className="w-full h-full object-cover" />
                                            ) : (
                                                course.courseName?.[0] || 'C'
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black leading-tight">{course.courseName}</h3>
                                            <div className="flex gap-2 mt-2">
                                                {course.status === 'active' 
                                                    ? <span className="bg-blue-100 text-blue-700 dark:bg-blue-600 dark:text-white px-2 py-1 rounded-md text-[10px] font-bold">مفعل</span>
                                                    : <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-600/20 dark:text-yellow-400 px-2 py-1 rounded-md text-[10px] font-bold">انتظار</span>
                                                }
                                                {course.status === 'pending' && <span className="text-xs text-yellow-500 font-bold flex items-center">⏳ قيد المراجعة</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        {course.status === 'active' ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => startExam(course.courseId)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg transition">بدء الامتحان</button>
                                                <button onClick={() => handleOpenMaterials(course.courseId, course.courseName)} className={`px-4 rounded-xl border transition flex items-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}><span>📂</span></button>
                                            </div>
                                        ) : (
                                            <div className="w-full flex flex-col gap-3">
                                                {/* 📝 رسالة التعليمات الجديدة */}
                                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                                                    <p className="text-[10px] md:text-xs text-yellow-500 font-bold">
                                                        ⚠️ يجب الضغط على "تفعيل" وإرسال صورة التحويل للمحاضر لتأكيد الاشتراك
                                                    </p>
                                                </div>

                                                <div className="flex gap-2 w-full">
                                                    <button onClick={() => handleOpenActivation(course)} className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg hover:shadow-yellow-500/20 transition animate-pulse">
                                                        🔒 تفعيل
                                                    </button>
                                                    <button onClick={() => handleCancelRequest(course.courseId)} className="px-4 py-3 rounded-xl font-bold text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition border border-red-500/20">
                                                        ✕ إلغاء
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className={`col-span-2 text-center p-8 border border-dashed rounded-2xl ${theme.textMuted}`}>
                                لسه مشتركتش في أي مواد. شوف المواد المقترحة في الصفحة الرئيسية! 🚀
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ... Results Tab (زي ما هو) ... */}
            {activeTab === 'results' && (
                <div className="animate-fade-in-up">
                    <h2 className="text-2xl font-black mb-6">سجل البطولات 🏅</h2>
                    <div className={`border rounded-3xl overflow-hidden shadow-xl ${theme.card}`}>
                        <table className="w-full text-right text-sm">
                            <thead className={`${isDark ? 'bg-black/20' : 'bg-gray-100'} ${theme.textMuted} uppercase text-xs font-bold`}>
                                <tr>
                                    <th className="p-4">الكورس</th>
                                    <th className="p-4">الدرجة</th>
                                    <th className="p-4 hidden md:table-cell">التاريخ</th>
                                    <th className="p-4">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                {data?.results?.map((res) => {
                                    // حساب نسبة النجاح
                                    const percent = res.total > 0 ? (res.score / res.total * 100) : 0;
                                    const isPassed = percent >= (data.config.minScore || 50);
        
                                    // جلب اسم الكورس
                                    const courseName = data.courses.find(c => c.courseId === res.courseId)?.courseName || 'General';
        
                                    return (
                                        <tr key={res.id} className={`${theme.hover} transition`}>
                                            <td className="p-4 font-bold">{courseName}</td>
                                            <td className="p-4">
                                                <span className={`font-black ${isPassed ? 'text-green-500' : 'text-red-500'}`}>{res.score}</span>
                                                <span className={theme.textMuted}>/{res.total}</span>
                                            </td>
                                            <td className={`p-4 text-xs hidden md:table-cell ${theme.textMuted}`}>
                                                {new Date(res.submittedAt).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="p-4 flex gap-2">
                                                {/* 🔥 1. زرار الشهادة: مش هيظهر غير لو (الأدمن سامح + الطالب ناجح) */}
                                                {res.allowCertificate && isPassed && (
                                                    <button 
                                                        onClick={() => handleDownloadCertificate(res, courseName)} 
                                                        className="flex items-center gap-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded-lg text-xs font-bold transition border border-yellow-300" 
                                                        title="تحميل الشهادة"
                                                    >
                                                        🎓 شهادة
                                                    </button>
                                                )}

                                                {/* 🔥 2. زرار المراجعة: مش هيظهر غير لو (الأدمن سامح بالمراجعة) */}
                                                {res.allowReview && (
                                                    <button 
                                                        onClick={() => router.push(`/exam/${res.courseId}/review/${res.id}`)} 
                                                        className="text-blue-500 hover:text-white hover:bg-blue-500 text-xs font-bold border border-blue-500 px-3 py-1 rounded-lg transition"
                                                    >
                                                         عرض الإجابات
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {data?.results?.length === 0 && <div className={`p-10 text-center ${theme.textMuted}`}>لا توجد نتائج حتى الآن.</div>}
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* 🛠️ MODALS AREA (كل المودالات موجودة زي ما هي بالظبط) */}
      
      {/* 2. Password Modal */}
      {showPasswordModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
              <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 ${theme.modal}`}>
                  <h3 className="text-xl font-black mb-4">تغيير كلمة المرور 🔒</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                          <label className={`text-xs block mb-2 ${theme.textMuted}`}>كلمة المرور الجديدة</label>
                          <input type="password" className={`w-full rounded-xl p-3 outline-none focus:border-blue-500 border ${theme.input}`} placeholder="******" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                      </div>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setShowPasswordModal(false)} className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>إلغاء</button>
                          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold">حفظ التغيير</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* 3. Materials Modal */}
      {showMaterialsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className={`w-full max-w-2xl rounded-3xl border p-6 ${theme.modal}`}>
                  <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-lg">محتوى الكورس: <span className="text-blue-500">{currentMaterials.name}</span></h3>
                       <button onClick={() => setShowMaterialsModal(false)} className={theme.textMuted}>✕</button>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                      {currentMaterials.list.length > 0 ? currentMaterials.list.map((item, idx) => (
                          <div key={idx} className={`flex justify-between items-center p-4 rounded-lg border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center gap-3">
                                  <span className="text-2xl">{item.type === 'video' ? '📺' : item.type === 'image' ? '🖼️' : '📄'}</span>
                                  <span className="font-bold text-sm">{item.title}</span>
                              </div>
                              <a href={item.link} target="_blank" rel="noreferrer" className="text-blue-500 text-sm font-bold bg-blue-500/10 px-3 py-1 rounded-lg hover:bg-blue-500 hover:text-white transition">فتح 🔗</a>
                          </div>
                      )) : (
                          <div className={`text-center py-8 ${theme.textMuted}`}>لا يوجد محتوى مضاف لهذا الكورس حالياً.</div>
                      )}
                  </div>
              </div>
          </div>
      )}


      {/* 🆕 Activation Popup */}
      {showActivationModal && activationData && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-scale-in">
              <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-8 relative overflow-hidden ${theme.modal}`}>
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
                  
                  <div className="text-center mb-6">
                      <div className="text-5xl mb-2">🔒</div>
                      <h3 className="text-2xl font-black mb-1">تفعيل الاشتراك</h3>
                      <p className={`text-sm ${theme.textMuted}`}>{activationData.courseName}</p>
                  </div>

                  {/* تفاصيل الدفع */}
                  {activationData.paymentDetailsSnapshot?.methodType !== 'center' && activationData.paymentMethod !== 'center' && (
                    <div className="space-y-4 mb-8">
                        {(activationData.price || activationData.paymentDetailsSnapshot?.price) > 0 ? (
                            <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <span className={theme.textMuted}>المبلغ المطلوب:</span>
                                <span className="font-black text-xl text-green-500">{activationData.price || activationData.paymentDetailsSnapshot?.price} ج.م</span>
                            </div>
                        ) : (
                            <div className="text-center text-green-500 font-bold p-2 bg-green-500/10 rounded-xl">مجاني (سيتم التفعيل قريباً)</div>
                        )}
                        {(activationData.paymentNumber || activationData.paymentDetailsSnapshot?.paymentNumber) && (
                            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-xs mb-2 ${theme.textMuted}`}>رقم فودافون كاش للتحويل:</p>
                                <p className="font-mono text-2xl font-black tracking-wider select-all text-yellow-500">{activationData.paymentNumber || activationData.paymentDetailsSnapshot?.paymentNumber}</p>
                            </div>
                        )}
                    </div>
                  )}

                  {(activationData.paymentDetailsSnapshot?.methodType === 'center' || activationData.paymentMethod === 'center') && (
                      <div className={`p-6 mb-8 text-center rounded-xl border border-dashed ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                          <p className="text-3xl mb-2">🏢</p>
                          <p className="font-bold mb-1">الدفع في السنتر</p>
                          <p className={`text-sm ${theme.textMuted}`}>يرجى التوجه للسنتر ودفع المبلغ لتفعيل الاشتراك.</p>
                      </div>
                  )}

                  <div className="flex flex-col gap-3">
                      {((activationData.contactPhone || activationData.paymentDetailsSnapshot?.contactPhone) && (activationData.paymentDetailsSnapshot?.methodType !== 'center' && activationData.paymentMethod !== 'center')) ? (
                           <a href={`https://wa.me/+2${activationData.contactPhone || activationData.paymentDetailsSnapshot?.contactPhone}?text=مرحباً، أريد تفعيل كورس ${activationData.courseName}.. وهذه صورة التحويل.`} target="_blank" rel="noreferrer" className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-1">
                               <span className="text-xl">💬</span> إرسال الإيصال (واتساب)
                           </a>
                      ) : null}
                      <button onClick={() => setShowActivationModal(false)} className={`w-full py-3 rounded-xl font-bold ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-200 text-gray-600'}`}>إغلاق</button>
                  </div>
              </div>
          </div>
      )}

      {/* 👇 مودال تأكيد الاشتراك */}
      {confirmSubModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-scale-in">
            <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-8 relative ${theme.modal}`}>
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-black mb-2">تأكيد الاشتراك ✅</h3>
                    <p className={`text-lg font-bold text-blue-500`}>{confirmSubModal.name}</p>
                    <p className={`text-sm ${theme.textMuted} mt-1`}>السعر: {confirmSubModal.price > 0 ? `${confirmSubModal.price} ج.م` : 'مجاني'}</p>
                </div>

                {confirmSubModal.price > 0 && (
                    <div className="mb-6">
                        <label className={`block text-xs font-bold mb-3 ${theme.textMuted}`}>اختر طريقة الدفع:</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(confirmSubModal.paymentMethods === 'both' || confirmSubModal.paymentMethods === 'center') && (
                                <button onClick={() => setSelectedPaymentMethod('center')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${selectedPaymentMethod === 'center' ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-gray-700 opacity-50'}`}>
                                    <span className="text-2xl">🏢</span> <span className="text-xs font-bold">في السنتر</span>
                                </button>
                            )}
                            {(confirmSubModal.paymentMethods === 'both' || confirmSubModal.paymentMethods === 'cash') && (
                                <button onClick={() => setSelectedPaymentMethod('cash')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${selectedPaymentMethod === 'cash' ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-gray-700 opacity-50'}`}>
                                    <span className="text-2xl">📱</span> <span className="text-xs font-bold">فودافون كاش</span>
                                </button>
                            )}
                        </div>
                        {selectedPaymentMethod === 'cash' && confirmSubModal.paymentNumber && (
                            <div className="mt-4 text-center p-3 bg-green-900/20 border border-green-900/50 rounded-lg">
                                <p className="text-xs text-gray-400 mb-1">رقم التحويل:</p>
                                <p className="font-mono font-bold text-green-500 text-lg select-all">{confirmSubModal.paymentNumber}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 mt-8">
                    <button onClick={() => setConfirmSubModal(null)} className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-200 text-gray-600'}`}>إلغاء</button>
                    <button onClick={handleConfirmSubscription} disabled={submittingEnroll} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">
                        {submittingEnroll ? 'جاري التنفيذ...' : 'تأكيد الاشتراك'}
                    </button>
                </div>
            </div>
        </div>
      )}
      {certificateData && (
          <CertificateModal
              studentName={certificateData.studentName}
              courseName={certificateData.courseName}
              instructorName={certificateData.instructorName} // 👈 الجديد
              topics={certificateData.topics}                 // 👈 الجديد
              score={certificateData.score}
              total={certificateData.total}
              date={certificateData.date}
              onClose={() => setCertificateData(null)}
          />
      )}
      {/* 💎 مودال التفاصيل المحسن للموبايل */}
      {viewCourseModal && (
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                {/* جعلناه ياخد الشاشة كاملة في الموبايل ويبقى كارت في الكمبيوتر */}
                <div className="bg-[#0B1120] w-full h-[90vh] md:h-auto md:max-h-[90vh] max-w-5xl rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative flex flex-col md:flex-row">
            
                    {/* زرار الإغلاق المحسن */}
                    <button onClick={() => setViewCourseModal(null)} className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition border border-white/10">✕</button>
            
                    {/* التفاصيل يمين */}
                    <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar relative z-20 bg-gradient-to-br from-[#0B1120] to-[#1a233a]">
                        <div className="flex flex-wrap gap-2 mb-4 mt-8 md:mt-0"> {/* margin-top عشان زرار الإغلاق في الموبايل */}
                            <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full">{viewCourseModal.college || "عام"}</span>
                            <span className="bg-green-500 text-black text-xs font-black px-3 py-1 rounded-full">{viewCourseModal.price > 0 ? `${viewCourseModal.price} ج.م` : 'مجاني'}</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white mb-6 leading-tight">{viewCourseModal.name}</h2>
                
                        {/* ... باقي محتوى المودال زي ما هو ... */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 mb-6">
                            {/* ... نفس كود المحاضر ... */}
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl shadow-lg shadow-blue-600/20 overflow-hidden">
                                {viewCourseModal.instructorImage ? <img src={viewCourseModal.instructorImage} alt="" className="w-full h-full object-cover" /> : <span>👨‍🏫</span>}
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold mb-0.5">محاضر المادة</p>
                                <p className="text-white font-bold text-lg">{viewCourseModal.instructorName || "Science Academy"}</p>
                            </div>
                        </div>

                        <div className="mb-8 flex-1">
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><span>📝</span> عن الكورس:</h3>
                            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{viewCourseModal.details || "كورس شامل..."}</p>
                        </div>

                        <div className="space-y-3 mt-auto pb-6 md:pb-0"> {/* padding-bottom للموبايل */}
                            {viewCourseModal.contactPhone && (
                                <a href={`https://wa.me/+2${viewCourseModal.contactPhone}`} target="_blank" rel="noreferrer" className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
                                    <span>💬</span> تواصل واتساب
                                </a>
                            )}
                            <button onClick={() => { setViewCourseModal(null); handleInitiateSubscribe(viewCourseModal); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
                                <span>🚀</span> اشترك الآن
                            </button>
                        </div>
                    </div>

                    {/* الصورة شمال (تختفي في الموبايل) */}
                    <div className="hidden md:block w-2/5 relative">
                        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay z-10"></div>
                        {viewCourseModal.image ? <img src={viewCourseModal.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center"><span className="text-9xl opacity-20">📚</span></div>}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}