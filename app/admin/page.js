'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from "firebase/auth";
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// --- Actions ---
import { getInstructorCourses, getAnnouncements } from '@/app/actions/admin';

// --- UI Components ---
import Sidebar from './components/ui/Sidebar';
import Header from './components/ui/Header';
import StatsCards from './components/ui/StatsCards';
import FloatingShape from '../components/ui/FloatingShape';
import AdminTools from './components/ui/AdminTools';

// --- Tabs ---
import StudentsTab from './components/tabs/StudentsTab';
import CoursesTab from './components/tabs/CoursesTab';
import QuestionsTab from './components/tabs/QuestionsTab';
import MaterialsTab from './components/tabs/MaterialsTab';
import AnnouncementsTab from './components/tabs/AnnouncementsTab';
import ResultsTab from './components/tabs/ResultsTab';
import LeaderboardTab from './components/tabs/LeaderboardTab';
import SettingsTab from './components/tabs/SettingsTab';

// --- Modals ---
import StructureModal from './components/modals/StructureModal';
import PasswordModal from './components/modals/PasswordModal';

export default function AdminDashboard() {
  const router = useRouter();
  useEffect(() => {
        document.title = "الأدمن | Science Academy";
      }, []);
  
  // --- Global States ---
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Data States ---
  const [myCourses, setMyCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [stats, setStats] = useState({ passData: [], gradeData: [], title: 'جاري التحميل...' });

  // --- Questions State (Shared for AdminTools refresh) ---
  const [questionsList, setQuestionsList] = useState([]);
  const [selectedCourseForQ, setSelectedCourseForQ] = useState('');

  // --- Modals State ---
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  // --- Theme Logic ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setIsDarkMode(savedTheme === 'dark');
  }, []);
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

 // --- Auth & Initial Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        router.push('/login'); 
        return; 
      }
      try {
        // 🔥 التعديل هنا: (true) بتجبره يجيب توكن جديد طازة من فايربيس
        const token = await user.getIdToken(true);
        
        // تخزين التوكن في الكوكيز
        document.cookie = `firebaseToken=${token}; path=/; max-age=3600; SameSite=Lax`;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            setAdminData(userDoc.data());
            await loadInitialData(user.uid);
        } else { 
            router.push('/login'); 
        }
      } catch(e) { 
        console.error("Auth Error:", e);
        // لو حصل خطأ في التوكن، نخرجه عشان يسجل من جديد
        signOut(auth);
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (activeTab === 'questions' && questionsList.length === 0 && myCourses.length > 0) {
       // لو مفيش كورس مختار، نختار الأول
       const courseId = selectedCourseForQ || myCourses[0].id;
       fetchQuestions(courseId);
    }
  }, [activeTab]);
  // --- Data Loading Functions ---
  const loadInitialData = async (uid) => {
      // 1. Get Courses
      const cRes = await getInstructorCourses(uid);
      if (cRes.success) {
          setMyCourses(cRes.data);
          if (cRes.data.length > 0) setSelectedCourseForQ(cRes.data[0].id);
          
          // Fetch dependent data
          fetchStudents(cRes.data);
          //fetchQuestions(cRes.data.length > 0 ? cRes.data[0].id : null);
          
          // ❌ احذف السطر ده أو خليه كومنت عشان نتأكد إنه مش هيشتغل
          // calculateStats(cRes.data); 
          
          // ✅ البديل: نادي الدالة الجديدة الموفرة
          calculateStats(null);
      }

      // 2. Get Announcements
      const aRes = await getAnnouncements();
      if (aRes.success) setAnnouncements(aRes.data);
  };

  const fetchStudents = async (courses) => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snapshot = await getDocs(q);
        const pending = [];
        const active = [];
        const myCourseIds = courses.map(c => c.id); 

        snapshot.forEach(doc => {
            const student = { uid: doc.id, ...doc.data() };
            const studentCourses = student.enrolledCourses || [];
            
            // Check if student is related to any of my courses
            const isRelated = studentCourses.some(c => myCourseIds.includes(c.courseId));
            
            if (isRelated) {
                active.push(student);
                if (studentCourses.some(c => myCourseIds.includes(c.courseId) && c.status === 'pending')) {
                    pending.push(student);
                }
            }
        });
        setPendingStudents(pending);
        setAllStudents(active);
      } catch (e) { console.error("Students Error:", e); }
  };

  const fetchQuestions = async (courseId) => {
    if(!courseId) return;
    const q = query(collection(db, 'questions_bank'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setQuestionsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  //const calculateStats = async (courses) => {
      // Simple Analytics based on fetched results (This could be moved to backend for performance later)
    //  try {
    //    const q = query(collection(db, "results"), orderBy("startTime", "desc"));
    //    const snap = await getDocs(q);
    //    const myCourseIds = courses.map(c => c.id);
    //    const data = snap.docs.map(d => d.data()).filter(r => myCourseIds.includes(r.courseId));
    //    
    //    let passed = 0, failed = 0;
    //    let grades = { Excellent: 0, VeryGood: 0, Good: 0, Acceptable: 0, Fail: 0 };
    //
    //    data.forEach(r => {
    //        if (r.total > 0) {
    //            const percent = (r.score / r.total) * 100;
    //            if (percent >= 50) passed++; else failed++;
    //            if (percent >= 85) grades.Excellent++;
    //            else if (percent >= 75) grades.VeryGood++;
    //            else if (percent >= 65) grades.Good++;
    //            else if (percent >= 50) grades.Acceptable++;
    //            else grades.Fail++;
    //        }
    //    });
    //
    //    setStats({
    //        title: 'إحصائيات عامة',
    //        passData: [{ name: 'ناجح', value: passed, color: '#10B981' }, { name: 'راسب', value: failed, color: '#EF4444' }],
    //        gradeData: [
    //            { name: 'امتياز', count: grades.Excellent }, { name: 'جيد جداً', count: grades.VeryGood },
    //            { name: 'جيد', count: grades.Good }, { name: 'مقبول', count: grades.Acceptable }, { name: 'ضعيف', count: grades.Fail }
    //        ]
    //    });
    //  } catch (e) { console.error("Stats Error:", e); }
  //};
    // ❌ دالة الإحصائيات القديمة كانت بتسحب كل الداتا
    // ✅ الدالة الجديدة (الموفرة): بترجع أصفار عشان الموقع يفتح وميسحبش رصيد
    const calculateStats = async (courses) => {
        console.log("⚠️ تم إيقاف الإحصائيات مؤقتاً لتوفير الرصيد");
        setStats({
            title: 'إحصائيات عامة (موقوفة مؤقتاً)',
            passData: [{ name: 'ناجح', value: 0, color: '#10B981' }, { name: 'راسب', value: 0, color: '#EF4444' }],
            gradeData: []
        });
        // ملحوظة: لما ترقي الباقة لـ Blaze ابقى رجع الكود القديم لو محتاجه
    };
  if (loading) return (
    <div className={`min-h-screen flex flex-col items-center justify-center dir-rtl ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`}>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans dir-rtl transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`} dir="rtl">
        {/* Background Animation */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
            <FloatingShape type="flask" delay={0} duration={25} top="10%" left="5%" isDarkMode={isDarkMode} />
            <FloatingShape type="atom" delay={5} duration={30} top="30%" right="10%" isDarkMode={isDarkMode} />
        </div>

        {/* Sidebar - تم تعديله ليكون Overlay في الموبايل */}
        <div className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:w-20'} md:translate-x-0`}>
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isSidebarOpen={isSidebarOpen} 
                adminData={adminData} 
                pendingCount={pendingStudents.length}
                // 🔥 إضافة: نقفل القائمة لما نختار تاب في الموبايل
                onCloseMobile={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
            />
        </div>

        {/* Backdrop for Mobile - خلفية سوداء لما القائمة تفتح */}
        {isSidebarOpen && (
            <div 
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
            ></div>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:mr-64' : 'md:mr-20'}`}>
            {/* Header */}
            <Header 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                onOpenPassModal={() => setShowPassModal(true)}
            />

            <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in relative z-10 overflow-x-hidden">
                {/* ... باقي التابات زي ما هي ... */}
                <StatsCards stats={stats} isDarkMode={isDarkMode} />
              
                {activeTab === 'students' && (
                    <StudentsTab 
                        allStudents={allStudents} 
                        pendingStudents={pendingStudents} 
                        myCourses={myCourses} 
                        searchTerm={searchTerm}
                        onRefresh={() => fetchStudents(myCourses)}
                        isDarkMode={isDarkMode}
                    />
                )}
                {activeTab === 'courses' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setShowStructureModal(true)} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition text-sm md:text-base">
                                ⚙️ إدارة الهيكل
                            </button>
                        </div>
                        <CoursesTab courses={myCourses} onRefresh={() => loadInitialData(auth.currentUser.uid)} isDarkMode={isDarkMode} adminData={adminData} />
                    </>
                )}
                {/* ... (كمل باقي التابات بنفس طريقتك القديمة) ... */}
                {activeTab === 'questions' && <QuestionsTab myCourses={myCourses} questionsList={questionsList} selectedCourseForQ={selectedCourseForQ} setSelectedCourseForQ={setSelectedCourseForQ} fetchQuestions={fetchQuestions} isDarkMode={isDarkMode} />}
                {activeTab === 'materials' && <MaterialsTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} myCourses={myCourses} onRefresh={async () => { const r = await getAnnouncements(); if(r.success) setAnnouncements(r.data); }} isDarkMode={isDarkMode} />}
                {activeTab === 'results' && <ResultsTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'leaderboard' && <LeaderboardTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'settings' && <SettingsTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'admin-tools' && <AdminTools myCourses={myCourses} onRefresh={(cId) => fetchQuestions(cId)} isDarkMode={isDarkMode} />}
            </div>
        </main>

        {/* Global Modals */}
        {showStructureModal && <StructureModal onClose={() => setShowStructureModal(false)} isDarkMode={isDarkMode} />}
        {showPassModal && <PasswordModal onClose={() => setShowPassModal(false)} isDarkMode={isDarkMode} />}
    </div>
  );
}