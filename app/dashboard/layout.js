'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // 1. لو مش مسجل أصلاً -> Login
                router.replace('/login');
            } else {
                // 2. التحقق من التفعيل (الحماية)
                if (!user.emailVerified) {
                    router.replace('/verify-email'); // طرد لصفحة التفعيل
                } else {
                    // 3. الطالب مفعل -> اسمح بالدخول
                    setAuthorized(true);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!authorized) return null; // حماية إضافية عشان المحتوى ميبانش لحظة التحويل

    return <>{children}</>;
}