export default function Loading() {
    return (
        <div className="bg-[#050505] min-h-screen flex flex-col items-center justify-center gap-6" dir="rtl">
            {/* Spinner */}
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-emerald-400 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-blue-400 border-l-emerald-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            </div>
            {/* Pulsing text */}
            <p className="text-gray-400 text-sm font-bold animate-pulse tracking-wide">
                جاري التحميل...
            </p>
        </div>
    );
}
