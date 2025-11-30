'use client';
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
// 🔥 استيراد الدوال الجديدة
import { getAllCourses, enrollStudent, getAnnouncements, getCourseMaterials } from '../actions';

// 📦 مكتبات الشهادة
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function StudentDashboard() {
  const router = useRouter();
  
  // --- States ---
  const [userData, setUserData] = useState(null);
  const [enrolledCoursesDetails, setEnrolledCoursesDetails] = useState([]);
  const [resultsByCourse, setResultsByCourse] = useState({});
  const [viewMode, setViewMode] = useState('folders');
  const [selectedResultCourse, setSelectedResultCourse] = useState(null); 
  const [loading, setLoading] = useState(true);

  // Password Modal
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrollLoading, setEnrollLoading] = useState(null);

  // 🔥 New Features States
  const [announcements, setAnnouncements] = useState([]);
  const [materialsModal, setMaterialsModal] = useState({ show: false, courseName: '', materials: [] });
  const [certConfig, setCertConfig] = useState({ enabled: false, minScore: 90 });
  
  // Ref for Certificate
  const certRef = useRef(null);

  // --- Init ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.isLocked) {
            alert("⛔ تم تجميد حسابك. يرجى مراجعة إدارة الأكاديمية.");
            await signOut(auth);
            return;
        }
        setUserData(data);

        // Load Settings for Certificate
        const settingsSnap = await getDoc(doc(db, "settings", "config"));
        if(settingsSnap.exists()) {
            const s = settingsSnap.data();
            setCertConfig({ enabled: s.enableCertificate || false, minScore: s.minScorePercent || 90 });
        }

        // Load Announcements
        const annRes = await getAnnouncements();
        if(annRes.success) setAnnouncements(annRes.data);

        let coursesList = [];
        if (data.enrolledCourses && data.enrolledCourses.length > 0) {
            coursesList = await fetchCoursesDetails(data.enrolledCourses);
        }
        await fetchMyResults(user.uid, coursesList);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Helpers ---
  const fetchCoursesDetails = async (enrolledList) => {
    const details = [];
    for (const item of enrolledList) {
        const courseDoc = await getDoc(doc(db, 'courses', item.courseId));
        if (courseDoc.exists()) {
            details.push({ ...item, name: courseDoc.data().name });
        }
    }
    setEnrolledCoursesDetails(details);
    return details;
  };

  const fetchMyResults = async (uid, courses) => {
    const q = query(collection(db, 'results'), where('studentId', '==', uid), orderBy('submittedAt', 'desc'));
    let allResults = [];
    try {
        const snap = await getDocs(q);
        allResults = snap.docs.map(d => ({...d.data(), id: d.id}));
    } catch (e) {
        const qNoOrder = query(collection(db, 'results'), where('studentId', '==', uid));
        const snap = await getDocs(qNoOrder);
        allResults = snap.docs.map(d => ({...d.data(), id: d.id}));
    }

    const uniqueExamCodes = [...new Set(allResults.map(r => r.examCode || 'General'))];
    const visibilityMap = {};
    for (const code of uniqueExamCodes) {
        const settingsDoc = await getDoc(doc(db, "exam_settings", code));
        visibilityMap[code] = settingsDoc.exists() ? settingsDoc.data().isVisible : false;
    }

    const grouped = {};
    courses.forEach(c => { grouped[c.courseId] = { name: c.name, results: [] }; });

    allResults.forEach(res => {
        if (grouped[res.courseId]) {
            grouped[res.courseId].results.push({
                ...res,
                isReviewable: visibilityMap[res.examCode || 'General'] || false
            });
        }
    });
    setResultsByCourse(grouped);
  };

  // 🔥 Materials Handler
  const handleOpenMaterials = async (courseId, courseName) => {
      setMaterialsModal({ show: true, courseName, materials: [], loading: true });
      const res = await getCourseMaterials(courseId);
      if(res.success) {
          setMaterialsModal({ show: true, courseName, materials: res.data, loading: false });
      } else {
          setMaterialsModal({ show: true, courseName, materials: [], loading: false });
      }
  };

  // 🔥 Certificate Generator (Premium English Version)
  const handleDownloadCertificate = async (studentName, courseName, score) => {
    if (!certRef.current) return;
    
    const element = certRef.current;
    
    // إظهار العنصر
    element.style.display = 'flex'; 
    
    // تعبئة البيانات
    element.querySelector('#cert-name').innerText = studentName;
    element.querySelector('#cert-course').innerText = courseName; // You might want to pass English names if available
    element.querySelector('#cert-score').innerText = score + '%';

    try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, { 
            scale: 2,
            backgroundColor: "#ffffff", 
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Certificate_${studentName}.pdf`);
    } catch (err) {
        console.error("Certificate Error:", err);
        alert("حدث خطأ أثناء تحميل الشهادة.");
    } finally {
        element.style.display = 'none'; 
    }
  };

  // Other Handlers
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    
    const user = auth.currentUser;
    if (!user || !user.email) {
        alert("خطأ في الجلسة."); setPassLoading(false); return;
    }

    const credential = EmailAuthProvider.credential(user.email, currentPass);
    
    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);
        alert("✅ تم تغيير كلمة المرور بنجاح!");
        setShowPassModal(false); setCurrentPass(""); setNewPass("");
    } catch (error) { 
        console.error(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("❌ كلمة المرور الحالية غير صحيحة.");
        } else if (error.code === 'auth/weak-password') {
            alert("⚠️ كلمة المرور ضعيفة جداً!\nيجب أن تتكون من 6 أحرف أو أرقام على الأقل.");
        } else {
            alert("فشل التغيير: " + error.message); 
        }
    } 
    finally { setPassLoading(false); }
  };

  const startExam = (courseId) => {
    if (confirm("هل أنت مستعد لبدء الامتحان؟")) {
        router.push(`/exam/${courseId}`);
    }
  };

  const goToReview = (res) => router.push(`/exam/${res.courseId}/review/${res.id}`);

  const handleOpenEnrollModal = async () => {
      setShowEnrollModal(true);
      const res = await getAllCourses();
      if (res.success) setAvailableCourses(res.data);
  };

  const handleEnroll = async (courseId) => {
      setEnrollLoading(courseId);
      const res = await enrollStudent(auth.currentUser.uid, courseId);
      if (res.success) { alert("✅ تم إرسال طلب الاشتراك!"); window.location.reload(); } 
      else { alert("❌ " + res.message); }
      setEnrollLoading(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120] text-white"><div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white dir-rtl font-sans relative overflow-x-hidden" dir="rtl">
      
      {/* 
         🔥🔥🔥 NEW PREMIUM CERTIFICATE TEMPLATE (English) 🔥🔥🔥
         Pure CSS - High Quality - A4 Landscape
      */}
      <div ref={certRef} style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0,
        width: '1123px', height: '794px', // A4 Landscape @96 DPI approx
        backgroundColor: '#fff',
        zIndex: 99999,
        fontFamily: "'Times New Roman', serif",
        color: '#1a202c'
      }}>
        {/* Layer 1: Navy Blue Border */}
        <div style={{
            width: '100%', height: '100%',
            padding: '25px',
            backgroundColor: '#0f172a', // Deep Navy
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxSizing: 'border-box'
        }}>
            {/* Layer 2: Gold Border & Cream Background */}
            <div style={{
                width: '100%', height: '100%',
                border: '5px solid #d4af37', // Gold
                backgroundColor: '#fffcf5', // Light Cream
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                backgroundImage: 'radial-gradient(circle at center, #fffcf5 0%, #f3ece0 100%)',
                boxShadow: 'inset 0 0 50px rgba(0,0,0,0.05)'
            }}>
                
                {/* Ornamental Corners */}
                <div style={{ position: 'absolute', top: '15px', left: '15px', width: '80px', height: '80px', borderTop: '5px solid #d4af37', borderLeft: '5px solid #d4af37' }}></div>
                <div style={{ position: 'absolute', top: '15px', right: '15px', width: '80px', height: '80px', borderTop: '5px solid #d4af37', borderRight: '5px solid #d4af37' }}></div>
                <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '80px', height: '80px', borderBottom: '5px solid #d4af37', borderLeft: '5px solid #d4af37' }}></div>
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '80px', height: '80px', borderBottom: '5px solid #d4af37', borderRight: '5px solid #d4af37' }}></div>

                {/* Header */}
                <h1 style={{ fontSize: '56px', letterSpacing: '4px', color: '#0f172a', margin: '0', textTransform: 'uppercase', fontWeight: 'bold' }}>Certificate</h1>
                <h2 style={{ fontSize: '26px', letterSpacing: '8px', color: '#b48e43', margin: '5px 0 40px 0', textTransform: 'uppercase', fontWeight: 'normal' }}>Of Achievement</h2>

                <p style={{ fontSize: '20px', fontStyle: 'italic', color: '#64748b', marginBottom: '15px' }}>This certificate is proudly presented to</p>

                {/* Name - Large & Elegant */}
                <div id="cert-name" style={{
                    fontSize: '60px',
                    fontFamily: "'Georgia', serif",
                    color: '#0f172a', // Navy text
                    margin: '10px 0 20px 0',
                    borderBottom: '2px solid #d4af37',
                    paddingBottom: '10px',
                    minWidth: '500px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                }}>Student Name</div>

                {/* Body Text */}
                <p style={{ fontSize: '22px', color: '#334155', maxWidth: '850px', textAlign: 'center', lineHeight: '1.6', marginTop: '10px' }}>
                    For successfully completing the final examination for
                    <br />
                    <span id="cert-course" style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '28px' }}>Physics Course</span>
                </p>

                <p style={{ fontSize: '20px', color: '#334155', marginTop: '15px' }}>
                    With an outstanding score of <span id="cert-score" style={{ fontWeight: 'bold', color: '#d4af37', fontSize: '28px' }}>100%</span>
                </p>

                {/* Footer Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '70%', marginTop: '70px', alignItems: 'flex-end' }}>
                    
                    {/* Date */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #94a3b8', paddingBottom: '5px', minWidth: '200px' }}>
                            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', marginTop: '5px' }}>Date</p>
                    </div>

                    {/* Seal Simulation */}
                    <div style={{ 
                        width: '120px', height: '120px', 
                        borderRadius: '50%', 
                        border: '4px double #d4af37',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: '#d4af37', fontWeight: 'bold', fontSize: '12px', textAlign: 'center',
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)',
                        backgroundColor: '#fff',
                        marginBottom: '10px'
                    }}>
                        <span style={{ fontSize: '24px' }}>★</span>
                        <span style={{ margin: '2px 0' }}>OFFICIAL</span>
                        <span style={{ margin: '2px 0' }}>SEAL</span>
                        <span style={{ fontSize: '24px' }}>★</span>
                    </div>

                    {/* Signature */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontFamily: 'cursive', color: '#0f172a', borderBottom: '1px solid #94a3b8', paddingBottom: '5px', minWidth: '200px' }}>
                            Science Academy
                        </p>
                        <p style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', marginTop: '5px' }}>Signature</p>
                    </div>
                </div>

            </div>
        </div>
      </div>
      {/* 🔥 END CERTIFICATE TEMPLATE 🔥 */}

      {/* 🔥 News Ticker */}
      {announcements.length > 0 && (
          <div className="bg-gradient-to-r from-blue-900 to-[#131B2E] text-white py-2 overflow-hidden border-b border-white/10 relative z-50">
              <div className="whitespace-nowrap animate-marquee flex gap-10 items-center">
                  {announcements.map((ann, i) => (
                      <span key={i} className="mx-8 font-bold text-sm flex items-center gap-2">📢 {ann.text}</span>
                  ))}
              </div>
          </div>
      )}

      <header className="bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-40 border-b border-white/5 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
            <div>
                <h1 className="font-black text-2xl text-white">مرحباً، {userData?.name} 👋</h1>
                <p className="text-sm text-blue-400 font-bold mt-1">
                    {userData?.section === 'physics' ? '⚛️ شعبة العلوم الطبيعية' : '🧬 شعبة العلوم البيولوجية'}
                </p>
            </div>
            <div className="flex gap-3">
                <button onClick={handleOpenEnrollModal} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"><span>🛍️</span> اشتراك جديد</button>
                <button onClick={() => setShowPassModal(true)} className="bg-blue-600/10 text-blue-400 px-4 py-2 rounded-xl font-bold text-sm border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">🔐</button>
                <button onClick={() => signOut(auth)} className="bg-red-500/10 text-red-400 px-4 py-2 rounded-xl font-bold text-sm border border-red-500/20 hover:bg-red-600 hover:text-white transition-all">خروج</button>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12 relative z-10">
        
        {/* === SECTION 1: COURSES === */}
        <section>
            <h2 className="font-black text-3xl mb-8 flex items-center gap-2"><span className="text-blue-500">📚</span> الامتحانات المتاحة</h2>
            
            {enrolledCoursesDetails.length === 0 ? (
                <div className="bg-[#131B2E] border border-white/5 p-10 rounded-3xl text-center">
                    <p className="text-gray-400 font-bold text-lg">لم تشترك في أي مواد بعد.</p>
                    <button onClick={handleOpenEnrollModal} className="mt-4 text-blue-400 font-bold hover:underline">اشترك الآن</button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrolledCoursesDetails.map(course => (
                        <div key={course.courseId} className={`p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[220px] ${course.status === 'active' ? 'bg-[#131B2E] border-blue-500/30' : 'bg-[#131B2E]/50 border-white/5 grayscale opacity-70'}`}>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="font-black text-2xl text-white leading-tight">{course.name}</h3>
                                {course.status === 'active' 
                                    ? <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold">مفعل ✅</span>
                                    : <span className="bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-bold">انتظار ⏳</span>
                                }
                            </div>
                            
                            <div className="relative z-10 mt-auto space-y-2">
                                {/* 🔥 Materials Button */}
                                {course.status === 'active' && (
                                    <button onClick={() => handleOpenMaterials(course.courseId, course.name)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-sm border border-white/10 flex items-center justify-center gap-2 transition">
                                        📚 المحتوى الدراسي
                                    </button>
                                )}

                                {course.status === 'active' ? (
                                    <button onClick={() => startExam(course.courseId)} className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"><span>🚀</span> ابدأ الامتحان</button>
                                ) : (
                                    <button disabled className="w-full py-4 bg-white/5 text-gray-500 rounded-xl font-bold cursor-not-allowed">غير متاح</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* === SECTION 2: RESULTS === */}
        <section>
            <h2 className="font-black text-3xl mb-8 flex items-center gap-2"><span className="text-purple-500">🏆</span> سجل الدرجات</h2>
            
            {viewMode === 'folders' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {Object.entries(resultsByCourse).map(([courseId, data]) => (
                         data.results.length > 0 && (
                            <div key={courseId} onClick={() => { setSelectedResultCourse(courseId); setViewMode('list'); }} className="group cursor-pointer">
                                <div className="bg-[#131B2E]/80 border border-white/10 p-8 rounded-3xl flex flex-col items-center gap-4 hover:border-purple-500/50 hover:-translate-y-2 transition-all">
                                    <div className="text-4xl">🎓</div>
                                    <h3 className="font-black text-xl text-white">{data.name}</h3>
                                    <span className="bg-white/10 text-gray-400 px-3 py-1 rounded-full text-xs font-bold">{data.results.length} امتحانات</span>
                                </div>
                            </div>
                         )
                    ))}
                </div>
            )}

            {viewMode === 'list' && selectedResultCourse && (
                <div className="animate-slide-up">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setViewMode('folders')} className="bg-white/5 hover:bg-white/10 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold transition">🡪</button>
                        <h3 className="font-black text-2xl text-white">نتائج: <span className="text-purple-400">{resultsByCourse[selectedResultCourse].name}</span></h3>
                    </div>

                    <div className="bg-[#131B2E]/60 rounded-3xl border border-white/5 overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-black/20 text-gray-400 font-bold text-xs uppercase">
                                <tr><th className="p-5">الامتحان</th><th className="p-5">الدرجة</th><th className="p-5">التاريخ</th><th className="p-5">الإجراءات</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm font-medium">
                                {resultsByCourse[selectedResultCourse].results.map((res, idx) => {
                                    const percent = (res.score / res.total) * 100;
                                    const isPassed = percent >= certConfig.minScore;
                                    return (
                                        <tr key={idx} className="hover:bg-white/5 transition">
                                            <td className="p-5 font-bold">{res.examCode || 'General'}</td>
                                            <td className="p-5 text-blue-400 font-black">{res.score} / {res.total}</td>
                                            <td className="p-5 text-gray-400">{res.submittedAt?.seconds ? new Date(res.submittedAt.seconds * 1000).toLocaleDateString('ar-EG') : '-'}</td>
                                            <td className="p-5 flex gap-2">
                                                <button onClick={() => goToReview(res)} disabled={!res.isReviewable} className={`px-3 py-1 rounded-lg text-xs font-bold border ${res.isReviewable ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                                    {res.isReviewable ? '👁️ إجابات' : '🔒 مغلق'}
                                                </button>
                                                {/* 🔥 Certificate Button */}
                                                {certConfig.enabled && isPassed && (
                                                    <button onClick={() => handleDownloadCertificate(userData.name, resultsByCourse[selectedResultCourse].name, percent.toFixed(0))} className="px-3 py-1 rounded-lg text-xs font-bold bg-yellow-500 text-black border border-yellow-400 hover:bg-yellow-400 animate-pulse">
                                                        🎓 شهادة
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
      </main>

      {/* 🔐 Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4">
            <div className="bg-[#131B2E] p-8 rounded-3xl border border-white/10 w-full max-w-md">
                <h3 className="font-black text-2xl mb-6 text-white text-center">تغيير الباسورد 🔐</h3>
                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2">كلمة المرور الحالية</label>
                        <div className="relative">
                            <input 
                                type={showCurrentPass ? "text" : "password"} 
                                required 
                                className="w-full p-4 bg-[#0B1120] border border-white/10 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition pl-12" 
                                value={currentPass} 
                                onChange={e => setCurrentPass(e.target.value)} 
                            />
                            <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 font-bold text-xl">
                                {showCurrentPass ? '👁️‍🗨️' : '👁️'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2">كلمة المرور الجديدة</label>
                        <div className="relative">
                            <input 
                                type={showNewPass ? "text" : "password"} 
                                required 
                                className="w-full p-4 bg-[#0B1120] border border-white/10 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition pl-12" 
                                value={newPass} 
                                onChange={e => setNewPass(e.target.value)} 
                            />
                            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 font-bold text-xl">
                                {showNewPass ? '👁️‍🗨️' : '👁️'}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="submit" disabled={passLoading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg">{passLoading ? 'جاري...' : 'تأكيد التغيير'}</button>
                        <button type="button" onClick={() => setShowPassModal(false)} className="px-6 bg-white/5 text-gray-300 rounded-xl font-bold hover:bg-white/10 transition border border-white/5">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 📚 Materials Modal */}
      {materialsModal.show && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in p-4">
              <div className="bg-[#131B2E] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <h3 className="font-black text-xl text-white">📚 محتوى: {materialsModal.courseName}</h3>
                      <button onClick={() => setMaterialsModal({...materialsModal, show: false})} className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                      {materialsModal.loading ? <p className="text-center text-gray-500">جاري التحميل...</p> : 
                       materialsModal.materials.length === 0 ? <p className="text-center text-gray-500 py-10">لا يوجد محتوى مضاف.</p> :
                       materialsModal.materials.map((item, idx) => (
                           <div key={idx} className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-blue-500/30 transition">
                               <div className="flex items-center gap-4">
                                   <div className="text-2xl">{item.type === 'video' ? '🎥' : item.type === 'image' ? '🖼️' : '📄'}</div>
                                   <div>
                                       <div className="font-bold text-white">{item.title}</div>
                                       <span className="text-[10px] text-gray-400">{item.type.toUpperCase()}</span>
                                   </div>
                               </div>
                               <a href={item.link} target="_blank" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg">فتح 🔗</a>
                           </div>
                       ))
                      }
                  </div>
              </div>
          </div>
      )}

      {/* 🛍️ Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in p-4">
            <div className="bg-[#131B2E] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-xl text-white">🛍️ اشتراك جديد</h3>
                    <button onClick={() => setShowEnrollModal(false)} className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    {availableCourses.filter(c => !userData?.enrolledCourses?.some(ec => ec.courseId === c.id)).map(course => (
                        <div key={course.id} className="bg-black/30 p-5 rounded-2xl border border-white/5 flex justify-between items-center gap-4">
                            <div>
                                <h4 className="font-bold text-lg text-white">{course.name}</h4>
                                <p className="text-xs text-gray-400">{course.section === 'physics' ? 'علمي رياضة' : 'علمي علوم'}</p>
                            </div>
                            <button onClick={() => handleEnroll(course.id)} disabled={enrollLoading === course.id} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm">
                                {enrollLoading === course.id ? '...' : 'اشتراك'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}