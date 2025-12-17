'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createCourse, updateCourse, deleteCourse, getUniversityStructure } from '@/app/actions/admin';

export default function CoursesTab({ courses, onRefresh, isDarkMode, adminData }) {
  
  // --- 1. إعداد صور الدكاترة ---
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

  // Form State
  const initialForm = {
    name: '', type: 'academic', category: '', // 👈 Added category
    university: '', college: '', year: '', section: '',
    price: '', paymentNumber: '', paymentMethods: 'both', contactPhone: '',
    startDate: '', details: '', image: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    async function loadStructure() {
      const res = await getUniversityStructure();
      if (res.success) setStructure(res.data || []);
    }
    loadStructure();
  }, []);

  // --- Helper Functions for Dropdowns (Cascading Logic) ---
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate) {
        return alert("يرجى ملء البيانات الأساسية");
    }
    if (formData.type !== 'summer' && (!formData.university || !formData.college || !formData.section)) {
        return alert("يرجى اختيار الجامعة والكلية والقسم بشكل صحيح من القائمة");
    }
    // 👈 Validation for summer category
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
      setFormData({
        name: course.name || course.title, 
        type: course.type || (course.isRevision ? 'revision' : course.isVacation ? 'summer' : 'academic'),
        category: course.category || '', // 👈 Restore category
        university: course.university || '',
        college: course.college || '',
        year: course.year || '',
        section: course.section || '',
        price: course.price || '',
        paymentNumber: course.paymentNumber || '',
        paymentMethods: course.paymentMethods || 'both',
        contactPhone: course.contactPhone || '',
        startDate: course.startDate || '',
        details: course.details || '',
        image: course.image || ''
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
                
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                    <img src={getInstructorImg(adminData?.name)} className="w-10 h-10 rounded-full object-cover border border-blue-500" alt="" />
                    <div>
                        <p className={`text-sm font-bold ${theme.textMain}`}>سيتم نشر الكورس باسم: <span className="text-blue-500">{adminData?.name || "الأدمن"}</span></p>
                        <p className={`text-xs ${theme.textSec}`}>يتم تحديد الاسم والصورة تلقائياً من حسابك الحالي.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Course Name & Type */}
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

                    {/* 🔥 2A. Summer Category (يظهر فقط في حالة الصيف) */}
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

                    {/* 2B. University Structure (يظهر فقط في غير الصيف) */}
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
                            {universitiesList.length === 0 && <p className="text-xs text-red-500 mt-2">⚠️ لم يتم إضافة جامعات في الهيكل.</p>}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label className={`text-xs font-bold ${theme.textSec}`}>السعر</label><input type="number" placeholder="0 = مجاني" className={`w-full p-3 mt-1 rounded-xl outline-none border ${theme.input}`} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
                        <div>
                            <label className={`text-xs font-bold ${theme.textSec}`}>طرق الدفع</label>
                            <select className={`w-full p-3 mt-1 rounded-xl outline-none border ${theme.input}`} value={formData.paymentMethods} onChange={e => setFormData({...formData, paymentMethods: e.target.value})}>
                                <option value="both" className="text-black">الكل</option>
                                <option value="cash" className="text-black">فودافون كاش</option>
                                <option value="center" className="text-black">سنتر</option>
                            </select>
                        </div>
                        <div><label className={`text-xs font-bold ${theme.textSec}`}>رقم المحفظة</label><input type="tel" className={`w-full p-3 mt-1 rounded-xl outline-none border dir-ltr ${theme.input}`} value={formData.paymentNumber} onChange={e => setFormData({...formData, paymentNumber: e.target.value})} /></div>
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

                    <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${theme.accentGradient}`}>
                        {loading ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : '🚀 إنشاء الكورس')}
                    </button>
                </form>
            </div>
        )}

        {/* Display Cards */}
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
                                    {/* 👇 Show Category for Summer */}
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
    </div>
  );
}