'use server'

import { adminDb, adminAuth } from "@/lib/firebase-admin-config";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sendNotification } from "@/app/actions/notifications";

// ==========================================================
// 🔒 كود الحماية (Security Helper)
// ==========================================================
async function assertAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseToken")?.value;
    
    if (!token) throw new Error("غير مصرح: يجب تسجيل الدخول");

    // التحقق من التوكن وصلاحية الأدمن
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (decodedToken.role !== 'admin') throw new Error("غير مصرح: أدمن فقط");
    
    return decodedToken.uid;
  } catch (error) {
    console.error("Security Warning:", error.message);
    throw new Error("Session Expired or Unauthorized");
  }
}

// ==========================================================
// 🧠 1. الذكاء الاصطناعي: المزامنة التلقائية (Auto Sync)
// (University -> College -> Year -> Section)
// ==========================================================
async function syncUniversityStructure(university, college, year, section) {
  if (!university || !college || !year || !section) return;

  try {
    const settingsRef = adminDb.collection('settings').doc('university_structure');
    const docSnap = await settingsRef.get();
    
    let structure = []; // Array based structure
    if (docSnap.exists && docSnap.data().structure) {
      structure = docSnap.data().structure;
    }

    // 1. هل الجامعة موجودة؟
    let uniIndex = structure.findIndex(u => u.name === university);
    if (uniIndex === -1) {
      structure.push({ name: university, colleges: [] });
      uniIndex = structure.length - 1;
    }

    // 2. هل الكلية موجودة داخل الجامعة؟
    let colIndex = structure[uniIndex].colleges.findIndex(c => c.name === college);
    if (colIndex === -1) {
      structure[uniIndex].colleges.push({ name: college, years: [] });
      colIndex = structure[uniIndex].colleges.length - 1;
    }

    // 3. هل السنة موجودة داخل الكلية؟
    let yearIndex = structure[uniIndex].colleges[colIndex].years.findIndex(y => y.name === year);
    if (yearIndex === -1) {
      structure[uniIndex].colleges[colIndex].years.push({ name: year, sections: [] });
      yearIndex = structure[uniIndex].colleges[colIndex].years.length - 1;
    }

    // 4. هل القسم موجود داخل السنة؟
    if (!structure[uniIndex].colleges[colIndex].years[yearIndex].sections.includes(section)) {
      structure[uniIndex].colleges[colIndex].years[yearIndex].sections.push(section);
      
      // حفظ التحديث
      await settingsRef.set({ structure: structure }, { merge: true });
      console.log(`✅ Auto-synced: Added ${section} to ${university} > ${college}`);
    }

  } catch (error) {
    console.error("❌ Sync Error:", error);
  }
}

