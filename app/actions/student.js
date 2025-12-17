'use server'

import { adminDb } from "@/lib/firebase-admin-config";
import { FieldValue } from "firebase-admin/firestore";
import { sendNotification } from "@/app/actions/notifications";

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

        for (const item of enrolled) {
            const courseSnap = await adminDb.collection('courses').doc(item.courseId).get();
            if (courseSnap.exists) {
                const cData = courseSnap.data();
                detailedCourses.push(serializeData({
                    ...item,
                    ...cData,
                    courseId: item.courseId,
                    courseName: cData.title || cData.name || cData.courseName,
                }));
            }
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

        const results = await Promise.all(resSnap.docs.map(async d => {
            const rData = d.data();
            
            // أ. نجيب إعدادات الكورس العامة (عشان الشهادة)
            let courseConfig = {};
            if (rData.courseId) {
                const configSnap = await adminDb.collection('exam_configs').doc(rData.courseId).get();
                if (configSnap.exists) courseConfig = configSnap.data();
            }

            // ب. نجيب إعدادات كود الامتحان (عشان زرار العين - المراجعة) 🔥 ده التعديل المهم
            let isReviewVisible = false;
            if (rData.examCode) {
                const codeSnap = await adminDb.collection('exam_settings').doc(rData.examCode).get();
                if (codeSnap.exists) {
                    isReviewVisible = codeSnap.data().isVisible === true;
                }
            }

            return {
                id: d.id,
                ...serializeData(rData),
                // هنا بنقوله المراجعة متاحة بس لو الأدمن فعل زرار العين للكود ده
                allowReview: isReviewVisible, 
                // والشهادة متاحة لو مفعلة في إعدادات الكورس العامة
                allowCertificate: courseConfig.enableCertificate === true 
            };
        }));

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
export async function getAllCourses(filters = {}) {
    try {
        let query = adminDb.collection('courses').where('active', '==', true);

        // 1. Filter by Mode (academic, revision, summer)
        if (filters.mode) {
            // Note: Old courses might be using isRevision/isVacation logic
            if (filters.mode === 'revision') {
                // Try to catch both new 'type' and old 'isRevision'
                // Firestore OR query is tricky, so we rely on client side filtering for mixed data 
                // OR we enforce the 'type' field in the new Admin code (which we did).
                query = query.where('type', '==', 'revision');
            } else if (filters.mode === 'summer') {
                query = query.where('type', '==', 'summer');
            } else if (filters.mode === 'academic') {
                 // For academic, we want strict university matching if provided
                 query = query.where('type', '==', 'academic');
            }
        }

        // 2. Filter by University Structure (Only for Academic/Revision)
        if (filters.mode !== 'summer') {
            if (filters.university) query = query.where('university', '==', filters.university);
            if (filters.college) query = query.where('college', '==', filters.college);
            if (filters.year) query = query.where('year', '==', filters.year);
            // Section filtering is usually done client-side because it's an array in DB or simple string
        }

        const snapshot = await query.get();

        const courses = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...serializeData(data),
                image: data.image || null,
            };
        });
        
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
export async function checkExamEligibility(studentId, courseId) {
    try {
        const userDoc = await adminDb.collection('users').doc(studentId).get();
        if (!userDoc.exists) return { allowed: false, message: "حساب غير موجود" };

        const userData = userDoc.data();
        if (userData.isLocked) return { allowed: false, message: "حسابك مجمد" };

        // 1. Check for EXCEPTIONS
        const exceptionId = `${courseId}_${studentId}`;
        const exceptionDoc = await adminDb.collection('exam_exceptions').doc(exceptionId).get();

        // 2. Initial Settings Fetch
        const settingsRef = adminDb.collection("exam_configs").doc(courseId);
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

        // ✅ لو فيه استثناء: اسمح بالدخول فوراً
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

        // 🔥🔥 4. إصلاح مشكلة التوقيت (Timezone Fix) 🔥🔥
        const now = Date.now();
        
        // بنزود 4 ساعات (بالمللي ثانية) على وقت السيرفر عشان نعادل فرق التوقيت
        // المعادلة: 4 ساعات * 60 دقيقة * 60 ثانية * 1000
        const TIMEZONE_OFFSET = 4 * 60 * 60 * 1000; 
        const serverTimeAdjusted = now + TIMEZONE_OFFSET;

        if (startDate) {
            const startTimestamp = new Date(startDate).getTime();
            // المقارنة بتتم بالوقت المعدل، فالسيرفر هيشوف الامتحان بدأ بدري
            if (serverTimeAdjusted < startTimestamp) {
                return { allowed: false, message: "الامتحان لم يبدأ بعد" };
            }
        }

        if (endDate) {
            const endTimestamp = new Date(endDate).getTime();
            if (serverTimeAdjusted > endTimestamp) {
                return { allowed: false, message: "انتهى وقت الامتحان" };
            }
        }

        // 5. التحقق هل امتحن قبل كده ولا لأ
        const resultId = `${courseId}_${studentId}_${examCode || 'General'}`;
        const resultDoc = await adminDb.collection("results").doc(resultId).get();

        if (resultDoc.exists) {
            const data = resultDoc.data();
            if (data.status.includes('Running')) return { allowed: true, resume: true, ...serializeData(data) };
            return { allowed: false, message: "لقد أديت هذا الامتحان مسبقاً" };
        }

        return { allowed: true, durationMinutes: durationMinutes, requiredCode: examCode };

    } catch (error) {
        return { allowed: false, message: "Server Error: " + error.message };
    }
}

