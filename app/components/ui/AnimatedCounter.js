"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';

const AnimatedCounter = ({ value, label }) => {
    const [count, setCount] = useState(0);
    
    const numericValue = parseInt(value.toString().replace(/\D/g, '')) || 0;
    const prefix = value.toString().includes('+') ? '+' : '';
    const suffix = value.toString().includes('/') ? '/7' : '';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            onViewportEnter={() => {
                let start = 0;
                const end = numericValue;
                const duration = 2000; 
                const increment = end / (duration / 16); 

                const timer = setInterval(() => {
                    start += increment;
                    if (start >= end) {
                        setCount(end);
                        clearInterval(timer);
                    } else {
                        setCount(Math.floor(start));
                    }
                }, 16);
            }}
            className="text-center p-4"
        >
            <h4 className="text-4xl font-black text-blue-500 mb-2 dir-ltr" style={{ direction: 'ltr' }}>
                {prefix}{count}{suffix}
            </h4>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
        </motion.div>
    );
};

export default AnimatedCounter;