"use client";
import { useState } from 'react';

const BrandLogo = ({ isDarkMode }) => {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-3xl">🧬</span>
                <span className={`font-black text-xl tracking-tight hidden md:block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Science Academy
                </span>
            </div>
        );
    }

    return (
        <div className="relative w-12 h-12 md:w-40 md:h-12 flex items-center">
             <img 
                src="/assets/images/logo.png" 
                alt="Science Academy Logo" 
                className="w-full h-full object-contain"
                onError={() => setError(true)}
            />
        </div>
    );
};

export default BrandLogo;