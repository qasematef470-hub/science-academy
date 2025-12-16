'use server';

import { cookies } from 'next/headers';

// دالة إنشاء الجلسة (Login)
export async function createSession(idToken) {
  // 1. استدعاء مخزن الكوكيز
  const cookieStore = await cookies();

  // 2. ضبط الكوكيز
  // بنحط الـ Token في كوكيز اسمه firebaseToken
  cookieStore.set('firebaseToken', idToken, {
    httpOnly: true, // أمان عالي: الجافاسكريبت مقدرش يقرأه (حماية من XSS)
    secure: process.env.NODE_ENV === 'production', // بيشتغل بس على https في الرفع
    path: '/', // متاح لكل صفحات الموقع
    maxAge: 60 * 60 * 24 * 5, // صلاحية 5 أيام
  });

  return { success: true };
}

// دالة إنهاء الجلسة (Logout)
export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete('firebaseToken');
  return { success: true };
}