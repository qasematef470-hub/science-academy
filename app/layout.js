import { Cairo } from "next/font/google";
import "./globals.css";
// 👇 استدعاء ملف الإشعارات (حافظنا عليه)
import NotificationSetup from "./NotificationSetup";

// إعداد الخط
const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
  variable: "--font-cairo", // مهم عشان Tailwind
});

// 👇 التعديل هنا: إعدادات الميتا والأيقونة
export const metadata = {
  title: {
    template: '%s | Science Academy', // القالب الديناميكي
    default: 'Science Academy - منصة التفوق', // العنوان الافتراضي
  },
  description: "أقوى منصة تعليمية لطلاب الكليات العلمية، شرح ومراجعات وامتحانات.",
  icons: {
    icon: '/assets/images/logo.png', // 👈 حط اللوجو هنا
    shortcut: '/assets/images/logo.png',
    apple: '/assets/images/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    // 👇 ظبطنا اللغة عربي والاتجاه يمين
    <html lang="ar" dir="rtl">
      {/* 🔥🔥 1. ضفنا الجزء ده عشان يحمل تصميم الرياضيات */}
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
      </head>
      
      <body className={`${cairo.className} antialiased overflow-x-hidden`}>
        {/* 👇 كود الإشعارات موجود هنا */}
        <NotificationSetup />
        
        {children}

        {/* 🔥🔥 2. ضفنا مكتبة الرياضيات هنا عشان تشتغل في الموقع كله */}
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
      </body>
    </html>
  );
}

