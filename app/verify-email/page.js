'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.replace('/login');
            } else if (currentUser.emailVerified) {
                router.replace('/dashboard'); // لو مفعل، وديه الداشبورد
            } else {
                setUser(currentUser); // لو مش مفعل، خليه هنا
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleResend = async () => {
        if (!user) return;
        setSending(true);
        try {
            await sendEmailVerification(user);
            setMessage('✅ تم إرسال رابط التفعيل مرة أخرى. تفقد البريد الوارد (و الـ Spam).');
        } catch (error) {
            setMessage('❌ انتظر قليلاً قبل المحاولة مرة أخرى.');
        }
        setSending(false);
    };

    const handleCheckVerification = async () => {
        if (!user) return;
        setChecking(true);
        try {
            // لازم نعمل reload عشان نحدث حالة التفعيل من سيرفر فايربيس
            await user.reload();
            if (auth.currentUser.emailVerified) {
                router.replace('/dashboard');
            } else {
                setMessage('⚠️ لم يتم التفعيل بعد. تأكد من الضغط على الرابط في الإيميل.');
            }
        } catch (error) {
            console.error(error);
        }
        setChecking(false);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/login');
    };

    if (!user) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">جاري التحميل...</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans text-right" dir="rtl">
            <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-700 text-center">
                <div className="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                    📧
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">تفعيل البريد الإلكتروني</h1>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                    أهلاً <b>{user.displayName}</b>،<br/>
                    تم إرسال رابط تفعيل إلى بريدك: <br/>
                    <span className="text-blue-400 font-mono bg-blue-400/10 px-2 rounded">{user.email}</span>
                </p>

                {message && (
                    <div className={`p-3 rounded-xl text-xs font-bold mb-4 ${message.includes('✅') ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {message}
                    </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={handleCheckVerification} 
                        disabled={checking}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
                    >
                        {checking ? 'جاري التحقق...' : 'تم التفعيل، اضغط هنا للدخول 🚀'}
                    </button>

                    <button 
                        onClick={handleResend} 
                        disabled={sending}
                        className="w-full bg-[#334155] hover:bg-[#475569] text-white font-bold py-3 rounded-xl transition"
                    >
                        {sending ? 'جاري الإرسال...' : 'إعادة إرسال الرابط 🔄'}
                    </button>
                    
                    <button 
                        onClick={handleLogout} 
                        className="text-gray-500 text-xs hover:text-white underline mt-4"
                    >
                        تسجيل الخروج
                    </button>
                </div>
            </div>
        </div>
    );
}