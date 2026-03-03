'use server'

import { adminDb } from "@/lib/firebase-admin-config";
import { FieldValue } from "firebase-admin/firestore";
import { sendNotification } from "@/app/actions/notifications";
import { unstable_cache } from "next/cache";

// دالة مساعدة لتحويل التواريخ لنصوص (عشان نحل مشكلة الـ Serialization)
const serializeData = (data) => {
    if (!data) return null;
    const serialized = { ...data };

    // قائمة الحقول المحتمل تكون تواريخ
    ['createdAt', 'updatedAt', 'enrolledAt', 'submittedAt', 'startTime', 'endTime', 'startDate', 'endDate'].forEach(field => {
        if (serialized[field] && serialized[field].toDate) {
            serialized[field] = serialized[field].toDate().toISOString();
        } else if (serialized[field] && serialized[field]._seconds) {
            // معالجة حالة خاصة لبعض أنواع التايم ستامب
            serialized[field] = new Date(serialized[field]._seconds * 1000).toISOString();
        }
    });
    return serialized;
};

// ==========================================================
// 📊 DASHBOARD & COURSES (بيانات الطالب والكورسات)
// ==========================================================

export async function getStudentDashboardData(uid) {
    try {
        if (!adminDb) throw new Error("Database connection failed");

        // 1. جلب بيانات الطالب
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (!userDoc.exists) return { success: false, message: "User not found" };

        const userData = userDoc.data();
        if (userData.isLocked) return { success: false, isLocked: true, message: "تم تجميد الحساب" };

        // 2. جلب الكورسات المشترك فيها
        const enrolled = userData.enrolledCourses || [];
        let detailedCourses = [];

        if (enrolled.length > 0) {
            const courseRefs = enrolled.map(item => adminDb.collection('courses').doc(item.courseId));
            const courseSnaps = await adminDb.getAll(...courseRefs);

            courseSnaps.forEach((courseSnap, index) => {
                if (courseSnap.exists) {
                    const cData = courseSnap.data();
                    const item = enrolled[index];
                    detailedCourses.push(serializeData({
                        ...item,
                        ...cData,
                        courseId: item.courseId,
                        courseName: cData.title || cData.name || cData.courseName,
                    }));
                }
            });
        }

        // 3. جلب الإعلانات
        const annSnap = await adminDb.collection('announcements').orderBy('createdAt', 'desc').limit(20).get();
        const myCourseIds = enrolled.map(c => c.courseId);

        const announcements = annSnap.docs
            .map(d => {
                const dData = d.data();
                return {
                    text: dData.text,
                    targetCourseId: dData.targetCourseId || null,
                    createdAt: dData.createdAt
                };
            })
            .filter(ann => !ann.targetCourseId || myCourseIds.includes(ann.targetCourseId))
            .slice(0, 5)
            .map(ann => serializeData(ann));

        // 4. جلب النتائج (مع قراءة حالة زرار العين 👁️)
        const resSnap = await adminDb.collection('results')
            .where('studentId', '==', uid)
            .orderBy('submittedAt', 'desc')
            .get();

        const uniqueCourseIds = [...new Set(resSnap.docs.map(d => d.data().courseId).filter(Boolean))];
        const uniqueExamCodes = [...new Set(resSnap.docs.map(d => d.data().examCode).filter(Boolean))];

        const configsMap = {};
        const settingsMap = {};

        if (uniqueCourseIds.length > 0) {
            const configRefs = uniqueCourseIds.map(id => adminDb.collection('exam_configs').doc(id));
            const configSnaps = await adminDb.getAll(...configRefs);
            configSnaps.forEach(snap => {
                if (snap.exists) configsMap[snap.id] = snap.data();
            });
        }

        if (uniqueExamCodes.length > 0) {
            const settingRefs = uniqueExamCodes.map(code => adminDb.collection('exam_settings').doc(code));
            const settingSnaps = await adminDb.getAll(...settingRefs);
            settingSnaps.forEach(snap => {
                if (snap.exists) settingsMap[snap.id] = snap.data();
            });
        }

        const results = resSnap.docs.map(d => {
            const rData = d.data();
            const courseConfig = rData.courseId ? (configsMap[rData.courseId] || {}) : {};
            const examSetting = rData.examCode ? (settingsMap[rData.examCode] || {}) : {};

            return {
                id: d.id,
                ...serializeData(rData),
                allowReview: examSetting.isVisible === true,
                allowCertificate: courseConfig.enableCertificate === true
            };
        });

        return {
            success: true,
            data: {
                user: {
                    uid: uid,
                    name: userData.name || userData.displayName || 'طالب',
                    university: userData.university || '',
                    college: userData.college || '',
                    year: userData.year || '',
                    section: userData.section || '',
                    isVacationMode: userData.isVacationMode || false,
                    vacationDetails: userData.vacationDetails || {},
                    role: userData.role,
                    isLocked: userData.isLocked || false
                },
                courses: detailedCourses,
                results: results, // النتائج بقت بتحتوي على allowReview و allowCertificate
                announcements: announcements,
                config: { minScore: 50 } // شيلنا enableCertificate الثابتة من هنا
            }
        };

    } catch (error) {
        console.error("Dashboard Error:", error);
        return { success: false, message: error.message };
    }
}

