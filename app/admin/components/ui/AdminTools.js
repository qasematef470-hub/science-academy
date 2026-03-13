'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
    batchAddQuestions,
    getQuestionsForCourse,
    copyQuestionsToCourse,
    batchDeleteQuestions
} from '@/app/actions/admin';

export default function AdminTools({ myCourses, onRefresh, isDarkMode }) {
    // Navigation
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [activeTool, setActiveTool] = useState(null); // 'ai', 'json', 'copy', 'clear'
    const [loading, setLoading] = useState(false);
    const [courseFilter, setCourseFilter] = useState('all'); // الفلتر

    // Data States
    const [targetCourseForCopy, setTargetCourseForCopy] = useState('');
    const [currentQuestions, setCurrentQuestions] = useState([]);
    const [selectedQIds, setSelectedQIds] = useState([]);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedLectureFilter, setSelectedLectureFilter] = useState('');

    // Theme
    const theme = {
        input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        textMain: isDarkMode ? 'text-white' : 'text-slate-900',
        textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        accentGradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white',
    };

    // Helper: Card Styles
    const getCardStyle = (type) => {
        switch (type) {
            case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
            case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
            default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
        }
    };

    // Filter Logic
    const filteredCourses = useMemo(() => {
        if (courseFilter === 'all') return myCourses;
        return myCourses.filter(c => {
            const type = c.type || (c.isRevision ? 'revision' : 'academic');
            return type === courseFilter;
        });
    }, [myCourses, courseFilter]);

    // Fetch Questions for Current Course (عند فتح أداة النقل أو الحذف)
    useEffect(() => {
        if ((activeTool === 'copy' || activeTool === 'clear') && selectedCourseId) {
            fetchQuestions();
        }
    }, [activeTool, selectedCourseId]);

    const fetchQuestions = async () => {
        setLoading(true);
        const res = await getQuestionsForCourse(selectedCourseId);
        if (res.success) setCurrentQuestions(res.data);
        setLoading(false);
    };

    // --- Logic ---

    // 1. AI
    // استبدل دالة generatePrompt القديمة بدي:
    const generatePrompt = () => {
        const courseName = myCourses.find(c => c.id === selectedCourseId)?.name || "المادة";
        const promptText = `
    تصرف كأستاذ جامعي خبير. قم بإنشاء 5 أسئلة لمادة [${courseName}].
    
    ⚠️ تعليمات التنسيق (Format Rules):
    1. المخرج يجب أن يكون JSON Array حصراً.
    2. الأسئلة باللغة العربية.
    3. هام جداً للرياضيات والرموز: أي معادلة أو رمز انجليزي (مثل x, y, numbers) ضعه بين علامتي $$ 
       مثال: "أوجد قيمة $$x$$ في المعادلة $$x^2+5=0$$"
    4. للمواد النظرية (أحياء/نظري): اكتب السؤال نصاً عادياً بدون $$.
    5. يمكنك إضافة أسئلة مقالية بإضافة "type": "essay" (إذا لم يُذكر، الافتراضي "mcq").
       للأسئلة المقالية: "options" يكون [] و"explanation" يحتوي الحل النموذجي.

    الشكل المطلوب (JSON):
    [
      { 
        "question": "نص السؤال هنا...", 
        "options": [
          { "text": "الإجابة 1", "isCorrect": true }, 
          { "text": "الإجابة 2", "isCorrect": false }
        ], 
        "difficulty": "medium",
        "lecture": "اسم المحاضرة",
        "explanation": "القانون المستخدم هو $$F = ma$$"
      },
      {
        "question": "سؤال مقالي: أثبت أن ...",
        "type": "essay",
        "options": [],
        "difficulty": "hard",
        "lecture": "اسم المحاضرة",
        "explanation": "الحل النموذجي: ..."
      }
    ]
    `;
        navigator.clipboard.writeText(promptText);
        alert("✅ تم نسخ الأمر المطور! (يدعم MCQ + مقالي)");
    };

    // 2. JSON Upload (To Current Course)
    const handleJsonUpload = async () => {
        if (!jsonInput) return alert("أدخل كود JSON");
        setLoading(true);
        try {
            const questionsData = JSON.parse(jsonInput);
            const res = await batchAddQuestions(selectedCourseId, questionsData);
            if (res.success) {
                alert(`✅ تم إضافة ${res.count} سؤال بنجاح!`);
                setJsonInput('');
                if (onRefresh) onRefresh();
            } else { alert("❌ خطأ: " + res.message); }
        } catch (e) { alert("❌ كود JSON غير صالح."); }
        setLoading(false);
    };

    // 3. Actions (Copy/Delete)
    const executeAction = async () => {
        if (selectedQIds.length === 0) return alert("لم تختر أي أسئلة!");
        if (activeTool === 'copy' && !targetCourseForCopy) return alert("اختر المادة التي ستنقل إليها!");

        if (!confirm(activeTool === 'clear' ? "تأكيد الحذف النهائي؟" : "تأكيد النسخ؟")) return;

        setLoading(true);
        try {
            let res;
            if (activeTool === 'clear') {
                res = await batchDeleteQuestions(selectedQIds); // Delete from Current
            } else {
                res = await copyQuestionsToCourse(selectedQIds, targetCourseForCopy); // Copy Current -> Target
            }

            if (res.success) {
                alert("✅ تمت العملية بنجاح");
                if (activeTool === 'clear') fetchQuestions(); // Refresh current list
                setSelectedQIds([]);
                if (onRefresh) onRefresh();
            } else { alert("❌ خطأ: " + res.message); }
        } catch (e) { alert("خطأ غير متوقع"); }
        setLoading(false);
    };

    // Question Filters
    const uniqueLectures = useMemo(() => [...new Set(currentQuestions.map(q => q.lecture || "عام"))], [currentQuestions]);
    const displayQuestions = useMemo(() => {
        if (!selectedLectureFilter) return currentQuestions;
        return currentQuestions.filter(q => (q.lecture || "عام") === selectedLectureFilter);
    }, [currentQuestions, selectedLectureFilter]);

    const handleSelectAll = () => {
        if (selectedQIds.length === displayQuestions.length) setSelectedQIds([]);
        else setSelectedQIds(displayQuestions.map(q => q.id));
    };

    const currentCourse = myCourses.find(c => c.id === selectedCourseId);

    // ================= RENDER =================

    // 1️⃣ Grid View (Course Cards)
    if (!selectedCourseId) {
        return (
            <div className="space-y-6 animate-fade-in w-full">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className={`text-2xl font-bold ${theme.textMain}`}>⚡ بنك الأسئلة المتقدم</h2>

                    {/* 🔥 الفلتر اللي طلبته */}
                    <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        {['all', 'academic', 'revision', 'summer'].map(f => (
                            <button key={f} onClick={() => setCourseFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${courseFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                                {f === 'all' ? 'الكل' : f === 'academic' ? 'أكاديمي' : f === 'revision' ? 'مراجعة' : 'صيفي'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => {
                        const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                        const styles = getCardStyle(type);
                        return (
                            <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                                <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                <div className="flex items-start gap-4 z-10 relative">
                                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm">
                                        {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.label}</span>
                                    </div>
                                </div>

                                {/* التفاصيل الكاملة */}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                    {type !== 'summer' ? (
                                        <>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                            <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "قسم عام"}</p>
                                        </>
                                    ) : <p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 2️⃣ Tools View (Specific Course)
    return (
        <div className="animate-scale-in max-w-6xl mx-auto w-full pb-10">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => { setSelectedCourseId(null); setActiveTool(null); }} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
                <h2 className={`text-2xl font-bold ${theme.textMain}`}>أدوات: <span className="text-fuchsia-500">{currentCourse?.name}</span></h2>
            </div>

            {/* Tools Menu */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { id: 'ai', icon: '🤖', title: 'مساعد AI', desc: 'توليد أسئلة لهذه المادة', color: 'bg-purple-100 text-purple-600' },
                    { id: 'json', icon: '📄', title: 'رفع JSON', desc: 'إضافة أسئلة لهذه المادة', color: 'bg-green-100 text-green-600' },
                    { id: 'copy', icon: '📋', title: 'نسخ لغيرها', desc: 'نقل أسئلة من هنا لمادة أخرى', color: 'bg-blue-100 text-blue-600' },
                    { id: 'clear', icon: '🗑️', title: 'حذف أسئلة', desc: 'حذف أسئلة من هذه المادة', color: 'bg-red-100 text-red-600' }
                ].map(tool => (
                    <div key={tool.id} onClick={() => setActiveTool(tool.id)}
                        className={`cursor-pointer p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg
                    ${activeTool === tool.id ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20' : theme.card}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${tool.color}`}>{tool.icon}</div>
                        <h3 className={`font-bold text-lg ${theme.textMain}`}>{tool.title}</h3>
                        <p className={`text-xs ${theme.textSec} mt-1`}>{tool.desc}</p>
                    </div>
                ))}
            </div>

            {/* Active Tool Area */}
            {activeTool && (
                <div className={`p-8 rounded-3xl border shadow-lg animate-slide-up ${theme.card}`}>

                    {/* AI & JSON (Add TO Current) */}
                    {(activeTool === 'ai' || activeTool === 'json') && (
                        <div className="space-y-6">
                            <h3 className={`font-bold text-xl ${theme.textMain}`}>{activeTool === 'ai' ? '🤖 توليد أسئلة' : '📄 رفع ملف'}</h3>
                            {activeTool === 'ai' ? (
                                <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800 text-center">
                                    <p className={`mb-4 ${theme.textMain}`}>اضغط لنسخ الأمر لـ ChatGPT</p>
                                    <button onClick={generatePrompt} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg">📋 نسخ البرومبت</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className={`text-sm ${theme.textSec}`}>سيتم إضافة الأسئلة مباشرة إلى: <b>{currentCourse?.name}</b></p>
                                    <textarea className={`w-full h-60 p-4 rounded-xl border outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm dir-ltr ${theme.input}`} placeholder='Paste JSON here...' value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
                                    <button onClick={handleJsonUpload} disabled={loading} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50">{loading ? 'جاري الرفع...' : '🚀 رفع الأسئلة'}</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Copy & Delete (From Current) */}
                    {(activeTool === 'copy' || activeTool === 'clear') && (
                        <div className="space-y-6">
                            <h3 className={`font-bold text-xl ${theme.textMain}`}>{activeTool === 'copy' ? '📋 نسخ من هذه المادة' : '🗑️ حذف من هذه المادة'}</h3>

                            {/* Target Selection (Only for Copy) */}
                            {activeTool === 'copy' && (
                                <div>
                                    <label className={`block text-xs font-bold mb-2 ${theme.textSec}`}>نسخ الأسئلة المحددة إلى:</label>
                                    <select className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 ${theme.input}`} value={targetCourseForCopy} onChange={e => setTargetCourseForCopy(e.target.value)}>
                                        <option value="">-- اختر المادة الهدف --</option>
                                        {myCourses.filter(c => c.id !== selectedCourseId).map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.type || 'أكاديمي'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Questions List (From Current) */}
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${theme.input}`} value={selectedLectureFilter} onChange={(e) => { setSelectedLectureFilter(e.target.value); setSelectedQIds([]); }}>
                                        <option value="">📂 كل المحاضرات ({currentQuestions.length})</option>
                                        {uniqueLectures.map((lec, i) => <option key={i} value={lec}>{lec}</option>)}
                                    </select>
                                    <button onClick={handleSelectAll} className="text-xs text-fuchsia-500 font-bold hover:underline">
                                        {selectedQIds.length === displayQuestions.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                                    </button>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                    {loading ? <p className="text-center py-4">جاري التحميل...</p> : displayQuestions.map(q => (
                                        <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition hover:bg-white dark:hover:bg-slate-700 ${selectedQIds.includes(q.id) ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-transparent'}`}>
                                            <input type="checkbox" className="mt-1 w-4 h-4 accent-fuchsia-600" checked={selectedQIds.includes(q.id)} onChange={() => { if (selectedQIds.includes(q.id)) setSelectedQIds(selectedQIds.filter(id => id !== q.id)); else setSelectedQIds([...selectedQIds, q.id]); }} />
                                            <div className="text-xs">
                                                <span className="text-fuchsia-500 font-bold block mb-0.5">[{q.lecture || 'عام'}]</span>
                                                <span className={`${theme.textMain}`}>{q.question}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button onClick={executeAction} disabled={loading || selectedQIds.length === 0} className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${activeTool === 'copy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {loading ? 'جاري التنفيذ...' : activeTool === 'copy' ? `📋 نسخ (${selectedQIds.length}) سؤال` : `🗑️ حذف (${selectedQIds.length}) سؤال`}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}