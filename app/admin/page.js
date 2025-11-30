'use client';
import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// 🔥 تم تحديث الاستيراد ليشمل دوال الـ Settings الجديدة (Per Course)
import { 
    toggleUserLock, adminResetPassword, updateCourseStatus, toggleExamCodeVisibility, 
    toggleSpecialAccess, getLeaderboard, deleteStudentAccount,
    addAnnouncement, getAnnouncements, deleteAnnouncement,
    addMaterialToCourse, getCourseMaterials, deleteMaterialFromCourse , resetLeaderboard,
    getUniqueLectures,
    saveCourseSettings, 
    getCourseSettings   
} from '../actions';

// 📦 المكتبات
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboard() {
  const router = useRouter();
  
  // --- States ---
  const [adminData, setAdminData] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); 
  
  // Folders System (Students)
  const [viewMode, setViewMode] = useState('folders');
  const [selectedFolder, setSelectedFolder] = useState(null); 

  // Results System
  const [resultsViewMode, setResultsViewMode] = useState('courses'); 
  const [selectedResultCourse, setSelectedResultCourse] = useState(null); 
  const [selectedExamCode, setSelectedExamCode] = useState(null); 
  const [examVisibility, setExamVisibility] = useState({});

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [lbCourse, setLbCourse] = useState('');

  // 🔥 Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");

  // 🔥 Materials State
  const [materialsCourse, setMaterialsCourse] = useState("");
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ title: "", type: "pdf", link: "" });
  const [matLoading, setMatLoading] = useState(false);

  // Password States
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Data
  const [pendingStudents, setPendingStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedCourseForQ, setSelectedCourseForQ] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [qLoading, setQLoading] = useState(false);
  const [editMode, setEditMode] = useState(null); 
  const [results, setResults] = useState([]);
  const [cheaters, setCheaters] = useState([]);
  
  // Settings (Updated logic for Multi-Course)
  const [settings, setSettings] = useState({ 
      duration: 45, count: 20, examCode: '', allowReview: false,
      easyPercent: 30, mediumPercent: 50, hardPercent: 20,
      startDate: '', endDate: '',
      enableCertificate: false, minScorePercent: 90, 
      includedLectures: [] 
  });

  const [availableLectures, setAvailableLectures] = useState([]);
  const [settingsCourseSelector, setSettingsCourseSelector] = useState("");
  const [qLecture, setQLecture] = useState(''); 

  // 📊 Analytics State
  const [stats, setStats] = useState({ passData: [], gradeData: [], title: 'إحصائيات عامة (كل المواد)' });

  // 🔥 NEW STATE: Lecture View Navigation
  const [selectedLectureView, setSelectedLectureView] = useState(null);

  // Question Form
  const [questionText, setQuestionText] = useState('');
  const [qImage, setQImage] = useState('');
  const [qDifficulty, setQDifficulty] = useState('medium');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [options, setOptions] = useState([
    { text: "", isCorrect: true }, { text: "", isCorrect: false },
    { text: "", isCorrect: false }, { text: "", isCorrect: false }
  ]);

  // --- Load Admin Data ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            const data = userDoc.data();
            setAdminData(data);
            if (data.access && data.access.length > 0) await fetchMyCourses(data.access);
            loadAnnouncements(); 
        } else { router.push('/login'); }
      } catch(e) { console.error(e); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 Effect to Update Charts Dynamically
  useEffect(() => {
    if (results.length === 0) return;

    let filteredData = results;
    let chartTitle = "إحصائيات عامة (كل المواد)";

    if (activeTab === 'results' && resultsViewMode === 'list' && selectedExamCode && selectedResultCourse) {
        filteredData = results.filter(r => r.courseId === selectedResultCourse && (r.examCode || 'General') === selectedExamCode);
        const courseName = myCourses.find(c => c.id === selectedResultCourse)?.name || '';
        chartTitle = `إحصائيات ${courseName} - كود: ${selectedExamCode}`;
    }
    else if (activeTab === 'results' && resultsViewMode === 'codes' && selectedResultCourse) {
        filteredData = results.filter(r => r.courseId === selectedResultCourse);
        const courseName = myCourses.find(c => c.id === selectedResultCourse)?.name || '';
        chartTitle = `إحصائيات شاملة لمادة: ${courseName}`;
    }
    else {
        filteredData = results;
    }

    calculateAnalytics(filteredData, chartTitle);

  }, [results, activeTab, resultsViewMode, selectedResultCourse, selectedExamCode]); 

  // --- Fetch Functions ---
  const fetchMyCourses = async (courseIds) => {
    const coursesList = [];
    for (const id of courseIds) {
        const cDoc = await getDoc(doc(db, 'courses', id));
        if (cDoc.exists()) coursesList.push({ id: cDoc.id, ...cDoc.data() });
    }
    setMyCourses(coursesList);
    if(coursesList.length > 0) {
        setSelectedCourseForQ(coursesList[0].id);
        setLbCourse(coursesList[0].id);
        setMaterialsCourse(coursesList[0].id);
        // 🔥 Set initial course for settings
        setSettingsCourseSelector(coursesList[0].id);
    }
    fetchStudents(coursesList);
    if(coursesList.length > 0) fetchQuestions(coursesList[0].id);
    fetchResults();
    fetchCheaters();
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
                if (studentCourses.some(c => myCourseIds.includes(c.courseId) && c.status === 'pending')) pending.push(student);
            }
        });
        setPendingStudents(pending);
        setAllStudents(active);
    } catch (e) { console.log("Perms Error (Students):", e); }
  };

  const fetchQuestions = async (courseId) => {
    if(!courseId) return;
    setQLoading(true);
    const q = query(collection(db, 'questions_bank'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setQuestionsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setQLoading(false);
  };

  const fetchResults = async () => {
    try {
        const q = query(collection(db, "results"), orderBy("startTime", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setResults(data);

        const uniqueCodes = [...new Set(data.map(item => item.examCode || 'General'))];
        const visibilityMap = {};
        for (const code of uniqueCodes) {
            const docSnap = await getDoc(doc(db, "exam_settings", code));
            visibilityMap[code] = docSnap.exists() ? docSnap.data().isVisible : false;
        }
        setExamVisibility(visibilityMap);
    } catch (e) { console.log("Perms Error (Results):", e); }
  };

  const calculateAnalytics = (data, title) => {
      let passed = 0, failed = 0;
      let grades = { Excellent: 0, VeryGood: 0, Good: 0, Acceptable: 0, Fail: 0 };

      data.forEach(r => {
          if (r.total > 0) {
            const percent = (r.score / r.total) * 100;
            if (percent >= 50) passed++; else failed++;

            if (percent >= 85) grades.Excellent++;
            else if (percent >= 75) grades.VeryGood++;
            else if (percent >= 65) grades.Good++;
            else if (percent >= 50) grades.Acceptable++;
            else grades.Fail++;
          }
      });

      setStats({
          title: title, 
          passData: [
              { name: 'ناجح', value: passed, color: '#10B981' },
              { name: 'راسب', value: failed, color: '#EF4444' }
          ],
          gradeData: [
              { name: 'امتياز', count: grades.Excellent },
              { name: 'جيد جداً', count: grades.VeryGood },
              { name: 'جيد', count: grades.Good },
              { name: 'مقبول', count: grades.Acceptable },
              { name: 'ضعيف', count: grades.Fail }
          ]
      });
  };

  const fetchCheaters = async () => {
    const q = query(collection(db, "cheating_logs"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    setCheaters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // 🔥🔥🔥🔥 UPDATED: Fetch Settings per Course 🔥🔥🔥🔥
  const fetchSettings = async (courseId) => {
    if(!courseId) return;

    // 1. Fetch Lectures (existing logic)
    const lectureRes = await getUniqueLectures(courseId);
    if(lectureRes.success) setAvailableLectures(lectureRes.data);
    else setAvailableLectures([]);

    // 2. Fetch Config (NEW Server Action Logic)
    const configRes = await getCourseSettings(courseId);
    if (configRes.success && configRes.data) {
        const d = configRes.data;
        setSettings({ 
            duration: d.examDuration || 45, 
            count: d.questionCount || 20, 
            examCode: d.examCode || '',
            allowReview: d.allowReview || false,
            easyPercent: d.easyPercent || 30,
            mediumPercent: d.mediumPercent || 50,
            hardPercent: d.hardPercent || 20,
            startDate: d.startDate || '',
            endDate: d.endDate || '',
            enableCertificate: d.enableCertificate || false,
            minScorePercent: d.minScorePercent || 90,
            includedLectures: d.includedLectures || []
        });
    } else {
        // Fallback: إعدادات افتراضية لو المادة دي ملهاش إعدادات لسه
        setSettings({ 
            duration: 45, count: 20, examCode: '', allowReview: false,
            easyPercent: 30, mediumPercent: 50, hardPercent: 20,
            startDate: '', endDate: '',
            enableCertificate: false, minScorePercent: 90, 
            includedLectures: [] 
        });
    }
  };

  // 🔥 Fetch Leaderboard
  const handleFetchLeaderboard = async () => {
    if (!lbCourse) return;
    setLoading(true);
    const res = await getLeaderboard(lbCourse);
    if (res.success) setLeaderboardData(res.data);
    setLoading(false);
  };
  
  const handleResetLeaderboard = async () => {
      if (!lbCourse) return alert("اختر المادة أولاً");
      if (!confirm("⚠️ تحذير هام!\nهل أنت متأكد من حذف جميع نتائج هذه المادة؟\nسيتم تصفير لوحة الشرف ولن يمكن استرجاع البيانات.")) return;
      if (!confirm("تأكيد نهائي: هل تريد تصفير النتائج فعلاً؟")) return;

      const res = await resetLeaderboard(lbCourse);
      if (res.success) {
          alert(res.message);
          handleFetchLeaderboard(); 
      } else {
          alert("❌ حدث خطأ: " + res.message);
      }
  };

  // 🔥 Announcements Logic
  const loadAnnouncements = async () => {
      const res = await getAnnouncements();
      if(res.success) setAnnouncements(res.data);
  };
  const handlePostAnnouncement = async () => {
      if(!newAnnouncement) return;
      await addAnnouncement(newAnnouncement);
      setNewAnnouncement("");
      loadAnnouncements();
  };
  const handleDeleteAnnouncement = async (id) => {
      if(confirm("حذف الإعلان؟")) {
          await deleteAnnouncement(id);
          loadAnnouncements();
      }
  };

  // 🔥 Materials Logic
  const loadMaterials = async () => {
      if(!materialsCourse) return;
      setMatLoading(true);
      const res = await getCourseMaterials(materialsCourse);
      if(res.success) setCourseMaterials(res.data);
      setMatLoading(false);
  };
  
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
          alert("✅ تم رفع الصورة بنجاح"); 
      }
    } catch (e) { alert("فشل الرفع"); } 
    finally { setUploadingImage(false); }
  };

  const handleAddMaterial = async (e) => {
      e.preventDefault();
      if(!materialForm.title || !materialForm.link) return alert("املأ جميع الحقول");
      await addMaterialToCourse(materialsCourse, materialForm);
      setMaterialForm({ title: "", type: "pdf", link: "" });
      alert("✅ تم إضافة المحتوى");
      loadMaterials();
  };

  const handleDeleteMaterial = async (item) => {
      if(confirm("حذف المحتوى؟")) {
          await deleteMaterialFromCourse(materialsCourse, item);
          loadMaterials();
      }
  };

  // 🔥 Effect Updates: Trigger fetchSettings when Tab or Course Changes
  useEffect(() => {
    if (activeTab === 'leaderboard') handleFetchLeaderboard();
    if (activeTab === 'materials') loadMaterials();
    if (activeTab === 'settings' && settingsCourseSelector) {
        fetchSettings(settingsCourseSelector);
    }
  }, [activeTab, lbCourse, materialsCourse, settingsCourseSelector]);


  // --- Helpers ---
  const getDeviceType = (userAgent) => {
      if (!userAgent) return "❓";
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(userAgent)) return "📱 موبايل";
      return "💻 كمبيوتر";
  };

  const getFilteredStudents = () => {
      if (!selectedFolder) return [];
      return allStudents.filter(student => 
          student.enrolledCourses?.some(c => c.courseId === selectedFolder && (c.status === 'active' || c.status === 'banned'))
      );
  };

  const getResultsByCourse = (courseId) => {
      return results.filter(r => r.courseId === courseId);
  };

  const getExamCodesForCourse = (courseId) => {
      const courseResults = getResultsByCourse(courseId);
      return [...new Set(courseResults.map(r => r.examCode || 'General'))];
  };

  const formatFullTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp.seconds * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
  };

  const handleExportExcel = () => {
    if (!selectedResultCourse) return alert("اختر المادة أولاً");
    const dataToExport = getResultsByCourse(selectedResultCourse)
        .filter(r => (r.examCode || 'General') === (selectedExamCode || 'General')) 
        .map(r => ({
            "الاسم": r.studentName,
            "المادة": myCourses.find(c => c.id === r.courseId)?.name || r.courseId,
            "الكود": r.examCode || 'General',
            "الدرجة": r.score,
            "المجموع": r.total,
            "النسبة": ((r.score/r.total)*100).toFixed(1) + "%",
            "الوقت المستغرق": r.timeTaken,
            "الحالة": r.status,
            "الجهاز": getDeviceType(r.deviceInfo),
            "التاريخ": r.startTime ? new Date(r.startTime.seconds * 1000).toLocaleDateString('ar-EG') : '-'
        }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النتائج");
    XLSX.writeFile(wb, `Results_${selectedExamCode || 'General'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // --- Actions ---
  const handleToggleReview = async () => {
      const newState = !settings.allowReview;
      setSettings(prev => ({ ...prev, allowReview: newState }));
  };

  const handleVisibilityToggle = async (e, code) => {
      e.stopPropagation();
      const newState = !examVisibility[code];
      setExamVisibility(prev => ({ ...prev, [code]: newState }));
      await toggleExamCodeVisibility(code, newState);
  };

  const handleCourseAction = async (uid, courseId, action) => {
    if (!confirm("تأكيد العملية؟")) return;
    const res = await updateCourseStatus(uid, courseId, action);
    if (res.success) fetchStudents(myCourses);
  };

  const handleRemoveFromCourse = async (uid) => {
    if (!selectedFolder) return;
    if (!confirm("⚠️ هل تريد إلغاء اشتراك الطالب في هذه المادة فقط؟\n(لن يتم حذف حسابه)")) return;
    const res = await updateCourseStatus(uid, selectedFolder, 'rejected');
    if (res.success) {
        alert("✅ تم إلغاء الاشتراك في المادة");
        fetchStudents(myCourses);
    } else {
        alert("❌ فشل العملية");
    }
  };

  const handleDeleteAccount = async (uid) => {
    if (!confirm("⚠️ تحذير خطير!\nسيتم حذف حساب الطالب نهائياً من المنصة بالكامل.\nهل أنت متأكد؟")) return;
    const res = await deleteStudentAccount(uid);
    if (res.success) {
        alert("✅ تم حذف الحساب نهائياً");
        fetchStudents(myCourses);
    } else {
        alert("❌ فشل الحذف: " + res.message);
    }
  };

  const handleLockToggle = async (student) => {
    if (!confirm(student.isLocked ? "هل أنت متأكد من فك تجميد الحساب؟" : "هل أنت متأكد من تجميد الحساب بالكامل؟")) return;
    const res = await toggleUserLock(student.uid, !student.isLocked);
    if (res.success) fetchStudents(myCourses);
  };

  const handleSpecialAccess = async (uid) => {
    if (!selectedFolder) return alert("اختر المادة أولاً");
    if (!confirm("منح الطالب استثناء للدخول (تجاوز الوقت/التكرار)؟\nسيتم استهلاك الاستثناء مرة واحدة.")) return;
    const res = await toggleSpecialAccess(uid, selectedFolder, true);
    if (res.success) alert("✅ تم منح الاستثناء بنجاح");
    else alert("❌ فشل العملية");
  };

  const handlePasswordReset = async (uid) => {
    const p = prompt("كلمة المرور الجديدة:");
    if (!p) return;
    const res = await adminResetPassword(uid, p);
    if (res.success) alert(res.message);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=704bf9cb613e81494745109ea367cf1e`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) { setQImage(data.data.url); alert("✅ الصورة جاهزة"); }
    } catch (e) { alert("فشل الرفع"); } 
    finally { setUploadingImage(false); }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if(!selectedCourseForQ) return alert("اختر المادة");
    try {
        const qData = {
            courseId: selectedCourseForQ,
            question: questionText,
            image: qImage,
            difficulty: qDifficulty, 
            options: options,
            lecture: qLecture, 
            createdAt: serverTimestamp()
        };
        if (editMode) {
            await setDoc(doc(db, "questions_bank", editMode), qData, { merge: true });
            setEditMode(null);
        } else {
            await addDoc(collection(db, "questions_bank"), qData);
        }
        setQuestionText(""); setQImage(""); setQDifficulty('medium'); setQLecture(""); 
        setOptions([{text:"",isCorrect:true},{text:"",isCorrect:false},{text:"",isCorrect:false},{text:"",isCorrect:false}]);
        fetchQuestions(selectedCourseForQ);
        alert("✅ تم الحفظ");
    } catch (e) { alert("خطأ"); }
  };

  const handleDeleteQuestion = async (id) => {
    if(confirm("حذف؟")) {
        await deleteDoc(doc(db, "questions_bank", id));
        fetchQuestions(selectedCourseForQ);
    }
  };

  const handleEditClick = (q) => {
    setEditMode(q.id);
    setQuestionText(q.question);
    setQImage(q.image || "");
    setQDifficulty(q.difficulty || 'medium');
    setQLecture(q.lecture || ""); 
    setOptions(q.options);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🔥 Toggle Lecture
  const toggleLectureSelection = (lecture) => {
    setSettings(prev => {
        const current = prev.includedLectures || []; 
        if (current.includes(lecture)) {
            return { ...prev, includedLectures: current.filter(l => l !== lecture) };
        } else {
            return { ...prev, includedLectures: [...current, lecture] };
        }
    });
  };

  // 🔥🔥🔥🔥 UPDATED: Save Settings per Course 🔥🔥🔥🔥
  const saveSettings = async () => {
    const total = Number(settings.easyPercent) + Number(settings.mediumPercent) + Number(settings.hardPercent);
    if (total !== 100) return alert(`⚠️ مجموع النسب لازم يكون 100% (المجموع الحالي: ${total}%)`);

    if(!settingsCourseSelector) return alert("الرجاء اختيار المادة أولاً.");

    // استخدم دالة الـ Server Action الجديدة
    const res = await saveCourseSettings(settingsCourseSelector, { 
        examDuration: Number(settings.duration), 
        questionCount: Number(settings.count),
        examCode: settings.examCode,
        allowReview: settings.allowReview,
        easyPercent: Number(settings.easyPercent),
        mediumPercent: Number(settings.mediumPercent),
        hardPercent: Number(settings.hardPercent),
        startDate: settings.startDate,
        endDate: settings.endDate,
        enableCertificate: settings.enableCertificate,
        minScorePercent: Number(settings.minScorePercent),
        includedLectures: settings.includedLectures || [] 
    });

    if (res.success) {
        alert("✅ تم حفظ إعدادات المادة بنجاح");
    } else {
        alert("❌ حدث خطأ أثناء الحفظ");
    }
  };

  const deleteResult = async (id) => {
    if(confirm("حذف؟")) { await deleteDoc(doc(db, "results", id)); fetchResults(); }
  };

  const handleChangeMyPassword = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    
    const user = auth.currentUser;
    if (!user || !user.email) {
        alert("حدث خطأ في الجلسة، يرجى إعادة تسجيل الدخول.");
        setPassLoading(false);
        return;
    }

    const credential = EmailAuthProvider.credential(user.email, currentPass);
    
    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);
        alert("✅ تم تغيير كلمة المرور بنجاح");
        setShowPassModal(false); setCurrentPass(""); setNewPass("");
    } catch (error) { 
        console.error(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("❌ كلمة المرور الحالية غير صحيحة.");
        } else if (error.code === 'auth/weak-password') {
            alert("⚠️ كلمة المرور ضعيفة جداً!\nيجب أن تتكون من 6 أحرف أو أرقام على الأقل.");
        } else {
            alert("❌ حدث خطأ: " + error.message); 
        }
    } finally { 
        setPassLoading(false); 
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white dir-rtl">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-gray-100 dir-rtl font-sans relative overflow-x-hidden" dir="rtl">
      
     <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] opacity-40"></div>
     </div>

      <header className="bg-white/5 backdrop-blur-xl sticky top-0 z-50 border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">A</div>
                <div>
                    <h1 className="font-bold text-lg leading-tight text-white">{adminData?.name}</h1>
                    <p className="text-xs text-gray-400 font-bold">Admin Panel</p>
                </div>
            </div>
            <div className="flex items-center gap-3"> 
                <button onClick={() => setShowPassModal(true)} className="bg-white/5 hover:bg-white/10 text-blue-400 px-4 py-2 rounded-xl font-bold text-xs border border-white/10 transition-all">تغيير الباسورد 🔑</button>
                <button onClick={() => signOut(auth)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-bold text-xs border border-red-500/20 transition-all">خروج 👋</button>
            </div>
        </div>
      </header>

      {showPassModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in p-4">
            <div className="bg-[#131B2E] border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <h3 className="text-xl font-black mb-6 text-white text-center">تغيير كلمة المرور</h3>
                <form onSubmit={handleChangeMyPassword} className="space-y-4">
                    <div className="relative">
                        <input 
                            type={showCurrentPass ? "text" : "password"} 
                            placeholder="كلمة المرور الحالية" 
                            required 
                            className="w-full p-4 bg-black/30 border border-white/10 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition-all pl-12" 
                            value={currentPass} 
                            onChange={e=>setCurrentPass(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xl">
                            {showCurrentPass ? '👁️‍🗨️' : '👁️'}
                        </button>
                    </div>

                    <div className="relative">
                        <input 
                            type={showNewPass ? "text" : "password"} 
                            placeholder="كلمة المرور الجديدة" 
                            required 
                            className="w-full p-4 bg-black/30 border border-white/10 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition-all pl-12" 
                            value={newPass} 
                            onChange={e=>setNewPass(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xl">
                            {showNewPass ? '👁️‍🗨️' : '👁️'}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={passLoading} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all">{passLoading ? 'جاري...' : 'تأكيد'}</button>
                        <button type="button" onClick={() => setShowPassModal(false)} className="px-6 bg-white/5 text-gray-300 rounded-xl font-bold hover:bg-white/10">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* 📊 Dashboard Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in">
            <div className="bg-[#131B2E]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    📈 نسب النجاح 
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">
                        {stats.title}
                    </span>
                </h3>
                <div className="h-48 w-full">
                    {stats.passData.every(d => d.value === 0) ? 
                        <div className="flex items-center justify-center h-full text-gray-500 text-xs">لا توجد بيانات لهذا الاختيار</div> 
                    : 
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.passData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                {stats.passData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <RechartsTooltip contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px'}} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    }
                </div>
            </div>
            <div className="bg-[#131B2E]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg">
                <h3 className="font-bold text-white mb-4">📊 توزيع التقديرات</h3>
                <div className="h-48 w-full">
                    {stats.gradeData.every(d => d.count === 0) ?
                        <div className="flex items-center justify-center h-full text-gray-500 text-xs">لا توجد بيانات لهذا الاختيار</div>
                    :
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.gradeData}>
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={10} />
                            <YAxis stroke="#6B7280" fontSize={10} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#000', border: 'none', borderRadius: '8px'}} />
                            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                    }
                </div>
            </div>
        </div>

        <div className="flex justify-center flex-wrap gap-4 mb-10">
            {[
                { id: 'students', label: 'الطلاب', icon: '👨‍🎓' },
                { id: 'questions', label: 'بنك الأسئلة', icon: '📚' },
                { id: 'materials', label: 'المحتوى', icon: '📚' }, 
                { id: 'announcements', label: 'الإعلانات', icon: '📢' }, 
                { id: 'results', label: 'النتائج', icon: '📊' },
                { id: 'leaderboard', label: 'لوحة الشرف', icon: '🏆' }, 
                { id: 'settings', label: 'الإعدادات', icon: '⚙️' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${activeTab === tab.id ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                    <span className="text-lg">{tab.icon}</span> {tab.label}
                    {tab.id === 'students' && pendingStudents.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-2 shadow-sm animate-pulse">{pendingStudents.length}</span>}
                </button>
            ))}
        </div>

        {/* 🔥 TAB: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="bg-[#131B2E] p-6 rounded-3xl border border-white/10">
                    <h3 className="font-bold text-white mb-4">📢 إضافة إعلان جديد</h3>
                    <div className="flex gap-2">
                        <input type="text" placeholder="اكتب الخبر العاجل هنا..." className="flex-1 p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500" value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} />
                        <button onClick={handlePostAnnouncement} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold">نشر</button>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {announcements.map(ann => (
                        <div key={ann.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                            <span className="text-white font-medium">{ann.text}</span>
                            <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-400 hover:text-red-300 text-sm font-bold">حذف</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 🔥 TAB: MATERIALS */}
        {activeTab === 'materials' && (
            <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
                <div className="lg:col-span-1">
                    <div className="bg-[#131B2E] p-6 rounded-3xl border border-white/10 sticky top-24">
                        <h3 className="font-bold text-white mb-6">➕ إضافة محتوى</h3>
                        <div className="space-y-4">
                            <select className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none" value={materialsCourse} onChange={e => setMaterialsCourse(e.target.value)}>
                                {myCourses.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
                            </select>
                            
                            <input type="text" placeholder="عنوان الدرس / الملف" className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} />
                            
                            <select className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none" value={materialForm.type} onChange={e => setMaterialForm({...materialForm, type: e.target.value})}>
                                <option value="pdf" className="text-black">📄 ملف PDF / Drive</option>
                                <option value="video" className="text-black">🎥 فيديو (YouTube)</option>
                                <option value="image" className="text-black">🖼️ صورة (مذكرة/ورق)</option>
                            </select>

                            {/* Link Input or Upload Button based on Type */}
                            {materialForm.type === 'image' ? (
                                <div className="relative">
                                    <input type="file" id="matFile" accept="image/*" onChange={handleMaterialImageUpload} className="hidden" />
                                    <label htmlFor="matFile" className="w-full p-3 bg-white/5 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition text-xs text-gray-400 font-bold">
                                        <span>{uploadingImage ? 'جاري الرفع...' : materialForm.link ? '✅ تم رفع الصورة' : '📷 رفع صورة المذكرة'}</span>
                                    </label>
                                </div>
                            ) : (
                                <input type="text" placeholder="رابط الملف (Drive / YouTube)" className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 dir-ltr" value={materialForm.link} onChange={e => setMaterialForm({...materialForm, link: e.target.value})} />
                            )}

                            <button onClick={handleAddMaterial} disabled={uploadingImage} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold">إضافة</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <h3 className="font-bold text-white mb-6 text-xl">📚 مكتبة: {myCourses.find(c => c.id === materialsCourse)?.name}</h3>
                    {matLoading ? <p className="text-gray-500">جاري التحميل...</p> : (
                        <div className="space-y-3">
                            {courseMaterials.length === 0 ? <p className="text-gray-500 text-center py-10 border border-dashed border-white/10 rounded-xl">لا يوجد محتوى لهذه المادة.</p> :
                            courseMaterials.map((item, idx) => (
                                <div key={idx} className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-blue-500/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl">{item.type === 'video' ? '🎥' : item.type === 'image' ? '🖼️' : '📄'}</div>
                                        <div>
                                            <div className="font-bold text-white">{item.title}</div>
                                            <a href={item.link} target="_blank" className="text-xs text-blue-400 hover:underline truncate block max-w-[200px]">{item.link}</a>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteMaterial(item)} className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white">حذف</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ... (Students, Questions, Results, Leaderboard) ... */}
        {activeTab === 'students' && (
            <div className="space-y-8 animate-fade-in">
                {pendingStudents.length > 0 && (
                <section className="bg-yellow-500/5 border border-yellow-500/20 p-6 rounded-3xl">
                    <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-yellow-400">📋 طلبات جديدة ({pendingStudents.length})</h3>
                    <div className="grid gap-4">
                        {pendingStudents.map(student => (
                            <div key={student.uid} className="bg-black/20 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold">{student.name[0]}</div>
                                    <div>
                                        <div className="font-bold text-white">{student.name}</div>
                                        <div className="text-xs text-gray-400 font-mono">{student.email}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {student.enrolledCourses.filter(c => myCourses.some(mc => mc.id === c.courseId) && c.status === 'pending').map(c => (
                                        <div key={c.courseId} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                            <span className="text-xs font-bold text-gray-300">{myCourses.find(mc => mc.id === c.courseId)?.name}</span>
                                            <button onClick={() => handleCourseAction(student.uid, c.courseId, 'active')} className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition">✓</button>
                                            <button onClick={() => handleCourseAction(student.uid, c.courseId, 'rejected')} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center border border-red-500/20 transition">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                )}

                <section>
                    {viewMode === 'folders' ? (
                        <>
                            <h3 className="font-black text-2xl mb-6 text-white text-center">📂 المواد الدراسية</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {myCourses.map(course => (
                                    <div key={course.id} onClick={() => { setSelectedFolder(course.id); setViewMode('list'); }} className="group relative cursor-pointer">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                                        <div className="relative bg-[#131B2E]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl flex flex-col items-center gap-4 transition-transform duration-300 group-hover:-translate-y-2 group-hover:border-blue-500/50">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🎓</div>
                                            <h4 className="text-xl font-bold text-white mb-1 text-center">{course.name}</h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="animate-slide-up">
                            <div className="flex items-center gap-4 mb-8">
                                <button onClick={() => setViewMode('folders')} className="bg-white/5 hover:bg-white/10 border border-white/5 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold transition">🡪</button>
                                <h3 className="font-black text-2xl text-white">طلاب <span className="text-blue-400">{myCourses.find(c => c.id === selectedFolder)?.name}</span></h3>
                            </div>
                            <div className="grid gap-3">
                                {getFilteredStudents().length === 0 ? <div className="p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 text-gray-500 font-bold">لا يوجد طلاب.</div> : 
                                    getFilteredStudents().map(student => {
                                        const courseStatus = student.enrolledCourses.find(c => c.courseId === selectedFolder)?.status;
                                        const isCourseBanned = courseStatus === 'banned';

                                        return (
                                        <div key={student.uid} className={`bg-[#131B2E]/60 backdrop-blur-md border p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:bg-white/5 ${isCourseBanned ? 'border-red-500/30' : 'border-white/5 hover:border-blue-500/30'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">{student.name[0]}</div>
                                                <div>
                                                    <div className="font-bold text-white text-lg flex items-center gap-2">
                                                        {student.name}
                                                        {isCourseBanned && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">🚫 محظور من المادة</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-mono flex items-center gap-2">{student.email} {student.isLocked && <span className="text-red-400 font-bold">| 🔒 حساب مجمد</span>}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                <button onClick={() => handleSpecialAccess(student.uid)} className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-white" title="استثناء (دخول في أي وقت)">🔓 استثناء</button>
                                                
                                                <button 
                                                    onClick={() => handleCourseAction(student.uid, selectedFolder, isCourseBanned ? 'active' : 'banned')} 
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isCourseBanned ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white'}`}
                                                >
                                                    {isCourseBanned ? '✅ فك حظر' : '🚫 حظر مادة'}
                                                </button>

                                                <button onClick={() => handleRemoveFromCourse(student.uid)} className="px-3 py-2 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-white" title="حذف من المادة فقط">📤 إلغاء اشتراك</button>

                                                <button onClick={() => handleDeleteAccount(student.uid)} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white" title="حذف الحساب نهائياً">💥 حذف نهائي</button>

                                                <button onClick={() => handleLockToggle(student)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10">{student.isLocked ? '🔒 فك تجميد' : '❄️ تجميد'}</button>
                                                
                                                <button onClick={() => handlePasswordReset(student.uid)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10">🔑 باسورد</button>
                                            </div>
                                        </div>
                                    )})
                                }
                            </div>
                        </div>
                    )}
                </section>
            </div>
        )}

        {/* ... (Existing Questions, Results Tabs - kept same logic) ... */}
        {activeTab === 'questions' && (
            <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
                {/* 🟢 العمود الأول: فورم إضافة السؤال */}
                <div className="lg:col-span-1">
                    <div className="bg-[#131B2E]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 sticky top-24 shadow-2xl">
                        <h3 className="font-black text-lg mb-6 text-white border-b border-white/10 pb-4">
                            {editMode ? 'تعديل سؤال' : 'إضافة سؤال جديد'}
                        </h3>
                        <div className="space-y-4">
                            <select className="w-full p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-white outline-none focus:border-blue-500 transition" value={selectedCourseForQ} onChange={(e) => { setSelectedCourseForQ(e.target.value); fetchQuestions(e.target.value); setSelectedLectureView(null); }}>
                                {myCourses.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
                            </select>
                            <form onSubmit={handleSaveQuestion} className="space-y-4">
                                <div className="relative">
                                    <input type="file" id="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    <label htmlFor="file" className="w-full p-3 bg-white/5 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition text-xs text-gray-400 font-bold"><span>📷 {qImage ? 'تم الرفع' : 'صورة'}</span></label>
                                </div>
                                <textarea required placeholder="السؤال..." className="w-full p-4 bg-black/20 border border-white/10 rounded-xl font-bold text-white h-24 focus:border-blue-500 outline-none resize-none transition" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
                                
                                {/* 🔥 خانة المحاضرة: هتتملي أوتوماتيك لما تدوس على الزرار الجديد */}
                                <div className="relative">
                                    <input type="text" placeholder="اسم المحاضرة / الدرس" className="w-full p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-sm text-white focus:border-blue-500 outline-none transition" value={qLecture} onChange={(e) => setQLecture(e.target.value)} />
                                    {qLecture && <span className="absolute left-3 top-3 text-[10px] text-green-400 font-bold">محدد ✅</span>}
                                </div>
                                
                                <input required placeholder="الإجابة الصحيحة ✅" className="w-full p-3 bg-green-500/10 border border-green-500/30 rounded-xl font-bold text-sm text-green-400 focus:border-green-500 outline-none transition" value={options[0].text} onChange={(e) => { const ops=[...options]; ops[0].text=e.target.value; setOptions(ops); }} />
                                {[1,2,3].map(i => <input key={i} required placeholder={`إجابة خطأ ${i}`} className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white focus:border-red-500/50 outline-none transition" value={options[i].text} onChange={(e) => { const ops=[...options]; ops[i].text=e.target.value; setOptions(ops); }} />)}
                                
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-2">مستوى الصعوبة</label>
                                    <div className="flex bg-black/20 p-1 rounded-xl">
                                        {['easy', 'medium', 'hard'].map(level => (
                                            <button key={level} onClick={() => setQDifficulty(level)} type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${qDifficulty === level ? (level === 'easy' ? 'bg-green-600 text-white' : level === 'medium' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white') : 'text-gray-500 hover:text-gray-300'}`}>
                                            {level === 'easy' ? 'سهل' : level === 'medium' ? 'متوسط' : 'صعب'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" disabled={uploadingImage} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">{editMode ? 'حفظ' : 'إضافة'}</button>
                                    {editMode && <button type="button" onClick={() => { setEditMode(null); setQuestionText(""); setQImage(""); }} className="px-4 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-bold text-sm">إلغاء</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* 🟢 العمود الثاني: عرض الأسئلة (فولدرات) */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xl text-white">
                            {selectedLectureView ? `📂 ${selectedLectureView}` : `بنك الأسئلة (${questionsList.length})`}
                        </h3>
                        <div className="flex gap-2">
                            {/* زرار الرجوع */}
                            {selectedLectureView && (
                                <button onClick={() => setSelectedLectureView(null)} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1 rounded-lg text-xs font-bold transition">
                                    🔙 رجوع
                                </button>
                            )}
                            <button onClick={() => fetchQuestions(selectedCourseForQ)} className="text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded-lg text-xs font-bold transition">تحديث 🔄</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {questionsList.length === 0 ? (
                            <div className="text-center p-10 border border-dashed border-white/10 rounded-3xl text-gray-500 font-bold">
                                لا توجد أسئلة في هذه المادة حتى الآن.
                            </div>
                        ) : (
                            <>
                                {/* 📂 عرض المجلدات (المحاضرات) */}
                                {!selectedLectureView ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                        {Object.entries(questionsList.reduce((groups, q) => {
                                            // 🔥 Trim: عشان نتجاهل المسافات الزيادة ونمنع تكرار الكروت
                                            const key = (q.lecture || "📌 أسئلة عامة").trim();
                                            if (!groups[key]) groups[key] = 0;
                                            groups[key]++;
                                            return groups;
                                        }, {})).map(([lectureName, count], idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => setSelectedLectureView(lectureName)}
                                                className="bg-[#131B2E] border border-white/10 p-6 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-white/5 transition-all group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-3xl">📁</span>
                                                        <div>
                                                            <h4 className="font-bold text-lg text-white group-hover:text-blue-400 transition">{lectureName}</h4>
                                                            <p className="text-xs text-gray-500 font-bold">{count} سؤال</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-gray-600 group-hover:text-white transition">🡺</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* 📝 عرض الأسئلة داخل المحاضرة المختارة */
                                    <div className="animate-slide-up space-y-4">
                                        
                                        {/* 🔥 الزرار الجديد: إضافة سؤال لهذه المحاضرة */}
                                        <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-blue-400">📝 إدارة: {selectedLectureView}</h4>
                                                <p className="text-[10px] text-gray-400">هل تريد إضافة سؤال جديد داخل هذا المجلد؟</p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setQLecture(selectedLectureView); // يملأ الخانة بالاسم
                                                    window.scrollTo({ top: 0, behavior: 'smooth' }); // يطلعك للفورم فوق
                                                }}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition"
                                            >
                                                ➕ إضافة سؤال هنا
                                            </button>
                                        </div>

                                        {questionsList.filter(q => (q.lecture || "📌 أسئلة عامة").trim() === selectedLectureView).map((q, idx) => (
                                            <div key={q.id} className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between gap-4 transition-all group">
                                                <div className="flex-1">
                                                    <div className="flex gap-2 mb-1">
                                                        <span className="bg-black/30 text-gray-400 px-2 py-1 rounded text-[10px] font-bold">#{idx + 1}</span>
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${q.difficulty === 'hard' ? 'text-red-400 bg-red-500/10' : q.difficulty === 'easy' ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                                                            {q.difficulty === 'hard' ? 'صعب' : q.difficulty === 'easy' ? 'سهل' : 'متوسط'}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-white text-base">{q.question}</span>
                                                    {q.image && <img src={q.image} alt="Q" className="mt-2 h-16 rounded-lg border border-white/10 object-cover" />}
                                                </div>
                                                <div className="flex gap-2 self-start opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditClick(q)} className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black flex items-center justify-center transition">✎</button>
                                                    <button onClick={() => handleDeleteQuestion(q.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition">🗑</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'results' && resultsViewMode === 'courses' && (
             <div className="animate-fade-in">
                <h3 className="font-black text-2xl mb-6 text-white text-center">📊 اختر المادة لعرض النتائج</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {myCourses.map(course => (
                        <div key={course.id} onClick={() => { setSelectedResultCourse(course.id); setResultsViewMode('codes'); }} className="group relative cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative bg-[#131B2E]/80 border border-white/10 p-8 rounded-3xl flex flex-col items-center gap-4 group-hover:-translate-y-2 transition-transform">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-3xl">🎓</div>
                                <h4 className="text-xl font-bold text-white">{course.name}</h4>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* ... (Previous Results Views: Codes, List) ... */}
        {activeTab === 'results' && resultsViewMode === 'codes' && (
             <div className="animate-slide-up">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setResultsViewMode('courses')} className="bg-white/5 px-4 py-2 rounded-xl text-white">🡪</button>
                    <h3 className="font-black text-2xl text-white">امتحانات مادة: <span className="text-blue-400">{myCourses.find(c=>c.id === selectedResultCourse)?.name}</span></h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {getExamCodesForCourse(selectedResultCourse).length === 0 ? <p className="text-gray-500 font-bold p-4">لا توجد امتحانات مسجلة لهذه المادة.</p> :
                    getExamCodesForCourse(selectedResultCourse).map(code => (
                        <div key={code} onClick={() => { setSelectedExamCode(code); setResultsViewMode('list'); }} className="bg-[#131B2E]/80 border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-4 cursor-pointer hover:border-green-500/50 transition relative">
                            <div className="text-3xl">📑</div>
                            <h4 className="text-xl font-bold text-white">{code}</h4>
                            <p className="text-xs text-gray-400 font-bold">{getResultsByCourse(selectedResultCourse).filter(r => (r.examCode || 'General') === code).length} طالب</p>
                            
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    onClick={(e) => handleVisibilityToggle(e, code)} 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${examVisibility[code] ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-black/40 text-gray-500 hover:bg-black/60'}`}
                                    title={examVisibility[code] ? "الإجابات ظاهرة للطلاب" : "الإجابات مخفية"}
                                >
                                    {examVisibility[code] ? '👁️' : '🔒'}
                                </button>
                            </div>
                            {examVisibility[code] && <div className="absolute bottom-2 text-[10px] text-blue-400 font-bold animate-pulse">متاح للمراجعة</div>}
                        </div>
                    ))}
                </div>
             </div>
        )}

        {activeTab === 'results' && resultsViewMode === 'list' && (
             <div className="animate-slide-up">
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setResultsViewMode('codes')} className="bg-white/5 px-4 py-2 rounded-xl text-white">🡪</button>
                        <h3 className="font-black text-2xl text-white">نتائج الكود: <span className="text-green-400">{selectedExamCode}</span></h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                            <span>📥</span> تصدير Excel
                        </button>
                        <button onClick={fetchResults} className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg text-xs font-bold">تحديث</button>
                    </div>
                </div>
                <div className="bg-[#131B2E]/60 rounded-3xl border border-white/5 overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-black/20 text-gray-400 font-bold text-xs"><tr><th className="p-5">الطالب</th><th className="p-5">البداية / النهاية</th><th className="p-5">المدة / الدرجة</th><th className="p-5">الحالة</th><th className="p-5">حذف</th></tr></thead>
                        <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                            {getResultsByCourse(selectedResultCourse).filter(r => (r.examCode || 'General') === selectedExamCode).map(res => (
                                <tr key={res.id} className="hover:bg-white/5">
                                    <td className="p-5"><div className="font-bold text-white">{res.studentName}</div><div className="text-[10px] text-gray-500">{getDeviceType(res.deviceInfo)}</div></td>
                                    <td className="p-5 text-xs font-mono text-gray-400">
                                        <div>🟢 {formatFullTime(res.startTime)}</div>
                                        <div>🔴 {formatFullTime(res.endTime || res.submittedAt)}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="font-black text-blue-400 text-lg">{res.score} / {res.total}</div>
                                        <div className="text-[10px] text-gray-500">⏱ {res.timeTaken}</div>
                                    </td>
                                    <td className="p-5"><span className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${res.status?.includes('Running') ? 'text-yellow-400 border-yellow-500/20' : res.status?.includes('غش') ? 'text-red-400 border-red-500/20' : 'text-green-400 border-green-500/20'}`}>{res.status}</span></td>
                                    <td className="p-5"><button onClick={() => deleteResult(res.id)} className="text-gray-600 hover:text-red-400">🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {activeTab === 'leaderboard' && (
            <div className="animate-slide-up">
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="font-black text-2xl text-white">🏆 لوحة الشرف</h3>
                    <select className="p-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm" value={lbCourse} onChange={(e) => setLbCourse(e.target.value)}>
                        {myCourses.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
                    </select>
                    {/* 🔥 زرار التصفير الجديد */}
                    <button onClick={handleResetLeaderboard} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all">
                        🗑️ تصفير النتائج
                    </button>
                </div>
                
                {leaderboardData.length === 0 ? (
                    <div className="p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 text-gray-500 font-bold">لا توجد بيانات للعرض حالياً.</div>
                ) : (
                    <div className="grid gap-4">
                        {leaderboardData.map((student, idx) => (
                            <div key={student.id} className="bg-[#131B2E]/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{student.name}</div>
                                        <div className="text-xs text-gray-400 font-mono">⏱ {student.timeTaken}</div>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-blue-400">{student.score} / {student.total}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* ================= TAB 5: SETTINGS (UPDATED) ================= */}
        {activeTab === 'settings' && (
            <div className="max-w-md mx-auto bg-[#131B2E]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl animate-scale-in">
                <h3 className="font-black text-2xl mb-8 text-white text-center">⚙️ إعدادات الامتحان</h3>
                
                {/* 🔥 Dropdown لاختيار المادة في الإعدادات */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-blue-400 mb-2">اختر المادة لتعديل إعداداتها:</label>
                    <select 
                        className="w-full p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl text-white font-bold outline-none focus:border-blue-500 transition"
                        value={settingsCourseSelector}
                        onChange={(e) => setSettingsCourseSelector(e.target.value)}
                    >
                        {myCourses.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
                    </select>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2">كود الامتحان (سري) 🔐</label>
                        <input type="text" placeholder="مثال: EXAM2025" className="w-full p-4 bg-black/30 border border-white/10 rounded-xl font-bold text-center text-xl text-yellow-400 focus:border-yellow-500 outline-none tracking-widest transition" value={settings.examCode} onChange={(e) => setSettings({...settings, examCode: e.target.value})} />
                    
                        {/* 🔥 قائمة المحاضرات (مرتبطة بالمادة المختارة) */}
                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 mt-4">
                            <label className="block text-xs font-bold text-blue-300 mb-3">📚 تحديد المحاضرات المقررة للامتحان</label>
                            
                            <div className="max-h-40 overflow-y-auto space-y-2 p-1 border border-white/5 rounded-lg bg-black/20">
                                {availableLectures.length === 0 ? <p className="text-[10px] text-gray-500 text-center p-2">لا توجد محاضرات مسجلة لهذه المادة.</p> : 
                                    availableLectures.map((lec, idx) => (
                                        <label key={idx} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                                            <input type="checkbox" className="accent-blue-500 w-4 h-4" 
                                            checked={settings.includedLectures?.includes(lec) || false} 
                                            onChange={() => toggleLectureSelection(lec)}
                                            />
                                            <span className="text-xs font-bold text-gray-300">{lec}</span>
                                        </label>
                                    ))
                                }
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">* ملحوظة: إذا لم تختر أي محاضرة، سيشمل الامتحان جميع محاضرات المادة.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">📅 بداية الامتحان</label>
                            <input type="datetime-local" className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white text-xs font-bold focus:border-blue-500 outline-none" value={settings.startDate} onChange={(e) => setSettings({...settings, startDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">📅 نهاية الامتحان</label>
                            <input type="datetime-local" className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white text-xs font-bold focus:border-blue-500 outline-none" value={settings.endDate} onChange={(e) => setSettings({...settings, endDate: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">المدة (دقائق)</label>
                            <input type="number" className="w-full p-4 bg-black/30 border border-white/10 rounded-xl font-bold text-center text-xl text-white focus:border-blue-500 outline-none transition" value={settings.duration} onChange={(e) => setSettings({...settings, duration: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">عدد الأسئلة</label>
                            <input type="number" className="w-full p-4 bg-black/30 border border-white/10 rounded-xl font-bold text-center text-xl text-white focus:border-blue-500 outline-none transition" value={settings.count} onChange={(e) => setSettings({...settings, count: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-bold text-gray-300">توزيع الصعوبة (%)</label>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${Number(settings.easyPercent)+Number(settings.mediumPercent)+Number(settings.hardPercent) === 100 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                المجموع: {Number(settings.easyPercent)+Number(settings.mediumPercent)+Number(settings.hardPercent)}%
                            </span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-12 text-green-400 font-bold">سهل</span>
                                <input type="range" min="0" max="100" step="5" className="flex-1 accent-green-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" value={settings.easyPercent} onChange={(e) => setSettings({...settings, easyPercent: e.target.value})} />
                                <span className="text-xs font-mono w-8 text-right">{settings.easyPercent}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-12 text-yellow-400 font-bold">متوسط</span>
                                <input type="range" min="0" max="100" step="5" className="flex-1 accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" value={settings.mediumPercent} onChange={(e) => setSettings({...settings, mediumPercent: e.target.value})} />
                                <span className="text-xs font-mono w-8 text-right">{settings.mediumPercent}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-12 text-red-400 font-bold">صعب</span>
                                <input type="range" min="0" max="100" step="5" className="flex-1 accent-red-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" value={settings.hardPercent} onChange={(e) => setSettings({...settings, hardPercent: e.target.value})} />
                                <span className="text-xs font-mono w-8 text-right">{settings.hardPercent}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/10">
                            <div>
                                <h4 className="font-bold text-white text-sm">سماح بمراجعة الإجابات</h4>
                                <p className="text-[10px] text-gray-400">السماح للطالب برؤية أخطائه بعد الامتحان</p>
                            </div>
                            <button onClick={handleToggleReview} className={`w-12 h-6 rounded-full transition-all relative ${settings.allowReview ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.allowReview ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* 🔥 Certificate Toggle */}
                        <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-white text-sm">🎓 تفعيل شهادات التقدير</h4>
                                    <p className="text-[10px] text-gray-400">منح شهادة للطالب المتفوق تلقائياً</p>
                                </div>
                                <button onClick={() => setSettings({...settings, enableCertificate: !settings.enableCertificate})} className={`w-12 h-6 rounded-full transition-all relative ${settings.enableCertificate ? 'bg-blue-600' : 'bg-gray-600'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.enableCertificate ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {settings.enableCertificate && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">الحد الأدنى للنسبة (%) للحصول على الشهادة</label>
                                    <input type="number" className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm outline-none" value={settings.minScorePercent} onChange={(e) => setSettings({...settings, minScorePercent: e.target.value})} />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button onClick={saveSettings} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all mt-4">حفظ التعديلات</button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}