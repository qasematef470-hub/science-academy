'use client';
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import 'katex/dist/katex.min.css';
import MathText from '@/app/components/ui/MathText';
import { saveEssayEvaluation, submitManualGrading } from '@/app/actions/admin';

export default function ExamReviewPage() {
    const router = useRouter();
    const params = useParams();
    const { courseId, resultId } = params;
    useEffect(() => {
        document.title = "المراجعة | Science Academy";
    }, []);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [isInstructor, setIsInstructor] = useState(false);

    // Essay Grading States
    const [essayGrades, setEssayGrades] = useState({}); // { [questionId]: { score, feedback } }
    const [savingEssayId, setSavingEssayId] = useState(null);
    const [submittingFinal, setSubmittingFinal] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) { router.replace('/login'); return; }

            try {
                // 1. جلب وثيقة النتيجة
                const resultRef = doc(db, 'results', resultId);
                const resultSnap = await getDoc(resultRef);

                if (!resultSnap.exists()) { setError("النتيجة غير موجودة."); setLoading(false); return; }
                const resultData = resultSnap.data();

                // التحقق من الصلاحيات
                const isStudentOwner = resultData.studentId === user.uid;
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';

                if (!isStudentOwner && !isAdmin) {
                    setError("غير مصرح لك بدخول هذه الصفحة.");
                    setLoading(false);
                    return;
                }
                if (isAdmin) { setIsInstructor(true); }

                // 2. تحديد الأسئلة المطلوبة
                const qIds = resultData.questionIds || [];
                // دعم للنتائج القديمة
                if (qIds.length === 0 && resultData.answers) qIds.push(...Object.keys(resultData.answers));

                if (qIds.length === 0) { setError("لا توجد بيانات للأسئلة."); setLoading(false); return; }

                // 3. جلب الأسئلة من بنك الأسئلة
                const questionsPromises = qIds.map(id => getDoc(doc(db, 'questions_bank', id)));
                const questionsSnaps = await Promise.all(questionsPromises);

                const processedQuestions = questionsSnaps
                    .filter(snap => snap.exists())
                    .map(snap => {
                        const qData = snap.data();
                        const qId = snap.id;

                        // 🔥 أهم جزء: استعادة الترتيب العشوائي
                        const variantIndices = resultData.variants ? resultData.variants[qId] : null;
                        let displayOptions = qData.options || [];

                        if (variantIndices && Array.isArray(variantIndices) && variantIndices.length > 0) {
                            const reordered = variantIndices.map(idx => qData.options[idx]).filter(Boolean);
                            if (reordered.length === qData.options.length) {
                                displayOptions = reordered;
                            }
                        }

                        return { id: qId, ...qData, options: displayOptions };
                    });

                setData({ result: resultData, questions: processedQuestions });

                // Initialize essay grades from existing evaluations
                const existingEvals = resultData.manualEvaluations || {};
                const initialGrades = {};
                Object.keys(existingEvals).forEach(qId => {
                    initialGrades[qId] = {
                        score: existingEvals[qId].score ?? '',
                        feedback: existingEvals[qId].feedback ?? ''
                    };
                });
                setEssayGrades(initialGrades);

            } catch (err) {
                console.error(err);
                setError("حدث خطأ أثناء تحميل المراجعة.");
            }
            setLoading(false);
        });
        return () => unsubscribe();

    }, [resultId, router]);

    // Handler: Save essay evaluation
    const handleSaveEssayGrade = async (questionId) => {
        const grade = essayGrades[questionId];
        if (!grade || grade.score === '' || grade.score === undefined) {
            alert("⚠️ أدخل الدرجة المستحقة أولاً.");
            return;
        }
        setSavingEssayId(questionId);
        try {
            const res = await saveEssayEvaluation(resultId, questionId, grade.score, grade.feedback);
            if (res.success) {
                // Update local data so no refresh needed
                setData(prev => ({
                    ...prev,
                    result: {
                        ...prev.result,
                        manualEvaluations: {
                            ...(prev.result.manualEvaluations || {}),
                            [questionId]: { score: Number(grade.score), feedback: grade.feedback || "" }
                        }
                    }
                }));
                alert("✅ تم حفظ التقييم بنجاح!");
            } else {
                alert("❌ خطأ: " + (res.message || "فشل الحفظ"));
            }
        } catch (e) {
            alert("❌ خطأ غير متوقع");
        }
        setSavingEssayId(null);
    };

    // Handler: Finalize all essay grading
    const handleFinalizeGrading = async () => {
        if (!data) return;
        const essayQuestions = data.questions.filter(q => q.type === 'essay');

        // Validate all essay questions have scores
        for (const q of essayQuestions) {
            const grade = essayGrades[q.id];
            const existingEval = (data.result.manualEvaluations || {})[q.id];
            const score = grade?.score ?? existingEval?.score;
            if (score === '' || score === undefined || score === null) {
                alert(`⚠️ لم تقم بتقييم السؤال رقم ${data.questions.indexOf(q) + 1} بعد.`);
                return;
            }
        }

        if (!confirm('هل أنت متأكد من اعتماد النتيجة النهائية؟ لن يمكن التراجع عن هذا الإجراء.')) return;

        setSubmittingFinal(true);
        try {
            const essayGradesObj = {};
            const feedbackObj = {};
            for (const q of essayQuestions) {
                const grade = essayGrades[q.id];
                const existingEval = (data.result.manualEvaluations || {})[q.id];
                essayGradesObj[q.id] = Number(grade?.score ?? existingEval?.score) || 0;
                feedbackObj[q.id] = grade?.feedback ?? existingEval?.feedback ?? '';
            }

            const res = await submitManualGrading(resultId, essayGradesObj, feedbackObj);
            if (res.success) {
                alert(`✅ تم اعتماد النتيجة النهائية بنجاح! الدرجة الكلية: ${res.newScore}`);
                window.location.reload();
            } else {
                alert('❌ خطأ: ' + (res.message || 'فشل الاعتماد'));
            }
        } catch (e) {
            alert('❌ خطأ غير متوقع');
        }
        setSubmittingFinal(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-white"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-red-500 font-bold text-xl">{error}</div>;

    const { result, questions } = data;
    const studentAnswers = result.answers || {};
    const manualEvaluations = result.manualEvaluations || {};

    return (
        <div className="min-h-screen bg-[#0B1120] text-white dir-rtl font-sans pb-20" dir="rtl">

            {/* Header */}
            <header className="bg-[#131B2E]/80 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="font-black text-2xl text-white">نتيجة الامتحان 📝</h1>
                        <p className="text-sm text-gray-400 mt-1">{result.studentName} | {new Date(result.submittedAt?.toDate()).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        {result.needsManualGrading ? (
                            <div className="px-4 py-2 rounded-xl font-bold text-lg border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                ⏳ بانتظار التقييم
                            </div>
                        ) : (
                            <div className={`px-4 py-2 rounded-xl font-black text-2xl border ${result.score >= result.total / 2 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {result.score} <span className="text-sm text-gray-400 font-medium">/ {result.total}</span>
                            </div>
                        )}
                        <span className="text-xs text-gray-500 mt-1">الدرجة النهائية</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                {questions.map((q, idx) => {
                    const isEssay = q.type === 'essay';
                    const studentAnswerText = studentAnswers[q.id];
                    const existingEval = manualEvaluations[q.id];

                    if (isEssay) {
                        // Essay question review
                        return (
                            <div key={q.id} className={`rounded-3xl border-2 ${existingEval ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-blue-500/30 bg-blue-500/5'} p-6 relative overflow-hidden transition-all hover:border-opacity-50`}>
                                {/* شريط الحالة */}
                                <div className="flex items-center gap-3 mb-6 flex-wrap">
                                    <span className="bg-[#0B1120] border border-white/10 w-10 h-10 flex items-center justify-center rounded-full text-white font-bold text-lg shadow-inner">
                                        {idx + 1}
                                    </span>
                                    <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-sm font-bold border border-blue-500/20">✍️ سؤال مقالي</span>
                                    {existingEval ? (
                                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-500/20">✅ تم التقييم</span>
                                    ) : (
                                        <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold border border-amber-500/20">📝 يتطلب تصحيح يدوي</span>
                                    )}
                                </div>

                                {/* السؤال */}
                                {q.image && (
                                    <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                        <img src={q.image} alt="" className="w-full max-h-80 object-contain" />
                                    </div>
                                )}

                                <div className="text-xl md:text-2xl font-bold text-gray-100 mb-8 leading-loose dir-rtl">
                                    <MathText text={q.question} />
                                </div>

                                {/* إجابة الطالب (صورة) */}
                                <div className="space-y-6">
                                    <div className="p-5 rounded-2xl border border-white/10 bg-[#131B2E]">
                                        <h4 className="font-black text-blue-400 mb-4 text-lg flex items-center gap-2">📷 إجابة الطالب</h4>
                                        {studentAnswerText && typeof studentAnswerText === 'string' && studentAnswerText.startsWith('http') ? (
                                            <img src={studentAnswerText} alt="إجابة الطالب" className="max-h-80 mx-auto rounded-xl object-contain border border-white/10 bg-white/5 p-1" />
                                        ) : (
                                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-gray-500 font-bold">لم يتم حفظ إجابة أو حدث خطأ أثناء الرفع ⚠️</div>
                                        )}
                                    </div>

                                    {/* الحل النموذجي */}
                                    <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                                        <h4 className="font-black text-amber-500 mb-4 text-lg flex items-center gap-2">💡 الحل النموذجي</h4>
                                        <div className="font-bold text-gray-300 leading-relaxed">
                                            {q.explanation ? (
                                                <MathText text={q.explanation} />
                                            ) : (
                                                <span className="opacity-70 italic">لم يضف المحاضر حلاً نموذجياً لهذا السؤال بعد.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ===== INSTRUCTOR GRADING PANEL ===== */}
                                    {isInstructor && (
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5 shadow-xl">
                                            <h4 className="font-black text-lg text-fuchsia-400 flex items-center gap-2">⚖️ لوحة التقييم</h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 mb-2">الدرجة المستحقة</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        className="w-full p-4 rounded-xl bg-[#0B1120] border border-white/10 text-white font-black text-xl outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition"
                                                        placeholder="0"
                                                        value={essayGrades[q.id]?.score ?? existingEval?.score ?? ''}
                                                        onChange={(e) => setEssayGrades(prev => ({ ...prev, [q.id]: { ...prev[q.id], score: e.target.value, feedback: prev[q.id]?.feedback ?? existingEval?.feedback ?? '' } }))}
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={() => handleSaveEssayGrade(q.id)}
                                                        disabled={savingEssayId === q.id}
                                                        className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl font-black text-lg shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        {savingEssayId === q.id ? (
                                                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> جاري الحفظ...</>
                                                        ) : (
                                                            <>💾 حفظ التقييم</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 mb-2">ملاحظات المحاضر (سيراها الطالب)</label>
                                                <textarea
                                                    rows={3}
                                                    className="w-full p-4 rounded-xl bg-[#0B1120] border border-white/10 text-white font-bold outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition resize-none"
                                                    placeholder="اكتب ملاحظاتك هنا... (اختياري)"
                                                    value={essayGrades[q.id]?.feedback ?? existingEval?.feedback ?? ''}
                                                    onChange={(e) => setEssayGrades(prev => ({ ...prev, [q.id]: { ...prev[q.id], feedback: e.target.value, score: prev[q.id]?.score ?? existingEval?.score ?? '' } }))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== STUDENT EVALUATION VIEW ===== */}
                                    {!isInstructor && (
                                        <>
                                            {existingEval && !result.needsManualGrading ? (
                                                <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-black text-blue-400 text-lg flex items-center gap-2">⚖️ تقييم المحاضر</h4>
                                                        <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl font-black text-xl border border-emerald-500/20">
                                                            {existingEval.score} درجة
                                                        </div>
                                                    </div>
                                                    {existingEval.feedback && (
                                                        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 shadow-lg shadow-amber-500/5">
                                                            <p className="text-amber-400 font-black text-base mb-2 flex items-center gap-2">💬 ملاحظة المحاضر:</p>
                                                            <p className="text-gray-200 font-bold leading-relaxed text-lg">{existingEval.feedback}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                                    <p className="text-amber-400 font-black text-lg">⏳ بانتظار تقييم المحاضر</p>
                                                    <p className="text-gray-500 text-sm font-bold mt-1">ستظهر الدرجة والملاحظات هنا بعد مراجعة المحاضر.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // MCQ question review (existing logic)
                    const correctOpt = q.options.find(opt => opt.isCorrect);
                    const correctAnswerText = correctOpt?.text;

                    const isCorrect = studentAnswerText === correctAnswerText;
                    const isSkipped = !studentAnswerText;

                    let borderClass = isCorrect ? 'border-green-500/30' : isSkipped ? 'border-yellow-500/30' : 'border-red-500/30';
                    let bgStatus = isCorrect ? 'bg-green-500/5' : isSkipped ? 'bg-yellow-500/5' : 'bg-red-500/5';

                    return (
                        <div key={q.id} className={`rounded-3xl border-2 ${borderClass} ${bgStatus} p-6 relative overflow-hidden transition-all hover:border-opacity-50`}>

                            {/* شريط الحالة */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-[#0B1120] border border-white/10 w-10 h-10 flex items-center justify-center rounded-full text-white font-bold text-lg shadow-inner">
                                    {idx + 1}
                                </span>
                                {isCorrect && <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm font-bold border border-green-500/20">✅ إجابة صحيحة</span>}
                                {isSkipped && <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-sm font-bold border border-yellow-500/20">⚠ لم يتم الحل</span>}
                                {!isCorrect && !isSkipped && <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-sm font-bold border border-red-500/20">❌ إجابة خاطئة</span>}
                            </div>

                            {/* السؤال */}
                            {q.image && (
                                <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                    <img src={q.image} alt="" className="w-full max-h-80 object-contain" />
                                </div>
                            )}

                            <div className="text-xl md:text-2xl font-bold text-gray-100 mb-8 leading-loose dir-rtl">
                                <MathText text={q.question} />
                            </div>

                            {/* الخيارات */}
                            <div className="grid gap-3">
                                {q.options.map((opt, i) => {
                                    // المقارنة بالنص لأن الترتيب اختلف
                                    const isSelected = studentAnswerText === opt.text;
                                    const isActuallyCorrect = opt.isCorrect;

                                    let optionStyle = "border-white/5 bg-[#131B2E] text-gray-400 hover:bg-[#1A253A]";
                                    let statusIcon = null;

                                    if (isActuallyCorrect) {
                                        optionStyle = "border-green-500 bg-green-500/10 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                                        statusIcon = "✅";
                                    } else if (isSelected && !isActuallyCorrect) {
                                        optionStyle = "border-red-500 bg-red-500/10 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                                        statusIcon = "❌";
                                    }

                                    return (
                                        <div key={i} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${optionStyle}`}>
                                            <div className="flex items-center gap-4 w-full">
                                                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold border ${isSelected || isActuallyCorrect ? 'border-current bg-current bg-opacity-20' : 'border-gray-600'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <div className="font-medium text-lg flex-1 break-words dir-rtl">
                                                    <MathText text={opt.text} />
                                                </div>
                                            </div>
                                            {statusIcon && <span className="text-xl mr-3">{statusIcon}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </main>

            <div className="fixed bottom-0 w-full bg-[#131B2E]/90 backdrop-blur border-t border-white/10 p-4 flex justify-center gap-4 z-40">
                <button onClick={() => router.push(isInstructor ? '/admin' : '/dashboard')} className="px-10 py-4 bg-white hover:bg-gray-100 text-black font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] transition-transform flex items-center gap-2">
                    <span>{isInstructor ? '🔙' : '🏠'}</span>
                    <span>{isInstructor ? 'العودة للوحة التحكم' : 'العودة للرئيسية'}</span>
                </button>
                {isInstructor && result.needsManualGrading && (
                    <button
                        onClick={handleFinalizeGrading}
                        disabled={submittingFinal}
                        className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-green-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submittingFinal ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> جاري الاعتماد...</>
                        ) : (
                            <>📝 اعتماد النتيجة النهائية</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}