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
import FloatingShape from '../components/ui/FloatingShape';
import AdminTools from './components/ui/AdminTools';

// --- Tabs ---
import StudentsTab from './components/tabs/StudentsTab';
import CoursesTab from './components/tabs/CoursesTab';
import QuestionsTab from './components/tabs/QuestionsTab';
import MaterialsTab from './components/tabs/MaterialsTab';
import AnnouncementsTab from './components/tabs/AnnouncementsTab';
import ResultsTab from './components/tabs/ResultsTab';
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

  // --- Questions State ---
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
        const token = await user.getIdToken(true);
        document.cookie = `firebaseToken=${token}; path=/; max-age=3600; SameSite=Lax`;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            setAdminData(userDoc.data());
            await loadInitialData(user.uid);
        } else { 
            router.push('/login'); 
        }
      } catch(e) { 
        signOut(auth);
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions' && questionsList.length === 0 && myCourses.length > 0) {
       const courseId = selectedCourseForQ || myCourses[0].id;
       fetchQuestions(courseId);
    }
  }, [activeTab]);

  // --- Data Loading Functions ---
  const loadInitialData = async (uid) => {
      const cRes = await getInstructorCourses(uid);
      if (cRes.success) {
          setMyCourses(cRes.data);
          if (cRes.data.length > 0) setSelectedCourseForQ(cRes.data[0].id);
          fetchStudents(cRes.data);
      }
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

  if (loading) return (
    <div className={`min-h-screen flex flex-col items-center justify-center dir-rtl ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`}>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans dir-rtl transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`} dir="rtl">
        {/* Background Animation (z-0) */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
            <FloatingShape type="flask" delay={0} duration={25} top="10%" left="5%" isDarkMode={isDarkMode} />
            <FloatingShape type="atom" delay={5} duration={30} top="30%" right="10%" isDarkMode={isDarkMode} />
        </div>

        {/* Sidebar (z-50) */}
        <div className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:w-20'} md:translate-x-0`}>
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isSidebarOpen={isSidebarOpen} 
                adminData={adminData} 
                pendingCount={pendingStudents.length}
                onCloseMobile={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
            />
        </div>

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
                {/* ... هنا التابات بتاعتك (StudentsTab, CoursesTab, الخ) ... */}
                {activeTab === 'students' && <StudentsTab allStudents={allStudents} pendingStudents={pendingStudents} myCourses={myCourses} searchTerm={searchTerm} onRefresh={() => fetchStudents(myCourses)} isDarkMode={isDarkMode} />}
                {activeTab === 'courses' && <CoursesTab courses={myCourses} onRefresh={() => loadInitialData(auth.currentUser.uid)} isDarkMode={isDarkMode} adminData={adminData} />}
                {activeTab === 'questions' && <QuestionsTab myCourses={myCourses} questionsList={questionsList} selectedCourseForQ={selectedCourseForQ} setSelectedCourseForQ={setSelectedCourseForQ} fetchQuestions={fetchQuestions} isDarkMode={isDarkMode} />}
                {activeTab === 'materials' && <MaterialsTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} myCourses={myCourses} onRefresh={async () => { const r = await getAnnouncements(); if(r.success) setAnnouncements(r.data); }} isDarkMode={isDarkMode} />}
                {activeTab === 'results' && <ResultsTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'settings' && <SettingsTab myCourses={myCourses} isDarkMode={isDarkMode} />}
                {activeTab === 'admin-tools' && <AdminTools myCourses={myCourses} onRefresh={(cId) => fetchQuestions(cId)} isDarkMode={isDarkMode} />}
            </div>
        </main>

        {/* 🛡️ إضافة الطبقة الخلفية للموبايل (دي اللي هتقفل السايدبار) */}
        {isSidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden transition-opacity duration-300"
                onClick={() => setIsSidebarOpen(false)}
            ></div>
        )}

        {/* Global Modals */}
        {showStructureModal && <StructureModal onClose={() => setShowStructureModal(false)} isDarkMode={isDarkMode} />}
        {showPassModal && <PasswordModal onClose={() => setShowPassModal(false)} isDarkMode={isDarkMode} />}
    </div>
  );
}