// ==========================================================
// 📈 2. تتبع تقدم الطالب (Progress & Views) - NEW PHASE 3
// ==========================================================

export async function getStudentCourseProgress(studentUid, courseId) {
    try {
        if (!studentUid || !courseId) throw new Error("Missing parameters");

        // 1. Fetch Video Views + Sessions
        const progressRef = adminDb.collection('user_progress').doc(`${studentUid}_${courseId}`);
        const progressSnap = await progressRef.get();
        const progressDoc = progressSnap.exists ? progressSnap.data() : {};
        const views = progressDoc.views || {};
        const sessions = progressDoc.sessions || {};

        // 2. Fetch Exam Results for this course
        const resultsSnap = await adminDb.collection('results')
            .where('studentId', '==', studentUid)
            .where('courseId', '==', courseId)
            .get();

        const exams = {};

        resultsSnap.docs.forEach(doc => {
            const data = doc.data();
            const eId = data.examId || data.examCode; // Fallback for older data
            if (!eId) return;

            // Filter out running exams from stats calculation
            if (data.status && data.status.includes('Running')) {
                // Just track that they attempted it
                if (!exams[eId]) {
                    exams[eId] = { highestScore: 0, totalScore: 0, fullMark: 0, attemptsStarted: 1, attemptsFinished: 0, isPassed: false };
                } else {
                    exams[eId].attemptsStarted += 1;
                }
                return;
            }

            const score = Number(data.score) || 0;
            const total = Number(data.total) || 1; // avoid division by zero
            const scorePercent = Math.round((score / total) * 100); // تحويل لنسبة مئوية
            // Get passScore from result doc if saved, else default to 50 for safety
            const passScore = data.passScore ? Number(data.passScore) : 50;

            if (!exams[eId]) {
                exams[eId] = {
                    highestScore: scorePercent,
                    totalScore: scorePercent,
                    fullMark: total,
                    attemptsStarted: 1,
                    attemptsFinished: 1,
                    isPassed: scorePercent >= passScore, // مقارنة نسبة مئوية بنسبة مئوية
                    passScore: passScore
                };
            } else {
                exams[eId].attemptsStarted += 1;
                exams[eId].attemptsFinished += 1;
                exams[eId].totalScore += scorePercent;
                if (scorePercent > exams[eId].highestScore) {
                    exams[eId].highestScore = scorePercent;
                }
                if (scorePercent >= passScore) {
                    exams[eId].isPassed = true; // Once passed, always passed
                }
            }
        });

        // Calculate averages + fetch maxAttempts from exam configs
        for (const eId of Object.keys(exams)) {
            const ex = exams[eId];
            ex.averageScore = ex.attemptsFinished > 0 ? Math.round(ex.totalScore / ex.attemptsFinished) : 0;

            // جلب maxAttempts من exam_configs
            try {
                const configSnap = await adminDb.collection('exam_configs').doc(eId).get();
                if (configSnap.exists) {
                    ex.maxAttempts = Number(configSnap.data().maxAttempts) || 1;
                } else {
                    ex.maxAttempts = 1;
                }
            } catch (e) {
                ex.maxAttempts = 1;
            }
            ex.remainingAttempts = Math.max(0, ex.maxAttempts - ex.attemptsFinished);
        }

        return { success: true, data: { views, sessions, exams } };

    } catch (error) {
        console.error("Progress fetch error:", error);
        return { success: false, message: error.message };
    }
}

