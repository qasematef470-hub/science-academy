'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
// 5. Removed server-side stats fetch import per requirements
// 👇 1. استدعاء المكون الخارجي (اللي احنا عدلناه وخليناه عريض)
import QuestionPreview from '../ui/QuestionPreview';
// 👇 2. استدعاء الماث تيكست (عشان القائمة اللي تحت)
import MathText from '@/app/components/ui/MathText';

export default function QuestionsTab({
    myCourses,
    questionsList,
    selectedCourseForQ,
    setSelectedCourseForQ,
    fetchQuestions,
    isDarkMode
}) {
    // State
    const [questionText, setQuestionText] = useState('');
    const [qImage, setQImage] = useState('');
    const [qDifficulty, setQDifficulty] = useState('medium');
    const [qLecture, setQLecture] = useState('');
    const [qExplanation, setQExplanation] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(null);
    const [selectedLectureView, setSelectedLectureView] = useState(null);
    const [courseFilter, setCourseFilter] = useState('all');
    const [previewIndex, setPreviewIndex] = useState(0);
    const [folderQuestions, setFolderQuestions] = useState([]);
    const [loadingFolder, setLoadingFolder] = useState(false);
    const [questionType, setQuestionType] = useState('mcq');

    const [options, setOptions] = useState([
        { text: "", isCorrect: true }, { text: "", isCorrect: false },
        { text: "", isCorrect: false }, { text: "", isCorrect: false }
    ]);

    // Dynamic Stats Logic
    const displayedQuestions = useMemo(() => {
        if (!selectedLectureView) return questionsList;
        return folderQuestions;
    }, [questionsList, selectedLectureView, folderQuestions]);

    // Questions shown in the preview paginator (same as displayedQuestions when a folder is open)
    const filteredQuestions = displayedQuestions;

    // Reset preview index when the list changes
    useEffect(() => {
        setPreviewIndex(0);
    }, [filteredQuestions.length, selectedLectureView]);

    const stats = useMemo(() => {
        return displayedQuestions.reduce((acc, q) => {
            acc.total++;
            const diff = q.difficulty || 'medium';
            if (acc[diff] !== undefined) acc[diff]++;
            return acc;
        }, { total: 0, easy: 0, medium: 0, hard: 0 });
    }, [displayedQuestions]);

    useEffect(() => {
        if (selectedLectureView) setQLecture(selectedLectureView);
    }, [selectedLectureView]);

    useEffect(() => {
        if (selectedLectureView) setQLecture(selectedLectureView);
    }, [selectedLectureView]);

    // Theme Styles
    const theme = {
        input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        textMain: isDarkMode ? 'text-white' : 'text-slate-900',
        textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        accentGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
    };

    // Logic Helpers
    const getCardStyle = (type) => {
        switch (type) {
            case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
            case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
            default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
        }
    };

    const filteredCourses = useMemo(() => {
        if (courseFilter === 'all') return myCourses;
        return myCourses.filter(c => {
            const type = c.type || (c.isRevision ? 'revision' : 'academic');
            return type === courseFilter;
        });
    }, [myCourses, courseFilter]);

    const handleCourseSelect = (courseId) => {
        setSelectedCourseForQ(courseId);
        fetchQuestions(courseId);
        setSelectedLectureView(null);
        setQLecture('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFolderSelect = async (name) => {
        setSelectedLectureView(name);
        setLoadingFolder(true);
        try {
            const qName = name === "أسئلة عامة" ? "" : name;
            let q;
            if (qName === "") {
                q = query(collection(db, 'questions_bank'), where('courseId', '==', selectedCourseForQ), limit(50));
            } else {
                q = query(collection(db, 'questions_bank'), where('courseId', '==', selectedCourseForQ), where('lecture', '==', name), limit(100));
            }
            const snapshot = await getDocs(q);
            setFolderQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
            console.error(e);
            alert("خطأ في تحميل الأسئلة");
        }
        setLoadingFolder(false);
    };

    const handleBackToGrid = () => {
        setSelectedCourseForQ(null);
        setQuestionText("");
        setQImage("");
        setQExplanation("");
    };

    // CRUD Operations
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", file);
        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e`, { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) { setQImage(data.data.url); alert("✅ الصورة جاهزة"); }
        } catch (e) { alert("فشل الرفع"); }
        finally { setUploadingImage(false); }
    };

    const handleSaveQuestion = async (e) => {
        e.preventDefault();
        if (!selectedCourseForQ) return alert("اختر المادة");
        if (!qLecture.trim()) return alert("⚠️ اسم المحاضرة مطلوب");
        if (isSaving) return;

        setIsSaving(true);
        try {
            const qData = {
                courseId: selectedCourseForQ,
                question: questionText,
                image: qImage,
                difficulty: qDifficulty,
                options: questionType === 'essay' ? [] : options,
                type: questionType,
                lecture: qLecture,
                explanation: qExplanation,
                createdAt: serverTimestamp()
            };

            if (editMode) {
                await setDoc(doc(db, "questions_bank", editMode), qData, { merge: true });
                setEditMode(null);
                alert("✅ تم التعديل");
            } else {
                await addDoc(collection(db, "questions_bank"), qData);
            }

            setQuestionText("");
            setQImage("");
            setQExplanation("");
            setQuestionType('mcq');
            setOptions([{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);
            fetchQuestions(selectedCourseForQ);
            if (selectedLectureView) handleFolderSelect(selectedLectureView);
            // Stats update automatically via useMemo
        } catch (e) { alert("خطأ في الحفظ"); console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleDeleteQuestion = async (id) => {
        if (confirm("حذف؟")) {
            await deleteDoc(doc(db, "questions_bank", id));
            fetchQuestions(selectedCourseForQ);
            if (selectedLectureView) handleFolderSelect(selectedLectureView);
            // Stats update automatically via useMemo
        }
    };

    const handleEditClick = (q) => {
        setEditMode(q.id);
        setQuestionText(q.question);
        setQImage(q.image || "");
        setQDifficulty(q.difficulty || 'medium');
        setQLecture(q.lecture || "");
        setQExplanation(q.explanation || "");
        setQuestionType(q.type || 'mcq');
        setOptions(q.options?.length ? q.options : [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ================= RENDER =================

    if (!selectedCourseForQ) {
        // (نفس كود عرض الكورسات السابق بدون تغيير)
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className={`text-2xl font-bold ${theme.textMain}`}>بنك الأسئلة والامتحانات</h2>
                    <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        {['all', 'academic', 'revision', 'summer'].map(f => (
                            <button key={f} onClick={() => setCourseFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${courseFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                                {f === 'all' ? 'الكل' : f === 'academic' ? 'أكاديمي' : f === 'revision' ? 'مراجعة' : 'صيفي'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.length === 0 ? <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${theme.textSec}`}>لا توجد كورسات.</div> :
                        filteredCourses.map(course => {
                            const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                            const styles = getCardStyle(type);
                            return (
                                <div key={course.id} onClick={() => handleCourseSelect(course.id)} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                    <div className="flex items-start gap-4 z-10 relative">
                                        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden">
                                            {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover" /> : styles.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                            <div className="mt-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${styles.badge}`}>{styles.label}</span></div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                        {type !== 'summer' ? (
                                            <>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                                <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "عام"}</p>
                                            </>
                                        ) : (<p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>)}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        );
    }

    // 2️⃣ Question Manager (Form & List)
    const currentCourse = myCourses.find(c => c.id === selectedCourseForQ);

    return (
        <div className="flex flex-col gap-8 animate-scale-in">
            <div className="flex items-center gap-4 border-b pb-4 border-gray-200 dark:border-gray-700">
                <button onClick={handleBackToGrid} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸</button>
                <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة: <span className="text-indigo-500">{currentCourse?.name}</span></h2>
            </div>

            {/* 📊 Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-blue-900/10 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                    <div className={`p-3 rounded-xl text-2xl ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>📊</div>
                    <div>
                        <h4 className="text-xs font-bold opacity-70 mb-1">إجمالي الأسئلة</h4>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-emerald-900/10 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                    <div className={`p-3 rounded-xl text-2xl ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'}`}>🟢</div>
                    <div>
                        <h4 className="text-xs font-bold opacity-70 mb-1">سهل</h4>
                        <p className="text-2xl font-bold">{stats.easy}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-yellow-900/10 border-yellow-800 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-600'}`}>
                    <div className={`p-3 rounded-xl text-2xl ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-100'}`}>🟡</div>
                    <div>
                        <h4 className="text-xs font-bold opacity-70 mb-1">متوسط</h4>
                        <p className="text-2xl font-bold">{stats.medium}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-red-900/10 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    <div className={`p-3 rounded-xl text-2xl ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100'}`}>🔴</div>
                    <div>
                        <h4 className="text-xs font-bold opacity-70 mb-1">صعب</h4>
                        <p className="text-2xl font-bold">{stats.hard}</p>
                    </div>
                </div>
            </div>

            {/* 🟢 Form Section */}
            <div className={`p-4 md:p-8 rounded-3xl border shadow-lg ${theme.card}`}>
                <h3 className={`font-bold text-xl mb-6 flex items-center gap-2 ${theme.textMain}`}>
                    <span className="text-2xl">{editMode ? '✏️' : '✨'}</span> {editMode ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
                </h3>

                <form onSubmit={handleSaveQuestion} className="flex flex-col gap-6">

                    {/* 1. Image */}
                    <div className="w-full">
                        <input type="file" id="qImg" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <label htmlFor="qImg" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl transition cursor-pointer ${qImage ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                            {uploadingImage ? <span className="text-xs font-bold animate-pulse">⏳ جاري الرفع...</span> : qImage ? <div className="flex items-center gap-2"><span className="text-2xl">🖼️</span><span className="text-sm font-bold text-green-600">تم الرفع</span></div> : <div className="flex items-center gap-2 opacity-60"><span className="text-2xl">📷</span><span className="text-sm font-bold">إرفاق صورة (اختياري)</span></div>}
                        </label>
                    </div>

                    {/* 2. Text */}
                    <div className="w-full">
                        <textarea
                            placeholder="اكتب نص السؤال هنا... استخدم $$ للمعادلات"
                            className={`w-full p-5 rounded-2xl h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition text-base font-medium ${theme.input}`}
                            value={questionText}
                            onChange={e => setQuestionText(e.target.value)}
                            required
                        />
                    </div>

                    {/* 2.5 Question Type Toggle */}
                    <div className="w-full">
                        <label className={`block text-xs font-bold mb-2 ${theme.textSec}`}>نوع السؤال</label>
                        <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
                            <button type="button" onClick={() => setQuestionType('mcq')} className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${questionType === 'mcq' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>اختياري (MCQ)</button>
                            <button type="button" onClick={() => setQuestionType('essay')} className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${questionType === 'essay' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>مقالي (صورة) ✍️</button>
                        </div>
                    </div>

                    {/* 3. Options — hidden for essay */}
                    {questionType === 'mcq' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <span className="absolute -top-2.5 right-3 px-2 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 z-10">الإجابة الصحيحة</span>
                                <input className={`w-full p-4 rounded-xl border-2 border-green-500/50 focus:border-green-500 outline-none transition font-bold ${isDarkMode ? 'bg-green-900/10 text-white' : 'bg-green-50 text-gray-900'}`} placeholder="الإجابة الصحيحة" value={options[0].text} onChange={(e) => { const ops = [...options]; ops[0].text = e.target.value; setOptions(ops); }} required />
                            </div>
                            {[1, 2, 3].map(i => (
                                <input key={i} className={`w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-red-400 transition ${theme.input}`} placeholder={`اختيار خاطئ ${i}`} value={options[i].text} onChange={(e) => { const ops = [...options]; ops[i].text = e.target.value; setOptions(ops); }} required />
                            ))}
                        </div>
                    )}

                    {questionType === 'essay' && (
                        <div className={`p-4 rounded-xl border-2 border-dashed text-center text-sm font-bold ${isDarkMode ? 'border-amber-500/30 bg-amber-900/10 text-amber-400' : 'border-amber-400 bg-amber-50 text-amber-700'}`}>
                            ✍️ سؤال مقالي — الطالب سيرفع صورة إجابته. اكتب الحل النموذجي في خانة "تفسير الحل" أدناه.
                        </div>
                    )}

                    {/* 3.5 Explanation (تفسير الحل) */}
                    <div className="w-full">
                        <textarea
                            placeholder="تفسير الحل (اختياري) - سيظهر للطالب بعد الإجابة أو عند طلب المساعدة"
                            className={`w-full p-5 rounded-2xl h-24 resize-none outline-none focus:ring-2 focus:ring-amber-500 transition text-sm font-medium border-2 border-amber-500/30 dark:focus:ring-amber-500 ${theme.input} `}
                            value={qExplanation}
                            onChange={e => setQExplanation(e.target.value)}
                        />
                    </div>

                    {/* 4. Tools */}
                    {/* 🔥🔥 التعديل: flex-col للموبايل و md:flex-row للشاشات الأكبر */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="flex-1 relative">
                            <span className="absolute top-3.5 left-3 opacity-50">🏷️</span>
                            <input type="text" placeholder="اسم المحاضرة" className={`w-full h-full p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold ${theme.input} ${!qLecture ? 'border-red-300' : ''}`} value={qLecture} onChange={e => setQLecture(e.target.value)} required />
                        </div>
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl min-w-[200px]">
                            {['easy', 'medium', 'hard'].map(lvl => (
                                <button key={lvl} type="button" onClick={() => setQDifficulty(lvl)} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${qDifficulty === lvl ? (lvl === 'easy' ? 'bg-green-500 text-white' : lvl === 'medium' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'text-gray-500'}`}>
                                    {lvl === 'easy' ? 'سهل' : lvl === 'medium' ? 'متوسط' : 'صعب'}
                                </button>
                            ))}
                        </div>
                        <button type="submit" disabled={uploadingImage || isSaving} className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform min-w-[150px] ${theme.accentGradient} disabled:opacity-50`}>
                            {isSaving ? '⏳...' : editMode ? '💾 حفظ' : '➕ إضافة'}
                        </button>
                        {editMode && <button type="button" onClick={() => { setEditMode(null); setQuestionText(""); setQImage(""); }} className="px-4 text-xs text-red-500 underline whitespace-nowrap self-center">إلغاء</button>}
                    </div>

                    {/* 5. Preview Section — Interactive Slider (Updated) */}
                    {(() => {
                        const isLiveDraft = !!(questionText || qImage);
                        const hasQuestions = filteredQuestions.length > 0;

                        if (!isLiveDraft && !hasQuestions) return null;

                        const safeIndex = Math.min(previewIndex, filteredQuestions.length - 1);
                        const previewQ = !isLiveDraft ? filteredQuestions[safeIndex] : null;

                        // دالة لتنظيف الفورم عند التقليب
                        const clearAndMove = (direction) => {
                            setEditMode(null);
                            setQuestionText("");
                            setQImage("");
                            setQExplanation("");
                            setQuestionType('mcq');
                            setOptions([{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);

                            if (direction === 'prev') setPreviewIndex(i => Math.max(0, i - 1));
                            if (direction === 'next') setPreviewIndex(i => Math.min(filteredQuestions.length - 1, i + 1));
                        };

                        return (
                            <div className="mt-6 relative group">
                                {/* Header Title */}
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <p className="text-sm font-black text-indigo-500 flex items-center gap-2 uppercase tracking-wider">
                                        {isLiveDraft ? '✨ مسودة حية (وضع التعديل)' : '👁️ معاينة شكل السؤال للطالب'}
                                    </p>
                                    {!isLiveDraft && previewQ && (
                                        <button
                                            type="button"
                                            onClick={() => handleEditClick(previewQ)}
                                            className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20"
                                        >
                                            <span>✏️</span> تعديل هذا السؤال
                                        </button>
                                    )}
                                </div>

                                {/* The Card Container */}
                                <div className={`relative p-8 md:p-12 rounded-[2.5rem] border overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#0f121a] border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-gray-100 shadow-xl'}`}>

                                    {/* Navigation Arrows (تظهر دائماً الآن حتى عند التعديل) */}
                                    {hasQuestions && (
                                        <>
                                            {/* زر السابق (يمين) */}
                                            <button
                                                type="button"
                                                onClick={() => clearAndMove('prev')}
                                                disabled={safeIndex === 0}
                                                className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${safeIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-black/20 hover:bg-indigo-600 text-white backdrop-blur-sm shadow-lg hover:scale-110'}`}
                                            >
                                                ➜
                                            </button>

                                            {/* زر التالي (يسار) */}
                                            <button
                                                type="button"
                                                onClick={() => clearAndMove('next')}
                                                disabled={safeIndex === filteredQuestions.length - 1}
                                                className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${safeIndex === filteredQuestions.length - 1 ? 'opacity-0 pointer-events-none' : 'bg-black/20 hover:bg-indigo-600 text-white backdrop-blur-sm shadow-lg hover:scale-110'}`}
                                            >
                                                ←
                                            </button>
                                        </>
                                    )}

                                    {/* Question Counter Badge */}
                                    {hasQuestions && (
                                        <div className="absolute top-6 left-6 z-10">
                                            <span className="bg-black/30 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/10">
                                                {safeIndex + 1} / {filteredQuestions.length}
                                            </span>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="w-full max-w-3xl mx-auto">
                                        {isLiveDraft ? (
                                            <QuestionPreview
                                                question={questionText}
                                                options={options}
                                                image={qImage}
                                                difficulty={qDifficulty}
                                                explanation={qExplanation}
                                            />
                                        ) : previewQ ? (
                                            <QuestionPreview
                                                question={previewQ.question}
                                                options={previewQ.options}
                                                image={previewQ.image || ''}
                                                difficulty={previewQ.difficulty || 'medium'}
                                                explanation={previewQ.explanation || ''}
                                                key={previewQ.id} // مفتاح لإعادة تشغيل الأنيميشن
                                            />
                                        ) : null}
                                    </div>

                                </div>
                            </div>
                        );
                    })()}
                </form>
            </div>

            {/* 🔵 Bottom: Folders List */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* (نفس كود القائمة اللي تحت بدون تغيير) */}
                <div className="flex justify-between items-center px-2">
                    <h3 className={`font-bold text-lg ${theme.textMain}`}>
                        {selectedLectureView ? `📂 ${selectedLectureView}` : `📚 أرشيف الأسئلة (${questionsList.length})`}
                    </h3>
                    {selectedLectureView && <button onClick={() => setSelectedLectureView(null)} className="text-indigo-500 font-bold text-sm hover:underline">عرض المجلدات</button>}
                </div>

                {!selectedLectureView ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Object.entries(questionsList.reduce((groups, q) => {
                            const key = (q.lecture || "أسئلة عامة").trim();
                            if (!groups[key]) groups[key] = 0;
                            groups[key]++;
                            return groups;
                        }, {})).map(([name, count], idx) => (
                            <div key={idx} onClick={() => handleFolderSelect(name)} className={`p-4 rounded-2xl border cursor-pointer hover:border-indigo-500 transition group flex flex-col items-center justify-center gap-2 text-center ${theme.card}`}>
                                <div className="text-3xl">📁</div>
                                <div>
                                    <h4 className={`font-bold text-sm ${theme.textMain} truncate max-w-[120px]`}>{name}</h4>
                                    <p className={`text-[10px] ${theme.textSec}`}>{count} سؤال</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : loadingFolder ? (
                    <div className="flex justify-center p-8">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedQuestions.map((q, idx) => {
                            const diffColor = q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border-rose-200';

                            const borderColor = q.difficulty === 'easy' ? 'border-emerald-500'
                                : q.difficulty === 'medium' ? 'border-amber-500'
                                    : 'border-rose-500';

                            return (
                                <div key={q.id} className={`group relative rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden flex flex-col ${theme.card}`}>
                                    {/* Header */}
                                    <div className={`px-5 py-3 border-b flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                                #{idx + 1}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${diffColor}`}>
                                                {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                                            </span>
                                        </div>
                                        {/* Actions in Header (Optional, or keep in Footer) - keeping in Footer for clean look */}
                                    </div>

                                    {/* Body */}
                                    <div className="p-5 flex-1 select-text">
                                        <div className="flex items-start gap-4">
                                            {q.image && (
                                                <div className="shrink-0">
                                                    <img
                                                        src={q.image}
                                                        alt="Q"
                                                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm"
                                                    />
                                                </div>
                                            )}
                                            <div className={`font-medium text-sm leading-relaxed ${theme.textMain} line-clamp-3`}>
                                                <MathText text={q.question} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className={`px-5 py-3 border-t bg-gray-50/30 dark:bg-gray-800/30 flex justify-end gap-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <button
                                            onClick={() => handleEditClick(q)}
                                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                            title="تعديل"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuestion(q.id)}
                                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                                            title="حذف"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Difficulty Border Indicator */}
                                    <div className={`absolute bottom-0 left-0 w-full h-1 ${borderColor.replace('border-', 'bg-')}`}></div>
                                </div>
                            );
                        })}
                    </div>

                )}
            </div>
        </div>
    );
}