'use server'

import { adminDb, adminAuth } from "@/lib/firebase-admin-config";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath, revalidateTag } from "next/cache";
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

async function assertSuperAdmin() {
  const adminUid = await assertAdmin();
  const currentUser = await adminAuth.getUser(adminUid);
  if (currentUser.email !== 'qasem@science-academy.com') {
    throw new Error("غير مصرح: هذه الصلاحية للمدير العام فقط");
  }
  return adminUid;
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
    await assertAdmin();
    const doc = await adminDb.collection("settings").doc("system_config").get();
    return { success: true, data: doc.exists ? doc.data() : {} };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getUniversityStructure() {
  try {
    await assertAdmin();
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
    revalidateTag('courses');
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/study");
    revalidatePath("/vacation");
    revalidatePath("/final-revision");
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
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 🛡️ حماية المنهج: لا تكتب modules أو materials إلا لو اتبعتوا فعلاً
    if (!courseData.hasOwnProperty('modules')) {
      delete updatedData.modules;
    }
    if (!courseData.hasOwnProperty('materials')) {
      delete updatedData.materials;
    }

    await adminDb.collection('courses').doc(courseId).update(updatedData);

    if (courseData.university && courseData.college) {
      await syncUniversityStructure(courseData.university, courseData.college, courseData.year, courseData.section);
    }

    revalidateTag('courses');
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/study");
    revalidatePath("/vacation");
    revalidatePath("/final-revision");
    return { success: true, message: "تم تحديث الكورس" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function deleteCourse(courseId) {
  try {
    await assertAdmin();
    await adminDb.collection("courses").doc(courseId).delete();
    revalidateTag('courses');
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/study");
    revalidatePath("/vacation");
    revalidatePath("/final-revision");
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

    // ترتيب الكورسات (الأحدث فالأقدم) - بدون Projection عشان الـ Curriculum Builder محتاج كل الداتا (modules)
    const snapshot = await query
      .orderBy("createdAt", "desc")
      .get();


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
    await assertSuperAdmin();
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
    await assertSuperAdmin();
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
    await assertAdmin();
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
    await assertAdmin();
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
    await assertAdmin();
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
    await assertAdmin();
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
    await assertAdmin();
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

// ==========================================================
// 👑 11. إدارة المسؤولين (Super Admin Only) - NEW
// ==========================================================
export async function addNewAdmin(email, password, name) {
  try {
    const adminUid = await assertAdmin();
    const currentUser = await adminAuth.getUser(adminUid);
    if (currentUser.email !== 'qasem@science-academy.com') {
      throw new Error("غير مصرح: هذه الصلاحية للمدير العام فقط");
    }

    // 1. Create User in Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true
    });

    // 2. Set Custom Claims optionally
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

    // 3. Save to Users Collection
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'admin',
      isLocked: false,
      createdAt: FieldValue.serverTimestamp()
    });

    revalidatePath("/admin");
    return { success: true, message: "تمت إضافة المسؤول بنجاح ✅" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function removeAdmin(uid) {
  try {
    const adminUid = await assertAdmin();
    const currentUser = await adminAuth.getUser(adminUid);
    if (currentUser.email !== 'qasem@science-academy.com') {
      throw new Error("غير مصرح: هذه الصلاحية للمدير العام فقط");
    }

    // 1. Check if trying to delete the super admin
    const targetUser = await adminAuth.getUser(uid);
    if (targetUser.email === 'qasem@science-academy.com') {
      throw new Error("لا يمكن حذف حساب المدير العام!");
    }

    // 2. Delete Auth and DB
    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();

    revalidatePath("/admin");
    return { success: true, message: "تم حذف حساب المسؤول بنجاح 🗑️" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==========================================================
// 👑 9. Super Admin — إدارة المحاضرين (Instructor Management)
// ==========================================================

const SUPER_ADMIN_EMAIL = 'qasem@science-academy.com';

async function assertSuperAdmin() {
  const adminUid = await assertAdmin();
  const adminUser = await adminAuth.getUser(adminUid);
  if (adminUser.email !== SUPER_ADMIN_EMAIL) {
    throw new Error("غير مصرح: هذه الصلاحية للمدير العام فقط");
  }
  return adminUid;
}

// 9.1 جلب جميع المحاضرين مع إحصائياتهم
export async function getAllInstructors() {
  try {
    await assertSuperAdmin();

    // 1. Fetch all admin users
    const usersSnap = await adminDb.collection('users').where('role', '==', 'admin').get();
    const instructors = [];

    for (const doc of usersSnap.docs) {
      const data = doc.data();

      // 2. Count courses for this instructor
      const coursesSnap = await adminDb.collection('courses').where('instructorId', '==', doc.id).get();
      const courseIds = coursesSnap.docs.map(c => c.id);

      // 3. Count unique enrolled students across this instructor's courses
      let studentsCount = 0;
      if (courseIds.length > 0) {
        const allStudentsSnap = await adminDb.collection('users').where('role', '==', 'student').get();
        const uniqueStudents = new Set();
        allStudentsSnap.docs.forEach(studentDoc => {
          const enrolled = studentDoc.data().enrolledCourses || [];
          enrolled.forEach(e => {
            if (courseIds.includes(e.courseId) && e.status === 'active') {
              uniqueStudents.add(studentDoc.id);
            }
          });
        });
        studentsCount = uniqueStudents.size;
      }

      instructors.push({
        uid: doc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        image: data.image || '',
        isLocked: data.isLocked || false,
        coursesCount: courseIds.length,
        studentsCount,
      });
    }

    return { success: true, data: instructors };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 9.2 إضافة محاضر جديد
export async function addNewInstructor({ name, email, password, phone, image }) {
  try {
    await assertSuperAdmin();
    if (!name || !email || !password) throw new Error("الاسم والإيميل وكلمة السر مطلوبين");

    // 1. Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Set admin custom claim
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'admin' });

    // 3. Create user document
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email,
      phone: phone || '',
      image: image || '',
      role: 'admin',
      isLocked: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin");
    return { success: true, message: `تم إضافة المحاضر "${name}" بنجاح ✅` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 9.3 تعديل صورة المحاضر
export async function updateInstructorImage(uid, imageUrl) {
  try {
    await assertSuperAdmin();
    if (!uid || !imageUrl) throw new Error("البيانات ناقصة");

    await adminDb.collection('users').doc(uid).update({ image: imageUrl });

    // Also update instructorImage on all courses belonging to this instructor
    const coursesSnap = await adminDb.collection('courses').where('instructorId', '==', uid).get();
    const batch = adminDb.batch();
    coursesSnap.docs.forEach(doc => {
      batch.update(doc.ref, { instructorImage: imageUrl });
    });
    await batch.commit();

    revalidatePath("/admin");
    return { success: true, message: "تم تحديث الصورة بنجاح ✅" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 9.4 تصفير كورسات المحاضر (حذف كل كورساته + الامتحانات + بنك الأسئلة)
export async function wipeInstructorCourses(instructorId) {
  try {
    await assertSuperAdmin();
    if (!instructorId) throw new Error("معرف المحاضر مطلوب");

    // Prevent wiping super admin's courses
    const targetUser = await adminAuth.getUser(instructorId);
    if (targetUser.email === SUPER_ADMIN_EMAIL) {
      throw new Error("لا يمكن تصفير كورسات المدير العام!");
    }

    // 1. Get all courses for this instructor
    const coursesSnap = await adminDb.collection('courses').where('instructorId', '==', instructorId).get();
    if (coursesSnap.empty) return { success: true, message: "لا يوجد كورسات لهذا المحاضر" };

    const batch = adminDb.batch();
    let deletedCount = 0;

    for (const courseDoc of coursesSnap.docs) {
      const courseId = courseDoc.id;

      // Delete related exam_configs
      const examConfigs = await adminDb.collection('exam_configs').where('courseId', '==', courseId).get();
      examConfigs.docs.forEach(doc => batch.delete(doc.ref));

      // Delete related questions_bank
      const questions = await adminDb.collection('questions_bank').where('courseId', '==', courseId).get();
      questions.docs.forEach(doc => batch.delete(doc.ref));

      // Delete the course itself
      batch.delete(courseDoc.ref);
      deletedCount++;
    }

    await batch.commit();
    revalidatePath("/admin");
    return { success: true, message: `تم حذف ${deletedCount} كورس وجميع بياناتهم بنجاح 🗑️` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 9.5 حذف المحاضر نهائياً (تصفير + حذف الحساب)
export async function nukeInstructorAccount(instructorId) {
  try {
    await assertSuperAdmin();
    if (!instructorId) throw new Error("معرف المحاضر مطلوب");

    // Prevent nuking the super admin
    const targetUser = await adminAuth.getUser(instructorId);
    if (targetUser.email === SUPER_ADMIN_EMAIL) {
      throw new Error("لا يمكن حذف حساب المدير العام!");
    }

    // 1. Wipe all courses first
    const wipeResult = await wipeInstructorCourses(instructorId);
    if (!wipeResult.success && !wipeResult.message.includes("لا يوجد")) {
      throw new Error("فشل في تصفير الكورسات: " + wipeResult.message);
    }

    // 2. Delete the user document
    await adminDb.collection('users').doc(instructorId).delete();

    // 3. Delete from Firebase Auth
    await adminAuth.deleteUser(instructorId);

    revalidatePath("/admin");
    return { success: true, message: "تم حذف المحاضر وجميع بياناته نهائياً 💀" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 9.6 تغيير كلمة سر المحاضر
export async function forceChangeInstructorPassword(uid, newPassword) {
  try {
    await assertSuperAdmin();
    if (!uid || !newPassword) throw new Error("البيانات ناقصة");
    if (newPassword.length < 6) throw new Error("كلمة السر يجب أن تكون 6 أحرف على الأقل");

    // Prevent changing super admin password (REMOVED: The user requested to be able to change their own password)
    // const targetUser = await adminAuth.getUser(uid);
    // if (targetUser.email === SUPER_ADMIN_EMAIL) {
    //   throw new Error("لا يمكن تغيير كلمة سر المدير العام من هنا!");
    // }

    await adminAuth.updateUser(uid, { password: newPassword });

    return { success: true, message: "تم تغيير كلمة السر بنجاح 🔑" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==========================================================
// ☢️ 10. تصفير قاعدة البيانات بالكامل (Nuke Database — Super Admin Only)
// ==========================================================
export async function nukeEntireDatabase() {
  try {
    await assertSuperAdmin();

    const details = {};

    // 1. حذف جميع الطلاب من Auth + Firestore
    const studentsSnap = await adminDb.collection('users').where('role', '==', 'student').get();
    let deletedStudents = 0;
    for (const doc of studentsSnap.docs) {
      try {
        await adminAuth.deleteUser(doc.id);
      } catch (e) {
        console.warn(`⚠️ Failed to delete auth for ${doc.id}:`, e.message);
      }
      await doc.ref.delete();
      deletedStudents++;
    }
    details.students = deletedStudents;

    // 2. تصفير الكوليكشنز المحددة (بدون settings وبدون admin users)
    const collectionsToWipe = [
      'courses', 'questions_bank', 'results', 'user_progress',
      'announcements', 'exam_configs', 'exam_settings', 'exam_exceptions', 'cheating_logs'
    ];

    for (const colName of collectionsToWipe) {
      let deletedCount = 0;
      let snapshot = await adminDb.collection(colName).limit(500).get();

      while (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deletedCount += snapshot.docs.length;
        snapshot = await adminDb.collection(colName).limit(500).get();
      }
      details[colName] = deletedCount;
    }

    revalidatePath("/admin");
    return { success: true, message: "☢️ تم تصفير قاعدة البيانات بالكامل (ما عدا الإدارة والإعدادات)", details };
  } catch (error) {
    console.error("Nuke Error:", error);
    return { success: false, message: error.message };
  }
}

// ==========================================================
// 👥 11. دليل حسابات المنصة (Global Students — Super Admin Only)
// ==========================================================
export async function getGlobalStudents(lastDocId = null, searchTerm = "") {
  try {
    await assertSuperAdmin();

    const mapStudent = (doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        name: data.name || '',
        phone: data.phone || '',
        university: data.university || '',
        college: data.college || '',
        year: data.year || '',
        section: data.section || '',
        enrolledCoursesCount: (data.enrolledCourses || []).length,
      };
    };

    // إذا فيه بحث → نجيب كل اليوزرز ونفلتر في الذاكرة
    if (searchTerm && searchTerm.trim().length > 0) {
      const term = searchTerm.trim().toLowerCase();
      const snapshot = await adminDb.collection('users').limit(1000).get();

      const filtered = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.role === 'admin') return; // تجاهل المحاضرين
        const name = (data.name || '').toLowerCase();
        const phone = (data.phone || '');
        if (name.includes(term) || phone.includes(term)) {
          filtered.push(mapStudent(doc));
        }
      });

      return { success: true, data: filtered.slice(0, 50), hasMore: false, lastDocId: null };
    }

    // بدون بحث → pagination بـ 10 (بدون orderBy عشان مش محتاجين index)
    let query = adminDb.collection('users').limit(10);

    if (lastDocId) {
      const lastDoc = await adminDb.collection('users').doc(lastDocId).get();
      if (lastDoc.exists) {
        query = adminDb.collection('users').startAfter(lastDoc).limit(10);
      }
    }

    const snapshot = await query.get();

    // فلترة الأدمنز في الذاكرة
    const students = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.role !== 'admin') {
        students.push(mapStudent(doc));
      }
    });

    const newLastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;

    return {
      success: true,
      data: students,
      hasMore: snapshot.docs.length === 10,
      lastDocId: newLastDocId
    };
  } catch (error) {
    console.error("Global Students Error:", error);
    return { success: false, message: error.message, data: [] };
  }
}

// ==========================================================
// 🏠 12. إعدادات الصفحة الرئيسية (Landing Page Settings)
// ==========================================================
export async function updateRegistrationVideoUrl(url) {
  try {
    await assertSuperAdmin();
    await adminDb.collection('settings').doc('system_config').set({
      registrationVideoUrl: url
    }, { merge: true });
    revalidatePath('/');
    return { success: true, message: "تم تحديث رابط الفيديو بنجاح ✅" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getRegistrationVideoUrl() {
  try {
    const doc = await adminDb.collection('settings').doc('system_config').get();
    if (doc.exists && doc.data().registrationVideoUrl) {
      return { success: true, videoId: doc.data().registrationVideoUrl };
    }
    return { success: true, videoId: "YsmGiwCnHhE" }; // Fallback default
  } catch (error) {
    return { success: true, videoId: "YsmGiwCnHhE" }; // Fallback on error too
  }
}