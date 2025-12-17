'use client';
import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { 
    toggleUserLock, 
    deleteStudentAccount, 
    adminResetPassword, 
    updateCourseStatus, 
    toggleSpecialAccess,
    getStudentStats // 👈 1. استدعاء الدالة الجديدة
} from '@/app/actions/admin';

// أيقونات بسيطة للمودال
const Icons = {
    Lock: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    Unlock: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Key: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
    Ban: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    Magic: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Eject: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l-5-5-5 5M12 4v9" /></svg>
};

export default function StudentProfileModal({ student, onClose, onRefresh, selectedCourseContext, isDarkMode }) {
  const theme = {
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
  };

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 👈 2. حالة جديدة لتخزين الإحصائيات
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden'; 
    
    // 👈 3. جلب الإحصائيات عند فتح المودال
    const fetchStats = async () => {
        if(student?.uid) {
            const res = await getStudentStats(student.uid);
            if(res.success) setStats(res.stats);
        }
        setStatsLoading(false);
    };
    fetchStats();

    return () => { document.body.style.overflow = 'unset'; };
  }, [student]);

  // --- Handlers ---
  const handleLockToggle = async () => {
    if (!confirm(student.isLocked ? "فك تجميد الحساب؟" : "تجميد الحساب بالكامل؟")) return;
    setLoading(true);
    await toggleUserLock(student.uid, !student.isLocked);
    onRefresh();
    setLoading(false);
    onClose();
  };

  const handleDeleteAccount = async () => {
    const confirmMsg = "⚠️ تحذير خطير!\nسيتم حذف حساب الطالب نهائياً من المنصة بالكامل.\nهل أنت متأكد؟";
    if (!confirm(confirmMsg)) return;
    setLoading(true);
    await deleteStudentAccount(student.uid);
    onRefresh();
    setLoading(false);
    onClose();
  };

  const handlePasswordReset = async () => {
    const p = prompt("أدخل كلمة المرور الجديدة:");
    if (!p) return;
    setLoading(true);
    await adminResetPassword(student.uid, p);
    alert("✅ تم تغيير كلمة المرور");
    setLoading(false);
  };

  const handleRemoveFromCourse = async () => {
    if (!selectedCourseContext) return alert("يجب الدخول من فولدر الكورس لتنفيذ هذا الإجراء");
    if (!confirm("⚠️ هل تريد إلغاء اشتراك الطالب في هذا الكورس فقط؟")) return;
    setLoading(true);
    await updateCourseStatus(student.uid, selectedCourseContext, 'remove');
    onRefresh();
    setLoading(false);
    onClose();
  };

  const handleBanFromCourse = async () => {
    if (!selectedCourseContext) return;
    const isBanned = student.enrolledCourses.find(c => c.courseId === selectedCourseContext)?.status === 'banned';
    if (!confirm(isBanned ? "فك الحظر عن الطالب في هذا الكورس؟" : "حظر الطالب من هذا الكورس؟")) return;
    setLoading(true);
    await updateCourseStatus(student.uid, selectedCourseContext, isBanned ? 'active' : 'banned');
    onRefresh();
    setLoading(false);
    onClose();
  };

  const handleSpecialAccess = async () => {
    if (!selectedCourseContext) return;
    if (!confirm("منح استثناء (دخول إضافي للامتحان)؟")) return;
    setLoading(true);
    await toggleSpecialAccess(student.uid, selectedCourseContext, true);
    alert("✅ تم منح الاستثناء");
    setLoading(false);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="flex min-h-full items-center justify-center p-4">
            <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative ${theme.card}`}>
                
                <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition z-10">✕</button>
                </div>

                <div className="px-8 pb-8 -mt-12 relative">
                    <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-xl mb-4">
                        <div className="w-full h-full rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-4xl font-bold text-indigo-600">
                            {student.name ? student.name[0] : '?'}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className={`text-2xl font-black ${theme.textMain}`}>{student.name || 'اسم غير متوفر'}</h2>
                        <div className={`text-sm ${theme.textSec} mt-1`}>{student.email}</div>
                        
                        {(student.college || student.year) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                                    {student.university || 'الجامعة غير محددة'}
                                </span>
                                <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">
                                    {student.college || '-'}
                                </span>
                                <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">
                                    {student.year || '-'}
                                </span>
                                <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">
                                    {student.section || '-'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 👈 4. القسم الجديد: عرض الإحصائيات (Stats Cards) */}
                    <div className="grid grid-cols-3 gap-3 mb-6 animate-scale-in">
                        {/* كارد المستوى العام */}
                        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${theme.card}`}>
                            <span className="text-2xl mb-1">📊</span>
                            <span className={`text-sm font-bold ${theme.textMain}`}>
                                {statsLoading ? "..." : stats?.averagePercent || "0%"}
                            </span>
                            <span className={`text-[10px] ${theme.textSec}`}>المستوى العام</span>
                        </div>
                        
                        {/* كارد عدد الامتحانات */}
                        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${theme.card}`}>
                            <span className="text-2xl mb-1">📝</span>
                            <span className={`text-sm font-bold ${theme.textMain}`}>
                                {statsLoading ? "..." : stats?.totalExams || 0}
                            </span>
                            <span className={`text-[10px] ${theme.textSec}`}>امتحان مكتمل</span>
                        </div>

                        {/* كارد آخر ظهور */}
                        <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${theme.card}`}>
                            <span className="text-2xl mb-1">🕒</span>
                            <span className={`text-[10px] font-bold text-center ${theme.textMain}`}>
                                {statsLoading ? "..." : stats?.lastLogin ? new Date(stats.lastLogin).toLocaleDateString('ar-EG') : 'جديد'}
                            </span>
                            <span className={`text-[10px] ${theme.textSec}`}>آخر ظهور</span>
                        </div>
                    </div>
                    {/* ------------------------------------------- */}

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className={`p-4 rounded-2xl border ${theme.card}`}>
                                <p className={`text-xs ${theme.textSec} mb-1`}>رقم الهاتف</p>
                                <div className="flex items-center gap-2">
                                    <p className={`font-mono font-bold text-lg ${theme.textMain} select-all`}>{student.phone}</p>
                                    <a href={`https://wa.me/+2${student.phone}`} target="_blank" className="text-green-500 hover:text-green-600">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    </a>
                                </div>
                        </div>
                        <div className={`p-4 rounded-2xl border ${theme.card}`}>
                                <p className={`text-xs ${theme.textSec} mb-1`}>ولي الأمر 👨‍👦</p>
                                <p className={`font-mono font-bold text-lg ${theme.textMain} select-all`}>{student.parentPhone || '-'}</p>
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button onClick={handleLockToggle} disabled={loading} className={`p-3 rounded-xl flex flex-col items-center justify-center gap-2 border transition ${student.isLocked ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                            {student.isLocked ? <Icons.Unlock /> : <Icons.Lock />}
                            <span className="text-[10px] font-bold">{student.isLocked ? 'فك التجميد' : 'تجميد الحساب'}</span>
                        </button>

                        <button onClick={handlePasswordReset} disabled={loading} className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100">
                            <Icons.Key />
                            <span className="text-[10px] font-bold">تغيير الباسورد</span>
                        </button>

                        <button onClick={handleDeleteAccount} disabled={loading} className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 bg-red-50 dark:bg-red-900/10 text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-100">
                            <Icons.Trash />
                            <span className="text-[10px] font-bold">حذف نهائي</span>
                        </button>
                        
                        {/* Course Specific Actions */}
                        {selectedCourseContext && (
                            <>
                                <button onClick={handleRemoveFromCourse} disabled={loading} className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100">
                                    <Icons.Eject />
                                    <span className="text-[10px] font-bold">إلغاء اشتراك</span>
                                </button>
                                <button onClick={handleBanFromCourse} disabled={loading} className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100">
                                    <Icons.Ban />
                                    <span className="text-[10px] font-bold">حظر/فك حظر</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}