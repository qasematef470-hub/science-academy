'use client';
import { useState, useEffect, useCallback } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogo from '../components/ui/BrandLogo';

export default function SignupPage() {
    useEffect(() => {
    document.title = "إنشاء حساب جديد | Science Academy";
  }, []);
  const router = useRouter();
  
  // --- States ---
  const [isDark, setIsDark] = useState(true); // ✅ زرار الثيم
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fetchingStructure, setFetchingStructure] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 🔥 1. هيكلة الجامعة
  const [universityStructure, setUniversityStructure] = useState([]);

  // 🔥 2. وضع الأجازة
  const [isVacationMode, setIsVacationMode] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    phone: '', parentPhone: '', governorate: '', 
    email: '', password: '', 
    // Academic
    university: '', college: '', year: '', section: '',
    // Vacation
    vacationType: 'student', 
    schoolYear: '3rd Sec',
    collegeType: 'scientific',
    gradFaculty: '',
    gradYear: ''
  });

  const governorates = [
      "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "المنوفية", 
      "القليوبية", "البحيرة", "الغربية", "بور سعيد", "دمياط", "الإسماعيلية", 
      "السويس", "كفر الشيخ", "الفيوم", "بني سويف", "المنيا", "أسيوط", 
      "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", 
      "مطروح", "شمال سيناء", "جنوب سيناء"
  ];

  // جلب الهيكلة
  const fetchUniversityStructure = useCallback(async () => {
    setFetchingStructure(true);
    setFetchError(false);
    try {
        const docRef = doc(db, 'settings', 'university_structure');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUniversityStructure(data.structure || []);
        } else {
            setUniversityStructure([]);
        }
    } catch (err) { 
        console.error(err); 
        setFetchError(true);
    } 
    finally { setFetchingStructure(false); }
  }, []);

  useEffect(() => {
    fetchUniversityStructure();
  }, [fetchUniversityStructure]);

  // --- Helpers ---
  const getUniversities = () => universityStructure.map(u => u.name);
  
  const getColleges = () => {
      if (!formData.university) return [];
      const uniObj = universityStructure.find(u => u.name === formData.university);
      return uniObj ? uniObj.colleges.map(c => c.name) : [];
  };

  const getYears = () => {
      if (!formData.university || !formData.college) return [];
      const uniObj = universityStructure.find(u => u.name === formData.university);
      const colObj = uniObj?.colleges.find(c => c.name === formData.college);
      return colObj ? colObj.years.map(y => y.name) : [];
  };

  const getSections = () => {
      if (!formData.university || !formData.college || !formData.year) return [];
      const uniObj = universityStructure.find(u => u.name === formData.university);
      const colObj = uniObj?.colleges.find(c => c.name === formData.college);
      const yearObj = colObj?.years.find(y => y.name === formData.year);
      return yearObj ? yearObj.sections : [];
  };

  const handleNameInput = (field, value) => {
      if (/^[\u0600-\u06FF\s]*$/.test(value)) setFormData({ ...formData, [field]: value });
  };

  // --- Validation & Submit ---
  const validateForm = () => {
      setError('');
      if (!formData.firstName || !formData.middleName || !formData.lastName) return "الاسم الثلاثي مطلوب.";
      if (formData.phone.length < 11 || formData.parentPhone.length < 11) return "رقم الهاتف غير صحيح.";
      if (!formData.governorate) return "اختر المحافظة.";
      if (!isVacationMode) {
          if (!formData.university || !formData.college || !formData.year || !formData.section) return "استكمل البيانات الدراسية.";
      }
      return null;
  };

  const saveUserToDB = async (user) => {
      const fullName = `${formData.firstName} ${formData.middleName} ${formData.lastName}`;
      const userData = {
        uid: user.uid,
        firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName,
        displayName: fullName, 
        name: fullName, 
        phone: formData.phone, parentPhone: formData.parentPhone,
        governorate: formData.governorate, email: user.email,
        role: 'student', enrolledCourses: [], createdAt: Timestamp.now(), isLocked: false,
        isVacationMode: isVacationMode
      };

      if (!isVacationMode) {
          userData.university = formData.university;
          userData.college = formData.college;
          userData.year = formData.year;
          userData.section = formData.section;
      } else {
          userData.vacationDetails = {
              type: formData.vacationType,
              ...(formData.vacationType === 'student' && { year: formData.schoolYear }),
              ...(formData.vacationType === 'college_student' && { 
                  collegeType: formData.collegeType, year: formData.year, collegeName: formData.college 
              }),
              ...(formData.vacationType === 'grad' && { faculty: formData.gradFaculty, gradYear: formData.gradYear })
          };
      }
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valError = validateForm();
    if (valError) { setError(valError); return; }
    
    setLoading(true); 
    try {
      const emailToRegister = formData.email.includes('@') ? formData.email : `${formData.email}@science.academy.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, formData.password);
      const user = userCredential.user;
      try { await sendEmailVerification(user); } catch (e) { console.error(e); }
      await saveUserToDB(user);
      router.push('/dashboard'); 
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('الإيميل مسجل بالفعل!');
      else if (err.code === 'auth/weak-password') setError('كلمة المرور ضعيفة.');
      else setError(err.message);
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    const valError = validateForm();
    if (valError) { setError(valError + " (مطلوب لاستكمال التسجيل بجوجل)"); return; }
    setGoogleLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await saveUserToDB(result.user);
        router.push('/dashboard');
    } catch (err) { setError("فشل التسجيل بجوجل: " + err.message); } 
    finally { setGoogleLoading(false); }
  };

  // --- Theme Variables ---
  const inputClass = isDark 
      ? "bg-[#111] border border-white/10 text-white focus:bg-[#151515]" 
      : "bg-white border border-gray-300 text-gray-900 focus:bg-gray-50";

  return (
    <div className={`min-h-[100dvh] w-full flex dir-rtl font-sans overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#050505] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* 🖼️ Right Side: Visual Image (Desktop Only) */}
      <div className={`hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden ${isDark ? 'bg-[#111]' : 'bg-gray-200'}`}>
          <div className="absolute inset-0 z-0">
             <Image 
                src="/assets/images/singup.png" 
                alt="Join Us" 
                fill 
                className="object-cover opacity-60 grayscale hover:grayscale-0 transition duration-700"
             />
             <div className={`absolute inset-0 bg-gradient-to-l from-transparent ${isDark ? 'to-[#050505]' : 'to-gray-50'}`}></div>
          </div>
          
          <div className="relative z-10 text-right p-12 max-w-lg">
               <h1 className="text-6xl font-black mb-6 leading-tight">
                   يلا مفيش وقت <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-500 to-purple-600">اعملك أكونت وأنجز.</span>
               </h1>
               <p className={`text-lg font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                   سجل الآن وانضم لأقوى منصة تعليمية. كورسات، مراجعات، وامتحانات هتظبطلك المنهج.
               </p>
          </div>
      </div>

      {/* 📝 Left Side: The Form */}
      <div className={`w-full lg:w-1/2 flex flex-col h-screen overflow-y-auto custom-scrollbar relative ${isDark ? 'bg-[#050505]' : 'bg-gray-50'}`}>
          
          <div className="p-8 md:p-12 lg:p-16 max-w-2xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <Link href="/" className="w-32 cursor-pointer hover:scale-105 transition-transform block">
                    <BrandLogo />
                </Link>

                <div className="flex items-center gap-4">
                     {/* ☀️ زرار الثيم */}
                    <button 
                        onClick={() => setIsDark(!isDark)} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition ${isDark ? 'border-white/20 text-yellow-400 hover:bg-white/10' : 'border-gray-300 text-blue-600 hover:bg-white shadow-sm'}`}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    <Link href="/login" className={`text-sm font-bold transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>تسجيل الدخول ➜</Link>
                </div>
            </div>

            <div className="mb-10">
                <h2 className="text-3xl font-black mb-2">أنشئ حسابك الآن 🚀</h2>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} font-medium`}>ادخل بياناتك بشكل صحيح للحصول على أفضل تجربة.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* 1. الاسم */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-blue-500">👤 الاسم الثلاثي</label>
                    {/* 🔥 التعديل هنا: grid-cols-1 للموبايل و sm:grid-cols-3 للشاشات الأكبر */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input required type="text" placeholder="الاسم الأول" className={`${inputClass} rounded-xl p-4 text-center font-bold focus:border-blue-500 outline-none transition`} value={formData.firstName} onChange={(e) => handleNameInput('firstName', e.target.value)} />
                        <input required type="text" placeholder="اسم الأب" className={`${inputClass} rounded-xl p-4 text-center font-bold focus:border-blue-500 outline-none transition`} value={formData.middleName} onChange={(e) => handleNameInput('middleName', e.target.value)} />
                        <input required type="text" placeholder="العائلة" className={`${inputClass} rounded-xl p-4 text-center font-bold focus:border-blue-500 outline-none transition`} value={formData.lastName} onChange={(e) => handleNameInput('lastName', e.target.value)} />
                    </div>
                </div>

                {/* 2. التواصل */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-blue-500">📱 بيانات التواصل</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required type="tel" placeholder="رقم هاتفك" className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition dir-ltr text-right`} maxLength={11} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
                        <input required type="tel" placeholder="رقم ولي الأمر" className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition dir-ltr text-right`} maxLength={11} value={formData.parentPhone} onChange={(e) => setFormData({...formData, parentPhone: e.target.value.replace(/\D/g, '')})} />
                        <select required className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition md:col-span-2`} value={formData.governorate} onChange={(e) => setFormData({...formData, governorate: e.target.value})}>
                            <option value="" disabled>اختر المحافظة...</option>
                            {governorates.map((gov, idx) => (<option key={idx} value={gov}>{gov}</option>))}
                        </select>
                    </div>
                </div>

                {/* 3. نوع الحساب (Toggle) */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-blue-900/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                    <div>
                        <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>تسجيل لكورسات الأجازة/الصيف؟ 🏖️</h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isVacationMode} onChange={(e) => setIsVacationMode(e.target.checked)} />
                        <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    </label>
                </div>

                {/* 4. البيانات الدراسية */}
                <div className="space-y-4">
                    <label className={`text-sm font-bold ${isVacationMode ? 'text-orange-500' : 'text-blue-500'}`}>
                        {isVacationMode ? '🏖️ تفاصيل الأجازة' : '🎓 المرحلة الدراسية'}
                    </label>

                    {/* Academic */}
                    {!isVacationMode && (
                        <div className="space-y-4">
                           {fetchingStructure ? <p className="text-gray-500 text-sm animate-pulse">جاري تحميل البيانات...</p> : (
                               <>
                                   <select required className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition w-full`} value={formData.university} onChange={(e) => setFormData({...formData, university: e.target.value, college: '', year: '', section: ''})}>
                                        <option value="" disabled>اختر الجامعة</option>
                                        {getUniversities().map((u, i) => <option key={i} value={u}>{u}</option>)}
                                    </select>
                                    <select required disabled={!formData.university} className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition w-full disabled:opacity-50`} value={formData.college} onChange={(e) => setFormData({...formData, college: e.target.value, year: '', section: ''})}>
                                        <option value="" disabled>اختر الكلية</option>
                                        {getColleges().map((c, i) => <option key={i} value={c}>{c}</option>)}
                                    </select>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select required disabled={!formData.college} className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition disabled:opacity-50`} value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value, section: ''})}>
                                            <option value="" disabled>السنة</option>
                                            {getYears().map((y, i) => <option key={i} value={y}>{y}</option>)}
                                        </select>
                                        <select required disabled={!formData.year} className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition disabled:opacity-50`} value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})}>
                                            <option value="" disabled>القسم</option>
                                            {getSections().map((s, i) => <option key={i} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                               </>
                           )}
                        </div>
                    )}

                    {/* Vacation */}
                    {isVacationMode && (
                        <div className="space-y-4">
                            <select className={`${inputClass} rounded-xl p-4 font-bold focus:border-orange-500 outline-none transition w-full`} value={formData.vacationType} onChange={(e) => setFormData({...formData, vacationType: e.target.value})}>
                                <option value="student">طالب مدرسة</option>
                                <option value="college_student">طالب جامعي</option>
                                <option value="grad">خريج</option>
                            </select>
                             {formData.vacationType === 'student' && (
                                <select className={`${inputClass} rounded-xl p-4 font-bold focus:border-orange-500 outline-none transition w-full`} value={formData.schoolYear} onChange={(e) => setFormData({...formData, schoolYear: e.target.value})}>
                                     {['1st Prep', '2nd Prep', '3rd Prep', '1st Sec', '2nd Sec', '3rd Sec'].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            )}
                             {formData.vacationType === 'college_student' && (
                                <div className="grid grid-cols-2 gap-4">
                                     <select className={`${inputClass} rounded-xl p-4 font-bold focus:border-orange-500 outline-none transition`} value={formData.collegeType} onChange={(e) => setFormData({...formData, collegeType: e.target.value})}>
                                        <option value="scientific">كليات علمية</option>
                                        <option value="literary">كليات أدبية</option>
                                        <option value="other">أخرى</option>
                                    </select>
                                    <input type="text" placeholder="اسم الكلية" className={`${inputClass} rounded-xl p-4 font-bold focus:border-orange-500 outline-none transition`} value={formData.college} onChange={(e) => setFormData({...formData, college: e.target.value})} />
                                </div>
                            )}
                             {formData.vacationType === 'grad' && (
                                 <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="الكلية" className={`${inputClass} rounded-xl p-4 font-bold focus:border-orange-500 outline-none transition`} value={formData.gradFaculty} onChange={(e) => setFormData({...formData, gradFaculty: e.target.value})} />
                                    <input type="text" placeholder="سنة التخرج" className={`${inputClass} rounded-xl p-4 font-bold focus:border-orange-500 outline-none transition`} value={formData.gradYear} onChange={(e) => setFormData({...formData, gradYear: e.target.value})} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 5. كلمة المرور */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-blue-500">🔐 تأمين الحساب</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input required type="email" placeholder="البريد الإلكتروني" className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition dir-ltr`} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                         <div className="relative">
                            <input required type={showPassword ? "text" : "password"} placeholder="كلمة المرور" className={`${inputClass} rounded-xl p-4 font-bold focus:border-blue-500 outline-none transition w-full pl-10`} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-[50%] transform -translate-y-1/2 text-gray-400 hover:text-blue-500">{showPassword ? '👁️' : '🔒'}</button>
                         </div>
                    </div>
                </div>

                 {/* Google & Submit */}
                 <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    {error && <div className="text-red-500 text-sm font-bold text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}
                    
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                         {loading ? 'جاري الإنشاء...' : '🚀 إتمام التسجيل'}
                    </button>

                    <button type="button" onClick={handleGoogleSignup} disabled={googleLoading} className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 border ${isDark ? 'bg-white text-gray-900 hover:bg-gray-100 border-white' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}>
                        {googleLoading ? 'جاري الاتصال...' : (
                            <>
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                                <span>سجل بجوجل (Google)</span>
                            </>
                        )}
                    </button>
                 </div>
            </form>
          </div>
      </div>

      {/* ✅ زرار الدعم الفني العائم */}
      <a 
         href="https://wa.me/201100588901" 
         target="_blank" 
         className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center gap-2 font-bold group"
      >
        <span className="text-xl">💬</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">الدعم الفني</span>
      </a>

    </div>
  );
}