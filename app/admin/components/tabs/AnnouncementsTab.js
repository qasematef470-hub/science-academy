'use client';
import React, { useState } from 'react';
import { addAnnouncement, deleteAnnouncement } from '@/app/actions/admin';
import { useRouter } from 'next/navigation'; // 👈 ضيف دي


export default function AnnouncementsTab({ 
  announcements = [], 
  myCourses = [], 
  onRefresh, 
  isDarkMode 
}) {
  const router = useRouter(); 
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [targetCourse, setTargetCourse] = useState("all"); // 'all' or courseId
  const [isPosting, setIsPosting] = useState(false);
  
  // حماية البيانات
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const safeCourses = Array.isArray(myCourses) ? myCourses : [];

  const theme = {
    input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    accent: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  };

  const getCardStyle = (type) => {
    switch(type) {
        case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة' };
        case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'صيفي' };
        default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'أكاديمي' };
    }
  };

  const handlePostAnnouncement = async () => {
      if(!newAnnouncement.trim()) return;
      setIsPosting(true);
      
      // 1. تحديد اسم الكورس المختار
      const courseName = targetCourse === 'all' ? 'عام' : safeCourses.find(c => c.id === targetCourse)?.name;

      // 2. إرسال البيانات كاملة (النص + الـ ID + الاسم)
      await addAnnouncement(
          newAnnouncement, 
          targetCourse === 'all' ? null : targetCourse, // لو "all" ابعت null
          courseName
      );
      
      setNewAnnouncement("");
      setTargetCourse("all"); // نرجع الاختيار عام تاني
      setIsPosting(false);
      if (onRefresh) onRefresh();
  };

  const handleDeleteAnnouncement = async (id) => {
      // تأكد إن فيه ID أصلاً
      if (!id) return alert("خطأ: لا يوجد ID لهذا الإعلان");

      if(confirm("حذف الإعلان؟")) {
          const res = await deleteAnnouncement(id);
          
          if (res.success) {
              // لو نجح، حدث الصفحة
              router.refresh();
              if (onRefresh) onRefresh();
          } else {
              // لو فشل، طلع رسالة بالسبب
              alert("فشل الحذف ❌: " + (res.error || "خطأ غير معروف"));
          }
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
        
        {/* 1️⃣ SECTION: Select Audience */}
        <div>
            <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${theme.textMain}`}>
                <span>📢</span> الخطوة 1: لمن تريد إرسال الإعلان؟
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                
                {/* A. Global Card */}
                <div 
                    onClick={() => setTargetCourse('all')}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center
                    ${targetCourse === 'all' 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-[1.02]' 
                        : `${theme.card} hover:border-indigo-300`}`}
                >
                    <div className="text-4xl">🌍</div>
                    <div>
                        <h4 className={`font-bold ${theme.textMain}`}>إعلان عام</h4>
                        <p className="text-xs text-gray-500">يظهر لجميع الطلاب المسجلين</p>
                    </div>
                    {targetCourse === 'all' && <div className="mt-2 text-indigo-600 font-bold text-sm">✅ تم الاختيار</div>}
                </div>

                {/* B. Course Cards */}
                {safeCourses.map(course => {
                    const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                    const styles = getCardStyle(type);
                    const isSelected = targetCourse === course.id;

                    return (
                        <div 
                            key={course.id} 
                            onClick={() => setTargetCourse(course.id)}
                            className={`relative group p-5 rounded-2xl border-2 cursor-pointer transition-all overflow-hidden
                            ${isSelected 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-[1.02]' 
                                : `${theme.card} hover:border-gray-300 dark:hover:border-gray-600`}`}
                        >
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-2xl">
                                    {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : styles.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold truncate ${theme.textMain}`}>{course.name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.label}</span>
                                </div>
                                {isSelected && <div className="text-xl text-indigo-500">✅</div>}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1 relative z-10">
                                {type !== 'summer' ? (
                                    <>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                        <p className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "قسم عام"}</p>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* 2️⃣ SECTION: Write & Publish */}
        <div className={`p-6 rounded-3xl border shadow-lg ${theme.card}`}>
             <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${theme.textMain}`}>
                 <span>✍️</span> الخطوة 2: اكتب الإعلان
             </h3>
             <div className="flex flex-col md:flex-row gap-4">
                <input 
                    type="text" 
                    placeholder={`اكتب الخبر هنا... (سيتم إرساله إلى: ${targetCourse === 'all' ? 'الجميع' : safeCourses.find(c => c.id === targetCourse)?.name})`}
                    className={`flex-1 p-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-lg ${theme.input}`} 
                    value={newAnnouncement} 
                    onChange={e => setNewAnnouncement(e.target.value)} 
                />
                <button 
                    onClick={handlePostAnnouncement} 
                    disabled={isPosting}
                    className={`px-8 py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 disabled:opacity-50 shadow-lg ${theme.accent}`}
                >
                    {isPosting ? 'جاري النشر...' : 'نشر الإعلان 🚀'}
                </button>
             </div>
        </div>

        {/* 3️⃣ SECTION: History */}
        <div className="space-y-3">
            <h3 className={`font-bold text-base px-2 ${theme.textMain}`}>سجل الإعلانات السابقة ({safeAnnouncements.length})</h3>
            
            {safeAnnouncements.length === 0 ? (
                <p className="text-center text-gray-500 py-8 border border-dashed rounded-2xl">لا توجد إعلانات منشورة حالياً.</p>
            ) : (
                safeAnnouncements.map(ann => (
                    <div key={ann.id} className={`flex justify-between items-center p-4 rounded-xl border shadow-sm transition hover:shadow-md ${theme.card}`}>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${ann.targetCourseId ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                    {ann.targetCourseId ? `لطلاب: ${ann.targetCourseName || 'مادة محددة'}` : '🌍 عام'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('ar-EG') : '-'}
                                </span>
                            </div>
                            
                            {/* 🔥🔥 الإصلاح هنا: عشان ميعملش كراش لو النص اتخزن غلط */}
                            <span className={`font-medium block text-lg ${theme.textMain}`}>
                                {typeof ann.text === 'object' ? (ann.text.text || "نص غير صالح") : ann.text}
                            </span>
                        </div>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-600 font-bold text-xs bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-lg transition">حذف</button>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}