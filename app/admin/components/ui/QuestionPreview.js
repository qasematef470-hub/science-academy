'use client';
import React from 'react';
import MathText from '@/app/components/ui/MathText';

export default function QuestionPreview({ question, options, image, difficulty }) {
  
  // ألوان الصعوبة (الاستايل الهادي)
  const getDifficultyColor = (level) => {
    switch(level) {
      case 'easy': return 'bg-emerald-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'hard': return 'bg-rose-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // ألوان الحدود للإجابات
  const getOptionStyle = (isCorrect) => {
    if (isCorrect) return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-900 dark:text-emerald-100';
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300';
  };

  return (
    // الكارت الرئيسي: عريض وواخد راحته (Wide Layout)
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden relative">
      
      {/* شريط ملون فوق حسب الصعوبة */}
      <div className={`h-1.5 w-full ${getDifficultyColor(difficulty)} opacity-80`}></div>

      <div className="p-6 md:p-8">
        
        {/* الهيدر: الصعوبة + بادج المعاينة */}
        <div className="flex justify-between items-center mb-6">
           <span className={`px-4 py-1 rounded-full text-xs font-bold shadow-sm ${getDifficultyColor(difficulty)}`}>
              {difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب'}
           </span>
           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-gray-200 px-2 py-1 rounded">
             Student View
           </span>
        </div>

        <div className="flex flex-col items-center text-center space-y-6">
          
          {/* 1. الصورة (لو موجودة) - بتظهر بشكل متوسط عشان متبوظش العرض */}
          {image && (
            <div className="w-full flex justify-center mb-2">
               <img src={image} alt="Question" className="max-h-60 rounded-xl object-contain shadow-sm border border-gray-100 dark:border-gray-700" />
            </div>
          )}

          {/* 2. السؤال (خط كبير وواضح) */}
          <div className="w-full px-4">
             <div className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white leading-relaxed dir-auto">
                <MathText text={question || "نص السؤال يظهر هنا..."} />
             </div>
          </div>

          {/* 3. الخيارات (Grid 2x2) -> عشان تبقى عريضة جنب بعض */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {options.map((opt, idx) => (
              <div 
                key={idx}
                className={`relative p-5 rounded-2xl border-2 flex items-center justify-center text-center transition-all duration-200 min-h-[80px]
                ${getOptionStyle(opt.isCorrect)}`}
              >
                 {/* علامة الصح للإجابة الصحيحة (بتظهر ليك انت بس كأدمن) */}
                 {opt.isCorrect && (
                   <span className="absolute top-2 right-3 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                     إجابة صحيحة
                   </span>
                 )}

                 <div className="text-lg font-bold">
                    <MathText text={opt.text || `الخيار ${idx + 1}`} />
                 </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}