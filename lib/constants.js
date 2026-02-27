// lib/constants.js

// lib/constants.js

export const SUPPORT_WHATSAPP = "https://wa.me/201100588901"; // حط رقم الدعم الفني العام هنا

export const TEAM_DATA = [
    {
        // اكتب الاسم هنا زي ما تحبه يظهر بالظبط
        name: 'م/ القاسم عاطف شريف',
        role: 'Mathematics & CS',
        img: '/assets/images/instructor-alqasem.jpg',
        // تأكد من الروابط دي، يفضل استخدام رقم الهاتف المباشر لو الـ QR مش شغال
        // مثال: https://wa.me/201xxxxxxxxx
        link: 'https://wa.me/201100588901'
    },
    {
        name: 'د/ طه على جميل',
        role: 'Botany & Zoology & Anatomy & Physiology',
        img: '/assets/images/instructor-taha.jpg',
        link: 'https://wa.me/201014946210'
    },
    {
        name: 'د/ خالد محمد',
        role: 'Chemistry',
        img: '/assets/images/instructor-Khaled.jpg',
        link: 'https://wa.me/201018529151'
    },
    {
        name: 'د/ محمد منصور',
        role: 'Physics',
        img: '/assets/images/instructor-mohamed.jpg',
        link: 'https://wa.me/201098746580'
    },
];

export const FEATURES_DATA = [
    { icon: '🎥', t: 'جودة 4K', d: 'تصوير ومونتاج احترافي بأحدث التقنيات لضمان وضوح الشرح.' },
    { icon: '🧠', t: 'بنك أسئلة ذكي', d: 'آلاف الأسئلة المتدرجة في الصعوبة للتدريب على نظام الامتحانات.' },
    { icon: '📈', t: 'متابعة دورية', d: 'تقارير مستوى دورية تصل لولي الأمر والطالب لمعرفة نقاط الضعف.' },
    { icon: '💬', t: 'دعم فني 24/7', d: 'تواصل مباشر مع التيم لحل أي مشكلة تواجهك فوراً.' },
    { icon: '🏆', t: 'تكريم الأوائل', d: 'جوائز قيمة وشهادات تقدير للمتفوقين في كل تيرم.' },
    { icon: '📱', t: 'تطبيق موبايل', d: 'ذاكر من موبايلك في أي وقت وأي مكان بتجربة مستخدم سلسة.' }
];

export const STATS_DATA = [
    { n: '+120', t: 'طالب' },
    { n: '+10', t: 'مادة' },
    { n: '+100', t: 'ساعة' },
    { n: '24', t: 'دعم' }
];

export const REGISTRATION_STEPS = [
    { n: '1', t: 'أنشئ حسابك', d: 'سجل بياناتك بسهولة في أقل من دقيقة.' },
    { n: '2', t: 'اختر المواد', d: 'تصفح الكورسات واختار المواد اللي محتاجها.' },
    { n: '3', t: 'ابدأ المذاكرة', d: 'ادفع بأمان واستمتع بشرح ومراجعات حصرية.' }
];


// ==========================================================
// 🔔 NOTIFICATION CONSTANTS
// ==========================================================
export const NOTIFICATION_TYPES = {
    INFO: 'info',       // معلومة عامة (أزرق)
    SUCCESS: 'success', // تم بنجاح (أخضر)
    WARNING: 'warning', // تحذير (أصفر)
    ERROR: 'error',     // خطأ أو مشكلة (أحمر)
    EXAM: 'exam',       // امتحان جديد (بنفسجي)
};