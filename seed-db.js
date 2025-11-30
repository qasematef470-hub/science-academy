const admin = require("firebase-admin");

// ⚠️⚠️ هام جداً: لازم تجيب ملف مفتاح الخدمة (Service Account Key) ⚠️⚠️
// 1. روح لـ Firebase Console -> Project Settings -> Service accounts
// 2. اضغط "Generate new private key"
// 3. حمل الملف وحطه في نفس الفولدر بتاع المشروع وسميه "service-account.json"
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// قائمة الموادا
const coursesData = [
  // --- د/ القاسم (رياضة وكمبيوتر) ---
  {
    id: "math_physics",
    name: "رياضيات (شعبة طبيعة)",
    section: "physics",
    instructorName: "م. القاسم عاطف"
  },
  {
    id: "math_biology",
    name: "رياضيات (شعبة بيولوجي)",
    section: "biology",
    instructorName: "م. القاسم عاطف"
  },
  {
    id: "computer_physics",
    name: "حاسب آلي (شعبة طبيعة)",
    section: "physics",
    instructorName: "م. القاسم عاطف"
  },

  // --- د/ عبدالرحمن (كيمياء) ---
  {
    id: "chemistry_physics",
    name: "كيمياء (شعبة طبيعة)",
    section: "physics",
    instructorName: "د. عبدالرحمن الحصري"
  },
  {
    id: "chemistry_biology",
    name: "كيمياء (شعبة بيولوجي)",
    section: "biology",
    instructorName: "د. عبدالرحمن الحصري"
  },

  // --- د/ طه (نبات وحيوان) ---
  {
    id: "botany_physics",
    name: "نبات (شعبة طبيعة)",
    section: "physics",
    instructorName: "د. طه جميل"
  },
  {
    id: "botany_biology",
    name: "نبات (شعبة بيولوجي)",
    section: "biology",
    instructorName: "د. طه جميل"
  },
  {
    id: "zoology_biology",
    name: "حيوان (شعبة بيولوجي)",
    section: "biology",
    instructorName: "د. طه جميل"
  }
  // (ملاحظة: zoology_physics مش موجودة حالياً حسب كلامك إنها ترم تاني)
];

async function seedCourses() {
  console.log("🚀 ببدأ عملية تأسيس المواد...");
  
  const batch = db.batch();

  coursesData.forEach((course) => {
    const docRef = db.collection("courses").doc(course.id);
    batch.set(docRef, {
      name: course.name,
      section: course.section,
      instructorName: course.instructorName,
      // إعدادات افتراضية لكل مادة
      settings: {
        examDuration: 45,
        questionCount: 20,
        isActive: false // الامتحان مقفول افتراضياً
      }
    });
  });

  await batch.commit();
  console.log("✅ تم إضافة المواد بنجاح لقاعدة البيانات!");
}

seedCourses().catch(console.error);