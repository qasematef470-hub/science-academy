'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { updateCourse, getUniqueLectures, saveExamConfig } from '@/app/actions/admin';

export default function MaterialsTab({ myCourses, isDarkMode }) {
    const theme = {
        input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        textMain: isDarkMode ? 'text-white' : 'text-slate-900',
        textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        accentGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
    };

    // --- State ---
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savingIndex, setSavingIndex] = useState(null);
    const [configExam, setConfigExam] = useState(null);
    const [availableLectures, setAvailableLectures] = useState([]);
    const savedModulesRef = useRef([]); // نسخة من الداتابيز عشان نعرف نحفظ كل محاضرة لوحدها
    const [mounted, setMounted] = useState(false);
    const [openModules, setOpenModules] = useState([]); // Array Tracking Open Modules Indexes

    useEffect(() => {
        setMounted(true);
    }, []);

    const getCardStyle = (type) => {
        switch (type) {
            case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
            case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
            default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
        }
    };

    // Load modules when a course is selected
    useEffect(() => {
        if (!selectedCourseId) return;
        const course = myCourses.find(c => c.id === selectedCourseId);
        if (course) {
            const safeModules = course.modules?.map(mod => ({
                ...mod,
                lessons: mod.lessons?.map(les => ({
                    title: les.title || '', type: les.type || 'video', link: les.link || '',
                    description: les.description || '', duration: les.duration || '',
                    maxViews: les.maxViews || 3, examId: les.examId || '',
                    maxAttempts: les.maxAttempts || 1, passScore: les.passScore || 60,
                    allowReview: les.allowReview || false, enableCertificate: les.enableCertificate || false,
                    startDate: les.startDate || '', endDate: les.endDate || '', isFree: les.isFree || false,
                    includedLectures: les.includedLectures || [], lectureCounts: les.lectureCounts || {},
                    easyPercent: les.easyPercent || 30, mediumPercent: les.mediumPercent || 50, hardPercent: les.hardPercent || 20,
                })) || []
            })) || [];
            setModules(safeModules);
            savedModulesRef.current = JSON.parse(JSON.stringify(safeModules)); // حفظ نسخة أصلية
        }
    }, [selectedCourseId, myCourses]);

    // --- Curriculum Functions ---
    const toggleModule = (mIndex) => {
        setOpenModules(prev =>
            prev.includes(mIndex) ? prev.filter(i => i !== mIndex) : [...prev, mIndex]
        );
    };

    const addModule = () => {
        setModules(prev => [...prev, { title: `المحاضرة ${prev.length + 1}`, lessons: [] }]);
        setOpenModules(prev => [...prev, modules.length]); // افتح المحاضرة الجديدة تلقائياً
    };
    const removeModule = (mIndex) => {
        const newModules = [...modules]; newModules.splice(mIndex, 1); setModules(newModules);
    };
    const updateModuleTitle = (mIndex, title) => {
        const newModules = [...modules]; newModules[mIndex].title = title; setModules(newModules);
    };
    const addLesson = (mIndex, type) => {
        const newModules = [...modules];
        newModules[mIndex].lessons.push({
            title: '', type, link: '', description: '', duration: '', maxViews: 3,
            examId: '', maxAttempts: 1, passScore: 60, allowReview: false,
            enableCertificate: false, startDate: '', endDate: '', isFree: false,
            includedLectures: [], lectureCounts: {}, easyPercent: 30, mediumPercent: 50, hardPercent: 20,
        });
        setModules(newModules);
    };
    const removeLesson = (mIndex, lIndex) => {
        const newModules = [...modules]; newModules[mIndex].lessons.splice(lIndex, 1); setModules(newModules);
    };
    const updateLesson = (mIndex, lIndex, field, value) => {
        const newModules = [...modules]; newModules[mIndex].lessons[lIndex][field] = value; setModules(newModules);
    };
    const openExamSettings = async (mIndex, lIndex) => {
        setLoading(true);
        const res = await getUniqueLectures(selectedCourseId);
        if (res.success) setAvailableLectures(res.data);
        setConfigExam({ mIndex, lIndex, settings: modules[mIndex].lessons[lIndex] });
        setLoading(false);
    };

    // --- 🔥 Save a SINGLE module independently (بدون ما يأثر على الباقي) ---
    const handleSaveModule = async (mIndex) => {
        setSavingIndex(mIndex);
        try {
            // ناخد النسخة المحفوظة من الداتابيز ونحدث المحاضرة دي بس
            const dbModules = JSON.parse(JSON.stringify(savedModulesRef.current));
            if (mIndex < dbModules.length) {
                // تحديث محاضرة موجودة
                dbModules[mIndex] = modules[mIndex];
            } else {
                // محاضرة جديدة
                dbModules.push(modules[mIndex]);
            }
            const res = await updateCourse(selectedCourseId, { modules: dbModules });
            if (res.success) {
                savedModulesRef.current = JSON.parse(JSON.stringify(dbModules)); // نحدث النسخة
                alert(`✅ تم حفظ المحاضرة "${modules[mIndex].title}" بنجاح`);
            } else {
                alert("❌ " + res.message);
            }
        } catch (e) { alert("❌ خطأ غير متوقع"); }
        finally { setSavingIndex(null); }
    };

    // --- 🗑️ Delete a SINGLE module independently ---
    const handleDeleteModule = async (mIndex) => {
        const modName = modules[mIndex].title || `المحاضرة ${mIndex + 1}`;
        if (!confirm(`⚠️ هل أنت متأكد من حذف "${modName}" وكل محتواها؟`)) return;
        setSavingIndex(mIndex);
        try {
            // نشيل المحاضرة من النسخة المحفوظة
            const dbModules = JSON.parse(JSON.stringify(savedModulesRef.current));
            dbModules.splice(mIndex, 1);
            const res = await updateCourse(selectedCourseId, { modules: dbModules });
            if (res.success) {
                savedModulesRef.current = JSON.parse(JSON.stringify(dbModules));
                setModules(prev => prev.filter((_, i) => i !== mIndex));
                alert(`🗑️ تم حذف "${modName}"`);
            } else {
                alert("❌ " + res.message);
            }
        } catch (e) { alert("❌ خطأ غير متوقع"); }
        finally { setSavingIndex(null); }
    };

    // --- 🔥 CRITICAL: Save exam config to exam_configs collection ---
    const handleSaveExamConfig = async () => {
        const s = configExam.settings;
        const diffTotal = Number(s.easyPercent || 0) + Number(s.mediumPercent || 0) + Number(s.hardPercent || 0);
        const totalQ = Object.values(s.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0);

        if (totalQ > 0 && diffTotal !== 100) {
            alert(`⚠️ عذراً، مجموع نسب الصعوبة يجب أن يكون 100%. المجموع الحالي هو ${diffTotal}%`);
            return;
        }

        if (!s.examId) {
            alert("⚠️ يجب تعيين كود الامتحان أولاً");
            return;
        }

        setLoading(true);
        try {
            const res = await saveExamConfig(s.examId, {
                examCode: s.examId,
                examDuration: Number(s.duration) || 30,
                duration: Number(s.duration) || 30,
                passScore: Number(s.passScore) || 60,
                maxAttempts: Number(s.maxAttempts) || 1,
                allowReview: s.allowReview || false,
                enableCertificate: s.enableCertificate || false,
                startDate: s.startDate || '',
                endDate: s.endDate || '',
                includedLectures: s.includedLectures || [],
                lectureCounts: s.lectureCounts || {},
                easyPercent: Number(s.easyPercent) || 30,
                mediumPercent: Number(s.mediumPercent) || 50,
                hardPercent: Number(s.hardPercent) || 20,
                questionCount: totalQ || 20,
                courseId: selectedCourseId,
            });
            if (res.success) {
                alert("✅ " + res.message);
            } else {
                alert("❌ " + res.message);
            }
        } catch (e) {
            alert("❌ خطأ في الحفظ");
        }
        setLoading(false);
        setConfigExam(null);
    };

    // ============ RENDER: Course Grid ============
    if (!selectedCourseId) {
        return (
            <div className="space-y-6 animate-fade-in">
                <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة المحتوى (المحاضرات والدروس والامتحانات)</h2>
                <p className={`text-sm ${theme.textSec}`}>اختر كورس لبدء إدارة المنهج والمحتوى 👇</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myCourses.map(course => {
                        const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                        const styles = getCardStyle(type);
                        const moduleCount = course.modules?.length || 0;
                        const lessonCount = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
                        return (
                            <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 transition ${theme.card} ${styles.border} overflow-hidden`}>
                                <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0]}`}></div>
                                <div className="flex items-start gap-4 z-10 relative">
                                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden">
                                        {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.icon} {styles.label}</span>
                                    </div>
                                </div>
                                {/* Instructor & University Info */}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                        <span>👨‍🏫</span> {course.instructorName || "Science Academy"}
                                    </p>
                                    {course.type !== 'summer' ? (
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500 flex items-center gap-1"><span>🏛️</span> {course.university || "غير محدد"}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1"><span>🎓</span> {course.college} - {course.year}</p>
                                            <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 قسم: {course.section || "عام"}</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>
                                    )}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                                    <span className="text-xs text-gray-500">📦 {moduleCount} محاضرات</span>
                                    <span className="text-xs text-gray-500">📄 {lessonCount} دروس</span>
                                </div>
                                <div className="mt-3 text-center text-xs font-bold text-gray-400 group-hover:text-emerald-500 transition">
                                    اضغط لإدارة المنهج والمحتوى 📂
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ============ RENDER: Curriculum Builder ============
    const currentCourse = myCourses.find(c => c.id === selectedCourseId);

    return (
        <>
            <div className="animate-scale-in space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setSelectedCourseId(null)} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
                    <h2 className={`text-2xl font-bold ${theme.textMain}`}>محتوى: <span className="text-indigo-500">{currentCourse?.name}</span></h2>
                </div>

                {/* Header + Add Button */}
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">إدارة محتوى الكورس (المحاضرات والدروس)</h4>
                    <button type="button" onClick={addModule} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition">+ محاضرة جديدة</button>
                </div>

                {/* Modules List — كل محاضرة في كارد مستقل */}
                <div className="space-y-8">
                    {modules.length === 0 && <p className="text-center text-gray-500 text-sm py-4">لم يتم إضافة أي محاضرات بعد. اضغط على "محاضرة جديدة" لإضافة المحتوى.</p>}

                    {modules.map((mod, mIndex) => (
                        <div key={mIndex} className={`p-5 md:p-6 rounded-2xl border-2 shadow-lg ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'} ${savingIndex === mIndex ? 'opacity-60 pointer-events-none' : ''}`}>
                            {/* عنوان المحاضرة & زر الإغلاق/الفتح */}
                            <div className="flex items-center gap-3 mb-4">
                                <button type="button" onClick={() => toggleModule(mIndex)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors">
                                    {openModules.includes(mIndex) ? '▼' : '◄'}
                                </button>
                                <span className="text-emerald-500 font-black text-xl">#{mIndex + 1}</span>
                                <input type="text" placeholder="عنوان المحاضرة (مثال: المحاضرة الأولى)"
                                    className={`flex-1 p-2 bg-transparent border-b-2 outline-none font-bold text-lg ${isDarkMode ? 'border-slate-700 focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'}`}
                                    value={mod.title} onChange={(e) => updateModuleTitle(mIndex, e.target.value)} />
                                <span className={`text-xs px-2 py-1 rounded-full ${openModules.includes(mIndex) ? 'hidden' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                                    {mod.lessons.length} دروس
                                </span>
                            </div>

                            {/* قائمة الدروس - تظهر فقط لو البوكس مفتوح */}
                            {openModules.includes(mIndex) && (
                                <div className="space-y-3 mr-4 border-r-2 border-emerald-500/20 pr-4 animate-fade-in">
                                    {mod.lessons.map((lesson, lIdx) => (
                                        <div key={lIdx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                            {/* السطر الأول: النوع والعنوان والحذف */}
                                            <div className="flex flex-col md:flex-row gap-3 items-center">
                                                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                                                    <span className="text-lg">{lesson.type === 'video' ? '🎥' : lesson.type === 'pdf' ? '📄' : '📝'}</span>
                                                    <select className={`bg-transparent text-xs font-bold outline-none ${theme.textMain}`} value={lesson.type}
                                                        onChange={(e) => updateLesson(mIndex, lIdx, 'type', e.target.value)}>
                                                        <option value="video" className="text-black">فيديو</option>
                                                        <option value="pdf" className="text-black">ملف PDF</option>
                                                        <option value="exam" className="text-black">امتحان</option>
                                                    </select>
                                                </div>
                                                <input type="text" placeholder="عنوان الدرس" className={`flex-1 p-2 rounded-lg text-sm outline-none ${theme.input}`}
                                                    value={lesson.title} onChange={(e) => updateLesson(mIndex, lIdx, 'title', e.target.value)} />
                                                <button type="button" onClick={() => removeLesson(mIndex, lIdx)} className="text-red-400 hover:text-red-500 p-2">✕ حذف</button>
                                            </div>

                                            {/* السطر الثاني: الروابط */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {lesson.type !== 'exam' ? (
                                                    <input type="text" placeholder={lesson.type === 'video' ? "رابط الفيديو" : "رابط الملف"}
                                                        className={`p-2 rounded-lg text-xs outline-none ${theme.input} dir-ltr`}
                                                        value={lesson.link} onChange={(e) => updateLesson(mIndex, lIdx, 'link', e.target.value)} />
                                                ) : (
                                                    <input type="text" placeholder="كود الامتحان الفريد"
                                                        className="p-2 rounded-lg text-xs outline-none bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-mono text-center"
                                                        value={lesson.examId} onChange={(e) => updateLesson(mIndex, lIdx, 'examId', e.target.value)} />
                                                )}
                                                <input type="text" placeholder="وصف يظهر للطالب..."
                                                    className={`p-2 rounded-lg text-xs outline-none ${theme.input}`}
                                                    value={lesson.description} onChange={(e) => updateLesson(mIndex, lIdx, 'description', e.target.value)} />
                                            </div>

                                            {/* السطر الثالث: الإعدادات */}
                                            <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2 shrink-0 border-l border-white/10 pl-4">
                                                    <button type="button" onClick={() => updateLesson(mIndex, lIdx, 'isFree', !lesson.isFree)} className={`w-10 h-5 rounded-full relative transition-colors ${lesson.isFree ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                                                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${lesson.isFree ? 'left-6' : 'left-1'}`}></div>
                                                    </button>
                                                    <span className="text-[10px] text-gray-300 font-bold">✨ متاح مجاناً كعينة</span>
                                                </div>
                                                {lesson.type === 'video' && (
                                                    <>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                            <label>المشاهدات:</label>
                                                            <input type="number" className="w-12 p-1 rounded bg-black/30 text-center" value={lesson.maxViews} onChange={(e) => updateLesson(mIndex, lIdx, 'maxViews', e.target.value)} />
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                            <label>المدة (د):</label>
                                                            <input type="text" className="w-12 p-1 rounded bg-black/30 text-center" value={lesson.duration} onChange={(e) => updateLesson(mIndex, lIdx, 'duration', e.target.value)} />
                                                        </div>
                                                    </>
                                                )}
                                                {lesson.type === 'exam' && (
                                                    <div className="space-y-4 p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-[1.5rem]">
                                                        <div className="flex flex-col md:flex-row gap-4 items-center">
                                                            <div className="flex-1 w-full">
                                                                <label className="text-[10px] font-bold text-yellow-600 mb-1 block">كود الامتحان (Password)</label>
                                                                <input type="text" placeholder="مثال: MATH101"
                                                                    className="w-full p-3 rounded-xl text-sm font-mono font-bold outline-none bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-center"
                                                                    value={lesson.examId || ""} onChange={(e) => updateLesson(mIndex, lIdx, 'examId', e.target.value)} />
                                                            </div>
                                                            <button type="button" onClick={() => openExamSettings(mIndex, lIdx)}
                                                                className="w-full md:w-auto px-6 py-4 bg-yellow-500 text-black rounded-xl font-black text-xs hover:bg-yellow-400 transition shadow-lg shrink-0">
                                                                ⚙️ ضبط الأسئلة والوقت
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 text-[10px] font-black text-yellow-600/60 uppercase">
                                                            <span>⏱️ {lesson.duration || 0} دقيقة</span>
                                                            <span>🎯 {lesson.passScore || 0}% للنجاح</span>
                                                            <span>🔄 {lesson.maxAttempts || 0} محاولات</span>
                                                            <span>📝 {Object.values(lesson.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0)} سؤال</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* أزرار إضافة محتوى */}
                                    <div className="flex gap-2 mt-3">
                                        <button type="button" onClick={() => addLesson(mIndex, 'video')} className="px-3 py-1.5 bg-blue-600/10 text-blue-500 rounded-lg text-[10px] font-bold hover:bg-blue-600/20">+ فيديو</button>
                                        <button type="button" onClick={() => addLesson(mIndex, 'pdf')} className="px-3 py-1.5 bg-purple-600/10 text-purple-500 rounded-lg text-[10px] font-bold hover:bg-purple-600/20">+ ملف</button>
                                        <button type="button" onClick={() => addLesson(mIndex, 'exam')} className="px-3 py-1.5 bg-yellow-600/10 text-yellow-500 rounded-lg text-[10px] font-bold hover:bg-yellow-600/20">+ امتحان</button>
                                    </div>
                                </div>
                            )}

                            {/* 🔥 أزرار الحفظ والحذف لكل محاضرة على حدة تبقى ظاهرة دايماً */}
                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={() => handleDeleteModule(mIndex)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition">
                                    🗑️ حذف المحاضرة
                                </button>
                                <button onClick={() => handleSaveModule(mIndex)} disabled={savingIndex === mIndex}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${theme.accentGradient}`}>
                                    {savingIndex === mIndex ? '⏳ جاري الحفظ...' : '💾 حفظ المحاضرة'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div> {/* إغلاق animate-scale-in عشان المودال ميتحجمش بسببه */}

            {/* ============ Exam Settings Modal (Rendered via Portal to escape stacking context) ============ */}
            {configExam && mounted && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in" dir="rtl">
                    <div className={`w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl overflow-y-auto p-5 md:p-8 md:rounded-[2.5rem] border ${theme.card} shadow-2xl custom-scrollbar flex flex-col`}>
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-black text-yellow-500 flex items-center gap-2">
                                <span className="text-2xl">⚙️</span> إعدادات: <span className="text-white text-lg">{configExam.settings.title || 'امتحان جديد'}</span>
                            </h3>
                            <button onClick={() => setConfigExam(null)}
                                className="text-gray-500 hover:text-white text-2xl font-black bg-white/5 w-10 h-10 rounded-full flex items-center justify-center transition-all">✕</button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 flex-1">
                            {/* العمود الأول: التوقيت والخيارات المتقدمة */}
                            <div className="space-y-6">
                                <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4 shadow-inner">
                                    <h4 className="font-bold text-sm text-indigo-400 flex items-center gap-2"><span>⏳</span> التوقيت والمدة</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">تاريخ البدء (اختياري)</label>
                                            <input type="datetime-local" className={`w-full p-2.5 rounded-xl outline-none border text-xs ${theme.input}`} value={configExam.settings.startDate || ''} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'startDate', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">تاريخ الانتهاء (اختياري)</label>
                                            <input type="datetime-local" className={`w-full p-2.5 rounded-xl outline-none border text-xs ${theme.input}`} value={configExam.settings.endDate || ''} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'endDate', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 pt-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block truncate">المدة (د)</label>
                                            <input type="number" className={`w-full p-2 rounded-xl outline-none border text-center font-bold text-sm ${theme.input}`} value={configExam.settings.duration || 0} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'duration', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block truncate">النجاح %</label>
                                            <input type="number" className={`w-full p-2 rounded-xl outline-none border text-center font-bold text-sm ${theme.input}`} value={configExam.settings.passScore || 60} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'passScore', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block truncate">المحاولات</label>
                                            <input type="number" className={`w-full p-2 rounded-xl outline-none border text-center font-bold text-sm ${theme.input}`} value={configExam.settings.maxAttempts || 1} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'maxAttempts', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4 shadow-inner">
                                    <h4 className="font-bold text-sm text-pink-400 flex items-center gap-2"><span>✨</span> خيارات متقدمة</h4>
                                    <button type="button" onClick={() => updateLesson(configExam.mIndex, configExam.lIndex, 'allowReview', !configExam.settings.allowReview)} className="w-full flex justify-between items-center p-3 bg-black/20 hover:bg-black/30 rounded-xl transition-all">
                                        <span className="text-xs md:text-sm font-bold text-gray-300">👁️ مراجعة الإجابات بعد الحل</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${configExam.settings.allowReview ? 'bg-green-500' : 'bg-gray-600'}`}>
                                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${configExam.settings.allowReview ? 'left-6' : 'left-1'}`}></div>
                                        </div>
                                    </button>
                                    <button type="button" onClick={() => updateLesson(configExam.mIndex, configExam.lIndex, 'enableCertificate', !configExam.settings.enableCertificate)} className="w-full flex justify-between items-center p-3 bg-black/20 hover:bg-black/30 rounded-xl transition-all">
                                        <span className="text-xs md:text-sm font-bold text-gray-300">🏆 إصدار شهادة للناجحين</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${configExam.settings.enableCertificate ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${configExam.settings.enableCertificate ? 'left-6' : 'left-1'}`}></div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* العمود الثاني: الأسئلة والصعوبة */}
                            <div className="space-y-6">
                                <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col h-full max-h-[350px] shadow-inner">
                                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                        <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2"><span>📚</span> مصادر الأسئلة</h4>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-lg font-black">
                                            الإجمالي: {Object.values(configExam.settings.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0)}
                                        </span>
                                    </div>
                                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                        {availableLectures.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">لم يتم إضافة أسئلة لبنك المادة بعد.</p> : null}
                                        {availableLectures.map((lec, idx) => {
                                            const isIncluded = configExam.settings.includedLectures?.includes(lec);
                                            return (
                                                <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isIncluded ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                                                    <button type="button"
                                                        onClick={() => {
                                                            let newList = [...(configExam.settings.includedLectures || [])];
                                                            if (isIncluded) newList = newList.filter(l => l !== lec);
                                                            else newList.push(lec);
                                                            updateLesson(configExam.mIndex, configExam.lIndex, 'includedLectures', newList);
                                                        }}
                                                        className={`flex-1 text-right text-xs font-bold truncate ml-2 ${isIncluded ? 'text-white' : 'text-gray-500'}`}>
                                                        {isIncluded ? '✅' : '➕'} {lec}
                                                    </button>
                                                    {isIncluded && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className="text-[9px] text-gray-500">العدد:</span>
                                                            <input type="number" className="w-12 p-1 rounded bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 text-center text-xs font-bold outline-none"
                                                                value={configExam.settings.lectureCounts?.[lec] || 0}
                                                                onChange={(e) => {
                                                                    const newCounts = { ...(configExam.settings.lectureCounts || {}), [lec]: e.target.value };
                                                                    updateLesson(configExam.mIndex, configExam.lIndex, 'lectureCounts', newCounts);
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4 shadow-inner">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-sm text-yellow-500">📊 توزيع الصعوبة</h4>
                                        <span className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${Number(configExam.settings.easyPercent || 0) + Number(configExam.settings.mediumPercent || 0) + Number(configExam.settings.hardPercent || 0) === 100 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400 animate-pulse'}`}>
                                            المجموع: {Number(configExam.settings.easyPercent || 0) + Number(configExam.settings.mediumPercent || 0) + Number(configExam.settings.hardPercent || 0)}%
                                        </span>
                                    </div>
                                    {['easyPercent', 'mediumPercent', 'hardPercent'].map((key) => (
                                        <div key={key} className="flex items-center gap-3 bg-black/20 p-2 rounded-xl">
                                            <span className="text-[10px] w-14 text-gray-400 font-bold">{key === 'easyPercent' ? 'سهل 🟢' : key === 'mediumPercent' ? 'متوسط 🟡' : 'صعب 🔴'}</span>
                                            <input type="range" className="flex-1 accent-yellow-500 h-1 cursor-pointer" value={configExam.settings[key] || 0} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, key, e.target.value)} />
                                            <span className="text-xs font-mono w-8 text-center text-white bg-white/5 rounded px-1">{configExam.settings[key] || 0}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* زر الحفظ */}
                        <div className="mt-6 md:mt-8 pt-2 md:pt-0">
                            <button type="button" onClick={handleSaveExamConfig} disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                                {loading ? 'جاري الحفظ...' : 'تأكيد وحفظ الإعدادات 💾'}
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}