export async function startVideoSession(studentUid, courseId, lessonKey) {
    try {
        if (!studentUid || !courseId || !lessonKey) throw new Error("Missing parameters");

        const progressRef = adminDb.collection('user_progress').doc(`${studentUid}_${courseId}`);
        const progressSnap = await progressRef.get();
        const progressDoc = progressSnap.exists ? progressSnap.data() : {};

        // 🛡️ Check if an active session already exists for this lesson
        const existingExpiry = progressDoc.sessions?.[lessonKey] || 0;
        if (Date.now() < existingExpiry) {
            // Session still active → no deduction, just return the existing expiry
            return { success: true, alreadyActive: true, expiresAt: existingExpiry };
        }

        // 🎟️ No active session → deduct 1 view and open a new 1-hour window
        const expiresAt = Date.now() + (60 * 60 * 1000); // 60 minutes from now

        await progressRef.set({
            views: {
                [lessonKey]: FieldValue.increment(1)
            },
            sessions: {
                [lessonKey]: expiresAt
            },
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, alreadyActive: false, expiresAt };
    } catch (error) {
        console.error("Start session error:", error);
        return { success: false, message: error.message };
    }
}

const getCachedActiveCourses = unstable_cache(
    async () => {
        const snapshot = await adminDb.collection('courses').where('active', '==', true).get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...serializeData(data),
                image: data.image || null,
            };
        });
    },
    ['all-active-courses'],
    { revalidate: 60, tags: ['courses'] }
);

export async function getAllCourses(filters = {}) {
    try {
        let courses = await getCachedActiveCourses();

        // 1. Filter by Mode (academic, revision, summer)
        if (filters.mode) {
            if (filters.mode === 'revision') {
                courses = courses.filter(c => c.type === 'revision');
            } else if (filters.mode === 'summer') {
                courses = courses.filter(c => c.type === 'summer');
            } else if (filters.mode === 'academic') {
                courses = courses.filter(c => c.type === 'academic');
            }
        }

        // 2. Filter by University Structure (Only for Academic/Revision)
        if (filters.mode !== 'summer') {
            if (filters.university) courses = courses.filter(c => c.university === filters.university);
            if (filters.college) courses = courses.filter(c => c.college === filters.college);
            if (filters.year) courses = courses.filter(c => c.year === filters.year);
        }

        // Additional Client-side filtering if Firestore limits are hit (e.g. section)
        let filteredCourses = courses;
        if (filters.section && filters.mode !== 'summer') {
            filteredCourses = courses.filter(c => !c.section || c.section === filters.section || c.section === 'عام');
        }

        return { success: true, data: filteredCourses };

    } catch (error) {
        console.error("Get All Courses Error:", error);
        return { success: false, message: error.message };
    }
}
// ==========================================================
// 📝 EXAM LOGIC (نظام الامتحانات)
// ==========================================================

