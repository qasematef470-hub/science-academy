'use client';

import React, { useRef } from 'react';

const achievers = [
    { id: 4, rank: 4, image: '/assets/images/4.png', name: 'ندا مجاهد', gpa: '3.57' },
    { id: 2, rank: 2, image: '/assets/images/2.png', name: 'حسناء حميد', gpa: '3.73' },
    { id: 1, rank: 1, image: '/assets/images/1.jpeg', name: 'مريم حسين', gpa: '3.83' },
    { id: 3, rank: 3, image: '/assets/images/3.png', name: 'كريمان محمد', gpa: '3.63' },
    { id: 5, rank: 5, image: '/assets/images/5.png', name: 'سوندس طلعت', gpa: '3.46' },
];

export default function HallOfFame({ theme, isDarkMode }) {
    const scrollContainerRef = useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth * 0.75;
            // In RTL, scroll direction is reversed
            const scrollValue = direction === 'left' ? -scrollAmount : scrollAmount;
            scrollContainerRef.current.scrollBy({ left: scrollValue, behavior: 'smooth' });
        }
    };

    // Desktop styling logic
    const getDesktopStyle = (rank) => {
        let baseStyle = "relative transition-all duration-500 hover:-translate-y-4 cursor-pointer group flex flex-col items-center";
        let zIndex = 10;
        let scale = 'scale-85 md:scale-90';
        let opacity = 'opacity-60 text-gray-500 hover:opacity-100 hover:text-white';
        let border = 'border-2 border-white/20';
        let margin = '';
        let overlay = 'bg-black/50 group-hover:bg-transparent';

        switch (rank) {
            case 1:
                zIndex = 50;
                scale = 'scale-110 md:scale-[1.15] md:-translate-y-4';
                opacity = 'opacity-100 text-white';
                margin = 'mx-1 md:mx-4';
                border = 'border-[4px] border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.5)]';
                overlay = 'bg-transparent'; // No overlay for #1
                break;
            case 2:
                // Right of #1
                zIndex = 40;
                scale = 'scale-100 md:scale-100';
                opacity = 'opacity-100 text-slate-200';
                margin = 'mx-1 md:mx-4';
                border = 'border-[3px] border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)]';
                overlay = 'bg-black/30 group-hover:bg-transparent';
                break;
            case 3:
                // Left of #1
                zIndex = 40;
                scale = 'scale-100 md:scale-100';
                opacity = 'opacity-100 text-orange-200';
                margin = 'mx-1 md:mx-4';
                border = 'border-[3px] border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.3)]';
                overlay = 'bg-black/30 group-hover:bg-transparent';
                break;
            case 4:
                // Far Right
                zIndex = 30;
                scale = 'scale-90 md:scale-90';
                opacity = 'opacity-60 hover:opacity-100 text-gray-400 hover:text-white';
                margin = 'mx-1 md:mx-3';
                overlay = 'bg-black/50 group-hover:bg-transparent';
                border = 'border-2 border-white/20';
                break;
            case 5:
                // Far Left
                zIndex = 30;
                scale = 'scale-90 md:scale-90';
                opacity = 'opacity-60 hover:opacity-100 text-gray-400 hover:text-white';
                margin = 'mx-1 md:mx-3';
                overlay = 'bg-black/50 group-hover:bg-transparent';
                border = 'border-2 border-white/20';
                break;
            default:
                break;
        }

        return { baseStyle: `${baseStyle} ${scale} ${opacity} ${margin}`, zIndex, border, overlay };
    };

    return (
        <section className={`py-20 relative overflow-hidden bg-transparent`}>
            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="text-center mb-16 md:mb-24">
                    <h2 className="text-4xl md:text-5xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-l from-amber-400 to-yellow-600">
                        لـوحـة الشـرف 🏆
                    </h2>
                    <p className={`text-lg md:text-xl font-bold max-w-2xl mx-auto ${theme?.textSec || 'text-gray-500'}`}>
                        الطلاب الأوائل الذين حققوا أعلى النتائج في أكاديمية العلوم. نسعى دائماً لتقدير التفوق.
                    </p>
                </div>

                {/* --- Desktop Podium --- */}
                <div className="hidden lg:flex justify-center items-center h-[500px] mt-10 w-full px-4">
                    {achievers.map((achiever) => {
                        const style = getDesktopStyle(achiever.rank);

                        return (
                            <div
                                key={achiever.id}
                                className={style.baseStyle}
                                style={{ zIndex: style.zIndex }}
                            >
                                <div className={`relative w-48 lg:w-[17rem] aspect-[4/3] rounded-[2rem] overflow-hidden bg-black/40 backdrop-blur-xl flex items-center justify-center ${style.border}`}>
                                    <img
                                        src={achiever.image}
                                        alt={achiever.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-slate-800', 'to-slate-900', 'flex-col');
                                            e.target.parentElement.innerHTML = `<span class="text-4xl mb-2">🎓</span><p class="font-bold text-white/50 text-sm tracking-widest">${achiever.name}</p>`;
                                        }}
                                    />
                                    {/* Glass Overlay for depth */}
                                    <div className={`absolute inset-0 transition-colors duration-500 ${style.overlay}`}></div>
                                </div>
                                <div className={`mt-6 px-6 py-3 rounded-2xl backdrop-blur-md ${achiever.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/10'} text-center shadow-xl w-48 lg:w-[17rem] flex flex-col items-center gap-1`}>
                                    <span className={`text-[10px] sm:text-xs font-bold ${achiever.rank === 1 ? 'text-amber-400' : 'text-slate-400'}`}>المركز {achiever.rank === 1 ? 'الأول' : achiever.rank === 2 ? 'الثاني' : achiever.rank === 3 ? 'الثالث' : achiever.rank === 4 ? 'الرابع' : 'الخامس'}</span>
                                    <h3 className={`font-black text-sm md:text-md truncate max-w-full ${achiever.rank === 1 ? 'text-amber-300' : 'text-white'}`}>{achiever.name}</h3>
                                    <div className="flex items-center gap-1 mt-1 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                        <span className="text-xs text-slate-300 font-bold">التقدير:</span>
                                        <span className={`text-sm font-black tracking-widest ${achiever.rank === 1 ? 'text-green-400' : 'text-sky-400'}`}>{achiever.gpa}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- Mobile & Tablet Horizontal Scroll --- */}
                <div className="lg:hidden relative">
                    {/* Visual Scroll Arrows */}
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-1 top-[25%] z-30 w-12 h-12 rounded-full bg-slate-800/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/20 text-white flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                        aria-label="التالي"
                    >
                        <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-1 top-[25%] z-30 w-12 h-12 rounded-full bg-slate-800/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/20 text-white flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
                        aria-label="السابق"
                    >
                        <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto gap-4 pb-14 pt-6 snap-x snap-mandatory px-6 md:px-0 md:justify-center w-full relative"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {/* Sort sequentially for mobile to make more sense when swiping */}
                        {[...achievers].sort((a, b) => a.rank - b.rank).map((achiever) => {
                            let border = 'border-white/10';
                            let shadow = '';
                            let nameBadge = 'bg-white/5 text-white/80 border-white/10';

                            if (achiever.rank === 1) {
                                border = 'border-[3px] border-amber-400';
                                shadow = 'shadow-[0_0_20px_rgba(251,191,36,0.3)]';
                                nameBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                            } else if (achiever.rank === 2) {
                                border = 'border-[3px] border-slate-300';
                                nameBadge = 'bg-slate-300/10 text-slate-200 border-slate-300/30';
                            } else if (achiever.rank === 3) {
                                border = 'border-[3px] border-orange-500/80';
                                nameBadge = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
                            }

                            return (
                                <div key={achiever.id} className="min-w-[80vw] sm:min-w-[50vw] md:min-w-[40vw] snap-center flex flex-col items-center flex-shrink-0">
                                    <div className={`w-full aspect-[4/3] max-w-[380px] rounded-[2rem] overflow-hidden bg-slate-900 flex items-center justify-center ${border} ${shadow}`}>
                                        <img
                                            src={achiever.image}
                                            alt={achiever.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-slate-800', 'to-slate-900', 'flex-col');
                                                e.target.parentElement.innerHTML = `<span class="text-4xl mb-2">🎓</span><span class="text-white/50 font-bold tracking-widest text-sm">${achiever.name}</span>`;
                                            }}
                                        />
                                    </div>
                                    <div className={`mt-5 px-6 py-4 rounded-2xl border backdrop-blur-sm text-center w-full flex flex-col items-center gap-1.5 shadow-lg ${nameBadge}`}>
                                        <span className="text-[10px] font-bold opacity-70">المركز {achiever.rank === 1 ? 'الأول' : achiever.rank === 2 ? 'الثاني' : achiever.rank === 3 ? 'الثالث' : achiever.rank === 4 ? 'الرابع' : 'الخامس'}</span>
                                        <h3 className="font-black text-sm">{achiever.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1 bg-black/30 px-4 py-1.5 rounded-full border border-white/10">
                                            <span className="text-xs font-bold opacity-80">التقدير:</span>
                                            <span className={`text-sm font-black tracking-widest ${achiever.rank === 1 ? 'text-green-400' : 'text-sky-400'}`}>{achiever.gpa}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Background glowing effects */}
            {isDarkMode && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]"></div>
                </div>
            )}

            <style jsx>{`
                .lg\\:hidden::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    );
}
