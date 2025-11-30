'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin-config';

// 1. تجميد أو فك تجميد الحساب
export async function toggleUserLock(uid, shouldLock) {
  try {
    if (!adminAuth || !adminDb) throw new Error("Admin SDK not initialized");

    // قفل الحساب في Auth (عشان ميعرفش يسجل دخول)
    await adminAuth.updateUser(uid, { disabled: shouldLock });
    
    // تحديث الحالة في Firestore (عشان تظهر في الجدول)
    await adminDb.collection('users').doc(uid).update({ isLocked: shouldLock });

    return { success: true, message: shouldLock ? "تم تجميد الحساب 🔒" : "تم فك التجميد 🔓" };
  } catch (error) {
    console.error(error);
    return { success: false, error: "حدث خطأ: " + error.message };
  }
}

// 2. تغيير كلمة المرور (Reset Password)
export async function adminResetPassword(uid, newPassword) {
  try {
    if (!adminAuth) throw new Error("Admin SDK not initialized");

    await adminAuth.updateUser(uid, { password: newPassword });
    return { success: true, message: "تم تغيير كلمة المرور بنجاح 🔑" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 3. تفعيل أو رفض اشتراك الطالب في مادة
export async function updateCourseStatus(studentUid, courseId, action) {
  try {
    if (!adminDb) throw new Error("Database connection failed");

    const userRef = adminDb.collection('users').doc(studentUid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) throw new Error("المستخدم غير موجود");
    
    const userData = userSnap.data();
    let courses = userData.enrolledCourses || [];

    // تحديد الحالة الجديدة
    // لو الأدمن ضغط "قبول" (active) -> الحالة تبقى 'approved' والدفع 'true'
    const newStatus = action === 'active' ? 'approved' : 'rejected';
    const isPaid = action === 'active'; 

    // تحديث المصفوفة
    const updatedCourses = courses.map(c => {
        if (c.courseId === courseId) {
            return { 
                ...c, 
                status: newStatus,
                paid: isPaid // 👈 دي مهمة جداً عشان زرار الامتحان يظهر
            };
        }
        return c;
    });

    await userRef.update({ enrolledCourses: updatedCourses });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}