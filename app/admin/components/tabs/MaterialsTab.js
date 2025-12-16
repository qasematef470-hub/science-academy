'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { addMaterialToCourse, getCourseMaterials, deleteMaterialFromCourse } from '@/app/actions/admin';

export default function MaterialsTab({ myCourses, isDarkMode }) {
  const theme = {
    input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400',
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSec: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    accentGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
  };

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ title: "", type: "pdf", link: "" });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const getCardStyle = (type) => {
    switch(type) {
        case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: '🔥', label: 'مراجعة نهائية' };
        case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700', icon: '🏖️', label: 'كورس صيفي' };
        default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: '📚', label: 'منهج أكاديمي' };
    }
  };

  useEffect(() => {
    if (!selectedCourseId) return;
    const load = async () => {
        setLoading(true);
        const res = await getCourseMaterials(selectedCourseId);
        if (res.success) setCourseMaterials(res.data);
        setLoading(false);
    };
    load();
  }, [selectedCourseId]);

  const handleMaterialImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) { 
          setMaterialForm({...materialForm, link: data.data.url});
          alert("✅ تم رفع الصورة"); 
      }
    } catch (e) { alert("فشل الرفع"); } 
    finally { setUploadingImage(false); }
  };

  const handleAddMaterial = async (e) => {
      e.preventDefault();
      if(!materialForm.title || !materialForm.link) return alert("البيانات ناقصة");
      
      const res = await addMaterialToCourse(selectedCourseId, materialForm);
      if (res.success) {
          setMaterialForm({ title: "", type: "pdf", link: "" });
          const updated = await getCourseMaterials(selectedCourseId);
          if (updated.success) setCourseMaterials(updated.data);
          alert("✅ تم الإضافة");
      } else {
          alert("❌ خطأ");
      }
  };

  const handleDeleteMaterial = async (item) => {
      if(confirm("حذف المحتوى؟")) {
          await deleteMaterialFromCourse(selectedCourseId, item);
          const updated = await getCourseMaterials(selectedCourseId);
          if (updated.success) setCourseMaterials(updated.data);
      }
  };

  // --- RENDER ---

  if (!selectedCourseId) {
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة المحتوى التعليمي</h2>
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
                            
                            {/* 🔥 تفاصيل الكورس (تم الإصلاح) */}
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                                {type !== 'summer' ? (
                                    <>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">🏛️ {course.university}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">🎓 {course.college} - {course.year}</p>
                                        <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>🔹 {course.section || "قسم عام"}</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-blue-500 font-bold">🌟 كورس عام لكل الطلاب</p>
                                )}
                            </div>

                            <div className="mt-4 text-center text-xs font-bold text-gray-400 group-hover:text-indigo-500 transition">
                                اضغط لإدارة الملفات والفيديوهات 📂
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  }

  // Material Manager View
  const currentCourse = myCourses.find(c => c.id === selectedCourseId);

  return (
    <div className="animate-scale-in">
         <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setSelectedCourseId(null)} className={`p-3 rounded-xl border transition hover:scale-105 ${theme.card} ${theme.textSec}`}>🡸 رجوع</button>
            <h2 className={`text-2xl font-bold ${theme.textMain}`}>محتوى: <span className="text-indigo-500">{currentCourse?.name}</span></h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
             <div className={`lg:col-span-1 p-6 rounded-3xl border shadow-sm h-fit sticky top-24 ${theme.card}`}>
                 <h3 className={`font-bold text-lg mb-6 border-b pb-2 ${theme.textMain}`}>➕ إضافة محتوى جديد</h3>
                 <div className="space-y-4">
                    <div>
                        <label className={`text-xs font-bold ${theme.textSec}`}>عنوان الدرس / الملف</label>
                        <input type="text" placeholder="مثال: مراجعة الوحدة الأولى" className={`w-full p-3 mt-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition ${theme.input}`} value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className={`text-xs font-bold ${theme.textSec}`}>نوع الملف</label>
                        <select className={`w-full p-3 mt-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition ${theme.input}`} value={materialForm.type} onChange={e => setMaterialForm({...materialForm, type: e.target.value})}>
                            <option value="pdf" className="text-black">📄 ملف PDF / Drive</option>
                            <option value="video" className="text-black">🎥 فيديو (YouTube/Link)</option>
                            <option value="image" className="text-black">🖼️ صورة توضيحية</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className={`text-xs font-bold ${theme.textSec}`}>{materialForm.type === 'image' ? 'رفع الصورة' : 'الرابط'}</label>
                        {materialForm.type === 'image' ? (
                            <div className="relative group mt-1">
                                <input type="file" id="matFile" className="hidden" accept="image/*" onChange={handleMaterialImageUpload} />
                                <label htmlFor="matFile" className={`w-full p-3 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer ${theme.textSec} border-gray-300 dark:border-gray-600 hover:border-indigo-500`}>
                                    {uploadingImage ? 'جاري الرفع...' : materialForm.link ? '✓ تم الرفع' : '📷 اضغط للرفع'}
                                </label>
                            </div>
                        ) : (
                            <input type="text" placeholder="https://..." className={`w-full p-3 mt-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition dir-ltr ${theme.input}`} value={materialForm.link} onChange={e => setMaterialForm({...materialForm, link: e.target.value})} />
                        )}
                    </div>
                    
                    <button onClick={handleAddMaterial} disabled={uploadingImage} className={`w-full py-3 mt-2 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 ${theme.accentGradient}`}>إضافة للمحتوى</button>
                 </div>
             </div>

             <div className="lg:col-span-2">
                 <h3 className={`font-bold text-lg mb-4 ${theme.textMain}`}>📂 الملفات المضافة ({courseMaterials.length})</h3>
                 <div className={`space-y-3`}>
                    {loading ? <p className="text-gray-500 text-center py-10">⏳ جاري التحميل...</p> : courseMaterials.length === 0 ? <div className={`p-8 text-center border border-dashed rounded-2xl ${theme.textSec}`}>لا يوجد محتوى مضاف حتى الآن.</div> : 
                    courseMaterials.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border hover:shadow-md transition group ${theme.card}`}>
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl ${item.type === 'video' ? 'bg-red-50 text-red-500' : item.type === 'image' ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500'}`}>
                                    {item.type === 'video' ? '🎥' : item.type === 'image' ? '🖼️' : '📄'}
                                </div>
                                <div className="min-w-0">
                                    <div className={`font-bold truncate ${theme.textMain}`}>{item.title}</div>
                                    <a href={item.link} target="_blank" className="text-xs text-indigo-500 hover:underline truncate block max-w-[200px] sm:max-w-xs">{item.link}</a>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteMaterial(item)} className="text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg text-xs font-bold transition">حذف 🗑️</button>
                        </div>
                    ))}
                 </div>
             </div>
        </div>
    </div>
  );
}