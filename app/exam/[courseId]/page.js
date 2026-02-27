'use client';
import React, { useState, useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
// ✅ استخدام MathText الجديد بدلاً من Latex
import MathText from '@/app/components/ui/MathText';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getExamQuestions, submitExamResult, logCheater, logExamStart, checkExamEligibility, verifyExamCodeServer } from '@/app/actions/student';

// --- 1️⃣ Icons ---
const Icons = {
    Clock: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Menu: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Cloud: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
    Warning: () => <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
};

export default function ExamPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const courseId = params.courseId;
    const examId = searchParams.get('examId');
    useEffect(() => {
        document.title = "الإمتحان | Science Academy";
    }, []);

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
    const [attemptNumber, setAttemptNumber] = useState(1);
    const [maxAttempts, setMaxAttempts] = useState(1);



    // --- UI States ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Refs
    const isSubmittingRef = useRef(false);
    const isMountedRef = useRef(true);
    const splitScreenIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const clipboardIntervalRef = useRef(null);

    const answersRef = useRef(answersIndices);

    useEffect(() => {
        answersRef.current = answersIndices;
    }, [answersIndices]);

    // Cleanup
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Init & Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!isMountedRef.current) return;
            if (!user) { router.replace('/login'); return; }
            if (!examId) { alert("رابط الامتحان غير صالح"); router.replace('/dashboard'); return; }

            try {
                setDeviceInfo(window.navigator.userAgent);
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                // 🔥 FIX 1: Ensure name is grabbed even if not in DB, fallback to User Object
                let sName = user.displayName || "طالب غير مسجل";
                let sEmail = user.email;
                if (userDoc.exists()) {
                    sName = userDoc.data().name || sName;
                    sEmail = userDoc.data().email || sEmail;
                }

                if (isMountedRef.current) {
                    setStudentData({ name: sName, email: sEmail, uid: user.uid });
                }

                const examConfigDoc = await getDoc(doc(db, 'exam_configs', searchParams.get('examId')));
                if (examConfigDoc.exists() && isMountedRef.current) {
                    setRequiredCode(examConfigDoc.data().examCode || "");
                } else {
                    const courseDocCheck = await getDoc(doc(db, 'courses', courseId));
                    if (courseDocCheck.exists() && courseDocCheck.data().examCode) {
                        setRequiredCode(courseDocCheck.data().examCode);
                    }
                }
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists() && isMountedRef.current) setCourseData(courseDoc.data());

                const sessionKey = `exam_session_${courseId}_${user.uid}_${examId}`;
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
                            setQuestions(parsed.questions);
                            setAnswersIndices(parsed.answersIndices || {});
                            setEnteredCode(parsed.examCode || "");
                            setTimeLeft(remainingTime);
                            setInitialDuration(parsed.initialDuration); // 🔥 FIX 2: Load initialDuration correctly
                            setStrikes(parsed.strikes || 0);
                            setCheatingHistory(parsed.cheatingHistory || []);

                            // 🔥 FIX 3: Restore name from localStorage if state is lost
                            if (parsed.studentName) {
                                setStudentData(prev => ({ ...prev, name: parsed.studentName }));
                            }
                            if (parsed.attemptNumber) {
                                setAttemptNumber(parsed.attemptNumber);
                            }

                            setStep('quiz');
                            return;
                        }
                    }
                }

                setStep('intro');

            } catch (error) { console.error("Init Error:", error); }
        });
        return () => unsubscribe();
    }, [courseId, router]);

    // Timer
    useEffect(() => {
        if ((step === 'quiz' || step === 'review')) {
            timerIntervalRef.current = setInterval(() => {
                const sessionKey = `exam_session_${courseId}_${studentData.uid}_${examId}`;
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

    // --- 3️⃣ Security Logic & Ban Watcher ---
    useEffect(() => {
        if (strikes >= MAX_STRIKES) {
            const timer = setTimeout(() => {
                setWarningModal({ show: false, msg: '', count: 0 });
                handleSubmit(`تم الطرد (تجاوز 3 مخالفات)`, true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [strikes]);

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
            if (document.hasFocus()) { navigator.clipboard.writeText(' ').catch(() => { }); }
        }, 1000);

        const triggerStrike = (reason) => {
            setStrikes(prev => {
                const newCount = prev + 1;
                const newHistory = [...cheatingHistory, { reason, time: new Date().toLocaleTimeString() }];
                setCheatingHistory(newHistory);
                updateLocalStorage({ strikes: newCount, cheatingHistory: newHistory });

                if (newCount < MAX_STRIKES) {
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

    // Ban Timer
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

    // Helpers
    const updateLocalStorage = (newData) => {
        if (!studentData.uid) return;
        const sessionKey = `exam_session_${courseId}_${studentData.uid}_${examId}`;
        const oldData = JSON.parse(localStorage.getItem(sessionKey) || "{}");
        localStorage.setItem(sessionKey, JSON.stringify({ ...oldData, ...newData }));
    };

    // --- Answer Handler with AutoSave UI ---
    const handleAnswerSelect = (qId, optionIndex) => {
        setIsSaving(true);
        setAnswersIndices(prev => {
            const newIndices = { ...prev };
            newIndices[qId] = optionIndex;
            updateLocalStorage({ answersIndices: newIndices });
            setTimeout(() => setIsSaving(false), 500);
            return newIndices;
        });
    };

    const getDifficultyColor = (level) => {
        const l = String(level).toLowerCase();
        if (l === 'hard' || l === '3' || l === 'صعب') return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', label: 'مستوى صعب 🔥' };
        if (l === 'medium' || l === '2' || l === 'متوسط') return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', label: 'مستوى متوسط ⚖️' };
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', label: 'مستوى سهل ✅' };
    };

    const handleStartExam = async () => {
        if (!enteredCode) { alert("من فضلك أدخل كود الامتحان"); return; }
        if (!examId) { alert("رابط الامتحان غير صالح"); return; }
        setStep('loading');

        try {
            const verification = await verifyExamCodeServer(courseId, enteredCode, examId);

            if (!verification.success) {
                setStep('intro');
                alert("⛔ " + verification.message);
                return;
            }

            const sessionKey = `exam_session_${courseId}_${studentData.uid}_${examId}`;
            const eligibility = await checkExamEligibility(studentData.uid, courseId, examId);

            if (!eligibility.allowed && !eligibility.resume) {
                alert(eligibility.message);
                setStep('intro');
                return;
            }

            // 🔥 إضافة تنبيه الاستثناء (Exception Alert)
            if (eligibility.isException) {
                alert("🔓 تم تفعيل استثناء خاص لك من الأدمن للدخول!");
            }

            if (eligibility.allowed && !eligibility.resume) {
                localStorage.removeItem(sessionKey);
            }
            if (eligibility.isRetake) {
                localStorage.removeItem(sessionKey);
            }

            // حفظ رقم المحاولة
            const currentAttempt = eligibility.attemptNumber || 1;
            setAttemptNumber(currentAttempt);
            setMaxAttempts(eligibility.maxAttempts || 1);

            const response = await getExamQuestions(courseId, examId);
            if (!response.success) { alert("لا توجد أسئلة."); router.replace('/dashboard'); return; }

            await logExamStart({
                studentName: studentData.name, section: courseData.section || "General", courseName: courseData.name,
                examCode: enteredCode,
                deviceInfo: window.navigator.userAgent,
                studentId: studentData.uid, courseId: courseId, examId: examId,
                attemptNumber: currentAttempt
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
                examCode: enteredCode,
                timeLeft: durationSeconds,
                initialDuration: durationSeconds,
                endTime: endTime,
                strikes: 0,
                cheatingHistory: [],
                finished: false,
                attemptNumber: currentAttempt
            }));

            try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) { }

        } catch (error) {
            console.error("Error starting exam:", error);
            alert("حدث خطأ أثناء الاتصال بالسيرفر، تأكد من الإنترنت.");
            setStep('intro');
        }
    };

    // ✅ handleSubmit (Major Fixes for Name & Time)
    const handleSubmit = async (reason = "تسليم طبيعي", isCheating = false) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setStep('loading');

        // 🔥 FIX 5: Robust Time Calculation
        // Ensure numbers are valid
        // 🔥 FIX 5: Robust Time Calculation (تم التعديل)
        const safeInitial = initialDuration || (45 * 60);
        let timeSpent;

        // لو السبب انتهاء الوقت، احسب الوقت الكامل فوراً
        if (reason === "انتهاء الوقت") {
            timeSpent = safeInitial;
        } else {
            // لو تسليم يدوي، احسب الفرق
            const safeTimeLeft = timeLeft !== null ? timeLeft : 0;
            timeSpent = Math.max(0, safeInitial - safeTimeLeft);
        }

        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // 🔥 FIX 6: Robust Name Retrieval (State -> Storage -> Fallback)
        let finalStudentName = studentData.name;
        if (!finalStudentName) {
            const sessionKey = `exam_session_${courseId}_${studentData.uid}_${examId}`;
            const savedSession = JSON.parse(localStorage.getItem(sessionKey) || "{}");
            finalStudentName = savedSession.studentName || "طالب غير معروف";
        }

        // DEBUGGING LOGS (افتح الـ Console لو لسه فيه مشكلة)
        console.log("Submitting Result...", {
            name: finalStudentName,
            time: formattedTime,
            initial: initialDuration,
            left: timeLeft
        });

        const questionIds = questions.map(q => q.id);
        const answersAsText = {};
        const variantsMap = {};
        const currentAnswers = answersRef.current;

        questions.forEach(q => {
            if (currentAnswers[q.id] !== undefined) {
                const idx = currentAnswers[q.id];
                if (q.options[idx]) {
                    answersAsText[q.id] = q.options[idx].text;
                }
            }
            if (q.options) {
                variantsMap[q.id] = q.options.map(opt => opt.originalIdx);
            }
        });

        if (isCheating) await logCheater({ studentName: finalStudentName, section: courseData.section, reason, logs: cheatingHistory, deviceInfo });

        const result = await submitExamResult({
            studentName: finalStudentName,
            studentId: studentData.uid,
            section: courseData.section,
            courseId,
            answers: answersAsText,
            variants: variantsMap,
            timeTaken: formattedTime,
            cheatingLog: isCheating ? cheatingHistory : null,
            // 👇 التعديل هنا: بنبعت نوع التسليم
            submissionType: isCheating ? 'cheating' : 'manual',
            forcedStatus: isCheating ? `تم الطرد (${reason})` : "تم التسليم ✅",
            questionIds,
            deviceInfo,
            examCode: enteredCode || 'General',
            examId: examId,
            attemptNumber: attemptNumber
        });

        if (result.success) {
            const sessionKey = `exam_session_${courseId}_${studentData.uid}_${examId}`;
            localStorage.setItem(sessionKey, JSON.stringify({ finished: true }));
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
            if (isMountedRef.current) {
                const msg = `تم إنهاء الامتحان.\nالدرجة: ${result.score}/${result.total}\nالوقت المستغرق: ${formattedTime}`;
                if (result.score >= (result.total / 2)) {
                    alert(msg + "\n🎉 مبروك! يمكنك تحميل الشهادة من صفحة النتائج.");
                } else {
                    alert(msg);
                }
                setTimeout(() => { router.replace('/dashboard'); }, 100);
            }
        } else {
            alert("فشل التسليم. حاول مرة أخرى."); isSubmittingRef.current = false;
            if (isMountedRef.current) setStep('review');
        }
    };

    if (step === 'loading') return <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white"><div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    // --- Intro View ---
    if (step === 'intro') return (
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 dir-rtl" dir="rtl">
            <div className="bg-[#131B2E] max-w-2xl w-full rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                <h1 className="text-3xl font-black text-white mb-2 text-center">{courseData.name}</h1>

                <div className="bg-red-900/10 border border-red-500/20 p-5 rounded-2xl mb-6 mt-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Icons.Warning />
                        <h3 className="font-bold text-lg text-red-500">تعليمات هامة جداً قبل البدء</h3>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                        <li>🚫 <b>ممنوع الخروج من التبويب</b> أو تصغير المتصفح.</li>
                        <li>📷 <b>ممنوع التقاط صور</b> للشاشة (Screenshot/PrintScreen).</li>
                        <li>🖥️ <b>ممنوع تقسيم الشاشة</b> (Split Screen).</li>
                        <li>⚡ أي محاولة غش سيتم تسجيلها، وبعد <b>3 مخالفات</b> سيتم طردك فوراً.</li>
                        <li>⏱️ عداد الوقت يعمل تلقائياً ولن يتوقف إذا خرجت.</li>
                    </ul>
                </div>

                {requiredCode && (
                    <div className="mb-6 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                        <label className="block text-yellow-500 font-bold text-sm mb-2 text-center">🔒 أدخل كود الامتحان</label>
                        <input type="text" className="w-full p-3 bg-black/40 border border-yellow-500/30 rounded-lg text-center text-white font-bold tracking-widest outline-none focus:border-yellow-500" placeholder="CODE" value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} />
                    </div>
                )}
                <button onClick={handleStartExam} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 text-lg">أوافق على الشروط وأبدأ الامتحان 🚀</button>
            </div>
        </div>
    );

    const question = questions[currentQIndex];
    const progress = ((currentQIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answersIndices).length;
    const diffStyle = question ? getDifficultyColor(question.difficulty || question.level || 'easy') : {};

    // --- Quiz View ---
    return (
        <div className="min-h-screen bg-[#0B1120] text-gray-100 font-sans select-none relative flex flex-col md:flex-row" dir="rtl">

            <div className="fixed inset-0 pointer-events-none z-[50] overflow-hidden opacity-[0.03] flex flex-wrap content-center justify-center gap-20 rotate-[-20deg]">
                {Array(20).fill("").map((_, i) => (
                    <div key={i} className="text-gray-100 font-black text-4xl whitespace-nowrap">{studentData.name} - {studentData.uid.slice(0, 5)}</div>
                ))}
            </div>

            {warningModal.show && (
                <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="bg-[#131B2E] border-2 border-red-500 rounded-3xl p-8 max-w-md w-full text-center animate-pulse">
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

            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed top-3 right-3 z-[60] bg-[#131B2E] p-2.5 rounded-xl border border-white/20 shadow-lg">
                <Icons.Menu />
            </button>

            <aside className={`fixed md:sticky top-0 right-0 h-screen w-[75vw] max-w-[260px] md:w-64 md:max-w-none bg-[#131B2E] border-l border-white/10 z-[55] transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} flex flex-col`}>
                <div className="p-6 border-b border-white/10">
                    <h2 className="font-bold text-white text-lg mb-1">خريطة الأسئلة</h2>
                    <p className="text-xs text-gray-400">الأسئلة المحلولة باللون الأخضر</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setCurrentQIndex(idx); setStep('quiz'); setIsSidebarOpen(false); }}
                                className={`aspect-square rounded-lg font-bold text-sm transition-all ${idx === currentQIndex ? 'ring-2 ring-white bg-blue-600 text-white' :
                                    answersIndices[questions[idx].id] !== undefined ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-white/10">
                    <button onClick={() => setStep('review')} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition">
                        مراجعة وتسليم 🏁
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                <header className="h-14 md:h-16 bg-[#131B2E] border-b border-white/10 flex items-center justify-between px-3 md:px-10 z-40">
                    <div className="hidden md:flex items-center gap-4">
                        <h1 className="font-bold text-white truncate">{courseData.name}</h1>
                        {strikes > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">مخالفات: {strikes}/3</span>}
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 mr-auto md:mr-0">
                        {attemptNumber > 1 && <span className="text-[10px] md:text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg font-bold">المحاولة {attemptNumber}</span>}
                        {isSaving && <div className="hidden md:flex items-center gap-1 text-xs text-green-400 font-bold animate-pulse"><Icons.Cloud /> تم الحفظ</div>}
                        <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-xl font-mono font-bold text-sm md:text-lg border ${timeLeft < 300 ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                            <Icons.Clock />
                            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                    </div>
                </header>

                <div className="h-1 bg-[#0B1120] w-full"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div></div>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-32">
                    {step === 'review' ? (
                        <div className="max-w-3xl mx-auto bg-[#131B2E] rounded-3xl p-8 border border-white/10 text-center animate-fade-in">
                            <h2 className="text-3xl font-black text-white mb-2">مراجعة نهائية</h2>
                            <p className="text-gray-400 mb-8">أجبت على <span className="text-blue-400 font-bold">{answeredCount}</span> من <span className="text-white font-bold">{questions.length}</span> سؤال</p>
                            <button onClick={() => handleSubmit("تسليم يدوي")} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl text-xl shadow-lg hover:scale-[1.01] transition-transform">تأكيد وإنهاء الامتحان ✅</button>
                            <button onClick={() => setStep('quiz')} className="mt-4 text-gray-400 hover:text-white underline text-sm">العودة للأسئلة</button>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto animate-slide-up">
                            <div className="bg-[#131B2E] rounded-3xl shadow-xl border border-white/5 p-6 md:p-10 relative">
                                {question && (
                                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-2 ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}>
                                        {diffStyle.label}
                                    </div>
                                )}

                                {question?.image && <img src={question.image} alt="Q" className="max-h-60 mx-auto mb-6 rounded-lg object-contain bg-white/5" />}

                                <div className="text-xl md:text-2xl font-bold text-white mb-8 leading-loose text-center dir-rtl">
                                    <MathText text={question?.question || ''} />
                                </div>

                                <div className="grid gap-4">
                                    {question?.options.map((opt, idx) => {
                                        const isSelected = answersIndices[question.id] === idx;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswerSelect(question.id, idx)}
                                                className={`flex items-center p-5 rounded-2xl border-2 text-right transition-all group relative overflow-hidden
                                            ${isSelected
                                                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                                        : 'border-white/5 bg-[#0B1120] hover:bg-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 ml-4 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                                    {isSelected && <div className="w-3 h-3 bg-white rounded-full"></div>}
                                                </div>
                                                <span className="text-lg font-medium text-gray-200 dir-rtl"> <MathText text={opt.text} /></span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {step === 'quiz' && (
                    <div className="h-20 bg-[#131B2E] border-t border-white/10 flex items-center justify-between px-6 md:px-10 shrink-0 z-40">
                        <button onClick={() => setCurrentQIndex(p => Math.max(0, p - 1))} disabled={currentQIndex === 0} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 disabled:opacity-30 transition">السابق</button>
                        <div className="text-sm font-bold text-gray-500 hidden md:block">سؤال {currentQIndex + 1} من {questions.length}</div>
                        <button onClick={() => {
                            if (currentQIndex === questions.length - 1) setStep('review');
                            else setCurrentQIndex(p => p + 1);
                        }} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition ${currentQIndex === questions.length - 1 ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                            {currentQIndex === questions.length - 1 ? 'مراجعة 📝' : 'التالي ⬅️'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}