'use client';
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function CertificateModal({ studentName, courseName, instructorName, topics, score, total, date, onClose }) {
    const certificateRef = useRef();
    const [isDownloading, setIsDownloading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleDownload = async () => {
        setIsDownloading(true);
        if (typeof window !== 'undefined') {
            try {
                const html2pdf = (await import('html2pdf.js')).default;
                const element = certificateRef.current;
                
                const opt = {
                    margin: 0,
                    filename: `Certificate_${studentName.replace(/\s/g, '_')}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        backgroundColor: '#ffffff' // مهم جداً عشان الخلفية
                    },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
                };
                
                await html2pdf().set(opt).from(element).save();
            } catch (error) {
                console.error("PDF Error:", error);
                alert("حدث خطأ أثناء تحميل الشهادة. يرجى المحاولة مرة أخرى.");
            } finally {
                setIsDownloading(false);
            }
        }
    };

    const percentage = Math.round((score / total) * 100);
    let grade = 'Pass';
    if (percentage >= 90) grade = 'Excellent';
    else if (percentage >= 80) grade = 'Very Good';
    else if (percentage >= 75) grade = 'Good';

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-md animate-fade-in">
            
            <div className="flex min-h-full items-center justify-center p-4 md:p-8">

                {/* الأزرار العلوية */}
                <div className="fixed top-4 right-4 flex gap-3 z-[1000]">
                    <button onClick={handleDownload} disabled={isDownloading} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 text-sm md:text-base">
                        {isDownloading ? 'Processing...' : '📥 Download PDF'}
                    </button>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 md:px-4 md:py-3 rounded-xl font-bold backdrop-blur text-sm md:text-base">
                        Close ✕
                    </button>
                </div>

                {/* جسم الشهادة القابل للطباعة */}
                <div className="overflow-auto max-w-full rounded-lg shadow-2xl">
                    
                    {/* استخدمنا ستايلات مباشرة هنا عشان مكتبة الـ PDF تفهمها صح */}
                    <div ref={certificateRef} className="w-[1100px] h-[750px] relative flex flex-col items-center justify-center p-12 text-center min-w-[1100px]" 
                        style={{ 
                            fontFamily: "'Times New Roman', serif", 
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            backgroundImage: 'linear-gradient(to bottom, #fffff0, #ffffff)'
                        }}>
                        
                        {/* الإطار الذهبي */}
                        <div className="absolute inset-4 border-[8px] border-double" style={{ borderColor: '#D4AF37' }}></div>
                        <div className="absolute inset-2 border-[2px]" style={{ borderColor: '#D4AF37' }}></div>
                        
                        {/* الزخارف الجانبية */}
                        <div className="absolute top-4 left-4 w-32 h-32 border-t-[8px] border-l-[8px] rounded-tl-3xl" style={{ borderColor: '#D4AF37' }}></div>
                        <div className="absolute top-4 right-4 w-32 h-32 border-t-[8px] border-r-[8px] rounded-tr-3xl" style={{ borderColor: '#D4AF37' }}></div>
                        <div className="absolute bottom-4 left-4 w-32 h-32 border-b-[8px] border-l-[8px] rounded-bl-3xl" style={{ borderColor: '#D4AF37' }}></div>
                        <div className="absolute bottom-4 right-4 w-32 h-32 border-b-[8px] border-r-[8px] rounded-br-3xl" style={{ borderColor: '#D4AF37' }}></div>

                        {/* المحتوى */}
                        <div className="z-10 w-full max-w-4xl space-y-4 mt-4">
                            
                            {/* اللوجو */}
                            <div className="flex flex-col items-center justify-center mb-6">
                                <img src="/assets/images/logo.png" alt="Logo" className="h-24 mb-3 object-contain" />
                                <div style={{ color: '#D4AF37', letterSpacing: '0.3em' }} className="text-3xl font-black uppercase font-serif">
                                    SCIENCE ACADEMY
                                </div>
                            </div>

                            <h1 className="text-5xl font-serif font-bold tracking-wide" style={{ color: '#1F2937' }}>
                                Certificate of Completion
                            </h1>
                            
                            <p className="text-lg italic font-medium" style={{ color: '#6B7280' }}>This certificate is proudly presented to</p>

                            {/* اسم الطالب */}
                            <div className="py-2">
                                <h2 className="text-5xl font-black border-b-2 inline-block pb-4 px-12 font-serif min-w-[500px]" 
                                    style={{ color: '#1a237e', borderColor: '#D4AF37' }}>
                                    {studentName}
                                </h2>
                            </div>

                            {/* التفاصيل */}
                            <div className="text-xl leading-relaxed max-w-3xl mx-auto" style={{ color: '#374151' }}>
                                <p>For successfully passing the exam in <span className="font-bold text-2xl" style={{ color: '#000000' }}>"{courseName}"</span></p>
                                
                                {topics && (
                                    <p className="text-base mt-2 italic border-t border-b py-1 inline-block px-4" style={{ color: '#4B5563', borderColor: '#E5E7EB' }}>
                                        Covering: <span className="font-bold" style={{ color: '#1F2937' }}>{topics}</span>
                                    </p>
                                )}

                                <p className="mt-2">with a score of <span className="font-bold" style={{ color: '#000000' }}>{score} / {total}</span> ({grade})</p>
                            </div>

                            {/* الإمضاءات */}
                            <div className="flex justify-between items-end mt-12 px-12 w-full">
                                
                                {/* إمضاء الشمال */}
                                <div className="text-center w-64">
                                    <div className="text-2xl font-serif italic mb-1" style={{ fontFamily: 'Cursive', color: '#1a237e' }}>
                                        Science Academy
                                    </div>
                                    <div className="text-lg font-bold border-t px-4 pt-2" style={{ color: '#1F2937', borderColor: '#9CA3AF' }}>
                                        General Manager
                                    </div>
                                </div>

                                {/* الختم */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-28 h-28 rounded-full border-4 flex items-center justify-center opacity-90 mb-2" style={{ borderColor: '#D4AF37' }}>
                                        <div className="absolute inset-1 border rounded-full border-dashed" style={{ borderColor: '#D4AF37' }}></div>
                                        <span className="font-black text-[10px] text-center rotate-[-15deg] uppercase leading-tight" style={{ color: '#D4AF37' }}>
                                            Official<br/>Document<br/>Verified
                                        </span>
                                    </div>
                                    <div className="font-bold text-sm" style={{ color: '#6B7280' }}>
                                        {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>

                                {/* إمضاء اليمين */}
                                <div className="text-center w-64">
                                    <div className="text-2xl font-serif italic mb-1" style={{ fontFamily: 'Cursive', color: '#1a237e' }}>
                                        {instructorName || "Instructor"}
                                    </div>
                                    <div className="text-lg font-bold border-t px-4 pt-2" style={{ color: '#1F2937', borderColor: '#9CA3AF' }}>
                                        Course Instructor
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}