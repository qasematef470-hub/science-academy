"use client";
import { motion, useScroll, useTransform } from 'framer-motion';

const FloatingShape = ({ type, top, left, right, bottom, isDarkMode, isFront, speed = 1 }) => {
    // 1. ربط الحركة بالسكرول
    const { scrollY } = useScroll();
    // كل ما تنزل 1000 بيكسل، العنصر يطلع لفوق (قيمة سلبية) مضروبة في سرعته
    const yScroll = useTransform(scrollY, [0, 1000], [0, -200 * speed]);

    const icons = {
        flask: '⚗️',
        atom: '⚛️',
        triangle: '📐',
        dna: '🧬',
        code: '💻',
        pi: 'π',
        integral: '∫',
        bug: '🐛',
        planet: '🪐'
    };

    const icon = icons[type] || '✨';
    
    // زودت الشفافية شوية عشان يظهروا
    const opacity = isFront ? "opacity-40" : (isDarkMode ? "opacity-20" : "opacity-30");
    const color = isDarkMode ? "text-white" : "text-blue-900";
    
    return (
        <motion.div
            style={{ 
                top, left, right, bottom, 
                position: 'absolute' 
            }} 
            // 2. أنيميشن الطفو العادي (شغال لوحده)
            animate={{ 
                rotate: [0, 10, -10, 0], 
                translateY: [0, -20, 0] 
            }}
            transition={{ 
                duration: 5 + speed, // تنويع السرعة
                repeat: Infinity, 
                ease: "easeInOut" 
            }}
            className={`text-6xl md:text-8xl pointer-events-none select-none font-mono z-0 ${opacity} ${color}`}
        >
            {icon}
        </motion.div>
    );
};

export default FloatingShape;