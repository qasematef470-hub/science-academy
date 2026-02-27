'use client';

import React, { useState, useEffect } from 'react';
import { getRegistrationVideoUrl } from '@/app/actions/admin';

const steps = [
    {
        icon: '👤',
        title: 'إنشاء حساب جديد',
        description: 'قم بالتسجيل في المنصة بخطوات بسيطة كطالب جديد، وأدخل بياناتك المطلوبة.',
    },
    {
        icon: '🔍',
        title: 'تصفح المواد واختيار الدورة',
        description: 'ابحث عن الدورة أو المادة التي ترغب في دراستها من قائمة المواد المتاحة وقم بإضافتها.',
    },
    {
        icon: '🚀',
        title: 'تفعيل الاشتراك والبدء',
        description: 'تواصل مع الدعم الفني أو أدخل كود التفعيل الخاص بك لفتح محتوى المادة فوراً.',
    }
];

export default function RegistrationGuide({ theme, isDarkMode }) {
    const [videoId, setVideoId] = useState('YsmGiwCnHhE');

    useEffect(() => {
        async function fetchVideoId() {
            try {
                const res = await getRegistrationVideoUrl();
                if (res.success && res.videoId) {
                    // إذا المستخدم حط رابط كامل، نستخرج منه الـ ID
                    let id = res.videoId;
                    if (id.includes('youtube.com/watch')) {
                        const url = new URL(id);
                        id = url.searchParams.get('v') || id;
                    } else if (id.includes('youtu.be/')) {
                        id = id.split('youtu.be/')[1]?.split('?')[0] || id;
                    } else if (id.includes('youtube.com/embed/')) {
                        id = id.split('embed/')[1]?.split('?')[0] || id;
                    }
                    setVideoId(id);
                }
            } catch (e) {
                console.error('Failed to fetch video URL:', e);
            }
        }
        fetchVideoId();
    }, []);

    return (
        <section className={`py-24 relative overflow-hidden bg-transparent`}>

            {/* Background Decorations */}
            {isDarkMode && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
                </div>
            )}

            <div className="container mx-auto px-4 lg:px-8 max-w-7xl relative z-10">
                {/* Header */}
                <div className="text-center mb-16 md:mb-20">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wide mb-4 ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                        دليلك للبدء
                    </span>
                    <h2 className={`text-4xl md:text-5xl font-black mb-6 ${theme?.textMain || 'text-slate-900'}`}>
                        طـريـقـة التـسـجـيـل
                    </h2>
                    <p className={`text-lg md:text-xl font-bold max-w-2xl mx-auto ${theme?.textSec || 'text-gray-500'}`}>
                        شاهد الفيديو القصير أو اتبع الخطوات الموضحة أدناه لتنضم إلى طلابنا وتبدأ رحلة تفوقك بكل سهولة.
                    </p>
                </div>

                {/* Main Content Centered Layout */}
                <div className="flex flex-col items-center gap-16 lg:gap-24 w-full">

                    {/* Top Side: Video Player (The Hero) */}
                    <div className="w-full max-w-4xl relative group mx-auto">
                        {/* Strong Glowing Blur Effect behind Video */}
                        <div className={`absolute -inset-10 rounded-[3rem] blur-[100px] transition-opacity duration-500 group-hover:opacity-70 -z-10 ${isDarkMode ? 'bg-blue-600/40' : 'bg-blue-500/20'}`}></div>

                        {/* Sleek transparent glass border around video */}
                        <div className={`relative p-2 rounded-[2.5rem] shadow-2xl transition-transform duration-500 hover:scale-[1.01] ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white/40 border border-gray-200/50 backdrop-blur-md'}`}>

                            {/* Inner Video Container / Screen Frame */}
                            <div className={`relative w-full aspect-video rounded-3xl overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-white/5' : 'bg-black border-[4px] border-slate-800'}`}>

                                {/* Screen Top Bar (Fake Mac-like UI) */}
                                <div className="h-6 bg-slate-800/80 backdrop-blur-md flex items-center px-4 gap-1.5 absolute top-0 w-full z-10 border-b border-white/5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                </div>

                                {/* YouTube iframe wrapper */}
                                <div className="w-full h-full pt-6 bg-black relative">
                                    <iframe
                                        className="w-full h-full absolute inset-0 pt-6 object-cover"
                                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                                        title="شرح التسجيل في المنصة"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Side: The Steps (Cards Grid) */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className={`relative flex flex-col items-center text-center p-6 md:p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl ${isDarkMode ? 'bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10' : 'bg-white/80 backdrop-blur-md hover:bg-white shadow-sm border border-gray-200 hover:border-gray-300'}`}
                            >
                                {/* Step Number Indication (Top Corner) */}
                                <div className={`absolute top-4 ${isDarkMode ? 'right-4 bg-white/10 text-white/50' : 'right-4 bg-gray-100 text-gray-500'} w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`}>
                                    {index + 1}
                                </div>

                                {/* Icon Badge */}
                                <div className={`w-20 h-20 mb-6 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-inner relative z-10 transition-transform duration-300 hover:scale-110 ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-200 border border-gray-300 text-slate-800'}`}>
                                    {step.icon}
                                </div>

                                {/* Text Content */}
                                <h3 className={`text-xl font-black mb-3 ${theme?.textMain || 'text-slate-900'}`}>
                                    {step.title}
                                </h3>
                                <p className={`text-sm md:text-base leading-relaxed font-semibold opacity-80 ${theme?.textSec || 'text-gray-500'}`}>
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
}
