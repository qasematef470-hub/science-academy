"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin-config"; 
import { FieldValue } from "firebase-admin/firestore";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeazuxf16mCi6iohy9Vz7Win8ZzVDqVxGaY80YPCc_C-FE_G2sgUeew6S77kBG69Xmzg/exec";

// ==========================================================
// 1️⃣ EXAM LOGIC (نظام الامتحانات - Multi-Course Update)
// ==========================================================

export async function checkExamEligibility(studentId, courseId) {
  try {
    if (!adminDb) throw new Error("Database Connection Failed");

    const userDoc = await adminDb.collection('users').doc(studentId).get();
    if (!userDoc.exists) return { allowed: false, message: "حساب الطالب غير موجود." };
    
    const userData = userDoc.data();
    if (userData.isLocked) return { allowed: false, message: "⛔ حسابك مجمد بالكامل. راجع الإدارة." };

    const enrolledCourses = userData.enrolledCourses || [];
    const courseStatus = enrolledCourses.find(c => c.courseId === courseId);

    if (!courseStatus) return { allowed: false, message: "⛔ أنت غير مسجل في هذه المادة." };
    if (courseStatus.status === 'banned') return { allowed: false, message: "⛔ أنت محروم من أداء امتحانات هذه المادة بسبب مخالفة سابقة." };
    if (courseStatus.status === 'pending') return { allowed: false, message: "⏳ المادة في انتظار تفعيل الأدمن." };

    const specialAccessId = `${courseId}_${studentId}`;
    const accessDoc = await adminDb.collection("special_access").doc(specialAccessId).get();
    const hasSpecialAccess = accessDoc.exists && accessDoc.data().allow === true;

    // 🔥 TWEAKED: القراءة من إعدادات المادة المحددة بدلاً من الإعدادات العامة
    // Old: adminDb.collection("settings").doc("config")
    const settingsRef = adminDb.collection("exam_configs").doc(courseId);
    const settingsSnap = await settingsRef.get();
    
    let durationMinutes = 45; 
    let examCode = "";
    
    if (settingsSnap.exists) {
      const d = settingsSnap.data();
      durationMinutes = d.examDuration || 45;
      examCode = d.examCode || "";

      if (!hasSpecialAccess) {
          const now = new Date().getTime();
          const start = d.startDate ? new Date(d.startDate).getTime() : null;
          const end = d.endDate ? new Date(d.endDate).getTime() : null;

          if (start && now < start) return { allowed: false, message: `⏳ الامتحان لم يبدأ بعد. (الموعد: ${new Date(start).toLocaleString('ar-EG')})` };
          if (end && now > end) return { allowed: false, message: "⛔ انتهى وقت الامتحان الرسمي." };
      }
    } else {
        // Fallback: لو مفيش إعدادات محفوظة للمادة دي، ندي قيم افتراضية عشان السيستم مايقعش
        // ممكن هنا نقرر نمنع الامتحان لو مفيش إعدادات، بس للأمان هنخليه 45 دقيقة
        durationMinutes = 45;
    }

    const currentCodeCheck = examCode || 'General';
    const resultId = `${courseId}_${studentId}_${currentCodeCheck}`;
    
    const resultDoc = await adminDb.collection("results").doc(resultId).get();

    if (resultDoc.exists) {
      const data = resultDoc.data();
      if (hasSpecialAccess) {
          return { allowed: true, durationMinutes: Number(durationMinutes), requiredCode: examCode, isRetake: true };
      }
      if (data.status === 'Running' || data.status.includes('⏳')) {
          return { allowed: true, resume: true, ...data };
      }
      return { allowed: false, message: "⛔ لقد قمت بتأدية هذا الامتحان بهذا الكود مسبقاً." };
    }

    return { allowed: true, durationMinutes: Number(durationMinutes), requiredCode: examCode };
  } catch (error) {
    return { allowed: false, message: "Server Error: " + error.message };
  }
}

export async function logExamStart(data) {
  try {
    const { studentName, studentId, courseId, section, courseName, examCode, deviceInfo } = data;
    
    const specialAccessId = `${courseId}_${studentId}`;
    const accessDocRef = adminDb.collection("special_access").doc(specialAccessId);
    const accessDoc = await accessDocRef.get();
    if (accessDoc.exists && accessDoc.data().allow) {
        await accessDocRef.delete(); 
    }

    const resultId = `${courseId}_${studentId}_${examCode || 'General'}`;

    await adminDb.collection("results").doc(resultId).set({
        studentName,
        studentId,
        courseId,
        section,
        examCode: examCode || 'General',
        startTime: FieldValue.serverTimestamp(),
        status: "Running ⏳", 
        score: 0,
        total: 0,
        cheatingLog: [],
        deviceInfo: deviceInfo || "Unknown"
    });

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: studentName,
            section: section,
            status: `بدأ امتحان ${courseName || ''} (${examCode}) ⏳`,
            score: "-",
            timeTaken: "-"
        }),
    }).catch(() => {}); 

    return { success: true };
  } catch (error) { 
    console.error("Exam Start Error:", error); 
    return { success: false }; 
  }
}