// ==========================================================
// ⚙️ 2. إدارة النظام (System Modes) - NEW
// ==========================================================
export async function toggleSystemMode(modeName, isActive) {
  try {
    await assertAdmin();
    await adminDb.collection("settings").doc("system_config").set({
      [modeName]: isActive
    }, { merge: true });
    revalidatePath("/"); 
    return { success: true, message: `تم تحديث وضع ${modeName}` };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getSystemModes() {
  try {
    const doc = await adminDb.collection("settings").doc("system_config").get();
    return { success: true, data: doc.exists ? doc.data() : {} };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getUniversityStructure() {
  try {
    const docRef = adminDb.collection('settings').doc('university_structure');
    const docSnap = await docRef.get();
    return { success: true, data: docSnap.exists ? docSnap.data().structure || [] : [] };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function saveUniversityStructure(structure) {
  try {
    await assertAdmin();
    await adminDb.collection('settings').doc('university_structure').set({
      structure: structure,
      updatedAt: new Date()
    });
    revalidatePath("/admin");
    return { success: true, message: "تم التحديث بنجاح" };
  } catch (error) { return { success: false, error: error.message }; }
}
// ==========================================================
// 🎓 3. إدارة الكورسات (Course Management)
// ==========================================================
export async function createCourse(courseData) {
  try {
    const adminUid = await assertAdmin();
    
    const newCourse = {
      ...courseData,
      price: Number(courseData.price) || 0,
      paymentNumber: courseData.paymentNumber || "",
      paymentMethods: courseData.paymentMethods || "both",
      contactPhone: courseData.contactPhone || "",
      instructorId: adminUid, // ربط الكورس بالأدمن الحالي
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      active: true
    };

    const docRef = await adminDb.collection('courses').add(newCourse);

    // 🔥 المزامنة مع الهيكل الجديد
    await syncUniversityStructure(
        courseData.university, // تأكد إن الحقل ده بيتبعت من الـ Form
        courseData.college, 
        courseData.year, 
        courseData.section
    );

    revalidatePath("/admin");
    return { success: true, id: docRef.id, message: "تم إنشاء الكورس بنجاح" };
  } catch (error) { 
    return { success: false, message: error.message }; 
  }
}

export async function updateCourse(courseId, courseData) {
  try {
    await assertAdmin();
    
    const updatedData = {
      ...courseData,
      price: Number(courseData.price) || 0,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('courses').doc(courseId).update(updatedData);

    // تحديث الهيكل لو البيانات اتغيرت
    if(courseData.university && courseData.college) {
        await syncUniversityStructure(courseData.university, courseData.college, courseData.year, courseData.section);
    }

    revalidatePath("/admin");
    return { success: true, message: "تم تحديث الكورس" };
  } catch (error) { 
    return { success: false, message: error.message }; 
  }
}

export async function deleteCourse(courseId) {
    try {
        await assertAdmin();
        await adminDb.collection("courses").doc(courseId).delete();
        revalidatePath("/admin");
        return { success: true, message: "تم حذف الكورس" };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export async function getInstructorCourses(uid) {
  try {
    // لو مبعوت UID هات للكورس ده، لو لا هات الكل (للماستر أدمن)
    let query = adminDb.collection('courses').orderBy("createdAt", "desc");
    
    // يمكن تفعيل الفلتر ده لو عندك أكتر من مدرس
    // if (uid) query = query.where('instructorId', '==', uid);

    const snapshot = await query.get();
    
    const courses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data, // ده بيجيب كل البيانات
            id: doc.id,
            // 👇 التعديل هنا: لازم نحول كل التواريخ لنصوص صريحة
            createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : null,
            updatedAt: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : null,
            startDate: data.startDate || "",
        };
    });

    return { success: true, data: courses };
  } catch (error) { return { success: false, message: error.message }; }
}
// ==========================================================
// 👥 4. إدارة الطلاب (Students)
// ==========================================================
export async function toggleUserLock(uid, shouldLock) {
  try {
    await assertAdmin();
    // 1. قفل الحساب في Auth
    await adminAuth.updateUser(uid, { disabled: shouldLock });
    // 2. تحديث الحالة في DB
    await adminDb.collection('users').doc(uid).update({ isLocked: shouldLock });
    
    revalidatePath("/admin");
    return { success: true, message: shouldLock ? "تم التجميد 🔒" : "تم التفعيل 🔓" };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function deleteStudentAccount(uid) {
  try {
    await assertAdmin();
    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();
    revalidatePath("/admin");
    return { success: true, message: "تم حذف الطالب نهائياً 🗑️" };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function updateCourseStatus(studentUid, courseId, action) {
  try {
    await assertAdmin();
    const userRef = adminDb.collection('users').doc(studentUid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) throw new Error("المستخدم غير موجود");
    
    let courses = userSnap.data().enrolledCourses || [];

    if (action === 'remove' || action === 'rejected') {
        const newCourses = courses.filter(c => c.courseId !== courseId);
        await userRef.update({ enrolledCourses: newCourses });
    } else {
        const newStatus = action === 'active' ? 'active' : action; 
        const isPaid = action === 'active'; 

        const courseIndex = courses.findIndex(c => c.courseId === courseId);
        if (courseIndex !== -1) {
            courses[courseIndex] = {
                ...courses[courseIndex],
                status: newStatus,
                paid: isPaid
            };
            await userRef.update({ enrolledCourses: courses });

            // 🔔 إشعار للطالب بتفعيل الكورس
            if (newStatus === 'active') {
                // 1. نجيب بيانات الكورس عشان الاسم
                const courseDoc = await adminDb.collection('courses').doc(courseId).get();
                // 🔥 عرفنا المتغير هنا بشكل صريح عشان ميعملش مشاكل
                const courseName = courseDoc.exists ? (courseDoc.data().name || courseDoc.data().title) : "الكورس";

                await sendNotification({
                    recipientId: studentUid,
                    title: "تم تفعيل الاشتراك ✅",
                    body: `مبروك! تم تفعيل اشتراكك بنجاح في: ${courseName}. ابدأ المذاكرة الآن!`,
                    type: "success",
                    link: "/dashboard"
                });
            }
        }
    }
    revalidatePath("/admin");
    return { success: true };
  } catch (error) { 
      console.error("Update Error:", error); // عشان نشوف الخطأ في الكونسول لو حصل
      return { success: false, error: error.message }; 
  }
}
export async function adminResetPassword(uid, newPassword) {
  try {
    await assertAdmin();
    await adminAuth.updateUser(uid, { password: newPassword });
    return { success: true, message: "تم تغيير الباسورد بنجاح 🔑" };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function toggleSpecialAccess(studentId, courseId, allow) {
    try {
        await assertAdmin();
        const id = `${courseId}_${studentId}`;
        if (allow) await adminDb.collection("special_access").doc(id).set({ allow: true });
        else await adminDb.collection("special_access").doc(id).delete();
        return { success: true };
    } catch (error) { return { success: false, message: error.message }; }
}

// ==========================================================
// 📊 5. إدارة الامتحانات والنتائج (Exams & Results)
// ==========================================================
export async function toggleExamCodeVisibility(examCode, isVisible) {
  try {
    await assertAdmin();
    await adminDb.collection("exam_settings").doc(examCode).set({ isVisible }, { merge: true });
    return { success: true };
  } catch (error) { return { success: false, message: error.message }; }
}

export async function resetLeaderboard(courseId) {
    try {
        await assertAdmin();
        const q = adminDb.collection('results').where('courseId', '==', courseId);
        const snapshot = await q.get();
        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        revalidatePath("/admin");
        return { success: true, message: "✅ تم تصفير النتائج بنجاح!" };
    } catch (error) { return { success: false, message: error.message }; }
}

export async function deleteResult(resultId) {
    try {
        await assertAdmin();
        await adminDb.collection("results").doc(resultId).delete();
        revalidatePath("/admin");
        return { success: true };
    } catch (error) { return { success: false, message: error.message }; }
}

export async function getLeaderboard(courseId) {
    try {
        const resultsRef = adminDb.collection("results");
        const q = resultsRef.where("courseId", "==", courseId);
        const snapshot = await q.get();
        
        let data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                ...d,
                id: doc.id,
                startTime: d.startTime?.toDate().toISOString() || null,
                endTime: d.endTime?.toDate().toISOString() || null,
                submittedAt: d.submittedAt?.toDate().toISOString() || null,
            };
        });
        
        // ترتيب التوب 50
        data = data.sort((a, b) => b.score - a.score).slice(0, 50);
        return { success: true, data: data };
    } catch (error) { return { success: false, message: error.message }; }
}

export async function saveCourseSettings(courseId, settingsData) {
    try {
        await assertAdmin();
        
        // 1. حفظ الإعدادات في الداتابيز
        await adminDb.collection("exam_configs").doc(courseId).set(settingsData, { merge: true });

        // 👇👇 بداية كود الإشعار 👇👇
        // لو الأدمن مفعل خيار "إرسال إشعار" أو لو ده امتحان جديد بكود
        if (settingsData.examCode) {
            
            // أ. نجيب اسم الكورس
            const courseDoc = await adminDb.collection('courses').doc(courseId).get();
            const courseName = courseDoc.exists ? (courseDoc.data().name || courseDoc.data().title) : "المادة";

            // ب. نجيب الطلاب المشتركين في الكورس ده بس (Active)
            // ملحوظة: عشان الداتابيز NoSQL، هنجيب الطلاب ونفلترهم
            const usersSnap = await adminDb.collection('users')
                .where('role', '==', 'student')
                .get();

            const batch = adminDb.batch();
            let count = 0;

            usersSnap.docs.forEach(doc => {
                const userData = doc.data();
                const enrolled = userData.enrolledCourses || [];
                
                // هل الطالب مشترك في الكورس ده وحسابه مفعل؟
                const isEnrolledActive = enrolled.some(c => c.courseId === courseId && c.status === 'active');

                if (isEnrolledActive) {
                    const ref = adminDb.collection('notifications').doc();
                    
                    // تكوين رسالة التفاصيل
                    const details = [
                        `الكود: ${settingsData.examCode}`,
                        settingsData.examDuration ? `المدة: ${settingsData.examDuration} دقيقة` : '',
                        settingsData.startDate ? `البدء: ${new Date(settingsData.startDate).toLocaleDateString('ar-EG')}` : ''
                    ].filter(Boolean).join(' | ');

                    batch.set(ref, {
                        recipientId: doc.id,
                        title: `امتحان جديد: ${courseName} 📝`,
                        body: `تم تحديد موعد امتحان جديد.\n${details}\nاستعد جيداً!`,
                        type: "exam", // ده هيظهر أيقونة الامتحان
                        link: `/exam/${courseId}`, // يوديه لصفحة الامتحان علطول
                        read: false,
                        createdAt: FieldValue.serverTimestamp()
                    });
                    count++;
                }
            });

            if (count > 0) await batch.commit();
        }
        // 👆👆 نهاية كود الإشعار 👆👆

        return { success: true, message: "تم الحفظ وإرسال الإشعارات للطلاب 📨" };
    } catch (error) { 
        console.error(error);
        return { success: false, message: error.message }; 
    }
}

export async function getCourseSettings(courseId) {
    try {
        await assertAdmin();
        const docSnap = await adminDb.collection("exam_configs").doc(courseId).get();
        return { success: true, data: docSnap.exists ? docSnap.data() : null };
    } catch (error) { return { success: false, message: error.message }; }
}

export async function getUniqueLectures(courseId) {
    try {
        const snapshot = await adminDb.collection('questions_bank').where('courseId', '==', courseId).get();
        const lectures = new Set();
        snapshot.docs.forEach(doc => { if (doc.data().lecture) lectures.add(doc.data().lecture); });
        return { success: true, data: Array.from(lectures) };
    } catch (e) { return { success: false, data: [] }; }
}

// ==========================================================
// 📚 6. إدارة المحتوى (Materials)
// ==========================================================
export async function addMaterialToCourse(courseId, materialData) {
    try {
        await assertAdmin();
        await adminDb.collection("courses").doc(courseId).update({
            materials: FieldValue.arrayUnion(materialData)
        });
        revalidatePath("/admin");
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
        await assertAdmin();
        await adminDb.collection("courses").doc(courseId).update({
            materials: FieldValue.arrayRemove(materialToDelete)
        });
        revalidatePath("/admin");
        return { success: true };
    } catch(e) { return { success: false }; }
}

// ==========================================================
// 📢 7. الإعلانات (Announcements)
// ==========================================================
// استبدل دالة addAnnouncement القديمة بدي
export async function addAnnouncement(text, targetCourseId = null, targetCourseName = null) {
    try {
        await assertAdmin();
        
        // 1. حفظ الإعلان في الداتابيز (بالبيانات الجديدة)
        await adminDb.collection("announcements").add({ 
            text, 
            targetCourseId: targetCourseId, // ده اللي بيخلي العلامة زرقاء
            targetCourseName: targetCourseName, // ده الاسم اللي بيظهر
            createdAt: FieldValue.serverTimestamp() 
        });

        revalidatePath("/admin");

        // 2. إرسال الإشعار للطلاب المستهدفين فقط
        let query = adminDb.collection('users').where('role', '==', 'student');
        
        // لو الإعلان عام، بنجيب عينة (للسرعة)، لو مخصص بنجيب الكل ونفلتر
        if (!targetCourseId) {
             query = query.limit(100);
        }
        
        const usersSnap = await query.get();
        const batch = adminDb.batch();
        let count = 0;

        usersSnap.docs.forEach(doc => {
            const userData = doc.data();
            let shouldSend = false;

            if (!targetCourseId) {
                shouldSend = true; // إعلان عام للكل
            } else {
                const enrolled = userData.enrolledCourses || [];
                // هل الطالب مشترك في الكورس ده (active)؟
                if (enrolled.some(c => c.courseId === targetCourseId && c.status === 'active')) {
                    shouldSend = true;
                }
            }

            if (shouldSend && count < 450) {
                const ref = adminDb.collection('notifications').doc();
                batch.set(ref, {
                    recipientId: doc.id,
                    title: targetCourseName ? `📢 إعلان: ${targetCourseName}` : "📢 إعلان عام هام",
                    body: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
                    type: "warning",
                    read: false,
                    createdAt: FieldValue.serverTimestamp()
                });
                count++;
            }
        });

        if (count > 0) await batch.commit();

        return { success: true };
    } catch (e) { 
        console.error(e);
        return { success: false }; 
    }
}
export async function getAnnouncements() {
    try {
        // هنجيب آخر 20 إعلان مثلاً
        const q = adminDb.collection("announcements").orderBy("createdAt", "desc").limit(20);
        const snap = await q.get();
        
        const data = snap.docs.map(doc => ({
            id: doc.id,
            text: doc.data().text,
            // 🔥 التعديل هنا: لازم نرجع البيانات دي عشان الواجهة تعرضها صح
            targetCourseId: doc.data().targetCourseId || null,
            targetCourseName: doc.data().targetCourseName || null,
            // ----------------------------------------------------
            createdAt: doc.data().createdAt?.toDate().toISOString() || null
        }));
        
        return { success: true, data };
    } catch (e) { return { success: false, data: [] }; }
}

export async function deleteAnnouncement(id) {
    try {
        console.log("جاري حذف الإعلان رقم:", id); // 👈 عشان نتأكد إن الـ ID وصل
        await assertAdmin();
        
        await adminDb.collection("announcements").doc(id).delete();
        
        console.log("تم الحذف بنجاح ✅");
        revalidatePath("/admin");
        return { success: true };
    } catch (e) { 
        console.error("خطأ في الحذف ❌:", e); // 👈 ده هيظهرلك سبب المشكلة في التيرمينال
        return { success: false, error: e.message }; 
    }
}

// ==========================================================
// 🛠️ 8. أدوات الأدمن المتقدمة (Admin Tools Logic)
// ==========================================================

// 1. رفع ملف JSON (Batch Upload)
export async function batchAddQuestions(courseId, questionsArray) {
  try {
    await assertAdmin();
    const batch = adminDb.batch();
    
    questionsArray.forEach(q => {
      const docRef = adminDb.collection("questions_bank").doc();
      batch.set(docRef, {
        ...q,
        courseId: courseId,
        createdAt: FieldValue.serverTimestamp(),
        image: q.image || ""
      });
    });

    await batch.commit();
    revalidatePath("/admin");
    return { success: true, count: questionsArray.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 2. جلب الأسئلة لمادة معينة (للمصدر)
export async function getQuestionsForCourse(courseId) {
  try {
    // مش محتاجين assertAdmin هنا عادي، أو ممكن تضيفها لو تحب
    const q = adminDb.collection('questions_bank').where('courseId', '==', courseId);
    const snap = await q.get();
    
    const questions = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // تحويل التواريخ لنصوص عشان العرض
      createdAt: doc.data().createdAt?.toDate().toISOString() || null
    }));

    return { success: true, data: questions };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 3. نسخ الأسئلة (Copy Questions)
export async function copyQuestionsToCourse(questionIds, targetCourseId) {
  try {
    await assertAdmin();
    const batch = adminDb.batch();

    // لازم نقرأ الأسئلة الأول عشان ننسخ بياناتها
    // ملاحظة: فايربيس معندهاش "WHERE ID IN [...]" لأكثر من 30 عنصر
    // عشان كده هنعمل Loop قراءة (مقبول في عمليات الأدمن المحدودة)
    
    const readPromises = questionIds.map(id => adminDb.collection("questions_bank").doc(id).get());
    const snapshots = await Promise.all(readPromises);

    snapshots.forEach(snap => {
      if (snap.exists) {
        const data = snap.data();
        const newRef = adminDb.collection("questions_bank").doc(); // ID جديد
        batch.set(newRef, {
          ...data,
          courseId: targetCourseId, // الكورس الجديد
          createdAt: FieldValue.serverTimestamp() // وقت جديد
        });
      }
    });

    await batch.commit();
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 4. حذف مجموعة أسئلة (Batch Delete)
export async function batchDeleteQuestions(questionIds) {
  try {
    await assertAdmin();
    const batch = adminDb.batch();

    questionIds.forEach(id => {
      const docRef = adminDb.collection("questions_bank").doc(id);
      batch.delete(docRef);
    });

    await batch.commit();
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
// ==========================================================
// 🚨 9. استثناءات الامتحانات (Exam Exceptions) - NEW
// ==========================================================
export async function grantExamException(studentId, courseId) {
    try {
        await assertAdmin();
        // تكوين الـ ID بنفس الطريقة اللي كود الطالب بيفهمها
        const exceptionId = `${courseId}_${studentId}`;
        
        await adminDb.collection('exam_exceptions').doc(exceptionId).set({
            createdAt: FieldValue.serverTimestamp(),
            active: true,
            grantedBy: 'admin_action'
        });

        return { success: true, message: "تم منح استثناء للطالب، يمكنه الدخول الآن 🔓" };
    } catch (error) { 
        return { success: false, message: error.message }; 
    }
}

// ==========================================================
// 📊 10. إحصائيات الطالب (Student Stats) - NEW
// ==========================================================
export async function getStudentStats(studentId) {
    try {
        await assertAdmin();

        // 1. جلب بيانات الطالب (لآخر ظهور)
        const userDoc = await adminDb.collection('users').doc(studentId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        // 2. جلب نتائج الامتحانات
        const resultsSnap = await adminDb.collection('results')
            .where('studentId', '==', studentId)
            .get();

        let totalExams = 0;
        let totalScore = 0; // مجموع درجات الطالب
        let totalMaxScore = 0; // مجموع الدرجات النهائية للامتحانات

        resultsSnap.docs.forEach(doc => {
            const data = doc.data();
            // تجاهل الامتحانات اللي لسه شغالة (Running)
            if (data.status && data.status.includes('Running')) return;

            totalExams++;
            totalScore += (Number(data.score) || 0);
            totalMaxScore += (Number(data.total) || 0);
        });

        // حساب النسبة المئوية العامة للطالب
        const averagePercent = totalMaxScore > 0 
            ? ((totalScore / totalMaxScore) * 100).toFixed(1) 
            : "0";

        return {
            success: true,
            stats: {
                totalExams,
                averagePercent: averagePercent + "%",
                lastLogin: userData.lastLogin ? userData.lastLogin.toDate().toISOString() : null,
                joinedAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null
            }
        };

    } catch (error) {
        console.error("Stats Error:", error);
        return { success: false, message: error.message };
    }
}