'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createCourse, updateCourse, deleteCourse, getUniversityStructure , getUniqueLectures } from '@/app/actions/admin';

export default function CoursesTab({ courses, onRefresh, isDarkMode, adminData }) {
  
  // --- 1. إعداد صور الدكاترة (الكود القديم) ---
  const getInstructorImg = (name) => {
      if (!name) return '/assets/images/logo.png';
      if (name.includes('طه')) return '/assets/images/instructor-taha.jpg';
      if (name.includes('عبدالرحمن')) return '/assets/images/instructor-abdelrahman.jpg';
      if (name.includes('القاسم')) return '/assets/images/instructor-alqasem.jpg';
      return '/assets/images/logo.png';
  };

  // --- Theme Logic ---
  const theme = {
    input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    accentGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
  };

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [structure, setStructure] = useState([]);
  const [configExam, setConfigExam] = useState(null); // الامتحان اللي بنعدل إعداداته حالياً
  const [availableLectures, setAvailableLectures] = useState([]); // المحاضرات المتاحة للمادة
  // Form State (تم دمج البيانات القديمة + modules الجديد)
  const initialForm = {
    name: '', type: 'academic', category: '',
    university: '', college: '', year: '', section: '',
    price: '', paymentNumber: '', paymentMethods: 'both', contactPhone: '',
    startDate: '', details: '', image: '',
    modules: [] // 👈 دي الزيادة الوحيدة عشان المنهج
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    async function loadStructure() {
      const res = await getUniversityStructure();
      if (res.success) setStructure(res.data || []);
    }
    loadStructure();
  }, []);

  // --- Helper Functions for Dropdowns ---
  const universitiesList = useMemo(() => structure, [structure]);
  
  const collegesList = useMemo(() => {
    const uni = structure.find(u => u.name === formData.university);
    return uni ? uni.colleges : [];
  }, [structure, formData.university]);

  const yearsList = useMemo(() => {
    const uni = structure.find(u => u.name === formData.university);
    const col = uni?.colleges.find(c => c.name === formData.college);
    return col ? col.years : [];
  }, [structure, formData.university, formData.college]);

  const sectionsList = useMemo(() => {
    const uni = structure.find(u => u.name === formData.university);
    const col = uni?.colleges.find(c => c.name === formData.college);
    const year = col?.years.find(y => y.name === formData.year);
    return year ? year.sections : [];
  }, [structure, formData.university, formData.college, formData.year]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageLoading(true);
    const data = new FormData();
    data.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e`, { method: "POST", body: data });
      const json = await res.json();
      if (json.success) { 
        setFormData(prev => ({ ...prev, image: json.data.url }));
        alert("✅ تم رفع الصورة"); 
      }
    } catch (e) { alert("فشل الرفع"); } 
    finally { setImageLoading(false); }
  };

  // 🔥🔥 دوال باني المنهج (Curriculum Functions) 🔥🔥
  const addModule = () => {
      setFormData(prev => ({
          ...prev,
          modules: [...prev.modules, { title: `الباب ${prev.modules.length + 1}`, lessons: [] }]
      }));
  };

  const removeModule = (mIndex) => {
      const newModules = [...formData.modules];
      newModules.splice(mIndex, 1);
      setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const updateModuleTitle = (mIndex, title) => {
      const newModules = [...formData.modules];
      newModules[mIndex].title = title;
      setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const addLesson = (mIndex, type) => {
      const newModules = [...formData.modules];
      const newLesson = { 
          title: '', 
          type, 
          link: '', 
          description: '', 
          duration: '',    
          maxViews: 3,     
          examId: '',      
          maxAttempts: 1,  
          passScore: 60,
          // 🔥 إضافات جديدة من SettingsTab
          allowReview: false,
          enableCertificate: false,
          startDate: '',
          endDate: ''
      };
      newModules[mIndex].lessons.push(newLesson);
      setFormData(prev => ({ ...prev, modules: newModules }));
  };
  const removeLesson = (mIndex, lIndex) => {
      const newModules = [...formData.modules];
      newModules[mIndex].lessons.splice(lIndex, 1);
      setFormData(prev => ({ ...prev, modules: newModules }));
  };

  const updateLesson = (mIndex, lIndex, field, value) => {
      const newModules = [...formData.modules];
      newModules[mIndex].lessons[lIndex][field] = value;
      setFormData(prev => ({ ...prev, modules: newModules }));
  };
  const openExamSettings = async (mIndex, lIndex) => {
      setLoading(true);
      const res = await getUniqueLectures(editingId); // جلب أسماء المحاضرات المسجلة في بنك الأسئلة للمادة
      if (res.success) setAvailableLectures(res.data);
      
      setConfigExam({ mIndex, lIndex, settings: formData.modules[mIndex].lessons[lIndex] });
      setLoading(false);
  };

  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate) {
        return alert("يرجى ملء البيانات الأساسية");
    }
    if (formData.type !== 'summer' && (!formData.university || !formData.college || !formData.section)) {
        return alert("يرجى اختيار الجامعة والكلية والقسم بشكل صحيح من القائمة");
    }
    if (formData.type === 'summer' && !formData.category) {
        return alert("يرجى اختيار تصنيف الكورس الصيفي (لغات، برمجة، ...)");
    }

    setLoading(true);
    
    const instructorName = adminData?.name || "Science Academy";
    const instructorImage = getInstructorImg(instructorName);
    
    const finalData = {
        ...formData,
        instructorName, 
        instructorImage,
        // 🔥 التعديل: تثبيت بيانات الدفع هنا
        paymentMethods: 'cash',
        paymentNumber: '01035268736',
    };

    try {
        let res;
        if (editingId) res = await updateCourse(editingId, finalData);
        else res = await createCourse(finalData);

        if (res.success) {
            alert(res.message);
            setIsCreating(false);
            setEditingId(null);
            setFormData(initialForm);
            if (onRefresh) onRefresh();
        } else {
            alert("❌ خطأ: " + res.message);
        }
    } catch (error) { alert("❌ حدث خطأ غير متوقع"); } 
    finally { setLoading(false); }
  };

  const handleEditClick = (course) => {
      // ✅ الكود الجديد: هيعمل Scan على كل درس ويضيف الحقول الناقصة
      const safeModules = course.modules?.map(mod => ({
          ...mod,
          lessons: mod.lessons?.map(les => ({
              title: les.title || '',
              type: les.type || 'video',
              link: les.link || '',
              description: les.description || '', // لو مش موجودة، يحط قيمة فاضية
              duration: les.duration || '',      // لو مش موجودة، يحط قيمة فاضية
              maxViews: les.maxViews || 3,      // لو مش موجودة، يحط 3
              examId: les.examId || '',
              maxAttempts: les.maxAttempts || 1,
              passScore: les.passScore || 60,
              allowReview: les.allowReview || false,
              enableCertificate: les.enableCertificate || false,
              startDate: les.startDate || '',
              endDate: les.endDate || ''
          })) || []
      })) || [];

      setFormData({
        name: course.name || '', 
        type: course.type || 'academic',
        category: course.category || '', 
        university: course.university || '',
        college: course.college || '',
        year: course.year || '',
        section: course.section || '',
        price: course.price || '',
        contactPhone: course.contactPhone || '',
        startDate: course.startDate || '',
        details: course.details || '',
        image: course.image || '',
        modules: safeModules // 👈 استرجاع المنهج الآمن بعد إضافة القيم الافتراضية
      });
      setEditingId(course.id);
      setIsCreating(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
      if(!confirm("⚠️ هل أنت متأكد من حذف الكورس؟")) return;
      const res = await deleteCourse(id);
      if (res.success) {
          alert(res.message);
          if (onRefresh) onRefresh();
      }
  };

  const getCardStyle = (type) => {
    switch(type) {
        case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700' };
        case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700' };
        default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700' };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
        {!isCreating ? (
            <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة الكورسات والمواد</h2>
                <button onClick={() => setIsCreating(true)} className={`px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105 ${theme.accentGradient}`}>
                    + إنشاء كورس جديد
                </button>
            </div>
        ) : (
            <div className={`p-4 md:p-8 rounded-3xl border shadow-xl relative ${theme.card}`}>
                <button onClick={() => { setIsCreating(false); setEditingId(null); setFormData(initialForm); }} className="absolute top-6 left-6 text-gray-400 hover:text-red-500 font-bold text-xl">✕ إلغاء</button>
                <h3 className={`font-bold text-2xl mb-6 flex items-center gap-2 ${theme.textMain}`}>
                    <span className="text-3xl">{editingId ? '✏️' : '🛠️'}</span> {editingId ? 'تعديل الكورس' : 'إنشاء كورس جديد'}
                </h3>
                
                {/* معلومات المحاضر التلقائية */}
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                    <img src={getInstructorImg(adminData?.name)} className="w-10 h-10 rounded-full object-cover border border-blue-500" alt="" />
                    <div>
                        <p className={`text-sm font-bold ${theme.textMain}`}>سيتم نشر الكورس باسم: <span className="text-blue-500">{adminData?.name || "الأدمن"}</span></p>
                        <p className={`text-xs ${theme.textSec}`}>يتم تحديد الاسم والصورة تلقائياً من حسابك الحالي.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ================================================== */}
                    {/* 1. البيانات الأساسية (من الكود القديم) */}
                    {/* ================================================== */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className={`text-xs font-bold ${theme.textSec}`}>اسم المادة</label>
                            <input type="text" placeholder="مثال: رياضيات تطبيقية" className={`w-full p-3 mt-1 rounded-xl outline-none border focus:ring-2 focus:ring-indigo-500 transition ${theme.input}`} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </div>
                        
                        <div>
                            <label className={`text-xs font-bold ${theme.textSec}`}>نوع الكورس</label>
                            <select 
                                className={`w-full p-3 mt-1 rounded-xl outline-none border focus:ring-2 focus:ring-indigo-500 font-bold ${theme.input}`} 
                                value={formData.type} 
                                onChange={e => setFormData({...formData, type: e.target.value})}
                            >
                                <option value="academic" className="text-black">📚 منهج أكاديمي (Study)</option>
                                <option value="revision" className="text-black">🔥 مراجعة نهائية (Revision)</option>
                                <option value="summer" className="text-black">🏖️ كورس صيفي (Summer)</option>
                            </select>
                        </div>
                    </div>

                    {formData.type === 'summer' && (
                         <div className={`p-5 rounded-2xl border border-cyan-200 bg-cyan-50/50`}>
                             <h4 className="font-bold text-sm text-cyan-600 mb-2">🏖️ تصنيف الكورس الصيفي</h4>
                             <select className={`w-full p-3 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                 <option value="" className="text-gray-500">اختر التصنيف...</option>
                                 <option value="languages" className="text-black">🗣️ لغات (Languages)</option>
                                 <option value="programming" className="text-black">💻 برمجة (Programming)</option>
                                 <option value="skills" className="text-black">🚀 مهارات شخصية (Soft Skills)</option>
                                 <option value="design" className="text-black">🎨 جرافيك ديزاين</option>
                                 <option value="other" className="text-black">✨ أخرى</option>
                             </select>
                         </div>
                    )}

                    {formData.type !== 'summer' && (
                        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-indigo-50/50 border-indigo-100'}`}>
                            <h4 className="font-bold text-sm text-indigo-500 mb-4 flex items-center gap-2">🏛️ بيانات التخصص (هام جداً للفلترة)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400">الجامعة</label>
                                    <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.university} onChange={e => setFormData({...formData, university: e.target.value, college: '', year: '', section: ''})}>
                                        <option value="" className="text-gray-500">اختر الجامعة...</option>
                                        {universitiesList.map((u, i) => <option key={i} value={u.name} className="text-black">{u.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400">الكلية</label>
                                    <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.college} onChange={e => setFormData({...formData, college: e.target.value, year: '', section: ''})} disabled={!formData.university}>
                                        <option value="" className="text-gray-500">اختر الكلية...</option>
                                        {collegesList.map((c, i) => <option key={i} value={c.name} className="text-black">{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400">السنة الدراسية</label>
                                    <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.year} onChange={e => setFormData({...formData, year: e.target.value, section: ''})} disabled={!formData.college}>
                                        <option value="" className="text-gray-500">اختر السنة...</option>
                                        {yearsList.map((y, i) => <option key={i} value={y.name} className="text-black">{y.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400">القسم / الشعبة</label>
                                    <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} disabled={!formData.year}>
                                        <option value="" className="text-gray-500">اختر القسم...</option>
                                        {sectionsList.map((s, i) => <option key={i} value={s} className="text-black">{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            {universitiesList?.length === 0 && <p className="text-xs text-red-500 mt-2">⚠️ لم يتم إضافة جامعات في الهيكل.</p>}
                        </div>
                    )}
                    
                    <div>
                        <label className={`text-xs font-bold ${theme.textSec}`}>السعر</label>
                        <input type="number" placeholder="0 = مجاني" className={`w-full p-3 mt-1 rounded-xl outline-none border ${theme.input}`} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className={`text-xs font-bold ${theme.textSec}`}>تاريخ البداية</label><input type="date" className={`w-full p-3 mt-1 rounded-xl outline-none border ${theme.input}`} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required /></div>
                        <div><label className={`text-xs font-bold ${theme.textSec}`}>رقم الدعم</label><input type="tel" className={`w-full p-3 mt-1 rounded-xl outline-none border dir-ltr ${theme.input}`} value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} /></div>
                    </div>

                    <div><label className={`text-xs font-bold ${theme.textSec}`}>الوصف</label><textarea className={`w-full p-3 mt-1 rounded-xl h-20 outline-none border ${theme.input}`} value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} /></div>

                    <div className="relative group cursor-pointer">
                        <input type="file" id="cImg" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <label htmlFor="cImg" className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-xl transition ${theme.textSec} border-gray-300 dark:border-gray-600 hover:border-indigo-500`}>
                            {imageLoading ? '⏳ جاري الرفع...' : formData.image ? '✅ تم الرفع' : '📷 رفع غلاف الكورس'}
                        </label>
                    </div>

                    {/* ================================================== */}
                    {/* 🔥 2. باني المنهج (Curriculum Builder) - الجديد 🔥 */}
                    {/* ================================================== */}
                    <div className={`p-6 rounded-2xl border bg-opacity-50 mt-8 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">إدارة محتوى الكورس (الأبواب والدروس)</h4>
                            <button type="button" onClick={addModule} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition">+ باب جديد</button>
                        </div>

                        <div className="space-y-6">
                            {formData.modules?.length === 0 && <p className="text-center text-gray-500 text-sm py-4">لم يتم إضافة أي أبواب بعد. اضغط على "باب جديد" لإضافة المحتوى.</p>}
                            
                            {formData.modules.map((mod, mIndex) => (
                                <div key={mIndex} className={`p-4 rounded-xl border-2 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                                    {/* عنوان الباب */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-emerald-500 font-black text-xl">#{mIndex + 1}</span>
                                        <input 
                                            type="text" 
                                            placeholder="عنوان الباب (مثال: الكيمياء الكهربية)" 
                                            className={`flex-1 p-2 bg-transparent border-b-2 outline-none font-bold text-lg ${isDarkMode ? 'border-slate-700 focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'}`}
                                            value={mod.title}
                                            onChange={(e) => updateModuleTitle(mIndex, e.target.value)}
                                        />
                                        <button type="button" onClick={() => removeModule(mIndex)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">🗑️</button>
                                    </div>

                                    {/* قائمة الدروس */}
                                    <div className="space-y-3 mr-4 border-r-2 border-emerald-500/20 pr-4">
                                        {mod.lessons.map((lesson, lIdx) => (
                                            <div key={lIdx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                                {/* السطر الأول: النوع والعنوان والحذف */}
                                                    <div className="flex flex-col md:flex-row gap-3 items-center">
                                                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                                                            <span className="text-lg">{lesson.type === 'video' ? '🎥' : lesson.type === 'pdf' ? '📄' : '📝'}</span>
                                                            <select 
                                                                className={`bg-transparent text-xs font-bold outline-none ${theme.textMain}`}
                                                                value={lesson.type}
                                                                onChange={(e) => updateLesson(mIndex, lIdx, 'type', e.target.value)}
                                                            >
                                                                <option value="video" className="text-black">فيديو</option>
                                                                <option value="pdf" className="text-black">ملف PDF</option>
                                                                <option value="exam" className="text-black">امتحان</option>
                                                            </select>
                                                        </div>
            
                                                        <input 
                                                            type="text" 
                                                            placeholder="عنوان الدرس" 
                                                            className={`flex-1 p-2 rounded-lg text-sm outline-none ${theme.input}`}
                                                            value={lesson.title}
                                                            onChange={(e) => updateLesson(mIndex, lIdx, 'title', e.target.value)}
                                                        />

                                                        <button type="button" onClick={() => removeLesson(mIndex, lIdx)} className="text-red-400 hover:text-red-500 p-2">✕ حذف</button>
                                                    </div>

                                                    {/* السطر الثاني: الروابط والأوصاف */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {lesson.type !== 'exam' ? (
                                                            <input 
                                                                type="text" 
                                                                placeholder={lesson.type === 'video' ? "رابط الفيديو" : "رابط الملف"} 
                                                                className={`p-2 rounded-lg text-xs outline-none ${theme.input} dir-ltr`}
                                                                value={lesson.link}
                                                                onChange={(e) => updateLesson(mIndex, lIdx, 'link', e.target.value)}
                                                            />
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                placeholder="كود الامتحان الفريد" 
                                                                className={`p-2 rounded-lg text-xs outline-none bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-mono text-center`}
                                                                value={lesson.examId}
                                                                onChange={(e) => updateLesson(mIndex, lIdx, 'examId', e.target.value)}
                                                            />
                                                        )}
            
                                                        <input 
                                                            type="text" 
                                                            placeholder="وصف يظهر للطالب..." 
                                                            className={`p-2 rounded-lg text-xs outline-none ${theme.input}`}
                                                            value={lesson.description}
                                                            onChange={(e) => updateLesson(mIndex, lIdx, 'description', e.target.value)}
                                                        />
                                                    </div>

                                                    {/* السطر الثالث: الإعدادات المتقدمة */}
                                                        <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
                                                            {lesson.type === 'video' && (
                                                                <>
                                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                        <label>المشاهدات:</label>
                                                                        <input type="number" className="w-12 p-1 rounded bg-black/30 text-center" value={lesson.maxViews} onChange={(e) => updateLesson(mIndex, lIdx, 'maxViews', e.target.value)} />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                        <label>المدة (د):</label>
                                                                        <input type="text" className="w-12 p-1 rounded bg-black/30 text-center" value={lesson.duration} onChange={(e) => updateLesson(mIndex, lIdx, 'duration', e.target.value)} />
                                                                    </div>
                                                                </>
                                                            )}
                                                            {lesson.type === 'exam' && (
                                                                <div className="space-y-4 p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-[1.5rem]">
                                                                    <div className="flex flex-col md:flex-row gap-4 items-center">
                                                                        <div className="flex-1 w-full">
                                                                            <label className="text-[10px] font-bold text-yellow-600 mb-1 block">كود الامتحان (Password)</label>
                                                                            <input 
                                                                                type="text" 
                                                                                placeholder="مثال: MATH101" 
                                                                                className={`w-full p-3 rounded-xl text-sm font-mono font-bold outline-none bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-center`}
                                                                                value={lesson.examId || ""} // حل مشكلة الأيرور
                                                                                onChange={(e) => updateLesson(mIndex, lIdx, 'examId', e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => openExamSettings(mIndex, lIdx)}
                                                                            className="w-full md:w-auto px-6 py-4 bg-yellow-500 text-black rounded-xl font-black text-xs hover:bg-yellow-400 transition shadow-lg shrink-0"
                                                                        >
                                                                            ⚙️ ضبط الأسئلة والوقت
                                                                        </button>
                                                                    </div>
        
                                                                    {/* ملخص ذكي */}
                                                                    <div className="flex flex-wrap gap-4 text-[10px] font-black text-yellow-600/60 uppercase">
                                                                        <span>⏱️ {lesson.duration || 0} دقيقة</span>
                                                                        <span>🎯 {lesson.passScore || 0}% للنجاح</span>
                                                                        <span>🔄 {lesson.maxAttempts || 0} محاولات</span>
                                                                        <span>📝 {Object.values(lesson.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0)} سؤال</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        
                                        {/* أزرار إضافة محتوى */}
                                        <div className="flex gap-2 mt-3">
                                            <button type="button" onClick={() => addLesson(mIndex, 'video')} className="px-3 py-1.5 bg-blue-600/10 text-blue-500 rounded-lg text-[10px] font-bold hover:bg-blue-600/20">+ فيديو</button>
                                            <button type="button" onClick={() => addLesson(mIndex, 'pdf')} className="px-3 py-1.5 bg-purple-600/10 text-purple-500 rounded-lg text-[10px] font-bold hover:bg-purple-600/20">+ ملف</button>
                                            <button type="button" onClick={() => addLesson(mIndex, 'exam')} className="px-3 py-1.5 bg-yellow-600/10 text-yellow-500 rounded-lg text-[10px] font-bold hover:bg-yellow-600/20">+ امتحان</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${theme.accentGradient}`}>
                        {loading ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : '🚀 إنشاء الكورس')}
                    </button>
                </form>
            </div>
        )}

        {/* Display Cards - الشكل القديم محفوظ تماماً */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.length === 0 ? <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${theme.textSec} border-gray-300 dark:border-gray-700`}>لا توجد كورسات.</div> : 
            courses.map(course => {
                const styles = getCardStyle(course.type || (course.isRevision ? 'revision' : 'academic'));
                return (
                    <div key={course.id} className={`group relative p-6 rounded-2xl border transition hover:shadow-xl hover:-translate-y-1 ${theme.card} ${styles.border} overflow-hidden`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full ${styles.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>

                        <div className="flex items-start gap-4 z-10 relative">
                            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden">
                                {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover" /> : course.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-lg truncate ${theme.textMain}`}>{course.name || course.title}</h4>
                                <div className="flex gap-2 mt-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${styles.badge}`}>
                                        {course.type === 'revision' || course.isRevision ? '🔥 مراجعة' : course.type === 'summer' ? '🏖️ صيفي' : '📚 أكاديمي'}
                                    </span>
                                    {course.type === 'summer' && course.category && (
                                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-gray-100 text-gray-600 border border-gray-200">{course.category}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                             <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                <span>👨‍🏫</span> {course.instructorName || "Science Academy"}
                            </p>
                            {course.type !== 'summer' ? (
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><span>🏛️</span> {course.university || "غير محدد"}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><span>🎓</span> {course.college} - {course.year}</p>
                                    <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 قسم: {course.section || "عام"}</p>
                                </div>
                            ) : (
                                <p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => handleEditClick(course)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition">تعديل</button>
                            <button onClick={() => handleDelete(course.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition">حذف</button>
                        </div>
                    </div>
                );
            })}
        </div>
        {/* 🛠️ مودال إعدادات الامتحان المتقدمة (تم إصلاح الشكل وإضافة اللوجيك) */}
        {configExam && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4 animate-fade-in" dir="rtl">
                
                {/* تعديل التجاوب: المودال بياخد الشاشة كلها في الموبايل (من تحت)، وفي التابلت/الكمبيوتر بيبقى بوكس في النص */}
                <div className={`w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl overflow-y-auto p-5 md:p-8 md:rounded-[2.5rem] border ${theme.card} shadow-2xl custom-scrollbar flex flex-col`}>
                    
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 sticky top-0 bg-inherit z-10">
                        <h3 className="text-xl font-black text-yellow-500 flex items-center gap-2">
                            <span className="text-2xl">⚙️</span> إعدادات: <span className="text-white text-lg">{configExam.settings.title || 'امتحان جديد'}</span>
                        </h3>
                        <button 
                            // 🔥 اللوجيك: التحقق قبل القفل
                            onClick={() => {
                                const s = configExam.settings;
                                const diffTotal = Number(s.easyPercent || 0) + Number(s.mediumPercent || 0) + Number(s.hardPercent || 0);
                                const totalQ = Object.values(s.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0);
                                
                                if (totalQ > 0 && diffTotal !== 100) {
                                    alert(`⚠️ عذراً، مجموع نسب الصعوبة يجب أن يكون 100%. المجموع الحالي هو ${diffTotal}%`);
                                    return; // يمنع القفل
                                }
                                setConfigExam(null); // لو سليم، يقفل
                            }} 
                            className="text-gray-500 hover:text-white text-2xl font-black bg-white/5 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    {/* تعديل التجاوب الداخلي: Grid متجاوب أفضل */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 flex-1">
                        
                        {/* 🔴 العمود الأول: الإعدادات الأساسية والتوقيت */}
                        <div className="space-y-6">
                            
                            <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4 shadow-inner">
                                <h4 className="font-bold text-sm text-indigo-400 flex items-center gap-2"><span>⏳</span> التوقيت والمدة</h4>
                                
                                {/* تواريخ البدء والانتهاء تحت بعض في الموبايل، جنب بعض في الشاشات الأكبر */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">تاريخ البدء (اختياري)</label>
                                        <input type="datetime-local" className={`w-full p-2.5 rounded-xl outline-none border text-xs ${theme.input}`} value={configExam.settings.startDate || ''} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'startDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">تاريخ الانتهاء (اختياري)</label>
                                        <input type="datetime-local" className={`w-full p-2.5 rounded-xl outline-none border text-xs ${theme.input}`} value={configExam.settings.endDate || ''} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'endDate', e.target.value)} />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block truncate">المدة (د)</label>
                                        <input type="number" className={`w-full p-2 rounded-xl outline-none border text-center font-bold text-sm ${theme.input}`} value={configExam.settings.duration || 0} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'duration', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block truncate">النجاح %</label>
                                        <input type="number" className={`w-full p-2 rounded-xl outline-none border text-center font-bold text-sm ${theme.input}`} value={configExam.settings.passScore || 60} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'passScore', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 mb-1 block truncate">المحاولات</label>
                                        <input type="number" className={`w-full p-2 rounded-xl outline-none border text-center font-bold text-sm ${theme.input}`} value={configExam.settings.maxAttempts || 1} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, 'maxAttempts', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4 shadow-inner">
                                <h4 className="font-bold text-sm text-pink-400 flex items-center gap-2"><span>✨</span> خيارات متقدمة</h4>
                                
                                <button type="button" onClick={() => updateLesson(configExam.mIndex, configExam.lIndex, 'allowReview', !configExam.settings.allowReview)} className="w-full flex justify-between items-center p-3 bg-black/20 hover:bg-black/30 rounded-xl transition-all">
                                    <span className="text-xs md:text-sm font-bold text-gray-300">👁️ مراجعة الإجابات بعد الحل</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${configExam.settings.allowReview ? 'bg-green-500' : 'bg-gray-600'}`}>
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${configExam.settings.allowReview ? 'left-6' : 'left-1'}`}></div>
                                    </div>
                                </button>

                                <button type="button" onClick={() => updateLesson(configExam.mIndex, configExam.lIndex, 'enableCertificate', !configExam.settings.enableCertificate)} className="w-full flex justify-between items-center p-3 bg-black/20 hover:bg-black/30 rounded-xl transition-all">
                                    <span className="text-xs md:text-sm font-bold text-gray-300">🏆 إصدار شهادة للناجحين</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${configExam.settings.enableCertificate ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${configExam.settings.enableCertificate ? 'left-6' : 'left-1'}`}></div>
                                    </div>
                                </button>
                            </div>

                        </div>

                        {/* 🔵 العمود الثاني: الأسئلة والصعوبة */}
                        <div className="space-y-6">
                            
                            <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col h-full max-h-[350px] shadow-inner">
                                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                    <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2"><span>📚</span> مصادر الأسئلة</h4>
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-lg font-black">
                                        الإجمالي: {Object.values(configExam.settings.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0)}
                                    </span>
                                </div>
                                
                                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                    {availableLectures.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">لم يتم إضافة أسئلة لبنك المادة بعد.</p> : null}
                                    {availableLectures.map((lec, idx) => {
                                        const isIncluded = configExam.settings.includedLectures?.includes(lec);
                                        return (
                                            <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isIncluded ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        let newList = [...(configExam.settings.includedLectures || [])];
                                                        if (isIncluded) newList = newList.filter(l => l !== lec);
                                                        else newList.push(lec);
                                                        updateLesson(configExam.mIndex, configExam.lIndex, 'includedLectures', newList);
                                                    }}
                                                    className={`flex-1 text-right text-xs font-bold truncate ml-2 ${isIncluded ? 'text-white' : 'text-gray-500'}`}
                                                >
                                                    {isIncluded ? '✅' : '➕'} {lec}
                                                </button>
                                                
                                                {isIncluded && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-[9px] text-gray-500">العدد:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-12 p-1 rounded bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 text-center text-xs font-bold outline-none"
                                                            value={configExam.settings.lectureCounts?.[lec] || 0}
                                                            onChange={(e) => {
                                                                const newCounts = {...(configExam.settings.lectureCounts || {}), [lec]: e.target.value};
                                                                updateLesson(configExam.mIndex, configExam.lIndex, 'lectureCounts', newCounts);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="p-5 md:p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4 shadow-inner">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-sm text-yellow-500">📊 توزيع الصعوبة</h4>
                                    <span className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${Number(configExam.settings.easyPercent || 0) + Number(configExam.settings.mediumPercent || 0) + Number(configExam.settings.hardPercent || 0) === 100 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400 animate-pulse'}`}>
                                        المجموع: {Number(configExam.settings.easyPercent || 0) + Number(configExam.settings.mediumPercent || 0) + Number(configExam.settings.hardPercent || 0)}%
                                    </span>
                                </div>
                                {['easyPercent', 'mediumPercent', 'hardPercent'].map((key) => (
                                    <div key={key} className="flex items-center gap-3 bg-black/20 p-2 rounded-xl">
                                        <span className="text-[10px] w-14 text-gray-400 font-bold">{key === 'easyPercent' ? 'سهل 🟢' : key === 'mediumPercent' ? 'متوسط 🟡' : 'صعب 🔴'}</span>
                                        <input type="range" className="flex-1 accent-yellow-500 h-1 cursor-pointer" value={configExam.settings[key] || 0} onChange={(e) => updateLesson(configExam.mIndex, configExam.lIndex, key, e.target.value)} />
                                        <span className="text-xs font-mono w-8 text-center text-white bg-white/5 rounded px-1">{configExam.settings[key] || 0}%</span>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>

                    {/* زر الحفظ العائم في الموبايل */}
                    <div className="mt-6 md:mt-8 sticky bottom-0 bg-[#0f121a] md:bg-transparent pt-2 md:pt-0">
                        <button 
                            type="button"
                            onClick={() => {
                                const s = configExam.settings;
                                const diffTotal = Number(s.easyPercent || 0) + Number(s.mediumPercent || 0) + Number(s.hardPercent || 0);
                                const totalQ = Object.values(s.lectureCounts || {}).reduce((a, b) => Number(a) + Number(b), 0);
                                
                                if (totalQ > 0 && diffTotal !== 100) {
                                    alert(`⚠️ عذراً، مجموع نسب الصعوبة يجب أن يكون 100%. المجموع الحالي هو ${diffTotal}%`);
                                    return;
                                }
                                setConfigExam(null);
                            }}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            تأكيد وحفظ الإعدادات 💾
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}