export async function checkExamEligibility(studentId, courseId, examId) {
    try {
        const userDoc = await adminDb.collection('users').doc(studentId).get();
        if (!userDoc.exists) return { allowed: false, message: "حساب غير موجود" };

        const userData = userDoc.data();
        if (userData.isLocked) return { allowed: false, message: "حسابك مجمد" };

        // 1. Check for EXCEPTIONS
        const exceptionId = `${courseId}_${studentId}`;
        const exceptionDoc = await adminDb.collection('exam_exceptions').doc(exceptionId).get();

        // 2. Initial Settings Fetch
        const settingsRef = adminDb.collection("exam_configs").doc(examId || courseId);
        const settingsSnap = await settingsRef.get();

        let durationMinutes = 45;
        let examCode = "";
        let startDate = null;
        let endDate = null;

        if (settingsSnap.exists) {
            const d = settingsSnap.data();
            durationMinutes = d.examDuration || d.duration || d.time || 45;
            examCode = d.examCode || "";
            startDate = d.startDate;
            endDate = d.endDate;
        } else {
            const courseDoc = await adminDb.collection("courses").doc(courseId).get();
            if (courseDoc.exists) {
                const c = courseDoc.data();
                durationMinutes = c.examDuration || c.duration || 45;
            }
        }
        durationMinutes = Number(durationMinutes) || 45;

        // ✅ استثناء خاص
        if (exceptionDoc.exists) {
            return {
                allowed: true,
                durationMinutes: durationMinutes,
                isException: true,
                message: "تم تفعيل استثناء خاص لك"
            };
        }

        // 3. Normal Checks
        const enrolledCourses = userData.enrolledCourses || [];
        const courseStatus = enrolledCourses.find(c => c.courseId === courseId);

        if (!courseStatus) return { allowed: false, message: "غير مشترك في المادة" };
        if (courseStatus.status !== 'active') return { allowed: false, message: "اشتراكك غير مفعل بعد" };

        // 🔥🔥 4. ضبط التوقيت الدقيق (+2 ساعة - توقيت مصر) 🔥🔥
        const now = Date.now();

        // المعادلة: وقت السيرفر (جرينتش) + 2 ساعة = توقيت مصر الحالي
        const TIMEZONE_OFFSET = 2 * 60 * 60 * 1000;
        const serverTimeAdjusted = now + TIMEZONE_OFFSET;

        if (startDate) {
            const startTimestamp = new Date(startDate).getTime();
            // بنقارن وقت مصر (المحسوب) بوقت البدء المسجل
            if (serverTimeAdjusted < startTimestamp) {
                return { allowed: false, message: "الامتحان لم يبدأ بعد" };
            }
        }

        // ✅ شرط النهاية شغال سليم دلوقتي
        if (endDate) {
            const endTimestamp = new Date(endDate).getTime();
            // لو وقت مصر الحالي عدى وقت النهاية -> اقفل الامتحان
            if (serverTimeAdjusted > endTimestamp) {
                return { allowed: false, message: "انتهى وقت الامتحان" };
            }
        }

        // 5. التحقق من عدد المحاولات المسموح بها
        let maxAttempts = 1; // القيمة الافتراضية
        if (settingsSnap.exists) {
            const d = settingsSnap.data();
            maxAttempts = Number(d.maxAttempts) || 1;
        }

        // نجيب كل النتائج بتاعة الطالب ده في الامتحان ده
        // بنجيب كل نتائج الطالب في الكورس ونفلتر بالـ document ID
        const examKey = examId || examCode || 'General';
        const basePrefix = `${courseId}_${studentId}_${examKey}`;

        const allResultsSnap = await adminDb.collection('results')
            .where('studentId', '==', studentId)
            .where('courseId', '==', courseId)
            .get();

        // فلترة بالـ doc ID عشان نلاقي بس النتائج بتاعة الامتحان ده
        const matchingDocs = allResultsSnap.docs.filter(d => d.id.startsWith(basePrefix));

        // نعد المحاولات المخلصة والجارية
        let finishedAttempts = 0;
        let runningAttempt = null;

        matchingDocs.forEach(d => {
            const data = d.data();
            if (data.status && data.status.includes('Running')) {
                runningAttempt = { id: d.id, ...serializeData(data) };
            } else {
                finishedAttempts++;
            }
        });

        // لو فيه محاولة شغالة دلوقتي -> ارجع واكمل
        if (runningAttempt) {
            return { allowed: true, resume: true, ...runningAttempt, durationMinutes };
        }

        // لو خلص كل المحاولات -> امنعه
        if (finishedAttempts >= maxAttempts) {
            return { allowed: false, message: `لقد استنفذت جميع المحاولات (${finishedAttempts}/${maxAttempts})` };
        }

        // لسه عنده محاولات -> اسمحله يدخل
        const nextAttempt = finishedAttempts + 1;
        return {
            allowed: true,
            durationMinutes: durationMinutes,
            requiredCode: examCode,
            isRetake: nextAttempt > 1,
            attemptNumber: nextAttempt,
            maxAttempts: maxAttempts
        };

    } catch (error) {
        return { allowed: false, message: "Server Error: " + error.message };
    }
}
export async function logExamStart(data) {
    try {
        const { studentName, studentId, courseId, section, examCode, deviceInfo, examId, attemptNumber } = data;
        const attempt = attemptNumber || 1;
        const resultId = `${courseId}_${studentId}_${examId || examCode || 'General'}_attempt${attempt}`;

        // 1. تسجيل بداية الامتحان
        await adminDb.collection("results").doc(resultId).set({
            studentName, studentId, courseId, section,
            examCode: examCode || 'General',
            examId: examId || '',
            attemptNumber: attempt,
            startTime: FieldValue.serverTimestamp(),
            status: "Running ⏳",
            score: 0, total: 0,
            cheatingLog: [],
            deviceInfo: deviceInfo || "Unknown"
        });

        // حذف الاستثناء إن وجد
        const exceptionId = `${courseId}_${studentId}`;
        await adminDb.collection('exam_exceptions').doc(exceptionId).delete().catch(() => { });

        // 🔥🔥 الجزء الجديد: إشعار للأدمن 🔥🔥
        // بنجيب بيانات الكورس عشان نعرف مين صاحب الكورس (instructorId)
        const courseDoc = await adminDb.collection('courses').doc(courseId).get();
        if (courseDoc.exists) {
            const courseData = courseDoc.data();
            const instructorId = courseData.instructorId;
            const courseName = courseData.title || courseData.name || "الكورس";

            if (instructorId) {
                await sendNotification({
                    recipientId: instructorId, // ابعت للأدمن
                    title: "بدء امتحان 🚀",
                    body: `الطالب (${studentName}) بدأ امتحان مادة: ${courseName} الآن.`,
                    type: "info", // لون أزرق
                    link: "/admin" // يوديه للوحة التحكم
                });
            }
        }
        // 🔥🔥 نهاية التعديل 🔥🔥

        return { success: true };

    } catch (error) { return { success: false }; }
}