export async function logExamStart(data) {
    try {
        const { studentName, studentId, courseId, section, examCode, deviceInfo } = data;
        const resultId = `${courseId}_${studentId}_${examCode || 'General'}`;

        // 1. تسجيل بداية الامتحان
        await adminDb.collection("results").doc(resultId).set({
            studentName, studentId, courseId, section,
            examCode: examCode || 'General',
            startTime: FieldValue.serverTimestamp(),
            status: "Running ⏳",
            score: 0, total: 0,
            cheatingLog: [],
            deviceInfo: deviceInfo || "Unknown"
        });

        // حذف الاستثناء إن وجد
        const exceptionId = `${courseId}_${studentId}`;
        await adminDb.collection('exam_exceptions').doc(exceptionId).delete().catch(() => {});
        
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

export async function getExamQuestions(courseId) {
    try {
        const settingsSnap = await adminDb.collection("exam_configs").doc(courseId).get();
        let limitCount = 20;

        if (settingsSnap.exists) {
            limitCount = settingsSnap.data().questionCount || 20;
        }

        const snapshot = await adminDb.collection('questions_bank').where('courseId', '==', courseId).get();
        if (snapshot.empty) return { success: false, message: "لا توجد أسئلة" };

        let allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Randomize questions (لخبطة الأسئلة نفسها)
        let selectedQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, limitCount);

        const cleanQuestions = selectedQuestions.map(q => {
            // 🔥 الإصلاح هنا:
            // 1. بنحتفظ بالترتيب الأصلي (originalIdx) قبل اللخبطة
            const optionsWithIndex = q.options.map((opt, idx) => ({
                text: opt.text,
                originalIdx: idx // 👈 ده المفتاح اللي كان ناقص
            }));

            // 2. نلخبط الاختيارات
            const shuffledOptions = optionsWithIndex.sort(() => Math.random() - 0.5);

            return {
                id: q.id,
                question: q.question,
                image: q.image,
                options: shuffledOptions, // نبعتها متلخبطة ومعاها مفاتيحها
                lecture: q.lecture,
                difficulty: q.difficulty || 'medium'
            };
        });

        return { success: true, data: cleanQuestions };

    } catch (error) {
        return { success: false, message: "فشل تحميل الأسئلة" };
    }
}

export async function submitExamResult(payload) {
    const { studentId, answers, timeTaken, cheatingLog, questionIds, variants, courseId, examCode, submissionType } = payload;

    try {
        if (!courseId || !studentId) throw new Error("Missing Data");

        const resultId = `${courseId}_${studentId}_${examCode || 'General'}`;
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

export async function verifyExamCodeServer(courseId, inputCode) {
    try {
        const configDoc = await adminDb.collection('exam_configs').doc(courseId).get();
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

export async function getLeaderboard(courseId, examCode) {
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