// 🔥🔥 دالة جلب الأسئلة (معدلة لدعم تعدد المواد) 🔥🔥
export async function getExamQuestions(courseId) {
  try {
    if (!adminDb) throw new Error("DB Error");

    // 🔥 TWEAKED: جلب الإعدادات الخاصة بالمادة (Exam Configs) بدلاً من الـ Global Config
    const settingsSnap = await adminDb.collection("exam_configs").doc(courseId).get();
    
    let limitCount = 20;
    let dist = { easy: 0, medium: 0, hard: 0 }; 
    let includedLectures = []; 

    if (settingsSnap.exists) {
        const d = settingsSnap.data();
        limitCount = d.questionCount || 20;
        includedLectures = d.includedLectures || []; 
        
        if (d.easyPercent || d.mediumPercent || d.hardPercent) {
            dist.easy = Math.floor((d.easyPercent || 0) / 100 * limitCount);
            dist.hard = Math.floor((d.hardPercent || 0) / 100 * limitCount);
            dist.medium = limitCount - dist.easy - dist.hard;
        }
    }

    const questionsRef = adminDb.collection('questions_bank');
    const snapshot = await questionsRef.where('courseId', '==', courseId).get();
    
    if (snapshot.empty) return { success: false, message: "No Questions Found" };

    // 1. تحويل الداتا
    let allQuestions = snapshot.docs.map(doc => {
      const data = doc.data();
      const optionsWithIndex = data.options ? data.options.map((opt, idx) => ({ 
          text: opt.text,       
          originalIdx: idx      
      })) : [];

      const shuffledOptions = optionsWithIndex.sort(() => Math.random() - 0.5);
      return { 
          id: doc.id, 
          question: data.question, 
          image: data.image, 
          options: shuffledOptions,
          difficulty: data.difficulty || 'medium',
          lecture: data.lecture || "" 
      };
    });

    // 2. الفلترة حسب المحاضرات (لو محددة)
    if (includedLectures.length > 0) {
        allQuestions = allQuestions.filter(q => includedLectures.includes(q.lecture));
    }

    if (allQuestions.length === 0) return { success: false, message: "لا توجد أسئلة في المحاضرات المحددة." };

    // 3. منطق الصعوبة والعدد (كما هو)
    let finalExamQuestions = [];

    if (dist.easy === 0 && dist.medium === 0 && dist.hard === 0) {
        finalExamQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, limitCount);
    } else {
        const easyQs = allQuestions.filter(q => q.difficulty === 'easy').sort(() => Math.random() - 0.5);
        const mediumQs = allQuestions.filter(q => q.difficulty === 'medium').sort(() => Math.random() - 0.5);
        const hardQs = allQuestions.filter(q => q.difficulty === 'hard').sort(() => Math.random() - 0.5);

        const selectedEasy = easyQs.slice(0, dist.easy);
        const selectedMedium = mediumQs.slice(0, dist.medium);
        const selectedHard = hardQs.slice(0, dist.hard);

        let pool = [...selectedEasy, ...selectedMedium, ...selectedHard];

        if (pool.length < limitCount) {
            const usedIds = new Set(pool.map(q => q.id));
            const remaining = allQuestions.filter(q => !usedIds.has(q.id)).sort(() => Math.random() - 0.5);
            const needed = limitCount - pool.length;
            pool = [...pool, ...remaining.slice(0, needed)];
        }
        
        finalExamQuestions = pool.sort(() => Math.random() - 0.5);
    }

    return { success: true, data: finalExamQuestions };
  } catch (error) {
    return { success: false, message: "فشل تحميل الأسئلة" };
  }
}

// دالة لجلب المحاضرات (للاستخدام في الأدمن)
export async function getUniqueLectures(courseId) {
    try {
        if (!adminDb) return { success: false, data: [] };
        const snapshot = await adminDb.collection('questions_bank').where('courseId', '==', courseId).get();
        
        const lectures = new Set();
        snapshot.docs.forEach(doc => {
            const l = doc.data().lecture;
            if (l) lectures.add(l);
        });

        return { success: true, data: Array.from(lectures) };
    } catch (e) {
        return { success: false, data: [] };
    }
}