export async function getExamQuestions(courseId, examId) {
    try {
        // 1. جلب الإعدادات اللي أنت عملتها في الـ Admin
        const settingsSnap = await adminDb.collection("exam_configs").doc(examId || courseId).get();
        if (!settingsSnap.exists) return { success: false, message: "لم يتم ضبط إعدادات الامتحان" };

        const settings = settingsSnap.data();
        const {
            includedLectures = [],
            easyPercent = 30,
            mediumPercent = 50,
            questionCount = 20
        } = settings;

        // 2. جلب كل الأسئلة المتاحة للمادة من البنك
        const snapshot = await adminDb.collection('questions_bank').where('courseId', '==', courseId).get();
        if (snapshot.empty) return { success: false, message: "بنك الأسئلة فارغ لهذه المادة" };

        let allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. فلترة الأسئلة بناءً على المحاضرات المختارة (Chapters)
        let filteredPool = allQuestions;
        if (includedLectures.length > 0) {
            filteredPool = allQuestions.filter(q => includedLectures.includes(q.lecture));
        }

        // 4. تقسيم الأسئلة المفلترة حسب الصعوبة
        const easyPool = filteredPool.filter(q => q.difficulty === 'easy' || q.difficulty === 'سهل').sort(() => Math.random() - 0.5);
        const mediumPool = filteredPool.filter(q => q.difficulty === 'medium' || q.difficulty === 'متوسط').sort(() => Math.random() - 0.5);
        const hardPool = filteredPool.filter(q => q.difficulty === 'hard' || q.difficulty === 'صعب').sort(() => Math.random() - 0.5);

        // 5. حساب عدد الأسئلة المطلوب من كل مستوى بناءً على النسب المئوية
        const countEasy = Math.round((easyPercent / 100) * questionCount);
        const countMedium = Math.round((mediumPercent / 100) * questionCount);
        const countHard = questionCount - (countEasy + countMedium); // الباقي للصعب

        // 6. تجميع الأسئلة النهائية
        let finalQuestions = [
            ...easyPool.slice(0, countEasy),
            ...mediumPool.slice(0, countMedium),
            ...hardPool.slice(0, countHard)
        ];

        // 7. لو لسه العدد أقل من المطلوب (بسبب نقص في البنك)، كمل من المتاح عشوائياً
        if (finalQuestions.length < questionCount) {
            const currentIds = finalQuestions.map(q => q.id);
            const remaining = filteredPool.filter(q => !currentIds.includes(q.id));
            finalQuestions = [...finalQuestions, ...remaining.slice(0, questionCount - finalQuestions.length)];
        }

        // 8. لخبطة الأسئلة النهائية ولخبطة الاختيارات (عشان كل طالب يجيله ترتيب مختلف)
        const readyQuestions = finalQuestions.sort(() => Math.random() - 0.5).map(q => {
            const optionsWithIndex = q.options.map((opt, idx) => ({
                text: opt.text,
                originalIdx: idx
            }));
            const shuffledOptions = optionsWithIndex.sort(() => Math.random() - 0.5);

            return {
                id: q.id,
                question: q.question,
                image: q.image,
                options: shuffledOptions,
                lecture: q.lecture,
                difficulty: q.difficulty
            };
        });

        return { success: true, data: readyQuestions };

    } catch (error) {
        console.error("Exam Generation Error:", error);
        return { success: false, message: "حدث خطأ أثناء توليد الأسئلة" };
    }
}

