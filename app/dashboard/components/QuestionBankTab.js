'use client';
import React, { useState, useMemo, useEffect } from 'react';
import MathText from '@/app/components/ui/MathText';
import { getStudentQuestions } from '@/app/actions/student';

export default function QuestionBankTab({ myCourses, isDark }) {
    // Selection States
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedLecture, setSelectedLecture] = useState('');

    // Data States
    const [allQuestions, setAllQuestions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Swiper States
    const [currentIndex, setCurrentIndex] = useState(0);
    const [shuffledOptions, setShuffledOptions] = useState([]);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
    const [showHint, setShowHint] = useState(false);

    // 1. Theme Configuration
    const theme = {
        card: isDark ? 'bg-[#0f121a] border-white/5' : 'bg-white border-gray-100 ring-1 ring-gray-100',
        textMain: isDark ? 'text-white' : 'text-slate-900',
        textSec: isDark ? 'text-gray-500' : 'text-gray-500',
        selectBg: isDark ? 'bg-[#151820] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
    };

    // 2. Data Fetching
    const fetchQuestions = async (courseId) => {
        setLoading(true);
        const res = await getStudentQuestions(courseId);
        if (res.success) {
            setAllQuestions(res.data);
        } else {
            alert('❌ فشل في جلب الأسئلة.');
        }
        setLoading(false);
    };

    const handleCourseSelect = (e) => {
        const cId = e.target.value;
        setSelectedCourseId(cId);
        setSelectedLecture('');
        setAllQuestions([]);
        setCurrentIndex(0);
        if (cId) fetchQuestions(cId);
    };

    // 3. Computed Data
    const uniqueLectures = useMemo(() => {
        const raw = allQuestions.map(q => q.lecture || "أسئلة عامة");
        return [...new Set(raw)];
    }, [allQuestions]);

    const displayQuestions = useMemo(() => {
        if (!selectedLecture) return [];
        return allQuestions.filter(q => (q.lecture || "أسئلة عامة") === selectedLecture);
    }, [allQuestions, selectedLecture]);

    const currentQ = displayQuestions[currentIndex];

    // 4. Shuffling & Resetting Question State
    useEffect(() => {
        if (currentQ) {
            if (!currentQ.type || currentQ.type === 'mcq') {
                // Shuffle options for MCQ only
                const shuffled = [...currentQ.options]
                    .map((value) => ({ value, sort: Math.random() }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ value }) => value);
                setShuffledOptions(shuffled);
            } else {
                setShuffledOptions([]);
            }
            setHasAnswered(false);
            setSelectedOptionIndex(null);
            setShowHint(false);
        }
    }, [currentQ]);

    // 5. Handlers
    const handleOptionClick = (idx, isCorrect) => {
        if (hasAnswered) return;
        setSelectedOptionIndex(idx);
        setHasAnswered(true);
        setShowHint(true); // Auto expand hint
    };

    const goNext = () => {
        if (currentIndex < displayQuestions.length - 1) {
            setCurrentIndex(i => i + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
        }
    };

    // ================= RENDER =================

    // A. Selection View
    if (!selectedLecture) {
        return (
            <div className="space-y-8 animate-fade-in w-full max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-500/10 text-4xl mb-6 shadow-xl shadow-blue-500/5 border border-blue-500/20">🧠</div>
                    <h2 className={`text-4xl font-black mb-4 ${theme.textMain}`}>بنك الأسئلة التفاعلي</h2>
                    <p className={`text-lg font-bold ${theme.textSec}`}>اختر المادة والمحاضرة للبدء في التدريب المجاني وتقييم مستواك.</p>
                </div>

                <div className={`p-8 md:p-10 rounded-[2.5rem] border shadow-2xl ${theme.card}`}>
                    <div className="space-y-6">
                        {/* Course Select */}
                        <div>
                            <label className={`block text-sm font-black mb-3 ${theme.textSec} uppercase tracking-widest`}>1. اختر المادة التعليمية</label>
                            <select
                                value={selectedCourseId}
                                onChange={handleCourseSelect}
                                className={`w-full p-5 rounded-2xl border outline-none font-bold text-lg focus:ring-2 focus:ring-blue-500 transition-all ${theme.selectBg}`}
                            >
                                <option value="">-- اختر من موادك المشترك بها --</option>
                                {myCourses.map(c => (
                                    <option key={c.courseId} value={c.courseId}>{c.courseName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Lecture Select */}
                        {selectedCourseId && (
                            <div className="animate-slide-up">
                                <label className={`block text-sm font-black mb-3 ${theme.textSec} uppercase tracking-widest mt-8`}>2. اختر القسم / المحاضرة</label>
                                {loading ? (
                                    <div className="p-8 text-center bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                        <p className="font-bold text-blue-500 animate-pulse">جاري جلب الأسئلة...</p>
                                    </div>
                                ) : uniqueLectures.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {uniqueLectures.map(lec => {
                                            const questionCount = allQuestions.filter(q => (q.lecture || 'أسئلة عامة') === lec).length;
                                            return (
                                                <button
                                                    key={lec}
                                                    onClick={() => setSelectedLecture(lec)}
                                                    className={`p-5 rounded-2xl border transition-all text-right flex justify-between items-center group
                                                    ${isDark ? 'bg-white/5 border-white/5 hover:border-blue-500 hover:bg-blue-500/10' : 'bg-gray-50 border-gray-200 hover:border-blue-500 hover:bg-blue-50'}`}
                                                >
                                                    <span className={`font-bold text-lg transition-colors group-hover:text-blue-500 ${theme.textMain}`}>{lec}</span>
                                                    <span className="bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-xs font-black shadow-sm">{questionCount} سؤال</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-rose-500/5 rounded-2xl border border-rose-500/10">
                                        <p className="font-bold text-rose-500">لا توجد أسئلة مضافة لهذه المادة بعد.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // B. Loading / Empty Swiper State
    if (!currentQ) return <div className="text-center p-20 animate-pulse font-bold text-gray-500">جاري التجهيز...</div>;

    // C. Swiper View
    return (
        <div className="animate-scale-in w-full max-w-5xl mx-auto pb-20">
            {/* Header / Info bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <button
                    onClick={() => { setSelectedLecture(''); setCurrentIndex(0); }}
                    className={`px-6 py-3 rounded-xl border font-bold transition-all shadow-sm hover:scale-105 ${theme.card} ${theme.textSec}`}
                >
                    🡸 العودة للمحاضرات
                </button>
                <div className="flex items-center gap-3">
                    <span className="bg-blue-600 font-bold px-4 py-2 rounded-xl text-xs text-white shadow-lg tracking-widest">{selectedLecture}</span>
                    <span className={`px-4 py-2 rounded-xl border font-black text-sm ${theme.card} ${theme.textMain}`}>
                        سؤال {currentIndex + 1} من {displayQuestions.length}
                    </span>
                </div>
            </div>

            {/* Main Question Card */}
            <div className={`relative p-8 md:p-14 lg:p-16 rounded-[3rem] border shadow-2xl overflow-hidden min-h-[500px] flex flex-col ${theme.card}`}>
                {/* Background flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-bl-full blur-3xl pointer-events-none"></div>

                {/* Difficulty Indicator */}
                <div className="absolute top-0 inset-x-0 flex justify-center">
                    <div className={`h-1.5 w-1/3 rounded-b-xl opacity-80 ${currentQ.difficulty === 'easy' ? 'bg-emerald-500' : currentQ.difficulty === 'hard' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                </div>

                <div className="flex-1 flex flex-col">
                    {/* Image */}
                    {currentQ.image && (
                        <div className="mb-8 flex justify-center">
                            <img src={currentQ.image} alt="Question" className="max-h-72 object-contain rounded-2xl shadow-lg border border-white/10 p-1 bg-white/5" />
                        </div>
                    )}

                    {/* Question Text */}
                    <div className={`text-2xl md:text-4xl font-black leading-snug dir-auto mb-12 text-center select-text ${theme.textMain}`}>
                        <MathText text={currentQ.question} />
                    </div>

                    {/* Options Grid — MCQ only */}
                    {(!currentQ.type || currentQ.type === 'mcq') ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto z-10">
                            {shuffledOptions.map((opt, idx) => {
                                // Logic for coloring options
                                let optClasses = `relative p-6 rounded-2xl border-2 font-bold text-lg md:text-xl transition-all duration-300 min-h-[90px] flex items-center justify-center text-center cursor-pointer select-none `;

                                if (hasAnswered) {
                                    // Answered State
                                    if (opt.isCorrect) {
                                        // Highlight correct always when answered
                                        optClasses += `bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] `;
                                    } else if (idx === selectedOptionIndex) {
                                        // Highlight incorrect if it was the one selected
                                        optClasses += `bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)] `;
                                    } else {
                                        // Dim other wrong options
                                        optClasses += `bg-transparent border-white/5 text-gray-500 opacity-50 cursor-not-allowed `;
                                    }
                                } else {
                                    // Default State
                                    optClasses += isDark
                                        ? `bg-[#151820] border-white/10 hover:border-blue-500 hover:bg-blue-500/5 text-gray-300 hover:text-white shadow-lg`
                                        : `bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 shadow-sm`;
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionClick(idx, opt.isCorrect)}
                                        disabled={hasAnswered}
                                        className={optClasses}
                                    >
                                        <div className="pointer-events-none p-1">
                                            <MathText text={opt.text} />
                                        </div>

                                        {/* Feedback Icons */}
                                        {hasAnswered && opt.isCorrect && (
                                            <span className="absolute top-3 right-4 text-2xl animate-bounce">✅</span>
                                        )}
                                        {hasAnswered && !opt.isCorrect && idx === selectedOptionIndex && (
                                            <span className="absolute top-3 right-4 text-2xl animate-shake">❌</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Essay Question — Show Model Answer Button */
                        <div className="mt-auto z-10 space-y-6">
                            <div className={`p-6 rounded-2xl border-2 border-dashed text-center ${isDark ? 'border-amber-500/30 bg-amber-900/10' : 'border-amber-400 bg-amber-50'}`}>
                                <p className={`text-lg font-black mb-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>✍️ سؤال مقالي</p>
                                <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>هذا السؤال يتطلب إجابة كتابية أو بالصورة. اطلع على الحل النموذجي للتعلم.</p>
                            </div>
                            <button
                                onClick={() => setShowHint(!showHint)}
                                className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${showHint
                                    ? (isDark ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-2 border-amber-300')
                                    : (isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_10px_40px_rgba(37,99,235,0.3)]' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg')}`}
                            >
                                <span className="text-xl">💡</span>
                                {showHint ? 'إخفاء الحل النموذجي' : 'إظهار الحل النموذجي 💡'}
                            </button>
                        </div>
                    )}

                    {/* Hint Section (Expandable) — used for both MCQ explanation and Essay model answer */}
                    {(hasAnswered || (currentQ.type === 'essay' && showHint)) && (
                        <div className="mt-8 animate-slide-up">
                            {(!currentQ.type || currentQ.type === 'mcq') && (
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className={`flex items-center gap-2 mx-auto font-bold text-sm transition-colors py-2 px-6 rounded-full border ${showHint ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-white/5 text-gray-400 hover:text-white border-white/10'}`}
                                >
                                    <span className="text-xl">💡</span>
                                    {showHint ? 'إخفاء التفسير' : 'هل تحتاج لـ تفسير الحل؟'}
                                </button>
                            )}

                            {showHint && (
                                <div className="mt-6 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                                    <h4 className="font-black text-amber-600 dark:text-amber-500 mb-3 text-lg">{currentQ.type === 'essay' ? 'الحل النموذجي:' : 'تفسير الحل:'}</h4>
                                    <div className="font-bold text-gray-800 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                                        {currentQ.explanation ? (
                                            <MathText text={currentQ.explanation} />
                                        ) : (
                                            <span className="opacity-70 italic">لم يضف المحاضر تفسيراً لهذا السؤال بعد...</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 gap-4">
                <button
                    onClick={goNext}
                    disabled={currentIndex === displayQuestions.length - 1}
                    className={`flex-1 md:flex-none px-10 py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3
                    ${currentIndex === displayQuestions.length - 1 ? 'opacity-30 cursor-not-allowed bg-white/5 text-gray-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_10px_40px_rgba(37,99,235,0.3)] hover:scale-105 hover:-translate-y-1'}`}
                >
                    السؤال التالي ➜
                </button>

                <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className={`flex-1 md:flex-none px-8 py-5 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3
                    ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5 hover:text-white'}`}
                >
                    السابق
                </button>
            </div>

        </div>
    );
}
