'use client';
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import 'katex/dist/katex.min.css';
import MathText from '@/app/components/ui/MathText';

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
                        // بنشوف هل النتيجة متسجل فيها variants لهذا السؤال ولا لأ
                        const variantIndices = resultData.variants ? resultData.variants[qId] : null;
                        let displayOptions = qData.options || [];

                        // لو لقينا خريطة ترتيب، بنعيد ترتيب الخيارات بناء عليها
                        if (variantIndices && Array.isArray(variantIndices) && variantIndices.length > 0) {
                            const reordered = variantIndices.map(idx => qData.options[idx]).filter(Boolean);
                            // تأكيد إن العدد مظبوط عشان لو حصل تغيير في بنك الأسئلة ميبوظش الدنيا
                            if (reordered.length === qData.options.length) {
                                displayOptions = reordered;
                            }
                        }

                        return { id: qId, ...qData, options: displayOptions };
                    });

                setData({ result: resultData, questions: processedQuestions });

            } catch (err) {
                console.error(err);
                setError("حدث خطأ أثناء تحميل المراجعة.");
            }
            setLoading(false);
        });
        return () => unsubscribe();

    }, [resultId, router]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-white"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-red-500 font-bold text-xl">{error}</div>;

    const { result, questions } = data;
    const studentAnswers = result.answers || {};

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
                        <div className={`px-4 py-2 rounded-xl font-black text-2xl border ${result.score >= result.total / 2 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {result.score} <span className="text-sm text-gray-400 font-medium">/ {result.total}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">الدرجة النهائية</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                {questions.map((q, idx) => {
                    const studentAnswerText = studentAnswers[q.id];
                    const correctOpt = q.options.find(opt => opt.isCorrect); // دي بتجيب الإجابة الصح من الـ Options (اللي اترتبت خلاص)
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

            <div className="fixed bottom-0 w-full bg-[#131B2E]/90 backdrop-blur border-t border-white/10 p-4 flex justify-center z-40">
                <button onClick={() => router.push(isInstructor ? '/admin' : '/dashboard')} className="px-10 py-4 bg-white hover:bg-gray-100 text-black font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] transition-transform flex items-center gap-2">
                    <span>{isInstructor ? '🔙' : '🏠'}</span>
                    <span>{isInstructor ? 'العودة للوحة التحكم' : 'العودة للرئيسية'}</span>
                </button>
            </div>
        </div>
    );
}