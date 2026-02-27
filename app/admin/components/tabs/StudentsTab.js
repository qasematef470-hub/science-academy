'use client';
import React, { useState } from 'react';
import StudentProfileModal from '../modals/StudentProfileModal';
import { updateCourseStatus, grantExamException } from '@/app/actions/admin'; // ✅ استدعاء دالة الاستثناء

export default function StudentsTab({
    allStudents,
    pendingStudents,
    myCourses,
    searchTerm,
    onRefresh,
    isDarkMode,
    onLoadMore,
    hasMoreStudents
}) {
    // Navigation State
    const [viewMode, setViewMode] = useState('folders'); // 'folders' | 'list'
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Theme
    const theme = {
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        textMain: isDarkMode ? 'text-white' : 'text-slate-900',
        textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        hover: isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100',
    };

    // Helper: Card Styles (Consistent)
    const getCardStyle = (type) => {
        switch (type) {
            case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة' };
            case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'صيفي' };
            default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'أكاديمي' };
        }
    };

    // Filter Logic
    const getFilteredStudents = () => {
        // 1. Global Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            return allStudents.filter(s =>
                (s.name && s.name.toLowerCase().includes(lower)) ||
                (s.phone && s.phone.includes(lower))
            );
        }
        // 2. Folder Filtering
        if (!selectedCourseId) return [];

        return allStudents.filter(student =>
            student.enrolledCourses?.some(c => c.courseId === selectedCourseId && ['active', 'approved', 'banned'].includes(c.status))
        );
    };

    const displayStudents = getFilteredStudents();
    const currentCourse = myCourses.find(c => c.id === selectedCourseId);

    // Actions
    const handleCourseAction = async (studentUid, courseId, action) => {
        if (!confirm(action === 'active' ? "قبول الطالب؟" : "رفض الطلب؟")) return;
        const res = await updateCourseStatus(studentUid, courseId, action);
        if (res.success) onRefresh();
        else alert("❌ خطأ: " + res.error);
    };

    // 🔥 دالة تفعيل الاستثناء
    const handleGrantException = async (e, studentUid, courseId) => {
        e.stopPropagation(); // عشان ميففتحش البروفايل لما ندوس
        if (!confirm("هل أنت متأكد من منح هذا الطالب استثناء لدخول الامتحان؟ (سيتم تجاوز الوقت والشروط لمرة واحدة)")) return;

        const res = await grantExamException(studentUid, courseId);
        if (res.success) {
            alert(res.message);
        } else {
            alert("❌ خطأ: " + res.message);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative z-0">
            {/* ✅ Z-0 added to prevent overlay issues */}

            {/* 🚨 1. PENDING REQUESTS (Always Visible) */}
            {pendingStudents.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500 opacity-10 rounded-bl-full"></div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                        <h3 className="font-bold text-amber-800 dark:text-amber-400 text-lg">طلبات انضمام معلقة ({pendingStudents.length})</h3>
                    </div>

                    <div className="grid gap-3">
                        {pendingStudents.map(student => (
                            <div key={student.uid} className={`flex flex-wrap items-center justify-between p-4 rounded-xl border bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/50 shadow-sm`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800 text-amber-600 flex items-center justify-center font-bold text-xl">
                                        {student.name ? student.name[0] : '?'}
                                    </div>
                                    <div>
                                        <div className={`font-bold ${theme.textMain}`}>{student.name || 'غير معروف'}</div>
                                        <div className={`text-xs ${theme.textSec}`}>{student.phone}</div>
                                    </div>
                                </div>

                                {/* Pending Courses List */}
                                <div className="flex flex-col gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                                    {student.enrolledCourses.filter(c => myCourses.some(mc => mc.id === c.courseId) && c.status === 'pending').map(c => {
                                        const courseName = myCourses.find(mc => mc.id === c.courseId)?.name;
                                        return (
                                            <div key={c.courseId} className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textMain}`}>{courseName}</span>
                                                    <span className={`text-[10px] ${c.paymentMethod === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>
                                                        {c.paymentMethod === 'cash' ? '💵 فودافون كاش' : '🏢 دفع سنتر'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleCourseAction(student.uid, c.courseId, 'active')} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold transition">قبول</button>
                                                    <button onClick={() => handleCourseAction(student.uid, c.courseId, 'rejected')} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs font-bold transition">رفض</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🔍 Search Mode */}
            {searchTerm ? (
                <div>
                    <h3 className={`font-bold text-lg mb-4 ${theme.textSec}`}>نتائج البحث: "{searchTerm}"</h3>
                    <div className="grid gap-3">
                        {displayStudents.length === 0 ? <p className="text-gray-500">لا توجد نتائج.</p> :
                            displayStudents.map(student => (
                                <div key={student.uid} onClick={() => setSelectedStudent(student)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${theme.card} ${theme.hover}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center font-bold">{student.name?.[0]}</div>
                                        <div><div className={`font-bold ${theme.textMain}`}>{student.name}</div><div className={`text-xs ${theme.textSec}`}>{student.phone}</div></div>
                                    </div>
                                    <span className="text-xs text-indigo-500 font-bold">ملف الطالب ➡</span>
                                </div>
                            ))}
                        {hasMoreStudents && (
                            <button onClick={onLoadMore} className={`w-full p-3 mt-2 rounded-xl border border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition`}>
                                👇 تحميل المزيد
                            </button>
                        )}
                    </div>
                </div>
            ) : !selectedCourseId ? (

                // 2️⃣ FOLDER MODE (Course Grid)
                <div className="space-y-6">
                    <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة الطلاب والمشتركين</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myCourses.map(course => {
                            const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                            const styles = getCardStyle(type);
                            // Count active students
                            const count = allStudents.filter(s => s.enrolledCourses?.some(c => c.courseId === course.id && c.status === 'active')).length;

                            return (
                                <div key={course.id} onClick={() => { setSelectedCourseId(course.id); setViewMode('list'); }} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                    <div className="flex items-start gap-4 z-10 relative">
                                        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm">
                                            {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : '👨‍🎓'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.label}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                        {type !== 'summer' ? (
                                            <>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                                <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "شعبة عامة"}</p>
                                            </>
                                        ) : <p className="text-xs text-blue-500 font-bold">🌟 كورس عام</p>}
                                        <div className={`text-lg font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                            {count} <span className="text-[10px] font-normal text-gray-400">طالب</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            ) : (

                // 3️⃣ LIST MODE (Students inside Course)
                <div className="space-y-4 animate-scale-in">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => setSelectedCourseId(null)} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
                        <h3 className={`font-bold text-xl ${theme.textMain}`}>مشتركين: <span className="text-indigo-500">{currentCourse?.name}</span></h3>
                    </div>

                    <div className="grid gap-3">
                        {displayStudents.length === 0 ? <div className={`p-12 text-center rounded-2xl border border-dashed ${theme.textSec}`}>لا يوجد طلاب مفعلين في هذا الكورس.</div> :
                            displayStudents.map(student => {
                                const courseInfo = student.enrolledCourses.find(c => c.courseId === selectedCourseId);
                                const isBanned = courseInfo?.status === 'banned';

                                return (
                                    <div key={student.uid} onClick={() => setSelectedStudent(student)} className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${isBanned ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : `${theme.card} ${theme.hover}`}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 text-lg">
                                                    {student.name ? student.name[0] : '?'}
                                                </div>
                                                {student.isLocked && <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-white"></span>}
                                            </div>
                                            <div>
                                                <div className={`font-bold ${theme.textMain} flex items-center gap-2`}>
                                                    {student.name}
                                                    {isBanned && <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[10px]">محظور</span>}
                                                </div>
                                                <div className={`text-xs ${theme.textSec}`}>{student.phone}</div>
                                                {/* تفاصيل الطالب الدراسية */}
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 rounded text-gray-500">{student.college}</span>
                                                    <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 rounded text-gray-500">{student.section || 'عام'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 🔥 أزرار التحكم في الطالب (الاستثناء والبروفايل) */}
                                        <div className="flex items-center gap-2">
                                            {/* زرار الاستثناء الجديد */}
                                            <button
                                                onClick={(e) => handleGrantException(e, student.uid, selectedCourseId)}
                                                className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500 hover:text-white border border-yellow-500/30 transition text-xs font-bold flex items-center gap-1"
                                                title="السماح للطالب بدخول الامتحان مرة أخرى رغم انتهاء الوقت"
                                            >
                                                🔓 استثناء
                                            </button>

                                            <span className="text-xs text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-lg">إدارة ⚙️</span>
                                        </div>
                                    </div>
                                );
                            })}
                        {hasMoreStudents && (
                            <button onClick={onLoadMore} className={`w-full p-3 mt-2 rounded-xl border border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition`}>
                                👇 تحميل المزيد
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Modal */}
            {selectedStudent && (
                <StudentProfileModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onRefresh={onRefresh}
                    selectedCourseContext={selectedCourseId}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
}