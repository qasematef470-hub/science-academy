import "./globals.css";

export const metadata = {
  title: "Science Academy", // ده العنوان اللي هيظهر فوق
  description: "Science Academy",
  icons: {
    icon: '/logo.png', // دي أيقونة اللوجو بتاعك هتظهر في اللسان
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}