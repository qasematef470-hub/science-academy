'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
// 👇 1. استدعاء المكون الخارجي (اللي احنا عدلناه وخليناه عريض)
import QuestionPreview from '../ui/QuestionPreview';
// 👇 2. استدعاء الماث تيكست (عشان القائمة اللي تحت)
import MathText from '@/app/components/ui/MathText';

export default function QuestionsTab({ 
  myCourses, 
  questionsList, 
  selectedCourseForQ, 
  setSelectedCourseForQ, 
  fetchQuestions, 
  isDarkMode 
}) {
  // State
  const [questionText, setQuestionText] = useState('');
  const [qImage, setQImage] = useState('');
  const [qDifficulty, setQDifficulty] = useState('medium');
  const [qLecture, setQLecture] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [selectedLectureView, setSelectedLectureView] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');

  const [options, setOptions] = useState([
    { text: "", isCorrect: true }, { text: "", isCorrect: false },
    { text: "", isCorrect: false }, { text: "", isCorrect: false }
  ]);

  // Auto-fill lecture
  useEffect(() => {
    if (selectedLectureView) setQLecture(selectedLectureView);
  }, [selectedLectureView]);

  // Theme Styles
  const theme = {
    input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    accentGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
  };

  // Logic Helpers
  const getCardStyle = (type) => {
    switch(type) {
        case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
        case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
        default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
    }
  };

  const filteredCourses = useMemo(() => {
    if (courseFilter === 'all') return myCourses;
    return myCourses.filter(c => {
        const type = c.type || (c.isRevision ? 'revision' : 'academic');
        return type === courseFilter;
    });
  }, [myCourses, courseFilter]);

  const handleCourseSelect = (courseId) => {
      setSelectedCourseForQ(courseId);
      fetchQuestions(courseId);
      setSelectedLectureView(null);
      setQLecture('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToGrid = () => {
      setSelectedCourseForQ(null);
      setQuestionText(""); 
      setQImage("");
  };

  // CRUD Operations
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) { setQImage(data.data.url); alert("✅ الصورة جاهزة"); }
    } catch (e) { alert("فشل الرفع"); } 
    finally { setUploadingImage(false); }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if(!selectedCourseForQ) return alert("اختر المادة");
    if(!qLecture.trim()) return alert("⚠️ اسم المحاضرة مطلوب");
    if(isSaving) return; 

    setIsSaving(true);
    try {
        const qData = {
            courseId: selectedCourseForQ,
            question: questionText,
            image: qImage,
            difficulty: qDifficulty, 
            options: options,
            lecture: qLecture, 
            createdAt: serverTimestamp()
        };
        
        if (editMode) {
            await setDoc(doc(db, "questions_bank", editMode), qData, { merge: true });
            setEditMode(null);
            alert("✅ تم التعديل");
        } else {
            await addDoc(collection(db, "questions_bank"), qData);
        }
        
        setQuestionText(""); 
        setQImage(""); 
        setOptions([{text:"",isCorrect:true},{text:"",isCorrect:false},{text:"",isCorrect:false},{text:"",isCorrect:false}]);
        fetchQuestions(selectedCourseForQ);
    } catch (e) { alert("خطأ في الحفظ"); console.error(e); } 
    finally { setIsSaving(false); }
  };

  const handleDeleteQuestion = async (id) => {
    if(confirm("حذف؟")) {
        await deleteDoc(doc(db, "questions_bank", id));
        fetchQuestions(selectedCourseForQ);
    }
  };

  const handleEditClick = (q) => {
    setEditMode(q.id);
    setQuestionText(q.question);
    setQImage(q.image || "");
    setQDifficulty(q.difficulty || 'medium');
    setQLecture(q.lecture || ""); 
    setOptions(q.options);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ================= RENDER =================

  if (!selectedCourseForQ) {
      // (نفس كود عرض الكورسات السابق بدون تغيير)
      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className={`text-2xl font-bold ${theme.textMain}`}>بنك الأسئلة والامتحانات</h2>
                  <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                      {['all', 'academic', 'revision', 'summer'].map(f => (
                          <button key={f} onClick={() => setCourseFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${courseFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                              {f === 'all' ? 'الكل' : f === 'academic' ? 'أكاديمي' : f === 'revision' ? 'مراجعة' : 'صيفي'}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.length === 0 ? <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${theme.textSec}`}>لا توجد كورسات.</div> : 
                  filteredCourses.map(course => {
                      const type = course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic');
                      const styles = getCardStyle(type);
                      return (
                          <div key={course.id} onClick={() => handleCourseSelect(course.id)} className={`group relative p-6 rounded-2xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                              <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                              <div className="flex items-start gap-4 z-10 relative">
                                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden">
                                      {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover" /> : styles.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                      <div className="mt-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${styles.badge}`}>{styles.label}</span></div>
                                  </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                  {type !== 'summer' ? (
                                      <>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                          <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "عام"}</p>
                                      </>
                                  ) : (<p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>)}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // 2️⃣ Question Manager (Form & List)
  const currentCourse = myCourses.find(c => c.id === selectedCourseForQ);
  
  return (
    <div className="flex flex-col gap-8 animate-scale-in">
        <div className="flex items-center gap-4 border-b pb-4 border-gray-200 dark:border-gray-700">
            <button onClick={handleBackToGrid} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸</button>
            <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة: <span className="text-indigo-500">{currentCourse?.name}</span></h2>
        </div>

        {/* 🟢 Form Section */}
        <div className={`p-4 md:p-8 rounded-3xl border shadow-lg ${theme.card}`}>
            <h3 className={`font-bold text-xl mb-6 flex items-center gap-2 ${theme.textMain}`}>
                <span className="text-2xl">{editMode ? '✏️' : '✨'}</span> {editMode ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="flex flex-col gap-6">
                
                {/* 1. Image */}
                <div className="w-full">
                    <input type="file" id="qImg" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <label htmlFor="qImg" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl transition cursor-pointer ${qImage ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                        {uploadingImage ? <span className="text-xs font-bold animate-pulse">⏳ جاري الرفع...</span> : qImage ? <div className="flex items-center gap-2"><span className="text-2xl">🖼️</span><span className="text-sm font-bold text-green-600">تم الرفع</span></div> : <div className="flex items-center gap-2 opacity-60"><span className="text-2xl">📷</span><span className="text-sm font-bold">إرفاق صورة (اختياري)</span></div>}
                    </label>
                </div>

                {/* 2. Text */}
                <div className="w-full">
                    <textarea 
                        placeholder="اكتب نص السؤال هنا... استخدم $$ للمعادلات" 
                        className={`w-full p-5 rounded-2xl h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition text-base font-medium ${theme.input}`}
                        value={questionText} 
                        onChange={e => setQuestionText(e.target.value)} 
                        required 
                    />
                </div>

                {/* 3. Options (Using MathText for inputs placeholders is tricky, better use normal inputs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <span className="absolute -top-2.5 right-3 px-2 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 z-10">الإجابة الصحيحة</span>
                        <input className={`w-full p-4 rounded-xl border-2 border-green-500/50 focus:border-green-500 outline-none transition font-bold ${isDarkMode ? 'bg-green-900/10 text-white' : 'bg-green-50 text-gray-900'}`} placeholder="الإجابة الصحيحة" value={options[0].text} onChange={(e) => { const ops=[...options]; ops[0].text=e.target.value; setOptions(ops); }} required />
                    </div>
                    {[1, 2, 3].map(i => (
                        <input key={i} className={`w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-red-400 transition ${theme.input}`} placeholder={`اختيار خاطئ ${i}`} value={options[i].text} onChange={(e) => { const ops=[...options]; ops[i].text=e.target.value; setOptions(ops); }} required />
                    ))}
                </div>

                {/* 4. Tools */}
                {/* 🔥🔥 التعديل: flex-col للموبايل و md:flex-row للشاشات الأكبر */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="flex-1 relative">
                            <span className="absolute top-3.5 left-3 opacity-50">🏷️</span>
                            <input type="text" placeholder="اسم المحاضرة" className={`w-full h-full p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold ${theme.input} ${!qLecture ? 'border-red-300' : ''}`} value={qLecture} onChange={e => setQLecture(e.target.value)} required />
                        </div>
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl min-w-[200px]">
                            {['easy', 'medium', 'hard'].map(lvl => (
                                <button key={lvl} type="button" onClick={() => setQDifficulty(lvl)} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${qDifficulty === lvl ? (lvl === 'easy' ? 'bg-green-500 text-white' : lvl === 'medium' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'text-gray-500'}`}>
                                    {lvl === 'easy' ? 'سهل' : lvl === 'medium' ? 'متوسط' : 'صعب'}
                                </button>
                            ))}
                        </div>
                        <button type="submit" disabled={uploadingImage || isSaving} className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform min-w-[150px] ${theme.accentGradient} disabled:opacity-50`}>
                            {isSaving ? '⏳...' : editMode ? '💾 حفظ' : '➕ إضافة'}
                        </button>
                        {editMode && <button type="button" onClick={() => { setEditMode(null); setQuestionText(""); setQImage(""); }} className="px-4 text-xs text-red-500 underline whitespace-nowrap self-center">إلغاء</button>}
                    </div>

                {/* 5. Preview Section (Now using the Component) */}
                {(questionText || qImage) && (
                    <div className={`mt-4 p-6 rounded-2xl border-2 border-dashed ${isDarkMode ? 'bg-indigo-900/10 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
                        <p className="text-sm font-bold text-indigo-500 mb-4 text-center">👁️ معاينة شكل السؤال للطالب</p>
                        <div className="w-full max-w-4xl mx-auto">
                            {/* 🔥🔥 ده التغيير المهم: رجعنا نستخدم المكون الخارجي */}
                            <QuestionPreview 
                                question={questionText} 
                                options={options} 
                                image={qImage} 
                                difficulty={qDifficulty} 
                            />
                        </div>
                    </div>
                )}
            </form>
        </div>

        {/* 🔵 Bottom: Folders List */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* (نفس كود القائمة اللي تحت بدون تغيير) */}
            <div className="flex justify-between items-center px-2">
                <h3 className={`font-bold text-lg ${theme.textMain}`}>
                    {selectedLectureView ? `📂 ${selectedLectureView}` : `📚 أرشيف الأسئلة (${questionsList.length})`}
                </h3>
                {selectedLectureView && <button onClick={() => setSelectedLectureView(null)} className="text-indigo-500 font-bold text-sm hover:underline">عرض المجلدات</button>}
            </div>

            {!selectedLectureView ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {Object.entries(questionsList.reduce((groups, q) => {
                        const key = (q.lecture || "أسئلة عامة").trim();
                        if (!groups[key]) groups[key] = 0;
                        groups[key]++;
                        return groups;
                    }, {})).map(([name, count], idx) => (
                        <div key={idx} onClick={() => setSelectedLectureView(name)} className={`p-4 rounded-2xl border cursor-pointer hover:border-indigo-500 transition group flex flex-col items-center justify-center gap-2 text-center ${theme.card}`}>
                            <div className="text-3xl">📁</div>
                            <div>
                                <h4 className={`font-bold text-sm ${theme.textMain} truncate max-w-[120px]`}>{name}</h4>
                                <p className={`text-[10px] ${theme.textSec}`}>{count} سؤال</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                        {questionsList.filter(q => (q.lecture || "أسئلة عامة").trim() === selectedLectureView).map((q, idx) => {
                            // دالة تحديد اللون حسب الصعوبة
                            const diffColor = q.difficulty === 'easy' ? 'border-l-emerald-500 bg-emerald-50/10' 
                                            : q.difficulty === 'medium' ? 'border-l-amber-500 bg-amber-50/10' 
                                            : 'border-l-rose-500 bg-rose-50/10';

                            return (
                                <div key={q.id} className={`p-4 rounded-xl border border-gray-100 dark:border-gray-700 border-l-[6px] flex items-center justify-between gap-4 transition hover:shadow-md ${diffColor} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                    <div className="flex items-center gap-4 flex-1">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                                        </span>
                                        
                                        {q.image && <img src={q.image} alt="Q" className="w-10 h-10 rounded object-cover border" />}
                                        
                                        <div className={`font-bold text-sm ${theme.textMain} line-clamp-1`}>
                                            <MathText text={q.question} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditClick(q)} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100">✏️</button>
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">🗑️</button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
                
            )}
        </div>
    </div>
  );
}