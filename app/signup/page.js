'use client';
import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    section: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(false);
  const [error, setError] = useState('');

  const fetchCoursesBySection = async (section) => {
    if (!section) return;
    setFetchingCourses(true);
    setAvailableCourses([]);
    setSelectedCourses([]); 
    try {
      const q = query(collection(db, 'courses'), where('section', '==', section));
      const querySnapshot = await getDocs(q);
      const courses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableCourses(courses);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setFetchingCourses(false);
    }
  };

  useEffect(() => {
    if (formData.section) {
      fetchCoursesBySection(formData.section);
    } else {
      setAvailableCourses([]);
    }
  }, [formData.section]);

  const handleCheckboxChange = (courseId) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.section) {
        setError("يرجى اختيار الشعبة أولاً.");
        setLoading(false);
        return;
    }

    if (selectedCourses.length === 0) {
        setError("يجب اختيار مادة واحدة على الأقل للاشتراك.");
        setLoading(false);
        return;
    }

    try {
      const emailToRegister = formData.email.includes('@') ? formData.email : `${formData.email}@science.academy.com`;
      
      const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, formData.password);
      const user = userCredential.user;

      const enrolledCoursesData = selectedCourses.map(courseId => ({
        courseId: courseId,
        status: 'pending',
        paid: false
      }));

      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: emailToRegister,
        role: 'student',
        section: formData.section,
        enrolledCourses: enrolledCoursesData,
        createdAt: Timestamp.now()
      });

      router.push('/dashboard'); 

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا الاسم مسجل بالفعل، حاول استخدام اسم آخر.');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).');
      } else {
        setError('حدث خطأ: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4 dir-rtl relative overflow-hidden" dir="rtl">
      
      {/* Background Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="max-w-2xl w-full bg-[#131B2E] p-8 rounded-3xl shadow-2xl border border-white/10 my-10 relative z-10">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white">إنشاء حساب طالب جديد 🎓</h2>
          <p className="mt-2 text-sm text-gray-400 font-bold">Science Academy LMS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">الاسم الثلاثي</label>
                <input
                  required
                  type="text"
                  className="w-full p-3 bg-[#0B1120] border border-white/10 rounded-xl focus:border-blue-500 outline-none font-bold text-white placeholder-gray-600 transition"
                  placeholder="مثال: القاسم عاطف"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">الشعبة</label>
                <select
                  required
                  className="w-full p-3 bg-[#0B1120] border border-white/10 rounded-xl focus:border-blue-500 outline-none font-bold text-white transition appearance-none"
                  value={formData.section}
                  onChange={(e) => setFormData({...formData, section: e.target.value})}
                >
                  <option value="" disabled className="text-gray-500">اختر شعبتك الدراسية...</option>
                  <option value="physics" className="text-black">⚛️ طبيعة (Physics)</option>
                  <option value="biology" className="text-black">🧬 بيولوجي (Biology)</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">اسم المستخدم (للدخول)</label>
                <div className="flex dir-ltr">
                    <input
                    required
                    type="text"
                    className="w-full p-3 bg-[#0B1120] border border-white/10 border-l-0 rounded-l-xl focus:border-blue-500 outline-none text-right font-bold text-white"
                    placeholder="ahmed2025"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <span className="bg-white/5 border border-white/10 border-r-0 text-gray-400 font-bold p-3 rounded-r-xl text-xs flex items-center">
                        @science.academy.com
                    </span>
                </div>
             </div>

             <div className="relative">
                <label className="block text-xs font-bold text-gray-400 mb-2">كلمة المرور</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full p-3 bg-[#0B1120] border border-white/10 rounded-xl focus:border-blue-500 outline-none font-bold text-white pl-10 transition"
                    placeholder="******"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-400"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
             </div>
          </div>

          {formData.section && (
            <div className="bg-blue-900/10 p-5 rounded-xl border border-blue-500/20 animate-fade-in">
                <h3 className="font-bold text-blue-400 mb-4 text-sm">📚 المواد المتاحة (اختر ما تريد الاشتراك به):</h3>
                
                {fetchingCourses ? (
                    <div className="flex justify-center p-4">
                        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : availableCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableCourses.map(course => (
                            <label key={course.id} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedCourses.includes(course.id) ? 'bg-blue-600/10 border-blue-500 shadow-md scale-[1.02]' : 'bg-[#0B1120] border-white/5 hover:border-blue-500/50'}`}>
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-blue-600 ml-3"
                                    checked={selectedCourses.includes(course.id)}
                                    onChange={() => handleCheckboxChange(course.id)}
                                />
                                <div>
                                    <div className="font-bold text-white text-md">{course.name}</div>
                                    <div className="text-xs text-gray-400 font-bold">{course.instructorName}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                ) : (
                    <p className="text-red-400 font-bold text-center text-sm">لا توجد مواد متاحة لهذه الشعبة حالياً.</p>
                )}
            </div>
          )}

          {error && <div className="text-red-400 bg-red-500/10 p-3 rounded-lg text-sm text-center font-bold border border-red-500/20">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white ${
              loading ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg'
            } transition-all`}
          >
            {loading ? 'جاري التسجيل...' : 'تسجيل حساب جديد ✨'}
          </button>

          <div className="text-center mt-4 border-t border-white/5 pt-4">
             <p className="text-sm text-gray-500 font-bold">لديك حساب بالفعل؟ <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold underline">سجل دخول هنا</Link></p>
          </div>

        </form>
      </div>
    </div>
  );
}