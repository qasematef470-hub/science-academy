'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin-config";

// 1. إنشاء الجلسة (Login)
export async function createSession(idToken, role) {
  const cookieStore = await cookies();

  // إعداد الكوكيز
  const options = {
    maxAge: 60 * 60 * 24 * 5, // 5 أيام
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  };

  cookieStore.set('firebaseToken', idToken, options);
  cookieStore.set('userRole', role, options);
}

// 2. تسجيل الخروج (Logout)
export async function logout() {
  const cookieStore = await cookies();

  // مسح الكوكيز
  cookieStore.delete('firebaseToken');
  cookieStore.delete('userRole');

  // التوجيه لصفحة الدخول
  redirect('/login');
}

// 3. جلب إعدادات النظام (للصفحة الرئيسية)
export async function getSystemConfig() {
  try {
    const docRef = adminDb.collection("settings").doc("system_config");
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data();
    }
    return {
      study_mode: true,
      revision_mode: false,
      vacation_mode: false
    };
  } catch (error) {
    console.error("Error fetching system config:", error);
    return {
      study_mode: true,
      revision_mode: false,
      vacation_mode: false
    };
  }
}