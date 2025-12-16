'use client';
import React, { useState, useEffect } from 'react';
import { getLeaderboard, resetLeaderboard } from '@/app/actions/admin';

export default function LeaderboardTab({ myCourses, isDarkMode }) {
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);

  const theme = {
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
  };

  // Helper: Card Styles
  const getCardStyle = (type) => {
    switch(type) {
        case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
        case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
        default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
    }
  };

  useEffect(() => {
    if (!selectedCourseId) return;
    const fetchLB = async () => {
        setLoading(true);
        const res = await getLeaderboard(selectedCourseId);
        if (res.success) setLeaderboardData(res.data);
        setLoading(false);
    };
    fetchLB();
  }, [selectedCourseId]);

  const handleReset = async () => {
      if (!confirm("⚠️ تحذير هام!\nهل أنت متأكد من حذف جميع نتائج هذه المادة؟\nسيتم تصفير لوحة الشرف ولن يمكن استرجاع البيانات.")) return;
      
      const res = await resetLeaderboard(selectedCourseId);
      if (res.success) {
          alert(res.message);
          setLeaderboardData([]);
      } else {
          alert("❌ حدث خطأ: " + res.message);
      }
  };

  const currentCourse = myCourses.find(c => c.id === selectedCourseId);

  // 1️⃣ VIEW: Course Grid
  if (!selectedCourseId) {
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className={`text-2xl font-bold ${theme.textMain}`}>🏆 لوحة الشرف والأوائل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map(course => {
                    const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                    const styles = getCardStyle(type);
                    return (
                        <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                            <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                            <div className="flex items-start gap-4 z-10 relative">
                                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm">
                                    {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : '🏆'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.label}</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                {type !== 'summer' ? (
                                    <>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                        <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "شعبة عامة"}</p>
                                    </>
                                ) : <p className="text-xs text-blue-500 font-bold">🌟 كورس عام</p>}
                            </div>
                            <div className="mt-4 text-center text-xs font-bold text-gray-400 group-hover:text-yellow-500 transition">
                                عرض الأوائل 🥇
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  }

  // 2️⃣ VIEW: Leaderboard List
  return (
    <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
                <button onClick={() => setSelectedCourseId(null)} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
                <h3 className={`font-bold text-2xl ${theme.textMain}`}>أوائل: <span className="text-yellow-500">{currentCourse?.name}</span></h3>
            </div>
            <button onClick={handleReset} className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition">
                🗑️ تصفير النتائج
            </button>
        </div>
        
        {loading ? <p className="text-gray-500 text-center py-10">⏳ جاري تحميل الأوائل...</p> : leaderboardData.length === 0 ? <p className="text-gray-500 text-center py-10">لا توجد نتائج مسجلة لهذه المادة حتى الآن.</p> :
        <div className="grid gap-3 max-w-4xl mx-auto">
            {leaderboardData.map((student, idx) => (
                <div key={student.id} className={`flex items-center justify-between p-4 rounded-xl border transition hover:scale-[1.01] ${theme.card} ${idx === 0 ? 'border-yellow-400 shadow-yellow-500/20 shadow-lg' : idx === 1 ? 'border-gray-300' : idx === 2 ? 'border-orange-300' : ''}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                            {idx + 1}
                        </div>
                        <div>
                            <div className={`font-bold text-lg ${theme.textMain}`}>{student.studentName || 'طالب'}</div>
                            <div className={`text-xs ${theme.textSec}`}>⏱ {student.timeTaken}</div>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-500 flex flex-col items-end">
                        <span>{student.score}</span>
                        <span className="text-[10px] font-normal text-gray-400">درجة</span>
                    </div>
                </div>
            ))}
        </div>
        }
    </div>
  );
}