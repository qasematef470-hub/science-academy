'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function CourseCard({ course, isDark = true, status = 'not-enrolled', handlers = {}, onClick }) {
    const router = useRouter();
    const isActive = status === 'active';
    const isPending = status === 'pending';

    const { handleInitiateSubscribe, handleOpenActivation, handleCancelRequest, handleOverview } = handlers;

    const onSubscribeClick = (e) => {
        e.stopPropagation();
        if (handleInitiateSubscribe) {
            handleInitiateSubscribe(course);
        } else {
            router.push('/login'); // Public pages redirect to login
        }
    };

    const overviewUrl = `/dashboard/course/${course.id || course.courseId}`;

    const onOverviewClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (handleOverview) {
            handleOverview(course);
        } else {
            router.push(overviewUrl);
        }
    };

    return (
        <div onClick={onClick || onOverviewClick} className={`group w-full cursor-pointer relative flex flex-col rounded-[2.5rem] overflow-hidden border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${isDark ? 'bg-[#0f121a] border-white/5 hover:border-blue-500/40' : 'bg-white border-gray-100 ring-1 ring-gray-100'}`}>

            {/* 1. صورة الكورس */}
            <div className="relative aspect-video overflow-hidden rounded-t-[2.5rem] bg-gray-900 border-b border-white/5">
                {course.image ? (
                    <img
                        src={course.image}
                        alt={course.name || course.courseName}
                        fetchpriority="high"
                        onError={(e) => { e.currentTarget.src = '/assets/images/logo.png'; }}
                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center text-6xl ${isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>📚</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status / Price Badge */}
                <div className="absolute top-4 right-4 z-20">
                    {isActive ? (
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-lg bg-emerald-500/90 text-white">✓ مفعل</span>
                    ) : isPending ? (
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-lg bg-amber-500/90 text-white">⏳ قيد المراجعة</span>
                    ) : (
                        <span className="bg-blue-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg shadow-blue-600/30">
                            {course.price > 0 ? `${course.price} ج.م` : 'مجاني 🔥'}
                        </span>
                    )}
                </div>

                {/* الشعبه (Section) */}
                {course.section && !isActive && !isPending && (
                    <div className="absolute top-4 left-4 z-20">
                        <span className="inline-block border border-white/30 bg-white/10 backdrop-blur-sm text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                            {course.section || course.category}
                        </span>
                    </div>
                )}
            </div>

            {/* 2. التفاصيل */}
            <div className="p-6 md:p-8 flex flex-col flex-1 relative z-10">
                <h4 className={`text-2xl font-black mb-3 line-clamp-2 leading-snug drop-shadow-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {course.name || course.courseName}
                </h4>

                {/* Instructor */}
                <div className="flex items-center gap-3 mb-8">
                    <img
                        src={course.instructorImage || '/assets/images/logo.png'}
                        alt="instructor"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = '/assets/images/logo.png'; }}
                        className="w-8 h-8 rounded-full border-2 border-blue-500/30 object-cover shadow-md bg-white/5"
                    />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">المحاضر / المدرب</span>
                        <span className="text-sm text-gray-300 font-bold">{course.instructorName || 'Science Academy'}</span>
                    </div>
                </div>

                {/* 🧠 Smart Buttons */}
                <div className="mt-auto space-y-3">

                    {/* A — Active: single big CTA */}
                    {isActive && (
                        <button
                            onClick={(e) => { e.stopPropagation(); router.push(overviewUrl); }}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            بدء المذاكرة 🚀
                        </button>
                    )}

                    {/* B — Pending: Activate + Cancel */}
                    {isPending && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={onOverviewClick}
                                    className={`py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                    نظرة عامة 👁️
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenActivation && handleOpenActivation(course); }}
                                    className="py-3 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    تفعيل الاشتراك 🔓
                                </button>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCancelRequest && handleCancelRequest(course.courseId); }}
                                className="w-full py-2 mt-2 text-xs text-red-500/70 hover:text-red-500 font-bold transition flex items-center justify-center gap-1"
                            >
                                ✕ إلغاء طلب الاشتراك
                            </button>
                        </>
                    )}

                    {/* C — Not Enrolled: Overview + Subscribe */}
                    {!isActive && !isPending && (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={onOverviewClick}
                                className={`py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-sm ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                            >
                                نظرة عامة 👁️
                            </button>
                            <button
                                onClick={onSubscribeClick}
                                className="py-3 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                الاشتراك الآن 🔥
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
