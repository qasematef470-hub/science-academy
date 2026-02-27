'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createCourse, updateCourse, deleteCourse, getUniversityStructure, getAllInstructors, addNewInstructor, updateInstructorImage, wipeInstructorCourses, nukeInstructorAccount, forceChangeInstructorPassword, nukeEntireDatabase, getGlobalStudents, updateRegistrationVideoUrl } from '@/app/actions/admin';

export default function CoursesTab({ courses, onRefresh, isDarkMode, adminData, onOpenStructure }) {

    // --- 1. إعداد صور الدكاترة (الكود القديم) ---
    const getInstructorImg = (name) => {
        if (!name) return '/assets/images/logo.png';
        if (name.includes('طه')) return '/assets/images/instructor-taha.jpg';
        if (name.includes('خالد')) return '/assets/images/instructor-Khaled.jpg';
        if (name.includes('محمد')) return '/assets/images/instructor-mohamed.jpg';
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

    // 👑 Super Admin State
    const isSuperAdmin = adminData?.email === 'qasem@science-academy.com';
    const [instructors, setInstructors] = useState([]);
    const [instructorsLoading, setInstructorsLoading] = useState(false);
    const [showAddInstructor, setShowAddInstructor] = useState(false);
    const [instructorForm, setInstructorForm] = useState({ name: '', email: '', password: '', phone: '', image: '' });
    const [instructorImgLoading, setInstructorImgLoading] = useState(false);
    const [addingInstructor, setAddingInstructor] = useState(false);
    const [passwordModal, setPasswordModal] = useState(null); // { uid, name }
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [imageModal, setImageModal] = useState(null); // { uid, name }
    const [newImageUrl, setNewImageUrl] = useState('');
    const [imageModalLoading, setImageModalLoading] = useState(false);

    // ☢️ Nuke State
    const [nukeLoading, setNukeLoading] = useState(false);

    // 👥 Global Students State
    const [showGlobalModal, setShowGlobalModal] = useState(false);
    const [globalStudents, setGlobalStudents] = useState([]);
    const [lastGlobalDoc, setLastGlobalDoc] = useState(null);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [hasMoreGlobal, setHasMoreGlobal] = useState(true);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const searchTimerRef = useRef(null);

    // 🏠 Landing Page Settings State
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [videoSaving, setVideoSaving] = useState(false);

    // Form State — Metadata ONLY (no modules)
    const initialForm = {
        name: '', type: 'academic', category: '',
        university: '', college: '', year: '', section: '',
        price: '', paymentNumber: '', paymentMethods: 'both', contactPhone: '',
        startDate: '', details: '', image: '',
    };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        async function loadStructure() {
            const res = await getUniversityStructure();
            if (res.success) setStructure(res.data || []);
        }
        loadStructure();
        if (isSuperAdmin) fetchInstructors();
    }, []);

    const fetchInstructors = async () => {
        setInstructorsLoading(true);
        const res = await getAllInstructors();
        if (res.success) setInstructors(res.data || []);
        setInstructorsLoading(false);
    };

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

    // --- Submit Handler (Metadata Only) ---
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
        const instructorImage = adminData?.image || getInstructorImg(instructorName);

        const finalData = {
            ...formData,
            instructorName,
            instructorImage,
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
        });
        setEditingId(course.id);
        setIsCreating(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm("⚠️ هل أنت متأكد من حذف الكورس؟")) return;
        const res = await deleteCourse(id);
        if (res.success) {
            alert(res.message);
            if (onRefresh) onRefresh();
        }
    };

    const getCardStyle = (type) => {
        switch (type) {
            case 'revision': return { border: 'border-l-4 border-l-orange-500', badge: 'bg-orange-100 text-orange-700' };
            case 'summer': return { border: 'border-l-4 border-l-cyan-500', badge: 'bg-cyan-100 text-cyan-700' };
            default: return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700' };
        }
    };

    // 👑 Super Admin Handlers
    const handleAddInstructor = async () => {
        if (!instructorForm.name || !instructorForm.email || !instructorForm.password) return alert('الاسم والإيميل والباسورد مطلوبين');
        setAddingInstructor(true);
        const res = await addNewInstructor(instructorForm);
        if (res.success) {
            alert(res.message);
            setShowAddInstructor(false);
            setInstructorForm({ name: '', email: '', password: '', phone: '', image: '' });
            fetchInstructors();
        } else alert('❌ ' + res.message);
        setAddingInstructor(false);
    };

    const handleInstructorImgUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setInstructorImgLoading(true);
        const data = new FormData();
        data.append('image', file);
        try {
            const res = await fetch('https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e', { method: 'POST', body: data });
            const json = await res.json();
            if (json.success) setInstructorForm(prev => ({ ...prev, image: json.data.url }));
        } catch { alert('فشل الرفع'); }
        finally { setInstructorImgLoading(false); }
    };

    const handleEditImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageModalLoading(true);
        const data = new FormData();
        data.append('image', file);
        try {
            const res = await fetch('https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e', { method: 'POST', body: data });
            const json = await res.json();
            if (json.success) setNewImageUrl(json.data.url);
        } catch { alert('فشل الرفع'); }
        finally { setImageModalLoading(false); }
    };

    const handleSaveImage = async () => {
        if (!imageModal || !newImageUrl) return;
        const res = await updateInstructorImage(imageModal.uid, newImageUrl);
        if (res.success) { alert(res.message); setImageModal(null); setNewImageUrl(''); fetchInstructors(); if (onRefresh) onRefresh(); }
        else alert('❌ ' + res.message);
    };

    const handleChangePassword = async () => {
        if (!passwordModal || !newPasswordInput) return;
        const res = await forceChangeInstructorPassword(passwordModal.uid, newPasswordInput);
        if (res.success) { alert(res.message); setPasswordModal(null); setNewPasswordInput(''); }
        else alert('❌ ' + res.message);
    };

    const handleWipe = async (uid, name) => {
        if (!confirm(`⚠️ هل أنت متأكد من تصفير كل كورسات "${name}"؟\nسيتم حذف جميع الكورسات والامتحانات وبنك الأسئلة نهائياً!`)) return;
        const res = await wipeInstructorCourses(uid);
        if (res.success) { alert(res.message); fetchInstructors(); if (onRefresh) onRefresh(); }
        else alert('❌ ' + res.message);
    };

    const handleNuke = async (uid, name) => {
        if (!confirm(`🚨 حذف نهائي!\nهل أنت متأكد من حذف المحاضر "${name}" نهائياً؟\nسيتم حذف: الحساب + كل الكورسات + الامتحانات + بنك الأسئلة!`)) return;
        if (!confirm(`⚠️ تأكيد أخير: لا يمكن التراجع عن هذا الإجراء!`)) return;
        const res = await nukeInstructorAccount(uid);
        if (res.success) { alert(res.message); fetchInstructors(); if (onRefresh) onRefresh(); }
        else alert('❌ ' + res.message);
    };

    // ☢️ Nuke Database Handler
    const handleNukeDatabase = async () => {
        if (!confirm('🚨 تحذير خطير!\n\nأنت على وشك تصفير قاعدة البيانات بالكامل!\n\nسيتم حذف:\n• جميع حسابات الطلاب\n• جميع الكورسات\n• جميع الامتحانات والنتائج\n• بنك الأسئلة بالكامل\n• الإعلانات\n\nلن يتم حذف: حسابات المحاضرين والإعدادات.\n\nهل أنت متأكد؟')) return;
        if (!confirm('☢️ تأكيد أخير ونهائي!\n\nهل أنت متأكد 100% من تصفير كل شيء؟\nلا يمكن التراجع عن هذا الإجراء!')) return;

        setNukeLoading(true);
        try {
            const res = await nukeEntireDatabase();
            if (res.success) {
                alert(`${res.message}\n\nتفاصيل الحذف:\n${Object.entries(res.details || {}).map(([k, v]) => `• ${k}: ${v}`).join('\n')}`);
                if (onRefresh) onRefresh();
            } else {
                alert('❌ فشل التصفير: ' + res.message);
            }
        } catch (e) {
            alert('❌ حدث خطأ غير متوقع');
        }
        setNukeLoading(false);
    };

    // 👥 Global Students Handlers
    const handleLoadGlobalStudents = useCallback(async (loadMore = false, search = '') => {
        setIsGlobalLoading(true);
        try {
            const docId = loadMore ? lastGlobalDoc : null;
            const res = await getGlobalStudents(docId, search);
            if (res.success) {
                setGlobalStudents(prev => loadMore ? [...prev, ...res.data] : res.data);
                setLastGlobalDoc(res.lastDocId);
                setHasMoreGlobal(res.hasMore);
            }
        } catch (e) {
            console.error('Global fetch error:', e);
        }
        setIsGlobalLoading(false);
    }, [lastGlobalDoc]);

    const handleOpenGlobalModal = () => {
        setShowGlobalModal(true);
        setGlobalStudents([]);
        setLastGlobalDoc(null);
        setHasMoreGlobal(true);
        setGlobalSearchTerm('');
        handleLoadGlobalStudents(false, '');
    };

    const handleGlobalSearch = (value) => {
        setGlobalSearchTerm(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setGlobalStudents([]);
            setLastGlobalDoc(null);
            setHasMoreGlobal(true);
            handleLoadGlobalStudents(false, value);
        }, 300);
    };

    return (
        <div className="space-y-8 animate-fade-in">

            {/* ═══════════════════════════════════════════════════
                👑 SUPER ADMIN — Instructor Management Section
            ═══════════════════════════════════════════════════ */}
            {isSuperAdmin && (
                <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <span className="text-2xl">👑</span>
                            <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>إدارة المحاضرين (Super Admin)</span>
                        </h2>
                        <button onClick={() => setShowAddInstructor(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition active:scale-95">
                            ➕ إضافة محاضر جديد
                        </button>
                    </div>

                    {instructorsLoading ? (
                        <div className="text-center py-10"><span className="text-xl animate-spin inline-block">⏳</span></div>
                    ) : instructors.length === 0 ? (
                        <p className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>لا يوجد محاضرين مسجلين.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {instructors.map(inst => (
                                <div key={inst.uid} className={`p-5 rounded-2xl border transition hover:shadow-lg ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-amber-500/30' : 'bg-white border-gray-200 hover:border-amber-300'}`}>
                                    {/* Instructor Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-700 border-2 border-amber-500/30 shadow-md">
                                            {inst.image ? <img src={inst.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{inst.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{inst.email}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                            <p className="text-lg font-black text-blue-500">{inst.coursesCount}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">كورسات</p>
                                        </div>
                                        <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                            <p className="text-lg font-black text-emerald-500">{inst.studentsCount}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">طلاب</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => { setPasswordModal({ uid: inst.uid, name: inst.name }); setNewPasswordInput(''); }} className="px-2 py-2 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition">🔑 كلمة السر</button>
                                        <button onClick={() => { setImageModal({ uid: inst.uid, name: inst.name }); setNewImageUrl(''); }} className="px-2 py-2 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition">🖼️ الصورة</button>
                                        {inst.email !== 'qasem@science-academy.com' && (
                                            <>
                                                <button onClick={() => handleWipe(inst.uid, inst.name)} className="px-2 py-2 rounded-lg text-[10px] font-bold bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition">🧹 تصفير</button>
                                                <button onClick={() => handleNuke(inst.uid, inst.name)} className="px-2 py-2 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition">🗑️ حذف نهائي</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ☢️ Nuke + 👥 Global Students Buttons */}
                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-dashed border-gray-700/50">
                        <button
                            onClick={handleNukeDatabase}
                            disabled={nukeLoading}
                            className="px-6 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/30 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {nukeLoading ? (
                                <><span className="animate-spin inline-block">⏳</span> جاري التصفير...</>
                            ) : (
                                <>☢️ تصفير قاعدة البيانات (مسح كل شيء ما عدا الإدارة)</>
                            )}
                        </button>
                        <button
                            onClick={handleOpenGlobalModal}
                            className="px-6 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-900/30 transition active:scale-95 flex items-center gap-2"
                        >
                            👥 عرض جميع حسابات المنصة
                        </button>
                    </div>

                    {/* 🏠 Landing Page Settings */}
                    <div className={`mt-6 pt-6 border-t border-dashed border-gray-700/50`}>
                        <h3 className={`text-lg font-black flex items-center gap-2 mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            <span className="text-xl">🏠</span> إعدادات الصفحة الرئيسية
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="رابط أو ID فيديو طريقة التسجيل (YouTube)"
                                className={`flex-1 p-3 rounded-xl border outline-none font-bold text-sm dir-ltr transition focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400'}`}
                                value={videoUrlInput}
                                onChange={(e) => setVideoUrlInput(e.target.value)}
                            />
                            <button
                                onClick={async () => {
                                    if (!videoUrlInput.trim()) return alert('أدخل رابط أو ID الفيديو');
                                    setVideoSaving(true);
                                    const res = await updateRegistrationVideoUrl(videoUrlInput.trim());
                                    if (res.success) {
                                        alert(res.message);
                                        setVideoUrlInput('');
                                    } else {
                                        alert('❌ ' + res.message);
                                    }
                                    setVideoSaving(false);
                                }}
                                disabled={videoSaving}
                                className="px-6 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
                            >
                                {videoSaving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
                            </button>
                        </div>
                        <p className={`text-xs mt-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                            💡 أدخل الـ ID فقط (مثال: YsmGiwCnHhE) أو الرابط الكامل.
                        </p>
                    </div>
                </div>
            )}

            {/* 👑 Modal: Add New Instructor */}
            {showAddInstructor && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4" dir="rtl">
                    <div className={`w-full max-w-lg rounded-3xl border p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <h3 className={`text-xl font-black mb-6 text-center ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>👑 إضافة محاضر جديد</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="الاسم بالكامل" className={`w-full p-3 rounded-xl border outline-none font-bold ${theme.input}`} value={instructorForm.name} onChange={e => setInstructorForm({ ...instructorForm, name: e.target.value })} />
                            <input type="email" placeholder="الإيميل" className={`w-full p-3 rounded-xl border outline-none font-bold dir-ltr ${theme.input}`} value={instructorForm.email} onChange={e => setInstructorForm({ ...instructorForm, email: e.target.value })} />
                            <input type="text" placeholder="كلمة السر" className={`w-full p-3 rounded-xl border outline-none font-bold dir-ltr ${theme.input}`} value={instructorForm.password} onChange={e => setInstructorForm({ ...instructorForm, password: e.target.value })} />
                            <input type="tel" placeholder="رقم الهاتف" className={`w-full p-3 rounded-xl border outline-none font-bold dir-ltr ${theme.input}`} value={instructorForm.phone} onChange={e => setInstructorForm({ ...instructorForm, phone: e.target.value })} />
                            <div>
                                <input type="file" id="instImg" className="hidden" accept="image/*" onChange={handleInstructorImgUpload} />
                                <label htmlFor="instImg" className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-xl cursor-pointer transition text-sm font-bold ${instructorForm.image ? 'border-emerald-500 text-emerald-500' : `${isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'}`}`}>
                                    {instructorImgLoading ? '⏳ جاري الرفع...' : instructorForm.image ? '✅ تم رفع الصورة' : '📷 رفع صورة المحاضر'}
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowAddInstructor(false)} className="flex-1 py-3 text-gray-500 font-bold hover:text-white transition rounded-xl">إلغاء</button>
                            <button onClick={handleAddInstructor} disabled={addingInstructor} className="flex-[2] py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black shadow-lg disabled:opacity-50 transition">
                                {addingInstructor ? 'جاري الإضافة...' : '✅ إضافة المحاضر'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 👑 Modal: Change Password */}
            {passwordModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4" dir="rtl">
                    <div className={`w-full max-w-sm rounded-3xl border p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <h3 className={`text-lg font-black mb-2 text-center ${theme.textMain}`}>🔑 تغيير كلمة السر</h3>
                        <p className="text-center text-sm text-gray-500 mb-6">{passwordModal.name}</p>
                        <input type="text" placeholder="كلمة السر الجديدة (6 أحرف على الأقل)" className={`w-full p-3 rounded-xl border outline-none font-bold dir-ltr mb-6 ${theme.input}`} value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setPasswordModal(null)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl">إلغاء</button>
                            <button onClick={handleChangePassword} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg">تغيير</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 👑 Modal: Edit Image */}
            {imageModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4" dir="rtl">
                    <div className={`w-full max-w-sm rounded-3xl border p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <h3 className={`text-lg font-black mb-2 text-center ${theme.textMain}`}>🖼️ تعديل صورة المحاضر</h3>
                        <p className="text-center text-sm text-gray-500 mb-6">{imageModal.name}</p>
                        <input type="file" id="editInstImg" className="hidden" accept="image/*" onChange={handleEditImageUpload} />
                        <label htmlFor="editInstImg" className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition text-sm font-bold mb-4 ${newImageUrl ? 'border-emerald-500 text-emerald-500' : `${isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'}`}`}>
                            {imageModalLoading ? '⏳ جاري الرفع...' : newImageUrl ? '✅ تم رفع الصورة' : '📷 اختر صورة جديدة'}
                        </label>
                        {newImageUrl && <img src={newImageUrl} className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 border-2 border-emerald-500" alt="" />}
                        <div className="flex gap-3">
                            <button onClick={() => setImageModal(null)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl">إلغاء</button>
                            <button onClick={handleSaveImage} disabled={!newImageUrl} className="flex-[2] py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg disabled:opacity-50">حفظ الصورة</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 👥 Modal: Global Platform Students */}
            {showGlobalModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4" dir="rtl">
                    <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                        {/* Header */}
                        <div className="p-6 border-b border-slate-700/50 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <span className="text-2xl">👥</span> دليل حسابات المنصة
                                </h3>
                                <button onClick={() => setShowGlobalModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-2xl transition">✕</button>
                            </div>
                            {/* Search */}
                            <div className="relative">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                                <input
                                    type="text"
                                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                                    className={`w-full pr-10 pl-4 py-3 rounded-xl border outline-none font-bold transition focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-slate-900 placeholder-slate-400'}`}
                                    value={globalSearchTerm}
                                    onChange={(e) => handleGlobalSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Body — Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {isGlobalLoading && globalStudents.length === 0 ? (
                                <div className="text-center py-16">
                                    <span className="text-4xl animate-spin inline-block">⏳</span>
                                    <p className={`mt-3 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>جاري تحميل البيانات...</p>
                                </div>
                            ) : globalStudents.length === 0 ? (
                                <div className="text-center py-16">
                                    <span className="text-4xl">📭</span>
                                    <p className={`mt-3 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>لا توجد نتائج</p>
                                </div>
                            ) : (
                                <>
                                    {/* Student Count */}
                                    <p className={`text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        عدد النتائج: {globalStudents.length}
                                    </p>

                                    {/* Student Cards Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {globalStudents.map((s) => (
                                            <div key={s.uid} className={`p-4 rounded-2xl border transition hover:shadow-md ${isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:border-blue-500/30' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-black truncate text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.name || 'بدون اسم'}</h4>
                                                        <p className="text-xs text-gray-500 font-mono mt-0.5 dir-ltr text-right">{s.phone || '---'}</p>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-lg text-center flex-shrink-0 ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                                        <p className="text-lg font-black text-blue-500">{s.enrolledCoursesCount}</p>
                                                        <p className="text-[9px] text-blue-400 font-bold">كورسات</p>
                                                    </div>
                                                </div>
                                                <div className={`mt-3 pt-3 border-t grid grid-cols-2 gap-x-4 gap-y-1 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                                                    <p className="text-[11px] text-gray-500 truncate"><span className="font-bold">🏛️</span> {s.university || '---'}</p>
                                                    <p className="text-[11px] text-gray-500 truncate"><span className="font-bold">🎓</span> {s.college || '---'}</p>
                                                    <p className="text-[11px] text-gray-500 truncate"><span className="font-bold">📅</span> {s.year || '---'}</p>
                                                    <p className="text-[11px] text-gray-500 truncate"><span className="font-bold">🔹</span> {s.section || '---'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-700/50 flex-shrink-0 text-center">
                            {hasMoreGlobal && !globalSearchTerm ? (
                                <button
                                    onClick={() => handleLoadGlobalStudents(true, '')}
                                    disabled={isGlobalLoading}
                                    className={`px-8 py-3 rounded-xl font-black text-sm transition active:scale-95 disabled:opacity-50 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-blue-600 border border-gray-300'}`}
                                >
                                    {isGlobalLoading ? '⏳ جاري التحميل...' : '👇 عرض المزيد'}
                                </button>
                            ) : (
                                globalStudents.length > 0 && (
                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {globalSearchTerm ? `نتائج البحث: ${globalStudents.length} طالب` : 'لقد وصلت لآخر قائمة الطلاب ✅'}
                                    </p>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!isCreating ? (
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <h2 className={`text-2xl font-bold ${theme.textMain}`}>إدارة الكورسات والمواد</h2>
                    <div className="flex items-center gap-3">
                        {onOpenStructure && isSuperAdmin && (
                            <button onClick={onOpenStructure} className={`px-5 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                ⚙️ إدارة الهيكل
                            </button>
                        )}
                        <button onClick={() => setIsCreating(true)} className={`px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105 ${theme.accentGradient}`}>
                            + إنشاء كورس جديد
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`p-4 md:p-8 rounded-3xl border shadow-xl relative ${theme.card}`}>
                    <button onClick={() => { setIsCreating(false); setEditingId(null); setFormData(initialForm); }} className="absolute top-6 left-6 text-gray-400 hover:text-red-500 font-bold text-xl">✕ إلغاء</button>
                    <h3 className={`font-bold text-2xl mb-6 flex items-center gap-2 ${theme.textMain}`}>
                        <span className="text-3xl">{editingId ? '✏️' : '🛠️'}</span> {editingId ? 'تعديل الكورس' : 'إنشاء كورس جديد'}
                    </h3>

                    {/* معلومات المحاضر التلقائية */}
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                        <img src={adminData?.image || getInstructorImg(adminData?.name)} className="w-10 h-10 rounded-full object-cover border border-blue-500" alt="" />
                        <div>
                            <p className={`text-sm font-bold ${theme.textMain}`}>سيتم نشر الكورس باسم: <span className="text-blue-500">{adminData?.name || "الأدمن"}</span></p>
                            <p className={`text-xs ${theme.textSec}`}>يتم تحديد الاسم والصورة تلقائياً من حسابك الحالي.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* البيانات الأساسية */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className={`text-xs font-bold ${theme.textSec}`}>اسم المادة</label>
                                <input type="text" placeholder="مثال: رياضيات تطبيقية" className={`w-full p-3 mt-1 rounded-xl outline-none border focus:ring-2 focus:ring-indigo-500 transition ${theme.input}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <div>
                                <label className={`text-xs font-bold ${theme.textSec}`}>نوع الكورس</label>
                                <select
                                    className={`w-full p-3 mt-1 rounded-xl outline-none border focus:ring-2 focus:ring-indigo-500 font-bold ${theme.input}`}
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
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
                                <select className={`w-full p-3 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
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
                                        <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.university} onChange={e => setFormData({ ...formData, university: e.target.value, college: '', year: '', section: '' })}>
                                            <option value="" className="text-gray-500">اختر الجامعة...</option>
                                            {universitiesList.map((u, i) => <option key={i} value={u.name} className="text-black">{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400">الكلية</label>
                                        <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.college} onChange={e => setFormData({ ...formData, college: e.target.value, year: '', section: '' })} disabled={!formData.university}>
                                            <option value="" className="text-gray-500">اختر الكلية...</option>
                                            {collegesList.map((c, i) => <option key={i} value={c.name} className="text-black">{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400">السنة الدراسية</label>
                                        <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value, section: '' })} disabled={!formData.college}>
                                            <option value="" className="text-gray-500">اختر السنة...</option>
                                            {yearsList.map((y, i) => <option key={i} value={y.name} className="text-black">{y.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400">القسم / الشعبة</label>
                                        <select className={`w-full p-2 rounded-lg outline-none border font-bold ${theme.input}`} value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} disabled={!formData.year}>
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
                            <input type="number" placeholder="0 = مجاني" className={`w-full p-3 mt-1 rounded-xl outline-none border ${theme.input}`} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className={`text-xs font-bold ${theme.textSec}`}>تاريخ البداية</label><input type="date" className={`w-full p-3 mt-1 rounded-xl outline-none border ${theme.input}`} value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} required /></div>
                            <div><label className={`text-xs font-bold ${theme.textSec}`}>رقم الدعم</label><input type="tel" className={`w-full p-3 mt-1 rounded-xl outline-none border dir-ltr ${theme.input}`} value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} /></div>
                        </div>

                        <div><label className={`text-xs font-bold ${theme.textSec}`}>الوصف</label><textarea className={`w-full p-3 mt-1 rounded-xl h-20 outline-none border ${theme.input}`} value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} /></div>

                        <div className="relative group cursor-pointer">
                            <input type="file" id="cImg" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <label htmlFor="cImg" className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-xl transition ${theme.textSec} border-gray-300 dark:border-gray-600 hover:border-indigo-500`}>
                                {imageLoading ? '⏳ جاري الرفع...' : formData.image ? '✅ تم الرفع' : '📷 رفع غلاف الكورس'}
                            </label>
                        </div>

                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <p className="text-sm text-emerald-400 font-bold">💡 لإدارة المحتوى (الأبواب والدروس والامتحانات)، اذهب لتاب "المحتوى" بعد إنشاء الكورس.</p>
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