export async function submitExamResult(payload) {
    const { studentId, answers, timeTaken, cheatingLog, questionIds, variants, courseId, examCode, submissionType, examId, attemptNumber } = payload;

    try {
        if (!courseId || !studentId) throw new Error("Missing Data");

        const attempt = attemptNumber || 1;
        const resultId = `${courseId}_${studentId}_${examId || examCode || 'General'}_attempt${attempt}`;
        const questionsRef = adminDb.collection('questions_bank');

        const snapshot = await questionsRef.where('courseId', '==', courseId).get();
        const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let score = 0;
        const targetIds = (questionIds && Array.isArray(questionIds)) ? questionIds : allQuestions.map(q => q.id);
        const questionsToGrade = allQuestions.filter(q => targetIds.includes(q.id));

        questionsToGrade.forEach(q => {
            const studentAns = answers[q.id];
            const correctOpt = q.options.find(o => o.isCorrect);
            if (studentAns && correctOpt && studentAns === correctOpt.text) {
                score += 1;
            }
        });

        const cleanVariants = JSON.parse(JSON.stringify(variants || {}));
        const cleanAnswers = JSON.parse(JSON.stringify(answers || {}));

        let finalStatus = "تم التسليم ✅";
        if (submissionType === 'cheating') {
            finalStatus = "تم الإلغاء (غش) 🚫";
        }

        await adminDb.collection("results").doc(resultId).set({
            score,
            total: questionsToGrade.length,
            timeTaken,
            cheatingLog: cheatingLog || [],
            status: finalStatus,
            answers: cleanAnswers,
            questionIds: targetIds,
            variants: cleanVariants,
            attemptNumber: attempt,
            submittedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // إشعار للطالب
        await sendNotification({
            recipientId: studentId,
            title: "تم تصحيح الامتحان 📝",
            body: `أنهيت امتحان ${examCode || 'العام'}. درجتك: ${score}/${questionsToGrade.length}`,
            type: score >= (questionsToGrade.length / 2) ? "success" : "warning",
            link: `/dashboard`
        });

        // 🔥🔥 الجزء الجديد: إشعار للأدمن 🔥🔥
        const courseDoc = await adminDb.collection('courses').doc(courseId).get();
        if (courseDoc.exists) {
            const courseData = courseDoc.data();
            const instructorId = courseData.instructorId;
            const courseName = courseData.title || courseData.name || "الكورس";

            // هنجيب اسم الطالب من بيانات المستخدم عشان الرسالة تكون واضحة
            const userDoc = await adminDb.collection('users').doc(studentId).get();
            const studentName = userDoc.exists ? (userDoc.data().name || "طالب") : "طالب";

            if (instructorId) {
                const isCheating = submissionType === 'cheating';

                await sendNotification({
                    recipientId: instructorId,
                    title: isCheating ? "حالة غش 🚨" : "تسليم امتحان 🏁",
                    body: `الطالب (${studentName}) ${isCheating ? 'تم إغلاق امتحانه بسبب الغش' : 'سلم الامتحان'}. الدرجة: ${score}/${questionsToGrade.length} في مادة: ${courseName}`,
                    type: isCheating ? "error" : "success", // أحمر لو غش، أخضر لو تسليم عادي
                    link: "/admin"
                });
            }
        }
        // 🔥🔥 نهاية التعديل 🔥🔥

        return { success: true, score, total: questionsToGrade.length };

    } catch (error) {
        console.error("Submit Error:", error);
        return { success: false, message: error.message };
    }
}
export async function logCheater(data) {
    try {
        await adminDb.collection("cheating_logs").add({ ...data, timestamp: FieldValue.serverTimestamp() });
        return { success: true };
    } catch (e) { return { success: false }; }
}

export async function verifyExamCodeServer(courseId, inputCode, examId) {
    try {
        const configDoc = await adminDb.collection('exam_configs').doc(examId).get();
        const serverCode = configDoc.exists ? configDoc.data().examCode : "";
        if (String(inputCode).trim() === String(serverCode).trim()) return { success: true };
        return { success: false, message: "الكود غير صحيح" };
    } catch (error) { return { success: false }; }
}

// ==========================================================
// 💳 SUBSCRIPTION & REQUESTS (الاشتراك والدفع)
// ==========================================================
export async function enrollStudent(uid, courseId, selectedMethod) {
    try {
        const userRef = adminDb.collection('users').doc(uid);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {}; // 🔥 جبنا بيانات الطالب

        const courseSnap = await adminDb.collection('courses').doc(courseId).get();
        const courseData = courseSnap.exists ? courseSnap.data() : {};

        const currentCourses = userData.enrolledCourses || [];
        if (currentCourses.some(c => c.courseId === courseId)) {
            return { success: false, message: "مشترك بالفعل" };
        }

        currentCourses.push({
            courseId,
            status: 'pending',
            paid: false,
            enrolledAt: new Date().toISOString(),
            paymentMethod: selectedMethod || 'center',
            paymentDetailsSnapshot: {
                price: Number(courseData.price) || 0,
                paymentNumber: courseData.paymentNumber || '',
                contactPhone: courseData.contactPhone || ''
            }
        });

        await userRef.update({ enrolledCourses: currentCourses });

        // 🔔 إشعار للأدمن (التعديل هنا)
        if (courseData.instructorId) {
            // 🔥 جبنا الاسم الحقيقي للطالب هنا
            const studentName = userData.name || "طالب غير مسجل";

            await sendNotification({
                recipientId: courseData.instructorId,
                title: "طلب اشتراك جديد 🆕",
                // 🔥 حطينا الاسم في الرسالة
                body: `الطالب (${studentName}) طلب الاشتراك في كورس: ${courseData.title || courseData.name}`,
                type: "info",
                link: "/admin"
            });
        }

        return { success: true };

    } catch (error) { return { success: false, message: error.message }; }
}
export async function cancelCourseRequest(uid, courseId) {
    try {
        const userRef = adminDb.collection('users').doc(uid);
        const userSnap = await userRef.get();
        let courses = userSnap.data().enrolledCourses || [];

        const newCourses = courses.filter(c => c.courseId !== courseId);
        await userRef.update({ enrolledCourses: newCourses });
        return { success: true };
    } catch (e) { return { success: false }; }

}

// ==========================================================
// 🏆 LEADERBOARD & UTILS (لوحة الشرف)
// ==========================================================

export async function getLeaderboard(courseId) {
    try {
        const resultsRef = adminDb.collection("results");
        let q = resultsRef.where("courseId", "==", courseId);
        // if (examCode) q = q.where("examCode", "==", examCode); // Optional filtering by code

        const snapshot = await q.get();
        let data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                name: d.studentName || "طالب",
                score: d.score || 0,
                timeTaken: d.timeTaken || "0:00",
                status: d.status || ""
            };
        });

        // ترتيب وتصفية: الأول بالأعلى درجة، ثم بالأسرع وقتاً
        data = data.filter(r => !r.status.includes("Running"))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                // Simple string comparison for time (not perfect but works for mm:ss if consistent)
                return a.timeTaken.localeCompare(b.timeTaken);
            })
            .slice(0, 10);

        return { success: true, data: data };
    } catch (error) { return { success: false }; }
}

