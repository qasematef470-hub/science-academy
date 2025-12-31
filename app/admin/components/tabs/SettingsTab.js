'use client';
import React, { useState, useEffect } from 'react';
import { 
    saveCourseSettings, 
    getCourseSettings, 
    getUniqueLectures, 
    toggleSystemMode, 
    getSystemModes 
} from '@/app/actions/admin';

export default function SettingsTab({ myCourses, isDarkMode }) {
  // Theme
  const theme = {
    input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    accentGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
  };

  // States
  // States
  const [selectedCourseId, setSelectedCourseId] = useState(null); 
  const [availableLectures, setAvailableLectures] = useState([]);
  const [lectureStats, setLectureStats] = useState({}); // 👈 ضيف السطر ده هنا
  const [systemModes, setSystemModes] = useState({ 
      study_mode: true, 
      revision_mode: false, 
      vacation_mode: false 
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Settings Form State
  const [settings, setSettings] = useState({ 
      duration: 45, count: 20, examCode: '', allowReview: false,
      easyPercent: 30, mediumPercent: 50, hardPercent: 20,
      startDate: '', endDate: '',
      enableCertificate: false, minScorePercent: 90, 
      includedLectures: [], lectureCounts: {} 
  });

  // Helper: Card Styles
  const getCardStyle = (type) => {
    switch(type) {
        case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
        case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
        default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
    }
  };

  // Load System Modes
  useEffect(() => {
    async function loadModes() {
        const res = await getSystemModes();
        if (res.success) setSystemModes(res.data || {});
    }
    loadModes();
  }, []);

  // Load Course Settings
  useEffect(() => {
    if(!selectedCourseId) return;
    async function fetchData() {
        setLoadingSettings(true);
        const lRes = await getUniqueLectures(selectedCourseId);
        setAvailableLectures(lRes.success ? lRes.data : []);
        setLectureStats(lRes.stats || {});

        const sRes = await getCourseSettings(selectedCourseId);
        
        // دي القيم اللي هنصفر بيها الصفحة
        const emptySettings = { 
            duration: 45, count: 0, examCode: '', allowReview: false,
            easyPercent: 30, mediumPercent: 50, hardPercent: 20,
            startDate: '', endDate: '',
            enableCertificate: false, minScorePercent: 90, 
            includedLectures: [], lectureCounts: {} 
        };

        if (sRes.success && sRes.data) {
            // هنا بنصفر الصفحة أولاً بالـ emptySettings وبعدين نحط بيانات المادة
            setSettings({ ...emptySettings, ...sRes.data });
        } else {
            setSettings(emptySettings);
        }
        setLoadingSettings(false);
    }
    fetchData();
  }, [selectedCourseId]);

  // Handlers
  const handleSystemModeToggle = async (mode) => {
      const newState = !systemModes[mode];
      setSystemModes(prev => ({ ...prev, [mode]: newState }));
      await toggleSystemMode(mode, newState);
  };

  const resetExamSettings = async () => {
    if (!confirm("هل أنت متأكد من حذف جميع إعدادات الامتحان الحالية والبدء من الصفر؟")) return;
    
    // 1. تصفير الـ State في الصفحة فوراً
    const cleared = { 
        duration: 45, count: 0, examCode: '', allowReview: false,
        easyPercent: 30, mediumPercent: 50, hardPercent: 20,
        startDate: '', endDate: '',
        enableCertificate: false, minScorePercent: 90, 
        includedLectures: [], lectureCounts: {} 
    };
    setSettings(cleared);

    // 2. مسح الإعدادات من الداتابيز نهائياً
    const res = await saveCourseSettings(selectedCourseId, cleared);
    
    if (res.success) {
        alert("✅ تم تصفير الامتحان بنجاح. يمكنك الآن ضبط إعدادات جديدة.");
    } else {
        alert("❌ فشل التصفير");
    }
  };
    const saveSettingsHandler = async () => {
    // 1. حساب المجموع الفعلي من المحاضرات المختارة الآن
    const lecturesTotal = (settings.includedLectures || []).reduce((acc, lec) => {
        return acc + (Number(settings.lectureCounts?.[lec]) || 0);
    }, 0);

    // 2. التحقق من مجموع الصعوبة
    const totalDiff = Number(settings.easyPercent) + Number(settings.mediumPercent) + Number(settings.hardPercent);
    if (totalDiff !== 100) return alert(`⚠️ مجموع الصعوبة لازم 100% (الحالي: ${totalDiff}%)`);

    // 3. التحقق من توفر الأسئلة في البنك
    const reqEasy = Math.round((Number(settings.easyPercent) / 100) * lecturesTotal);
    const reqMedium = Math.round((Number(settings.mediumPercent) / 100) * lecturesTotal);
    const reqHard = lecturesTotal - (reqEasy + reqMedium);

    let availEasy = 0, availMedium = 0, availHard = 0;
    settings.includedLectures.forEach(lecName => {
        const s = lectureStats[lecName] || { easy: 0, medium: 0, hard: 0 };
        availEasy += s.easy; availMedium += s.medium; availHard += s.hard;
    });

    if (availEasy < reqEasy || availMedium < reqMedium || availHard < reqHard) {
        return alert("⚠️ الأسئلة في البنك غير كافية لهذا العدد!");
    }

    // 4. الحفظ في الداتابيز
    const res = await saveCourseSettings(selectedCourseId, {
        ...settings,
        questionCount: lecturesTotal, // الرقم الحقيقي
        examDuration: Number(settings.duration), 
        easyPercent: Number(settings.easyPercent),
        mediumPercent: Number(settings.mediumPercent),
        hardPercent: Number(settings.hardPercent),
        minScorePercent: Number(settings.minScorePercent),
    });

    if (res.success) {
        setSettings(prev => ({ ...prev, count: lecturesTotal }));
        // 👇 هنا التعديل: الرقم بقى يطلع ديناميكي حسب اختيارك
        alert(`✅ تم الحفظ بنجاح والامتحان الآن ${lecturesTotal} سؤال`); 
    } else {
        alert("❌ خطأ في الحفظ");
    }
  };

  const toggleLectureSelection = (lecture) => {
    setSettings(prev => {
        const currentLectures = prev.includedLectures || []; 
        const currentCounts = { ...prev.lectureCounts };
        if (currentLectures.includes(lecture)) {
            const newLectures = currentLectures.filter(l => l !== lecture);
            delete currentCounts[lecture];
            const newTotal = Object.values(currentCounts).reduce((a, b) => Number(a) + Number(b), 0);
            // خلي الـ count هو الإجمالي الفعلي للمحاضرات المختارة بس
            return { ...prev, includedLectures: newLectures, lectureCounts: currentCounts, count: newTotal };
        } else {
            return { ...prev, includedLectures: [...currentLectures, lecture] };
        }
    });
  };

  // --- RENDER ---

  if (!selectedCourseId) {
      return (
          <div className="space-y-8 animate-fade-in">
              {/* Global Control Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                
                {/* 1. Study Mode Toggle */}
                <div className={`p-4 md:p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:shadow-lg text-center md:text-right ${systemModes.study_mode ? 'bg-indigo-50 border-indigo-300' : theme.card}`}>
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${systemModes.study_mode ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>🎓</div>
                        <div>
                            <h4 className={`font-bold text-lg ${systemModes.study_mode ? 'text-indigo-700' : theme.textMain}`}>وضع الدراسة</h4>
                            <p className="text-[10px] text-gray-500">عرض المناهج الأكاديمية</p>
                        </div>
                    </div>
                    <button onClick={() => handleSystemModeToggle('study_mode')} className={`w-14 h-8 rounded-full relative transition ${systemModes.study_mode ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all ${systemModes.study_mode ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                {/* 2. Revision Mode Toggle */}
                <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all hover:shadow-lg ${systemModes.revision_mode ? 'bg-orange-50 border-orange-300' : theme.card}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${systemModes.revision_mode ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>🔥</div>
                        <div>
                            <h4 className={`font-bold text-lg ${systemModes.revision_mode ? 'text-orange-700' : theme.textMain}`}>وضع المراجعة</h4>
                            <p className="text-[10px] text-gray-500">تفعيل تبويب المراجعة للطلاب</p>
                        </div>
                    </div>
                    <button onClick={() => handleSystemModeToggle('revision_mode')} className={`w-14 h-8 rounded-full relative transition ${systemModes.revision_mode ? 'bg-orange-500' : 'bg-gray-300'}`}>
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all ${systemModes.revision_mode ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                {/* 3. Vacation Mode Toggle */}
                <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all hover:shadow-lg ${systemModes.vacation_mode ? 'bg-cyan-50 border-cyan-300' : theme.card}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${systemModes.vacation_mode ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-400'}`}>🏖️</div>
                        <div>
                            <h4 className={`font-bold text-lg ${systemModes.vacation_mode ? 'text-cyan-700' : theme.textMain}`}>وضع الأجازة</h4>
                            <p className="text-[10px] text-gray-500">الكورسات الصيفية والمهارات</p>
                        </div>
                    </div>
                    <button onClick={() => handleSystemModeToggle('vacation_mode')} className={`w-14 h-8 rounded-full relative transition ${systemModes.vacation_mode ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all ${systemModes.vacation_mode ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

              </div>

              {/* Course Selection Header */}
              <div className="flex items-center gap-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className={`text-xl font-bold ${theme.textMain}`}>⚙️ إعدادات المواد والامتحانات</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">اختر مادة للتعديل</span>
              </div>

              {/* Course Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myCourses.map(course => {
                      const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                      const styles = getCardStyle(type);
                      return (
                          <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                              <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                              <div className="flex items-start gap-4 z-10 relative">
                                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm">
                                      {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover rounded-xl" /> : styles.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${styles.badge}`}>{styles.label}</span>
                                  </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                  {type !== 'summer' ? (
                                      <>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                        <p className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "قسم عام"}</p>
                                      </>
                                  ) : (
                                      <p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // 2️⃣ VIEW: Editor View (Specific Course Settings) - (نفس الكود القديم دون تغيير)
  const currentCourse = myCourses.find(c => c.id === selectedCourseId);

  return (
    <div className="animate-scale-in max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setSelectedCourseId(null)} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
            <h2 className={`text-2xl font-bold ${theme.textMain}`}>إعدادات: <span className="text-indigo-500">{currentCourse?.name}</span></h2>
        </div>

        {loadingSettings ? <div className="text-center py-20">⏳ جاري تحميل الإعدادات...</div> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Right Column: Main Configs */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={`p-6 rounded-3xl border shadow-sm ${theme.card}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🔑</span>
                            <h3 className={`font-bold ${theme.textMain}`}>كود الامتحان (Password)</h3>
                        </div>
                        <input type="text" placeholder="مثال: EXAM2025" className={`w-full p-4 rounded-xl text-center text-xl font-mono font-bold tracking-widest outline-none border-2 border-dashed border-gray-300 focus:border-indigo-500 transition ${theme.input}`} value={settings.examCode} onChange={(e) => setSettings({...settings, examCode: e.target.value})} />
                        <p className="text-[10px] text-gray-400 mt-2 text-center">اتركه فارغاً ليكون الامتحان مفتوحاً بدون كود</p>
                    </div>

                    <div className={`p-6 rounded-3xl border shadow-sm ${theme.card}`}>
                        <h3 className={`font-bold mb-4 flex items-center gap-2 ${theme.textMain}`}><span>⏳</span> التوقيت والمدة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={`text-xs font-bold ${theme.textSec}`}>يبدأ في</label><input type="datetime-local" className={`w-full p-3 rounded-xl mt-1 outline-none border ${theme.input}`} value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} /></div>
                            <div><label className={`text-xs font-bold ${theme.textSec}`}>ينتهي في</label><input type="datetime-local" className={`w-full p-3 rounded-xl mt-1 outline-none border ${theme.input}`} value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} /></div>
                            <div className="md:col-span-2"><label className={`text-xs font-bold ${theme.textSec}`}>مدة الامتحان (دقيقة)</label><input type="number" className={`w-full p-3 rounded-xl mt-1 outline-none border text-center font-bold ${theme.input}`} value={settings.duration} onChange={(e) => setSettings({...settings, duration: e.target.value})} /></div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-3xl border shadow-sm ${theme.card}`}>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className={`font-bold flex items-center gap-2 ${theme.textMain}`}><span>📊</span> توزيع الصعوبة</h3>
                             <span className={`text-xs font-bold px-2 py-1 rounded ${Number(settings.easyPercent)+Number(settings.mediumPercent)+Number(settings.hardPercent) === 100 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                المجموع: {Number(settings.easyPercent)+Number(settings.mediumPercent)+Number(settings.hardPercent)}%
                             </span>
                        </div>
                        <div className="space-y-4">
                            {[{ k: 'easyPercent', l: 'سهل 🟢', c: 'green' }, { k: 'mediumPercent', l: 'متوسط 🟡', c: 'yellow' }, { k: 'hardPercent', l: 'صعب 🔴', c: 'red' }].map((lvl) => (
                                <div key={lvl.k} className="flex items-center gap-3">
                                    <span className={`text-xs w-14 font-bold ${theme.textSec}`}>{lvl.l}</span>
                                    <input type="range" min="0" max="100" step="5" className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-${lvl.c}-200`} value={settings[lvl.k]} onChange={(e) => setSettings({...settings, [lvl.k]: e.target.value})} />
                                    <span className={`text-xs font-mono w-8 ${theme.textMain}`}>{settings[lvl.k]}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Left Column */}
                <div className="space-y-6">
                    <div className={`p-6 rounded-3xl border shadow-sm h-fit ${theme.card}`}>
                        <h3 className={`font-bold mb-4 flex items-center gap-2 ${theme.textMain}`}><span>📚</span> مصادر الأسئلة</h3>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
                             {availableLectures.length === 0 ? <p className="text-center text-xs text-gray-500 py-4">لا توجد محاضرات. أضف أسئلة أولاً.</p> :
                             availableLectures.map((lec, idx) => {
                                 const isSelected = settings.includedLectures?.includes(lec);
                                 return (
                                     <div key={idx} className={`flex items-center justify-between p-3 mb-2 rounded-xl border transition ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                         <label className="flex items-center gap-2 cursor-pointer flex-1">
                                             <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={isSelected} onChange={() => toggleLectureSelection(lec)} />
                                             <span className={`text-xs font-bold ${theme.textMain}`}>{lec}</span>
                                         </label>
                                         {isSelected && <input type="number" min="1" className={`w-12 p-1 text-center text-xs font-bold rounded border ${theme.input}`} value={settings.lectureCounts?.[lec] || ''} onChange={(e) => { const num = parseInt(e.target.value) || 0; setSettings(prev => { const newCounts = { ...prev.lectureCounts, [lec]: num }; const total = Object.values(newCounts).reduce((a, b) => a + b, 0); return { ...prev, lectureCounts: newCounts, count: total }; }); }} />}
                                     </div>
                                 )
                             })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <span className={`text-xs font-bold ${theme.textSec}`}>إجمالي الأسئلة:</span>
                            <span className="text-xl font-bold text-indigo-500">{settings.count}</span>
                        </div>
                    </div>

                    <div className={`p-6 rounded-3xl border shadow-sm ${theme.card} space-y-4`}>
                        <div className="flex justify-between items-center">
                            <span className={`text-sm font-bold ${theme.textMain}`}>👁️ مراجعة الإجابات</span>
                            <button onClick={() => setSettings({...settings, allowReview: !settings.allowReview})} className={`w-10 h-6 rounded-full relative transition ${settings.allowReview ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.allowReview ? 'left-5' : 'left-1'}`}></div></button>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`text-sm font-bold ${theme.textMain}`}>🏆 شهادات التقدير</span>
                            <button onClick={() => setSettings({...settings, enableCertificate: !settings.enableCertificate})} className={`w-10 h-6 rounded-full relative transition ${settings.enableCertificate ? 'bg-indigo-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.enableCertificate ? 'left-5' : 'left-1'}`}></div></button>
                        </div>
                        {settings.enableCertificate && (
                            <div className="flex items-center justify-between pt-2">
                                <span className={`text-xs ${theme.textSec}`}>نسبة النجاح %</span>
                                <input type="number" className={`w-16 p-1 text-center text-xs font-bold border rounded ${theme.input}`} value={settings.minScorePercent} onChange={(e) => setSettings({...settings, minScorePercent: e.target.value})} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
                    {/* زرار التصفير الجديد */}
                    <button 
                        onClick={resetExamSettings} 
                        className="flex-1 py-4 rounded-xl font-bold text-lg border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                        🗑️ إلغاء الامتحان وتصفير الأرقام
                    </button>

                    {/* زرار الحفظ القديم */}
                    <button 
                        onClick={saveSettingsHandler} 
                        className={`flex-[2] py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform ${theme.accentGradient}`}
                    >
                        💾 حفظ الإعدادات الجديدة
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}