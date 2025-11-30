'use client';
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export default function ExamReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { courseId, resultId } = params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { result, questions }
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }

      try {
        // 1. جلب ملف النتيجة
        const resultRef = doc(db, 'results', resultId);
        const resultSnap = await getDoc(resultRef);

        if (!resultSnap.exists()) { setError("النتيجة غير موجودة."); setLoading(false); return; }
        const resultData = resultSnap.data();

        // 2. التحقق من الصلاحيات (صاحب النتيجة فقط)
        if (resultData.studentId !== user.uid) { setError("غير مصرح لك بدخول هذه الصفحة."); setLoading(false); return; }

        // 3. التحقق من إذن المراجعة (من الأدمن)
        const settingsRef = doc(db, 'exam_settings', resultData.examCode || 'General');
        const settingsSnap = await getDoc(settingsRef);
        
        if (!settingsSnap.exists() || !settingsSnap.data().isVisible) {
            setError("⛔ المراجعة مغلقة حالياً من قبل الأدمن.");
            setLoading(false);
            return;
        }

        // 4. جلب الأسئلة الأصلية
        const qIds = resultData.questionIds || [];
        if (qIds.length === 0) {
            // دعم الامتحانات القديمة (Legacy)
             if (resultData.answers) qIds.push(...Object.keys(resultData.answers));
        }

        if (qIds.length === 0) { setError("لا توجد بيانات للأسئلة."); setLoading(false); return; }

        // جلب كل سؤال من بنك الأسئلة
        const questionsPromises = qIds.map(id => getDoc(doc(db, 'questions_bank', id)));
        const questionsSnaps = await Promise.all(questionsPromises);
        
        // 5. 🔥 السحر هنا: إعادة بناء ترتيب الاختيارات (Reconstruction)
        const processedQuestions = questionsSnaps
            .filter(snap => snap.exists())
            .map(snap => {
                const qData = snap.data();
                const qId = snap.id;
                
                // هل توجد خريطة ترتيب مسجلة لهذا السؤال؟
                const variantOrder = resultData.variants ? resultData.variants[qId] : null;
                
                let displayOptions = qData.options || [];

                if (variantOrder && Array.isArray(variantOrder)) {
                    // ✅ إعادة ترتيب الاختيارات بناءً على ما رآه الطالب
                    // بنمشي على الخريطة (الأرقام) ونجيب الاختيار الأصلي المقابل لكل رقم
                    displayOptions = variantOrder.map(originalIdx => qData.options[originalIdx]).filter(Boolean);
                } 
                // لو مفيش خريطة (امتحان قديم)، بنعرض الترتيب الافتراضي وخلاص

                return {
                    id: qId,
                    ...qData,
                    options: displayOptions
                };
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white dir-rtl">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-gray-400">جاري استرجاع ورقة إجابتك...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white dir-rtl">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-black text-red-500 mb-4">{error}</h2>
        <button onClick={() => router.back()} className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition">عودة</button>
    </div>
  );

  const { result, questions } = data;
  const studentAnswers = result.answers || {};

  return (
    <div className="min-h-screen bg-[#0B1120] text-white dir-rtl font-sans select-none relative overflow-hidden" dir="rtl">
        
        {/* خلفية العلامة المائية للحماية */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] flex flex-wrap content-center justify-center gap-20 rotate-[-20deg]">
            {Array(20).fill("").map((_, i) => (
                <div key={i} className="text-gray-100 font-black text-4xl whitespace-nowrap">نسخة مراجعة - {result.studentName}</div>
            ))}
        </div>

        {/* Header */}
        <header className="bg-[#131B2E]/90 backdrop-blur-md sticky top-0 z-50 border-b border-white/10 p-4">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div>
                    <h1 className="font-black text-xl text-white">تقرير المراجعة 📝</h1>
                    <p className="text-sm text-gray-400">الطالب: <span className="text-blue-400">{result.studentName}</span></p>
                </div>
                <div className="text-left bg-black/30 px-4 py-2 rounded-xl border border-white/10">
                    <div className="text-xs text-gray-400">الدرجة النهائية</div>
                    <div className={`text-2xl font-black ${result.score >= result.total/2 ? 'text-green-400' : 'text-red-400'}`}>
                        {result.score} <span className="text-base text-gray-500">/ {result.total}</span>
                    </div>
                </div>
            </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 space-y-8 pb-20 relative z-10">
            
            {/* رسالة توضيحية */}
            <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-xl flex gap-3 items-center">
                <span className="text-2xl">💡</span>
                <p className="text-sm text-blue-200">هذه النسخة تعرض ترتيب الأسئلة والاختيارات تماماً كما ظهرت لك أثناء الامتحان. الإجابات الصحيحة مظللة باللون الأخضر.</p>
            </div>

            {questions.map((q, idx) => {
                const studentAnswerText = studentAnswers[q.id]; 
                const correctAnswerText = q.options.find(opt => opt.isCorrect)?.text;
                
                const isCorrect = studentAnswerText === correctAnswerText;
                const isSkipped = !studentAnswerText; 

                return (
                    <div key={q.id} className={`rounded-3xl border-2 p-6 relative overflow-hidden transition-all ${isCorrect ? 'bg-green-500/5 border-green-500/20' : isSkipped ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        
                        {/* رأس السؤال */}
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-black/30 px-3 py-1 rounded-lg text-xs font-bold text-gray-400">سؤال {idx + 1}</span>
                            {isCorrect ? <span className="text-green-400 font-bold flex items-center gap-1">✅ إجابة صحيحة</span> : 
                             isSkipped ? <span className="text-yellow-400 font-bold flex items-center gap-1">⚠ لم يتم الحل</span> :
                             <span className="text-red-400 font-bold flex items-center gap-1">❌ إجابة خاطئة</span>}
                        </div>

                        {/* المحتوى */}
                        {q.image && <img src={q.image} alt="Question" className="max-h-60 rounded-xl mb-4 border border-white/10" />}
                        <div className="text-lg font-bold text-white mb-6 leading-relaxed"><Latex>{q.question}</Latex></div>

                        {/* الاختيارات (Read Only) */}
                        <div className="space-y-3 pointer-events-none">
                            {q.options.map((opt, optIdx) => {
                                const isSelectedByStudent = studentAnswerText === opt.text;
                                const isActuallyCorrect = opt.isCorrect;
                                
                                let styleClass = "border-white/5 bg-[#0B1120] text-gray-400 opacity-60"; // Default dimmed
                                let icon = null;

                                if (isActuallyCorrect) {
                                    // الإجابة الصحيحة (دائماً منورة أخضر)
                                    styleClass = "border-green-500 bg-green-500/20 text-white shadow-[0_0_10px_rgba(34,197,94,0.2)] opacity-100";
                                    icon = "✅";
                                } 
                                
                                if (isSelectedByStudent) {
                                    if (isActuallyCorrect) {
                                        // الطالب اختار صح
                                        styleClass = "border-green-500 bg-green-500/20 text-white ring-2 ring-green-400 opacity-100";
                                        icon = "👏"; 
                                    } else {
                                        // الطالب اختار غلط
                                        styleClass = "border-red-500 bg-red-500/20 text-white opacity-100";
                                        icon = "❌ اختيارك";
                                    }
                                }

                                return (
                                    <div key={optIdx} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${styleClass}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm opacity-50">{String.fromCharCode(65 + optIdx)}</span>
                                            <span className="font-medium"><Latex>{opt.text}</Latex></span>
                                        </div>
                                        {icon && <span className="text-sm font-bold">{icon}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </main>
        
        <div className="fixed bottom-0 w-full bg-[#131B2E] border-t border-white/10 p-4 flex justify-center z-50">
            <button onClick={() => router.push('/dashboard')} className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition shadow-lg">
                عودة للرئيسية 🏠
            </button>
        </div>
    </div>
  );
}