export async function submitExamResult(payload) {
  const { studentId, answers, timeTaken, cheatingLog, forcedStatus, questionIds, variants, courseId, deviceInfo, examCode } = payload;
  
  try {
    if (!adminDb) throw new Error("DB Error");
    
    const resultId = `${courseId}_${studentId}_${examCode || 'General'}`;

    const questionsRef = adminDb.collection('questions_bank');
    const snapshot = await questionsRef.where('courseId', '==', courseId).get();
    const allCourseQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let finalScore = 0;
    const safeQuestionIds = Array.isArray(questionIds) ? questionIds : [];
    
    const questionsToGrade = allCourseQuestions.filter(q => safeQuestionIds.includes(q.id));
    const totalQuestions = questionsToGrade.length > 0 ? questionsToGrade.length : Object.keys(answers || {}).length;

    questionsToGrade.forEach(q => {
      const studentAnswerText = answers[q.id];
      const correctOption = q.options.find(opt => opt.isCorrect); 
      if (studentAnswerText && correctOption && studentAnswerText === correctOption.text) {
        finalScore += 1;
      }
    });

    const finalStatus = forcedStatus || (cheatingLog && cheatingLog.length >= 3 ? "تم الطرد (غش) 🚫" : "تم التسليم ✅");

    await adminDb.collection("results").doc(resultId).set({
      studentId: studentId || "unknown",
      courseId,
      score: finalScore,
      total: totalQuestions,
      timeTaken,
      cheatingLog: cheatingLog || [],
      status: finalStatus,
      deviceInfo: deviceInfo || "Unknown",
      examCode: examCode || 'General',
      questionIds: safeQuestionIds,
      variants: variants || {}, 
      answers: answers || {},      
      endTime: FieldValue.serverTimestamp(),
      submittedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, score: finalScore, total: totalQuestions };
  } catch (error) {
    console.error("Submit Error:", error);
    return { success: false, message: error.message };
  }
}

export async function logCheater(data) {
    try {
        if (!adminDb) return { success: false };
        await adminDb.collection("cheating_logs").add({ ...data, timestamp: FieldValue.serverTimestamp() });
        return { success: true };
    } catch (e) { return { success: false }; }
}

// ==========================================
// 2️⃣ ADMIN ACTIONS
// ==========================================

// 🔥 NEW: حفظ إعدادات الامتحان لكل مادة على حدة
export async function saveCourseSettings(courseId, settingsData) {
    try {
        await adminDb.collection("exam_configs").doc(courseId).set(settingsData, { merge: true });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// 🔥 NEW: جلب إعدادات الامتحان لمادة معينة
export async function getCourseSettings(courseId) {
    try {
        const docSnap = await adminDb.collection("exam_configs").doc(courseId).get();
        if (docSnap.exists) {
            return { success: true, data: docSnap.data() };
        }
        return { success: true, data: null }; // Return null if no config yet
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export async function toggleUserLock(uid, shouldLock) {
  try {
    if (!adminDb || !adminAuth) throw new Error("Server Config Error");
    await adminDb.collection('users').doc(uid).update({ isLocked: shouldLock });
    await adminAuth.updateUser(uid, { disabled: shouldLock });
    return { success: true, message: shouldLock ? "تم تجميد الحساب 🔒" : "تم فك التجميد 🔓" };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function adminResetPassword(uid, newPassword) {
  try {
    if (!adminAuth) throw new Error("Auth Config Error");
    await adminAuth.updateUser(uid, { password: newPassword });
    return { success: true, message: "✅ تم تغيير كلمة المرور بنجاح" };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function updateCourseStatus(uid, courseId, newStatus) {
  try {
    if (!adminDb) throw new Error("DB Error");
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("User not found");
    let courses = userSnap.data().enrolledCourses || [];
    const courseIndex = courses.findIndex(c => c.courseId === courseId);
    if (courseIndex > -1) {
        if (newStatus === 'rejected') courses = courses.filter(c => c.courseId !== courseId);
        else courses[courseIndex].status = newStatus;
    }
    await userRef.update({ enrolledCourses: courses });
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function toggleReviewAnswers(allowed) {
    try {
        // Warning: This is still global config. 
        // If you want review per course, we should move it to exam_configs as well.
        // For now, kept as requested.
        await adminDb.collection("settings").doc("config").update({ allowReview: allowed });
        return { success: true };
    } catch (e) { return { success: false }; }
}

export async function toggleExamCodeVisibility(examCode, isVisible) {
  try {
    if (!adminDb) throw new Error("DB Error");
    await adminDb.collection("exam_settings").doc(examCode).set({
      isVisible: isVisible
    }, { merge: true });
    return { success: true };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function checkExamCodeVisibility(examCode) {
  try {
    if (!examCode) return false;
    const docSnap = await adminDb.collection("exam_settings").doc(examCode).get();
    return docSnap.exists ? docSnap.data().isVisible : false;
  } catch (error) { return false; }
}

export async function toggleSpecialAccess(studentId, courseId, allow) {
    try {
        const id = `${courseId}_${studentId}`;
        if (allow) {
            await adminDb.collection("special_access").doc(id).set({ allow: true, createdAt: FieldValue.serverTimestamp() });
        } else {
            await adminDb.collection("special_access").doc(id).delete();
        }
        return { success: true };
    } catch (error) { return { success: false, message: error.message }; }
}

export async function getLeaderboard(courseId, examCode) {
    try {
        const resultsRef = adminDb.collection("results");
        
        let q = resultsRef.where("courseId", "==", courseId);
        if (examCode) q = q.where("examCode", "==", examCode);

        const snapshot = await q.get();
        
        if (snapshot.empty) return { success: true, data: [] };

        let data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                name: d.studentName || "طالب",
                score: d.score || 0,
                total: d.total || 0,
                timeTaken: d.timeTaken || "-",
                status: d.status || "",
                submittedAt: d.submittedAt ? d.submittedAt.toDate().toISOString() : null,
                _timestamp: d.submittedAt ? d.submittedAt.toMillis() : 0 
            };
        });

        data = data
            .filter(r => r.status && !r.status.includes("Running") && !r.status.includes("طرد")) 
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score; 
                }
                return a._timestamp - b._timestamp; 
            });

        const cleanData = data.map(({ _timestamp, ...rest }) => rest);

        return { success: true, data: cleanData.slice(0, 10) };

    } catch (error) { 
        console.error("Leaderboard Error:", error);
        return { success: false, message: error.message }; 
    }
}

export async function getAllCourses() {
  try {
    if (!adminDb) throw new Error("DB Error");
    const snapshot = await adminDb.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: courses };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function enrollStudent(studentId, courseId) {
  try {
    if (!adminDb) throw new Error("DB Error");
    const userRef = adminDb.collection('users').doc(studentId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) return { success: false, message: "User not found" };

    let currentCourses = userSnap.data().enrolledCourses || [];
    
    const exists = currentCourses.find(c => c.courseId === courseId);
    if (exists) return { success: false, message: "أنت مشترك بالفعل أو الطلب قيد المراجعة" };

    currentCourses.push({
        courseId: courseId,
        status: 'pending',
        enrolledAt: new Date().toISOString() 
    });

    await userRef.update({ enrolledCourses: currentCourses });
    return { success: true };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function deleteStudentAccount(uid) {
  try {
    if (!adminDb || !adminAuth) throw new Error("Server Config Error");
    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();
    return { success: true, message: "تم حذف الطالب بنجاح" };
  } catch (error) {
    return { success: false, message: "فشل الحذف: " + error.message };
  }
}

export async function addAnnouncement(text) {
    try {
        await adminDb.collection("announcements").add({
            text,
            createdAt: FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (e) { return { success: false }; }
}

export async function getAnnouncements() {
    try {
        const q = adminDb.collection("announcements").orderBy("createdAt", "desc").limit(5);
        const snap = await q.get();
        const data = snap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                text: d.text,
                createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : null 
            };
        });
        return { success: true, data: data };
    } catch (e) { return { success: false, data: [] }; }
}

export async function deleteAnnouncement(id) {
    try {
        await adminDb.collection("announcements").doc(id).delete();
        return { success: true };
    } catch (e) { return { success: false }; }
}

export async function addMaterialToCourse(courseId, materialData) {
    try {
        const courseRef = adminDb.collection("courses").doc(courseId);
        await courseRef.update({
            materials: FieldValue.arrayUnion(materialData)
        });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

export async function getCourseMaterials(courseId) {
    try {
        const docSnap = await adminDb.collection("courses").doc(courseId).get();
        if(docSnap.exists) {
            return { success: true, data: docSnap.data().materials || [] };
        }
        return { success: false, data: [] };
    } catch(e) { return { success: false, data: [] }; }
}

export async function deleteMaterialFromCourse(courseId, materialToDelete) {
    try {
        const courseRef = adminDb.collection("courses").doc(courseId);
        await courseRef.update({
            materials: FieldValue.arrayRemove(materialToDelete)
        });
        return { success: true };
    } catch(e) { return { success: false }; }
}

export async function resetLeaderboard(courseId) {
    try {
        if (!adminDb) throw new Error("DB Error");
        const q = adminDb.collection('results').where('courseId', '==', courseId);
        const snapshot = await q.get();
        if (snapshot.empty) return { success: true, message: "لا توجد نتائج لحذفها." };
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return { success: true, message: "✅ تم تصفير النتائج بنجاح!" };
    } catch (error) { 
        return { success: false, message: error.message }; 
    }
}