export async function checkExamCodeVisibility(examCode) {
    try {
        if (!examCode) return false;
        const docSnap = await adminDb.collection("exam_settings").doc(examCode).get();
        return docSnap.exists ? docSnap.data().isVisible : false;
    } catch (error) { return false; }
}

export async function getCourseDetails(courseId, uid) {
    try {
        // 1. Fetch course first (needed regardless of enrollment)
        const docRef = adminDb.collection('courses').doc(courseId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return { success: false, message: "الكورس غير موجود" };

        const data = docSnap.data();
        const baseData = {
            id: docSnap.id,
            ...serializeData(data),
            modules: data.modules || []
        };

        // 2. Check enrollment status
        let isEnrolled = false;
        if (uid) {
            const userSnap = await adminDb.collection('users').doc(uid).get();
            if (userSnap.exists) {
                const enrollment = (userSnap.data().enrolledCourses || [])
                    .find(c => c.courseId === courseId);
                isEnrolled = !!(enrollment && enrollment.status === 'active');
            }
        }

        // 3a. Active subscriber → return full data
        if (isEnrolled) {
            return { success: true, data: { ...baseData, isLocked: false } };
        }

        // 3b. Non-enrolled / pending → sanitize sensitive fields, set isLocked = true
        const sanitizedModules = (data.modules || []).map(module => ({
            ...module,
            lessons: (module.lessons || []).map(lesson => ({
                title: lesson.title,
                type: lesson.type,
                description: lesson.description || null,
                duration: lesson.duration || null,
                link: lesson.isFree ? lesson.link : null,    // 🔒 hidden unless free preview
                examId: lesson.isFree ? lesson.examId : null,  // 🔒 hidden unless free preview
                isFree: lesson.isFree || false
            }))
        }));

        return {
            success: true,
            data: { ...baseData, modules: sanitizedModules, isLocked: true }
        };

    } catch (error) {
        console.error("Get Course Details Error:", error);
        return { success: false, message: error.message };
    }
}

// 🧠 جلب أسئلة بنك الأسئلة للطالب (لمادة معينة)
export async function getStudentQuestions(courseId) {
    try {
        const q = adminDb.collection('questions_bank').where('courseId', '==', courseId);
        const snap = await q.get();

        const questions = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString() || null
        }));

        return { success: true, data: questions };
    } catch (error) {
        console.error("Fetch Student Questions Error:", error);
        return { success: false, message: error.message };
    }
}