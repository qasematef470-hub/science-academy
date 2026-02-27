import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. قراءة التوكن والرتبة من الكوكيز
  const token = request.cookies.get('firebaseToken')?.value;
  const userRole = request.cookies.get('userRole')?.value; // هنضيف دي في ملف الـ Auth الجاي

  // 2. تحديد المسارات
  const isAdminRoute = pathname.startsWith('/admin');
  const isStudentRoute = (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/course')) || pathname.startsWith('/exam');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // 🔴 الحالة الأولى: غير مسجل دخول وبيحاول يدخل منطقة محمية
  if ((isAdminRoute || isStudentRoute) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 🟡 الحالة الثانية: مسجل دخول (طالب) وبيحاول يدخل صفحات الأدمن
  if (isAdminRoute && userRole === 'student') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 🔵 الحالة الثالثة: مسجل دخول (أدمن) وبيحاول يدخل صفحات الطالب
  if (isStudentRoute && userRole === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // 🟢 الحالة الرابعة: مسجل دخول بالفعل وبيحاول يروح لصفحة اللوجن
  if (isAuthRoute && token) {
    // توجيهه حسب رتبته بدل ما يفضل في صفحة اللوجن
    const destination = userRole === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

// تحديد الصفحات اللي الميدل وير هيراقبها
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/exam/:path*',
    '/login',
    '/signup',
  ],
};