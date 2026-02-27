'use client';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toggleExamCodeVisibility, deleteResult } from '@/app/actions/admin';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function ResultsTab({ myCourses, isDarkMode }) {
    // Navigation State
    const [viewMode, setViewMode] = useState('courses');
    const [selectedResultCourse, setSelectedResultCourse] = useState(null);
    const [selectedExamCode, setSelectedExamCode] = useState(null);

    // Data State
    const [results, setResults] = useState([]);
    const [examVisibility, setExamVisibility] = useState({});
    const [loading, setLoading] = useState(false);

    const theme = {
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        textMain: isDarkMode ? 'text-white' : 'text-slate-900',
        textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        hover: isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100',
    };

    // Helper: Card Styles
    const getCardStyle = (type) => {
        switch (type) {
            case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
            case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
            default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
        }
    };

    // Fetch All Results
    const fetchResults = async () => {
        if (!myCourses.length) return;
        setLoading(true);
        try {
            const q = query(collection(db, "results"), orderBy("startTime", "desc"));
            const snap = await getDocs(q);
            const myCourseIds = myCourses.map(c => c.id);

            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => myCourseIds.includes(r.courseId));

            setResults(data);

            // Check visibility settings (للتحكم في ظهور المراجعة للطالب)
            const uniqueCodes = [...new Set(data.map(item => item.examCode || 'General'))];
            const visibilityMap = {};
            for (const code of uniqueCodes) {
                const docSnap = await getDoc(doc(db, "exam_settings", code));
                visibilityMap[code] = docSnap.exists() ? docSnap.data().isVisible : false;
            }
            setExamVisibility(visibilityMap);

        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchResults(); }, [myCourses]);

    // Helpers
    const getResultsByCourse = (courseId) => results.filter(r => r.courseId === courseId);
    const getExamCodesForCourse = (courseId) => [...new Set(getResultsByCourse(courseId).map(r => r.examCode || 'General'))];

    const getDeviceType = (userAgent) => {
        if (!userAgent) return "❓";
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(userAgent)) return "📱 موبايل";
        return "💻 كمبيوتر";
    };

    const formatFullTime = (timestamp) => {
        if (!timestamp) return "-";
        return new Date(timestamp.seconds * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Actions
    // 1. التحكم في ظهور المراجعة للطالب
    const handleVisibilityToggle = async (e, code) => {
        e.stopPropagation();
        const newState = !examVisibility[code];
        setExamVisibility(prev => ({ ...prev, [code]: newState }));
        await toggleExamCodeVisibility(code, newState);
    };

    const handleDeleteResult = async (id) => {
        if (confirm("حذف النتيجة؟")) {
            await deleteResult(id).catch(async () => { });
            setResults(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleExportExcel = () => {
        const dataToExport = getResultsByCourse(selectedResultCourse)
            .filter(r => (r.examCode || 'General') === (selectedExamCode || 'General'))
            .map(r => ({
                "الاسم": r.studentName,
                "الكود": r.examCode || 'General',
                "المحاولة": r.attemptNumber || 1,
                "الدرجة": r.score,
                "المجموع": r.total,
                "النسبة": ((r.score / r.total) * 100).toFixed(1) + "%",
                "الوقت": r.timeTaken,
                "الحالة": r.status,
                "الجهاز": getDeviceType(r.deviceInfo),
                "التاريخ": r.startTime ? new Date(r.startTime.seconds * 1000).toLocaleDateString('ar-EG') : '-'
            }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "النتائج");
        XLSX.writeFile(wb, `Results_${selectedExamCode}.xlsx`);
    };

    // 🔥 دالة فتح ورقة الإجابة للأدمن (في صفحة جديدة عشان المعادلات تظهر صح)
    const handleAdminViewExam = (courseId, resultId) => {
        const url = `/exam/${courseId}/review/${resultId}`;
        window.open(url, '_blank'); // فتح في تبويب جديد
    };

    const currentCourse = myCourses.find(c => c.id === selectedResultCourse);

    return (
        <div className="space-y-6 animate-scale-in">
            {loading && <p className="text-center text-gray-500 py-4">⏳ جاري تحميل وفلترة النتائج...</p>}

            {/* 1️⃣ LEVEL 1: Course Grid */}
            {viewMode === 'courses' && (
                <div className="space-y-6">
                    <h2 className={`text-2xl font-bold ${theme.textMain}`}>نتائج الطلاب والامتحانات</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myCourses.map(course => {
                            const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                            const styles = getCardStyle(type);
                            const resultCount = getResultsByCourse(course.id).length;

                            return (
                                <div key={course.id} onClick={() => { setSelectedResultCourse(course.id); setViewMode('codes'); }} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                    <div className="flex items-start gap-4 z-10 relative">
                                        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm">
                                            {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : '📊'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.label}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                        {type !== 'summer' ? (
                                            <>
                                                <p className="text-[10px] text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                                <p className="text-[10px] text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                                <p className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "قسم عام"}</p>
                                            </>
                                        ) : <p className="text-xs text-blue-500 font-bold">🌟 كورس عام</p>}
                                        <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                            📝 {resultCount} امتحان تم تسليمه
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 2️⃣ LEVEL 2: Exam Codes Grid */}
            {viewMode === 'codes' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => setViewMode('courses')} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
                        <h3 className={`font-bold text-xl ${theme.textMain}`}>امتحانات: <span className="text-indigo-500">{currentCourse?.name}</span></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {getExamCodesForCourse(selectedResultCourse).map(code => {
                            const count = getResultsByCourse(selectedResultCourse).filter(r => (r.examCode || 'General') === code).length;
                            return (
                                <div key={code} onClick={() => { setSelectedExamCode(code); setViewMode('list'); }}
                                    className={`relative p-6 rounded-2xl border cursor-pointer hover:border-indigo-500 hover:shadow-lg transition ${theme.card}`}>
                                    <div className="text-3xl mb-2">🧾</div>
                                    <h4 className={`font-bold text-xl ${theme.textMain}`}>{code}</h4>
                                    <p className={`text-xs mt-2 ${theme.textSec}`}>{count} طالب</p>

                                    {/* 🔥 ده زرار التحكم في ظهور المراجعة للطلاب */}
                                    <button
                                        onClick={(e) => handleVisibilityToggle(e, code)}
                                        className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition ${examVisibility[code] ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}
                                        title={examVisibility[code] ? "المراجعة متاحة للطلاب" : "المراجعة مغلقة"}
                                    >
                                        {examVisibility[code] ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            )
                        })}
                        {getExamCodesForCourse(selectedResultCourse).length === 0 && <p className="text-gray-500 col-span-3 text-center">لا توجد امتحانات مسجلة لهذا الكورس.</p>}
                    </div>
                </div>
            )}

            {/* 3️⃣ LEVEL 3: Results Table */}
            {viewMode === 'list' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewMode('codes')} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
                            <h3 className={`font-bold text-xl ${theme.textMain}`}>نتائج الكود: <span className="bg-indigo-100 text-indigo-700 px-2 rounded">{selectedExamCode}</span></h3>
                        </div>
                        <button onClick={handleExportExcel} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 flex items-center gap-2">
                            <span>📊</span> تصدير Excel
                        </button>
                    </div>

                    <div className={`overflow-x-auto rounded-2xl border ${theme.card}`}>
                        <table className="w-full text-right min-w-[800px]">
                            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                    {['الطالب', 'المحاولة', 'التوقيت', 'الدرجة', 'الحالة', 'ورقة الإجابة', 'حذف'].map(h => <th key={h} className={`p-4 text-xs font-bold ${theme.textSec}`}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {getResultsByCourse(selectedResultCourse).filter(r => (r.examCode || 'General') === selectedExamCode).map(res => (
                                    <tr key={res.id} className={theme.hover}>
                                        <td className="p-4">
                                            <div className={`font-bold ${theme.textMain}`}>{res.studentName || 'اسم غير متوفر'}</div>
                                            <div className="text-[10px] text-gray-400">{getDeviceType(res.deviceInfo)}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${(res.attemptNumber || 1) > 1 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                المحاولة {res.attemptNumber || 1}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-xs font-mono ${theme.textSec}`}>
                                            <div>Start: {formatFullTime(res.startTime)}</div>
                                            <div>End: {formatFullTime(res.endTime || res.submittedAt)}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-black text-indigo-500 text-lg">{res.score}</span> <span className="text-gray-400 text-xs">/ {res.total}</span>
                                            <div className="text-[10px] text-gray-400">⏱ {res.timeTaken}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${res.status?.includes('غش') ? 'bg-red-50 text-red-600 border-red-200' :
                                                res.status?.includes('Running') ? 'bg-yellow-50 text-yellow-600 border-yellow-200 animate-pulse' :
                                                    'bg-green-50 text-green-600 border-green-200'
                                                }`}>
                                                {res.status}
                                            </span>
                                        </td>

                                        {/* 🔥 زرار فتح ورقة الإجابة للأدمن (هيفتح صفحة تانية) */}
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleAdminViewExam(res.courseId, res.id)}
                                                className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white transition text-xs font-bold flex items-center gap-1"
                                                title="عرض ورقة الإجابة بتنسيق المعادلات"
                                            >
                                                📄 عرض الورقة
                                            </button>
                                        </td>

                                        <td className="p-4"><button onClick={() => handleDeleteResult(res.id)} className="text-gray-400 hover:text-red-500 text-xl transition">×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* إضافة تنويه صغير للموبايل */}
                    <p className="md:hidden text-center text-[10px] text-gray-400 mt-2">اسحب الجدول يميناً ويساراً لرؤية باقي التفاصيل ↔️</p>
                </div>
            )}
        </div>
    );
}