import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. قراءة "البطاقة" (Token) من الكوكيز
  const token = request.cookies.get('firebaseToken')?.value;

  // 2. تحديد المسارات المحمية
  const isAdminRoute = pathname.startsWith('/admin');
  const isStudentRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/exam');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // 🔴 الحالة الأولى: شخص بيحاول يدخل صفحة أدمن أو طالب وهو مش مسجل دخول
  if ((isAdminRoute || isStudentRoute) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // بنحفظ المكان اللي كان رايحه عشان نرجعه ليه بعد ما يسجل دخول
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 🟢 الحالة الثانية: شخص مسجل دخول بالفعل وبيحاول يروح لصفحة Login
  if (isAuthRoute && token) {
    // هنا ممكن نوجهه للوحة التحكم بتاعته (اختياري)
    // حالياً هنسيبه يدخل عادي عشان لو عايز يسجل خروج أو يغير حساب
    return NextResponse.next();
  }

  // السماح بالمرور
  return NextResponse.next();
}

// تحديد الصفحات اللي "البواب" هيقف عليها
export const config = {
  matcher: [
    '/admin/:path*',      // حماية كل صفحات الأدمن
    '/dashboard/:path*',  // حماية لوحة الطالب
    '/exam/:path*',       // حماية الامتحانات
    '/login',             // مراقبة صفحة الدخول
    '/signup',            // مراقبة صفحة التسجيل
  ],
};