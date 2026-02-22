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
// 🎓 تعديل: إنشاء كورس مع تسجيل بصمة المحاضر (ID)
// ==========================================================
export async function createCourse(courseData) {
  try {
    const adminUid = await assertAdmin();

    const newCourse = {
      ...courseData,
      price: Number(courseData.price) || 0,
      instructorId: adminUid,
      // تأمين حفظ الموديولات بكل محتوياتها (الوصف، عدد المشاهدات، مدة الفيديو)
      modules: courseData.modules || [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      active: true
    };

    const docRef = await adminDb.collection('courses').add(newCourse);
    if (courseData.university && courseData.college) {
      await syncUniversityStructure(courseData.university, courseData.college, courseData.year, courseData.section);
    }
    revalidatePath("/admin");
    return { success: true, id: docRef.id, message: "تم إنشاء الكورس والمنهج المطور بنجاح ✅" };
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
      // 🔥 التعديل الجديد: ضمان تحديث المنهج
      modules: courseData.modules || [],
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('courses').doc(courseId).update(updatedData);

    if (courseData.university && courseData.college) {
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
// ==========================================================
// 🎓 تعديل هام: جلب الكورسات الخاصة بالمحاضر فقط
// ==========================================================
export async function getInstructorCourses() {
  try {
    // 1. التأكد من هوية المحاضر
    const adminUid = await assertAdmin();

    // 2. تحديد الإيميلات المسموح لها برؤية كل شيء (الماستر أدمن)
    // استبدل الإيميل ده بإيميلك الشخصي لو عاوز تشوف كل حاجة
    const MASTER_ADMINS = ["admin@tamam.com"];

    // نجيب بيانات اليوزر عشان نتأكد من الإيميل
    const userRecord = await adminAuth.getUser(adminUid);
    const isMaster = MASTER_ADMINS.includes(userRecord.email);

    let query = adminDb.collection('courses');

    // 🔥 الشرط الجذري: لو مش "ماستر أدمن"، هات كورساتي أنا بس
    if (!isMaster) {
      query = query.where('instructorId', '==', adminUid);
    }

    // ترتيب الكورسات (الأحدث فالأقدم)
    const snapshot = await query.orderBy("createdAt", "desc").limit(20).get(); // بنجيب أحدث 20 كورس بس للسرعة


    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // تحويل التواريخ لنصوص عشان ميعملش مشاكل في الموقع
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        startDate: data.startDate || "",
      };
    });

    return { success: true, data: courses };
  } catch (error) {
    console.error("Error fetching courses:", error);
    return { success: false, message: error.message };
  }
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

    revalidatePath("/", "layout");
    return { success: true, message: shouldLock ? "تم التجميد 🔒" : "تم التفعيل 🔓" };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function deleteStudentAccount(uid) {
  try {
    await assertAdmin();
    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();
    revalidatePath("/", "layout");
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
    revalidatePath("/", "layout");
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
    // الترتيب بيحصل في السيرفر (أسرع بـ 100 مرة) وبناخد أول 50 بس
    const snapshot = await adminDb.collection("results")
      .where("courseId", "==", courseId)
      .orderBy("score", "desc")
      .limit(50)
      .get();

    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        ...d,
        id: doc.id,
        submittedAt: d.submittedAt?.toDate().toISOString() || null,
      };
    });

    return { success: true, data: data };
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return { success: false, message: error.message };
  }
}
// 📝 حفظ إعدادات امتحان (تحديث: دعم الـ Unique ID والشروط المتقدمة)
export const saveCourseSettings = saveExamConfig;
export async function saveExamConfig(examId, settingsData) {
  try {
    await assertAdmin();

    // حفظ الإعدادات باستخدام الـ examId (كود الامتحان) كـ مفتاح فريد
    await adminDb.collection("exam_configs").doc(examId).set({
      ...settingsData,
      passScore: Number(settingsData.passScore) || 60, // درجة النجاح الافتراضية
      maxAttempts: Number(settingsData.maxAttempts) || 1, // عدد المحاولات
      duration: Number(settingsData.duration) || 30, // المدة بالدقائق
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // تفعيل الكود في جدول الأكواد
    await adminDb.collection("exam_settings").doc(examId).set({
      isVisible: true,
      courseId: settingsData.courseId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, message: "تم حفظ إعدادات الامتحان وتفعيله بنجاح ✅" };
  } catch (error) {
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
    const stats = {}; // هنخزن هنا الإحصائيات

    snapshot.docs.forEach(doc => {
      const q = doc.data();
      const lec = q.lecture || "بدون عنوان";
      const diff = (q.difficulty || q.level || 'easy').toLowerCase();

      if (!stats[lec]) stats[lec] = { easy: 0, medium: 0, hard: 0, total: 0 };

      if (diff.includes('easy') || diff.includes('سهل')) stats[lec].easy++;
      else if (diff.includes('medium') || diff.includes('متوسط')) stats[lec].medium++;
      else if (diff.includes('hard') || diff.includes('صعب')) stats[lec].hard++;

      stats[lec].total++;
    });

    // هنرجع أسامي المحاضرات ومعاها الداتا بتاعتها
    return {
      success: true,
      data: Object.keys(stats),
      stats: stats // 👈 دي اللي هنستخدمها للتأكد
    };
  } catch (e) { return { success: false, data: [], stats: {} }; }
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
    if (docSnap.exists) {
      return { success: true, data: docSnap.data().materials || [] };
    }
    return { success: false, data: [] };
  } catch (e) { return { success: false, data: [] }; }
}

export async function deleteMaterialFromCourse(courseId, materialToDelete) {
  try {
    await assertAdmin();
    await adminDb.collection("courses").doc(courseId).update({
      materials: FieldValue.arrayRemove(materialToDelete)
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) { return { success: false }; }
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
    const usersDocs = usersSnap.docs;
    let i = 0;
    const batchSize = 450; // حجم المجموعة الواحدة

    while (i < usersDocs.length) {
      const batch = adminDb.batch();
      const currentBatchDocs = usersDocs.slice(i, i + batchSize);

      currentBatchDocs.forEach(doc => {
        const userData = doc.data();
        const enrolled = userData.enrolledCourses || [];
        const isTargeted = !targetCourseId || enrolled.some(c => c.courseId === targetCourseId && c.status === 'active');

        if (isTargeted) {
          const ref = adminDb.collection('notifications').doc();
          batch.set(ref, {
            recipientId: doc.id,
            title: targetCourseName ? `📢 إعلان: ${targetCourseName}` : "📢 إعلان عام هام",
            body: text.substring(0, 100),
            type: "warning",
            read: false,
            createdAt: FieldValue.serverTimestamp()
          });
        }
      });

      await batch.commit(); // بيبعت المجموعة دي ويخش على اللي بعدها
      i += batchSize;
    }
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

// 🧠 جلب إحصائيات مستويات الصعوبة لبنك الأسئلة
export async function getQuestionDifficultyStats(courseId) {
  try {
    await assertAdmin();
    const snapshot = await adminDb.collection('questions_bank')
      .where('courseId', '==', courseId)
      .get();

    let stats = { easy: 0, medium: 0, hard: 0, total: 0 };

    snapshot.docs.forEach(doc => {
      const q = doc.data();
      const level = (q.difficulty || q.level || 'easy').toLowerCase();

      if (level.includes('easy') || level.includes('سهل')) stats.easy++;
      else if (level.includes('medium') || level.includes('متوسط')) stats.medium++;
      else if (level.includes('hard') || level.includes('صعب')) stats.hard++;
      stats.total++;
    });

    return { success: true, stats };
  } catch (e) {
    return { success: false, stats: { easy: 0, medium: 0, hard: 0, total: 0 } };
  }
}