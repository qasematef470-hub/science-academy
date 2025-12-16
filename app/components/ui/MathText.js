'use client';
import React, { useEffect, useRef, useState } from 'react';

export default function MathText({ text, className = "" }) {
    const containerRef = useRef(null);
    const [isLibLoaded, setIsLibLoaded] = useState(false);

    useEffect(() => {
        // 1. فحص وتحميل مكتبة KaTeX لو مش موجودة
        if (typeof window !== 'undefined' && !window.katex) {
            const link = document.createElement('link');
            link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
            link.rel = "stylesheet";
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
            script.defer = true;
            script.onload = () => setIsLibLoaded(true);
            document.head.appendChild(script);
        } else if (typeof window !== 'undefined' && window.katex) {
            setIsLibLoaded(true);
        }
    }, []);

    useEffect(() => {
        renderMath();
    }, [text, isLibLoaded]);

    const renderMath = () => {
        if (!isLibLoaded || !containerRef.current || !window.katex) return;

        // تقسيم النص بناءً على علامة $$ للمعادلات
        // المتغير parts هيكون مصفوفة فيها نصوص عادية ومعادلات
        const parts = text ? text.split(/(\$\$[^$]+\$\$)/g) : [];
        containerRef.current.innerHTML = '';

        parts.forEach(part => {
            const span = document.createElement('span');
            
            if (part.startsWith('$$') && part.endsWith('$$')) {
                // دي معادلة رياضية -> نستخدم KaTeX
                try {
                    const mathContent = part.slice(2, -2); // شيل علامات $$
                    window.katex.render(mathContent, span, { 
                        throwOnError: false,
                        displayMode: false, // عشان تيجي في نفس السطر (Inline)
                        output: 'html' // استخدام HTML للعرض
                    });
                    span.dir = 'ltr'; // المعادلة دايماً من الشمال لليمين
                    span.style.margin = '0 3px';
                    span.style.display = 'inline-block';
                } catch (e) { 
                    span.innerText = part; 
                }
            } else {
                // ده نص عادي (عربي أو إنجليزي)
                span.innerText = part;
            }
            containerRef.current.appendChild(span);
        });
    };

    return (
        <div 
            ref={containerRef} 
            dir="auto" 
            className={`font-medium unicode-bidi-isolate leading-relaxed ${className}`} 
        />
    );
}