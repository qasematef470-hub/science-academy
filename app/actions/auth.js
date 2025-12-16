'use server'

import { adminDb } from "@/lib/firebase-admin-config";

// 1. جلب هيكلة الجامعة لصفحة التسجيل (Public)
export async function getUniversityStructure() {
  try {
    const doc = await adminDb.collection('settings').doc('university_structure').get();
    if (!doc.exists) return { structure: [] };
    return doc.data(); // هيرجع { structure: [...] }
  } catch (error) {
    console.error("Error fetching structure:", error);
    return { structure: [] };
  }
}

// 2. تسجيل مستخدم جديد (Register User)
export async function registerUser(userData) {
  try {
    const { uid, email, name, phone, photoURL, isVacationMode, ...academicInfo } = userData;

    // تجهيز بيانات الطالب
    const studentProfile = {
      uid,
      email,
      name,
      firstName: name.split(' ')[0], // استخراج الاسم الأول
      phone,
      photoURL: photoURL || "",
      role: 'student',
      isLocked: false,
      createdAt: new Date().toISOString(),
      enrolledCourses: [], // مصفوفة فاضية في البداية
      
      // البيانات الدراسية (ديناميكية)
      isVacationMode: !!isVacationMode,
      // لو وضع أجازة، هنحفظ بياناته الخاصة بالأجازة
      // لو وضع دراسي، هنحفظ الكلية والسنة
      ...academicInfo 
    };

    // حفظ في Firestore
    await adminDb.collection('users').doc(uid).set(studentProfile, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Registration Error:", error);
    return { success: false, error: error.message };
  }
}

// 3. التحقق من حالة "وضع الأجازة" (عشان الفورم يعرف يظهر إيه)
export async function getSystemConfig() {
  try {
    const doc = await adminDb.collection('settings').doc('system_config').get();
    return doc.exists ? doc.data() : {};
  } catch (error) {
    return {};
  }
}