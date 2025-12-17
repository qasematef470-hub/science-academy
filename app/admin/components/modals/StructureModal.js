'use client';
import React, { useState, useEffect } from 'react';
import { getUniversityStructure, saveUniversityStructure } from '@/app/actions/admin';

export default function StructureModal({ onClose, isDarkMode }) {
  const [structure, setStructure] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 ألوان وتصميمات أوضح وأقوى
  const theme = {
    overlay: 'bg-black/80 backdrop-blur-md', // تعتيم الخلفية
    modalBg: isDarkMode ? 'bg-[#0f172a] border border-slate-700' : 'bg-white border border-gray-300',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    inputBg: isDarkMode ? 'bg-[#1e293b] text-white border-slate-600' : 'bg-gray-100 text-slate-900 border-gray-300',
    cardBg: isDarkMode ? 'bg-[#1e293b]/50' : 'bg-gray-50',
    borderColor: isDarkMode ? 'border-slate-700' : 'border-gray-200',
  };

  useEffect(() => {
    async function load() {
      const res = await getUniversityStructure();
      if (res.success) setStructure(res.data || []);
    }
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const res = await saveUniversityStructure(structure);
    setLoading(false);
    if (res.success) {
        alert(res.message);
        onClose();
    } else {
        alert("❌ حدث خطأ: " + res.error);
    }
  };

  // Helper functions (Add/Delete/Update) ... SAME LOGIC
  const addUni = () => setStructure([...structure, { name: "جامعة جديدة", colleges: [] }]);
  const updateUniName = (idx, val) => { const s = [...structure]; s[idx].name = val; setStructure(s); };
  const deleteUni = (idx) => { if(!confirm("حذف الجامعة؟")) return; const s = [...structure]; s.splice(idx, 1); setStructure(s); };

  const addCollege = (uniIdx) => { const s = [...structure]; s[uniIdx].colleges.push({ name: "", years: [] }); setStructure(s); };
  const updateCollegeName = (uniIdx, colIdx, val) => { const s = [...structure]; s[uniIdx].colleges[colIdx].name = val; setStructure(s); };
  const deleteCollege = (uniIdx, colIdx) => { const s = [...structure]; s[uniIdx].colleges.splice(colIdx, 1); setStructure(s); };

  const addYear = (uniIdx, colIdx) => { const s = [...structure]; s[uniIdx].colleges[colIdx].years.push({ name: "", sections: [] }); setStructure(s); };
  const updateYearName = (uniIdx, colIdx, yearIdx, val) => { const s = [...structure]; s[uniIdx].colleges[colIdx].years[yearIdx].name = val; setStructure(s); };
  
  const addSection = (uniIdx, colIdx, yearIdx) => { const val = prompt("اسم القسم:"); if(val) { const s = [...structure]; s[uniIdx].colleges[colIdx].years[yearIdx].sections.push(val); setStructure(s); }};
  const deleteSection = (uniIdx, colIdx, yearIdx, secIdx) => { const s = [...structure]; s[uniIdx].colleges[colIdx].years[yearIdx].sections.splice(secIdx, 1); setStructure(s); };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${theme.overlay} overflow-y-auto`}>
        <div className={`w-full max-w-4xl m-4 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] ${theme.modalBg}`}>
            
            {/* Header */}
            <div className={`p-4 md:p-6 border-b flex justify-between items-center ${theme.borderColor}`}>
                <h3 className={`font-bold text-lg md:text-2xl flex items-center gap-2 ${theme.textMain}`}>
                    ⚙️ إدارة هيكل الجامعات
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl font-bold">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                {structure.map((uni, uIdx) => (
                    <div key={uIdx} className={`p-6 rounded-3xl border-2 ${isDarkMode ? 'border-indigo-900/50' : 'border-indigo-100'} ${theme.cardBg}`}>
                        
                        {/* University Input */}
                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-indigo-500">اسم الجامعة</label>
                                <button onClick={() => deleteUni(uIdx)} className="text-red-500 text-xs font-bold hover:underline">حذف الجامعة</button>
                            </div>
                            <input 
                                type="text" 
                                placeholder="مثال: جامعة الأقصر"
                                className={`w-full p-4 rounded-xl text-lg font-bold outline-none border focus:ring-2 focus:ring-indigo-500 transition ${theme.inputBg}`}
                                value={uni.name} 
                                onChange={(e) => updateUniName(uIdx, e.target.value)}
                            />
                        </div>

                        {/* Colleges List */}
                        <div className="pl-4 border-r-2 border-gray-300 dark:border-gray-700 space-y-6">
                            {uni.colleges.map((col, cIdx) => (
                                <div key={cIdx} className={`p-4 rounded-2xl border ${theme.borderColor} ${isDarkMode ? 'bg-black/20' : 'bg-white'}`}>
                                    
                                    {/* College Input */}
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1">اسم الكلية</label>
                                            <input 
                                                type="text" 
                                                placeholder="مثال: كلية العلوم"
                                                className={`w-full p-3 rounded-lg font-bold text-base outline-none border ${theme.inputBg}`}
                                                value={col.name}
                                                onChange={(e) => updateCollegeName(uIdx, cIdx, e.target.value)}
                                            />
                                        </div>
                                        <button onClick={() => deleteCollege(uIdx, cIdx)} className="self-end mb-1 p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition">🗑️</button>
                                    </div>

                                    {/* Years */}
                                    <div className="space-y-3">
                                        {col.years.map((yr, yIdx) => (
                                            <div key={yIdx} className={`p-3 rounded-xl border flex flex-col gap-3 ${theme.borderColor} ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="السنة (مثال: الفرقة الأولى)"
                                                        className={`flex-1 p-2 rounded bg-transparent border-b font-bold text-sm outline-none ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'}`}
                                                        value={yr.name}
                                                        onChange={(e) => updateYearName(uIdx, cIdx, yIdx, e.target.value)}
                                                    />
                                                </div>
                                                
                                                {/* Sections Badges */}
                                                <div className="flex flex-wrap gap-2">
                                                    {yr.sections.map((sec, sIdx) => (
                                                        <span key={sIdx} className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-500 text-white flex items-center gap-2">
                                                            {sec}
                                                            <button onClick={() => deleteSection(uIdx, cIdx, yIdx, sIdx)} className="hover:text-red-200 font-bold">×</button>
                                                        </span>
                                                    ))}
                                                    <button onClick={() => addSection(uIdx, cIdx, yIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold border border-dashed hover:bg-indigo-500 hover:text-white transition ${isDarkMode ? 'border-gray-500 text-gray-400' : 'border-gray-400 text-gray-600'}`}>
                                                        + قسم
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => addYear(uIdx, cIdx)} className="w-full py-2 text-xs font-bold text-indigo-500 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10">
                                            + إضافة سنة دراسية
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addCollege(uIdx)} className="w-full py-3 border-2 border-dashed border-gray-400 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-500 font-bold transition">
                                + إضافة كلية جديدة لـ {uni.name || 'الجامعة'}
                            </button>
                        </div>
                    </div>
                ))}
                
                <button onClick={addUni} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition text-lg">
                    + إضافة جامعة جديدة
                </button>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t flex justify-end gap-3 ${theme.borderColor}`}>
                <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition">إلغاء</button>
                <button onClick={handleSave} disabled={loading} className="px-8 py-3 rounded-xl font-bold bg-green-600 text-white shadow-lg hover:bg-green-700 transition">
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات ✅'}
                </button>
            </div>
        </div>
    </div>
  );
}