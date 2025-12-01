'use client';
import React, { useState, useEffect, useRef } from 'react'; 
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
// تأكد إن المسار ده صح عندك
import { getExamQuestions, submitExamResult, logCheater, logExamStart, checkExamEligibility, getLeaderboard } from '../../actions';

export default function ExamPage() {
  const router = useRouter();
  const params = useParams(); 
  const courseId = params.courseId;

  // --- States ---
  const [step, setStep] = useState('loading'); 
  const [studentData, setStudentData] = useState({ name: '', email: '', uid: '' });
  const [courseData, setCourseData] = useState({ name: '', section: '' }); 
  
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  const [answersIndices, setAnswersIndices] = useState({}); 

  const [timeLeft, setTimeLeft] = useState(null);
  const [initialDuration, setInitialDuration] = useState(45 * 60);
  
  // Security States
  const [strikes, setStrikes] = useState(0);
  const MAX_STRIKES = 3;
  const [warningModal, setWarningModal] = useState({ show: false, msg: '', count: 0 });
  const [cheatingHistory, setCheatingHistory] = useState([]);
  const [splitScreenWarning, setSplitScreenWarning] = useState(false);
  const [splitScreenTimer, setSplitScreenTimer] = useState(30);
  const [deviceInfo, setDeviceInfo] = useState("");

  // Exam Config
  const [enteredCode, setEnteredCode] = useState("");
  const [requiredCode, setRequiredCode] = useState("");
  
  // Leaderboard State
  const [topStudents, setTopStudents] = useState([]);

  // Refs
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);
  const splitScreenIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const clipboardIntervalRef = useRef(null);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // 1️⃣ Init & Auth (تجهيز الصفحة فقط بدون منع الدخول)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMountedRef.current) return;
      if (!user) { router.replace('/login'); return; }

      try {
        setDeviceInfo(window.navigator.userAgent);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) { router.replace('/dashboard'); return; }
        
        if(isMountedRef.current) {
            setStudentData({ name: userDoc.data().name, email: userDoc.data().email, uid: user.uid });
        }

        // ✅ التصحيح: قراءة كود الامتحان من مكانه الصحيح (exam_configs) بناءً على اسم المادة
        const examConfigDoc = await getDoc(doc(db, 'exam_configs', courseId));
        if (examConfigDoc.exists() && isMountedRef.current) {
            console.log("Exam Code Found:", examConfigDoc.data().examCode); // عشان تتأكد في الكونسول
            setRequiredCode(examConfigDoc.data().examCode || "");
        } else {
            // احتياطي: لو ملقاش الكود في exam_configs يدور عليه جوه بيانات الكورس نفسه
            const courseDocCheck = await getDoc(doc(db, 'courses', courseId));
            if (courseDocCheck.exists() && courseDocCheck.data().examCode) {
                setRequiredCode(courseDocCheck.data().examCode);
            }
        }
        const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
        if (settingsDoc.exists() && isMountedRef.current) {
            setRequiredCode(settingsDoc.data().examCode || "");
        }

        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists() && isMountedRef.current) setCourseData(courseDoc.data());

        const lbRes = await getLeaderboard(courseId);
        if (lbRes.success && isMountedRef.current) {
            setTopStudents(lbRes.data.slice(0, 3)); 
        }

        // هنا بنشوف لو هو كان "فاتح امتحان بالفعل" عشان يكمل (Resume)
        // لكن لو هو مخلص أو لسه مدخلش، بنسيبه في شاشة الـ Intro عادي
        const sessionKey = `exam_session_${courseId}_${user.uid}`;
        const savedData = localStorage.getItem(sessionKey);
        
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (!parsed.finished) {
             let remainingTime = parsed.timeLeft;
             if (parsed.endTime) {
                 const now = Date.now();
                 remainingTime = Math.ceil((parsed.endTime - now) / 1000);
             }

             if (remainingTime > 0) {
                 // استكمال الجلسة المفتوحة
                 setQuestions(parsed.questions);
                 setAnswersIndices(parsed.answersIndices || {}); 
                 setTimeLeft(remainingTime);
                 setInitialDuration(parsed.initialDuration);
                 setStrikes(parsed.strikes || 0);
                 setCheatingHistory(parsed.cheatingHistory || []);
                 setStep('quiz');
                 return; // نخرج عشان منعرضش الـ Intro
             }
          }
        }
        
        // الوضع الطبيعي: اعرض شاشة الكود
        setStep('intro'); 

      } catch (error) { console.error("Init Error:", error); }
    });
    return () => unsubscribe();
  }, [courseId, router]);

  // 2️⃣ Timer
  useEffect(() => {
    if ((step === 'quiz' || step === 'review')) { 
      timerIntervalRef.current = setInterval(() => {
        const sessionKey = `exam_session_${courseId}_${studentData.uid}`;
        const savedSession = JSON.parse(localStorage.getItem(sessionKey) || "{}");

        if (savedSession && savedSession.endTime) {
            const now = Date.now();
            const diffInSeconds = Math.ceil((savedSession.endTime - now) / 1000);

            if (diffInSeconds <= 0) {
                clearInterval(timerIntervalRef.current);
                setTimeLeft(0);
                if (isMountedRef.current && !isSubmittingRef.current) {
                     handleSubmit("انتهاء الوقت");
                }
            } else {
                setTimeLeft(diffInSeconds);
            }
        } else {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timerIntervalRef.current);
                    handleSubmit("انتهاء الوقت");
                    return 0;
                }
                return prev - 1;
            });
        }
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [step, courseId, studentData.uid]);

  // 3️⃣ Security Logic
  useEffect(() => {
    if (step !== 'quiz' && step !== 'review') return; 
    const showPanicOverlay = () => {
        if (document.getElementById('panic-overlay')) return; 
        const blocker = document.createElement('div');
        blocker.id = 'panic-overlay';
        blocker.style.cssText = 'position:fixed; inset:0; background:black; z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-size:40px; font-weight:bold;';
        blocker.innerHTML = '<div style="font-size:80px;">📷🚫</div><div>ممنوع التصوير!</div>';
        document.body.appendChild(blocker);
        setTimeout(() => { const el = document.getElementById('panic-overlay'); if (el) el.remove(); }, 1500);
    };

    clipboardIntervalRef.current = setInterval(() => {
        if (document.hasFocus()) { navigator.clipboard.writeText(' ').catch(() => {}); }
    }, 1000);

    const triggerStrike = (reason) => {
        setStrikes(prev => {
            const newCount = prev + 1;
            const newHistory = [...cheatingHistory, { reason, time: new Date().toLocaleTimeString() }];
            setCheatingHistory(newHistory);
            updateLocalStorage({ strikes: newCount, cheatingHistory: newHistory });
            if (newCount >= MAX_STRIKES) {
                setWarningModal({ show: false, msg: '', count: 0 });
                handleSubmit(`تم الطرد (تجاوز 3 مخالفات: ${reason})`, true);
            } else {
                setWarningModal({ show: true, msg: reason, count: newCount });
            }
            return newCount;
        });
    };

    const handleVisibilityChange = () => { if (document.hidden) triggerStrike("الخروج من التبويب"); };
    const handleBlur = () => { showPanicOverlay(); triggerStrike("محاولة تصوير / فقدان التركيز"); };
    const handleKeyActivity = (e) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44 || e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault(); e.stopPropagation();
        showPanicOverlay(); triggerStrike("محاولة استخدام أزرار محظورة");
      }
    };
    const handleResize = () => {
      const isSplit = window.innerWidth < window.screen.width * 0.98; 
      if (isSplit) {
          if (!splitScreenWarning) { setSplitScreenWarning(true); triggerStrike("تقسيم الشاشة"); }
      } else { setSplitScreenWarning(false); setSplitScreenTimer(30); }
    };

    handleResize();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur); 
    document.addEventListener("keydown", handleKeyActivity); 
    document.addEventListener("keyup", handleKeyActivity);
    window.addEventListener("resize", handleResize);
    const handleContext = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContext);

    return () => {
      clearInterval(clipboardIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyActivity);
      document.removeEventListener("keyup", handleKeyActivity);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("contextmenu", handleContext);
      const el = document.getElementById('panic-overlay'); if (el) el.remove();
    };
  }, [step, cheatingHistory, splitScreenWarning]);

  // 4️⃣ Ban Timer
  useEffect(() => {
    if (splitScreenWarning && (step === 'quiz' || step === 'review')) {
        splitScreenIntervalRef.current = setInterval(() => {
            setSplitScreenTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(splitScreenIntervalRef.current);
                    setSplitScreenWarning(false);
                    handleSubmit("تم الطرد (تقسيم الشاشة)", true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        clearInterval(splitScreenIntervalRef.current);
        setSplitScreenTimer(30);
    }
    return () => clearInterval(splitScreenIntervalRef.current);
  }, [splitScreenWarning, step]);

  // --- Helpers ---
  const updateLocalStorage = (newData) => {
    if (!studentData.uid) return;
    const sessionKey = `exam_session_${courseId}_${studentData.uid}`;
    const oldData = JSON.parse(localStorage.getItem(sessionKey) || "{}");
    localStorage.setItem(sessionKey, JSON.stringify({ ...oldData, ...newData }));
  };

  const handleAnswerSelect = (qId, optionIndex) => {
    setAnswersIndices(prev => {
        const newIndices = { ...prev };
        newIndices[qId] = optionIndex; 
        updateLocalStorage({ answersIndices: newIndices });
        return newIndices;
    });
  };

  // 🔥🔥🔥 هنا التصحيح كله 🔥🔥🔥
  // الفحص بيتم هنا لما الطالب يضغط زرار البداية، مش أول ما الصفحة تفتح
  const handleStartExam = async () => {
    // 1. فحص كود الامتحان محلياً الأول
    if (requiredCode && enteredCode.trim() !== requiredCode.toString().trim()) { 
    alert("⛔ كود الامتحان غير صحيح!"); 
    return; 
    }

    setStep('loading');
    const sessionKey = `exam_session_${courseId}_${studentData.uid}`;
    
    // 2. سؤال السيرفر: هل الطالب ده ينفع يمتحن؟ (امتحن قبل كده ولا لأ)
    const eligibility = await checkExamEligibility(studentData.uid, courseId);
    
    // لو السيرفر قال "غير مسموح" (يعني امتحن وله نتيجة)
    if (!eligibility.allowed && !eligibility.resume) { 
        alert(eligibility.message); // هيطلعله رسالة "لقد قمت بتأدية الامتحان مسبقاً"
        setStep('intro'); // ويفضل مكانه في شاشة البداية عشان لو مسحت نتيجته يدخل تاني
        return; 
    }
    
    // لو مسموح له، امسح أي داتا قديمة وابدأ جديد
    if (eligibility.allowed && !eligibility.resume) {
        localStorage.removeItem(sessionKey);
    }
    
    if (eligibility.isRetake) {
        localStorage.removeItem(sessionKey);
    }

    const response = await getExamQuestions(courseId);
    if (!response.success) { alert("لا توجد أسئلة."); router.replace('/dashboard'); return; }

    await logExamStart({ 
        studentName: studentData.name, section: courseData.section, courseName: courseData.name,
        examCode: requiredCode || 'General', deviceInfo: window.navigator.userAgent,
        studentId: studentData.uid, courseId: courseId
    });

    const fetchedQuestions = response.data;
    const durationSeconds = eligibility.durationMinutes * 60;
    const endTime = Date.now() + (durationSeconds * 1000);

    setQuestions(fetchedQuestions);
    setTimeLeft(durationSeconds);
    setInitialDuration(durationSeconds);
    setStep('quiz');

    localStorage.setItem(sessionKey, JSON.stringify({
        studentName: studentData.name, 
        section: courseData.section, 
        questions: fetchedQuestions, 
        answersIndices: {},
        timeLeft: durationSeconds, 
        initialDuration: durationSeconds,
        endTime: endTime,
        strikes: 0, 
        cheatingHistory: [], 
        finished: false
    }));
    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) {}
  };

  const handleSubmit = async (reason = "تسليم طبيعي", isCheating = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setStep('loading'); 

    const timeSpent = initialDuration - (timeLeft || 0);
    const formattedTime = `${Math.floor(timeSpent / 60)}:${timeSpent % 60}`;
    const questionIds = questions.map(q => q.id);

    const answersAsText = {};
    const variantsMap = {};

    questions.forEach(q => {
        if (answersIndices[q.id] !== undefined) {
            const idx = answersIndices[q.id];
            if (q.options[idx]) {
                answersAsText[q.id] = q.options[idx].text;
            }
        }
        if (q.options) {
            variantsMap[q.id] = q.options.map(opt => opt.originalIdx);
        }
    });

    if (isCheating) await logCheater({ studentName: studentData.name, section: courseData.section, reason, logs: cheatingHistory, deviceInfo });

    const result = await submitExamResult({
        studentName: studentData.name, studentId: studentData.uid, section: courseData.section, courseId, 
        answers: answersAsText, 
        variants: variantsMap, 
        timeTaken: formattedTime, cheatingLog: isCheating ? cheatingHistory : null,
        forcedStatus: isCheating ? `تم الطرد (${reason})` : "تم التسليم ✅", questionIds, deviceInfo, examCode: requiredCode || 'General' 
    });

    if (result.success) {
        const sessionKey = `exam_session_${courseId}_${studentData.uid}`;
        localStorage.setItem(sessionKey, JSON.stringify({ finished: true }));
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        if (isMountedRef.current) {
            alert(`تم إنهاء الامتحان.\nالدرجة: ${result.score}/${result.total}`);
            router.replace('/dashboard');
        }
    } else {
        alert("فشل التسليم. حاول مرة أخرى."); isSubmittingRef.current = false; 
        if (isMountedRef.current) setStep('review'); 
    }
  };

  if (step === 'loading') return <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white"><div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (step === 'intro') return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="bg-[#131B2E] max-w-lg w-full rounded-3xl p-8 text-center border border-white/10 relative overflow-hidden">
            <h1 className="text-3xl font-black text-white mb-2">{courseData.name}</h1>
            
            {/* Leaderboard Section */}
            {topStudents.length > 0 && (
                <div className="my-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <h3 className="text-yellow-400 font-bold mb-3 flex items-center justify-center gap-2">🏆 أبطال المادة (Top 3)</h3>
                    <div className="space-y-2">
                        {topStudents.map((st, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg px-4">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${idx===0 ? 'bg-yellow-500 text-black' : idx===1 ? 'bg-gray-400 text-black' : 'bg-orange-700 text-white'}`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm font-bold text-gray-200">{st.name.split(' ')[0]} ...</span>
                                </div>
                                <span className="text-blue-400 font-mono font-bold text-sm">{st.score} درجة</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {requiredCode && (
                <div className="mb-6 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mt-4">
                    <label className="block text-yellow-500 font-bold text-sm mb-2">🔒 أدخل كود الامتحان</label>
                    <input type="text" className="w-full p-3 bg-black/40 border border-yellow-500/30 rounded-lg text-center text-white font-bold tracking-widest outline-none focus:border-yellow-500" placeholder="CODE" value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} />
                </div>
            )}
            <button onClick={handleStartExam} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-blue-500 transition shadow-lg shadow-blue-600/20">ابدأ الامتحان 🚀</button>
        </div>
    </div>
  );

  const question = questions[currentQIndex];
  const progress = ((currentQIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answersIndices).length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-gray-100 font-sans select-none relative" dir="rtl">    
      <div className="fixed inset-0 pointer-events-none z-[50] overflow-hidden opacity-[0.04] flex flex-wrap content-center justify-center gap-20 rotate-[-20deg]">
          {Array(20).fill("").map((_, i) => (
              <div key={i} className="text-gray-100 font-black text-4xl whitespace-nowrap">{studentData.name} - {studentData.uid.slice(0,5)}</div>
          ))}
      </div>

      {warningModal.show && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="bg-[#131B2E] border-2 border-red-500 rounded-3xl p-8 max-w-md w-full text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-3xl font-black text-red-500 mb-2">تحذير مخالفة!</h2>
                <p className="text-white text-lg font-bold mb-6"><span className="text-yellow-400">{warningModal.msg}</span></p>
                <button onClick={() => setWarningModal({ ...warningModal, show: false })} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl">أعترف بالخطأ وأكمل الامتحان ✋</button>
            </div>
        </div>
      )}

      {splitScreenWarning && (
         <div className="fixed inset-0 z-[10000] bg-red-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-4">
            <h2 className="text-4xl font-black mb-4">⚠️ تقسيم الشاشة ممنوع!</h2>
            <div className="text-9xl font-black animate-pulse text-red-400">{splitScreenTimer}</div>
         </div>
      )}

      {/* Header */}
      <div className="bg-[#131B2E] shadow-sm sticky top-0 z-40 border-b border-white/10 relative z-10">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex gap-4 items-center">
                <span className="font-bold text-gray-300">
                    {step === 'review' ? 'مراجعة نهائية 📝' : `سؤال ${currentQIndex + 1}/${questions.length}`}
                </span>
                {strikes > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">مخالفات: {strikes}/3</span>}
            </div>
            <div className={`font-mono font-bold text-xl px-5 py-2 rounded-xl border ${timeLeft < 300 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-blue-500/10 text-blue-400'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
        </div>
        <div className="h-1 bg-[#0B1120] w-full"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div></div>
      </div>

      {step === 'review' ? (
          <div className="max-w-4xl mx-auto p-6 mt-8 relative z-10 animate-fade-in">
              <div className="bg-[#131B2E] rounded-3xl p-8 text-center border border-white/5 shadow-2xl">
                  <h2 className="text-3xl font-black text-white mb-2">مراجعة الإجابات</h2>
                  <p className="text-gray-400 mb-8 font-bold">لقد قمت بحل <span className="text-blue-400">{answeredCount}</span> من أصل <span className="text-white">{questions.length}</span> سؤال</p>
                  
                  <div className="grid grid-cols-5 md:grid-cols-8 gap-3 mb-10">
                      {questions.map((q, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => { setCurrentQIndex(idx); setStep('quiz'); }} 
                            className={`p-4 rounded-xl font-black text-lg transition-transform hover:scale-105 ${answersIndices[q.id] !== undefined 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}
                          >
                            {idx + 1}
                          </button>
                      ))}
                  </div>

                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 mb-6">
                      <h4 className="font-bold text-white mb-2">تعليمات التسليم:</h4>
                      <p className="text-xs text-gray-400">بمجرد الضغط على زر التسليم، لا يمكن التراجع أو تعديل الإجابات. تأكد من مراجعة الأسئلة غير المحلولة (باللون الأصفر).</p>
                  </div>

                  <button onClick={() => handleSubmit("تسليم يدوي")} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl text-xl shadow-lg hover:shadow-green-500/20 transition-all transform hover:scale-[1.01]">
                    تأكيد التسليم النهائي ✅
                  </button>
              </div>
          </div>
      ) : (
          <div className="max-w-4xl mx-auto p-4 pb-32 relative z-10 animate-slide-up">
             <div className="bg-[#131B2E] rounded-3xl shadow-xl border border-white/5 p-6 md:p-10 min-h-[400px]">
                {question?.image && <img src={question.image} alt="Q" className="max-h-60 mx-auto mb-6 rounded-lg object-contain" />}
                <div className="text-xl md:text-2xl font-medium text-white mb-10 leading-loose text-center dir-rtl"><Latex>{question?.question || ''}</Latex></div>
                <div className="grid gap-4 mt-8">
                    {question?.options.map((opt, idx) => {
                        const isSelected = answersIndices[question.id] === idx;
                        return (
                            <button 
                                key={idx} 
                                onClick={() => handleAnswerSelect(question.id, idx)}
                                className={`flex items-center p-5 rounded-2xl border-2 text-right transition-all group
                                    ${isSelected 
                                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.01]' 
                                        : 'border-white/5 bg-[#0B1120] hover:bg-white/5' 
                                    }`}
                            > 
                                <span className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ml-4 border-2 shrink-0
                                    ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-500 border-gray-600 group-hover:border-gray-400'}`}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-lg font-medium text-gray-200 dir-rtl"><Latex>{opt.text}</Latex></span>
                            </button>
                        );
                    })}
                </div>
             </div>
          </div>
      )}

      {step === 'quiz' && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#131B2E]/90 backdrop-blur-md border-t border-white/10 p-4 z-30">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
                <button onClick={() => setCurrentQIndex(p => Math.max(0, p - 1))} disabled={currentQIndex === 0} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 disabled:opacity-30 transition">السابق</button>
                
                {currentQIndex === questions.length - 1 ? 
                    <button onClick={() => setStep('review')} className="px-8 py-3 rounded-xl font-bold bg-white text-black shadow-lg hover:bg-gray-200 transition">مراجعة وتسليم 📝</button> 
                    : <button onClick={() => setCurrentQIndex(p => p + 1)} className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition">التالي ⬅️</button>
                }
            </div>
        </div>
      )}
    </div>
  );
}