const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json"); // تأكد أن الملف ده موجود

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function migrateCourses() {
  console.log("🚀 جاري بدء عملية إصلاح الكورسات...");

  try {
    // 1. جلب كل الدكاترة (Admins)
    const usersSnap = await db.collection("users").where("role", "==", "admin").get();
    const instructorsMap = {};
    
    usersSnap.docs.forEach(doc => {
        const data = doc.data();
        // تخزين الاسم والـ ID
        instructorsMap[data.name.trim()] = doc.id;
    });

    // 🔥🔥🔥 التعديل الهام لإصلاح مشكلة م. القاسم 🔥🔥🔥
    // بنقول للسكريبت: لو لقيت كورس باسم "م. القاسم عاطف"، اربطه بحساب "د. القاسم عاطف"
    if (instructorsMap["د. القاسم عاطف"]) {
        instructorsMap["م. القاسم عاطف"] = instructorsMap["د. القاسم عاطف"];
        console.log("✅ تم التعرف على حساب: م. القاسم عاطف -> د. القاسم عاطف");
    }

    console.log(`👨‍🏫 تم العثور على ${Object.keys(instructorsMap).length} دكتور.`);

    // 2. جلب كل الكورسات وتحديث الناقص
    const coursesSnap = await db.collection("courses").get();
    const batch = db.batch();
    let updatedCount = 0;

    coursesSnap.docs.forEach(doc => {
        const course = doc.data();
        
        // لو الكورس مفيهوش ID للدكتور
        if (!course.instructorId) {
            const instructorName = course.instructorName ? course.instructorName.trim() : "";
            
            // البحث عن الـ ID باستخدام الاسم
            const foundId = instructorsMap[instructorName];

            if (foundId) {
                const docRef = db.collection("courses").doc(doc.id);
                batch.update(docRef, { 
                    instructorId: foundId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ تم ربط كورس: "${course.name}" بالدكتور: ${instructorName}`);
                updatedCount++;
            } else {
                console.log(`⚠️ كورس "${course.name}" باسم "${instructorName}" لم نجد له حساب مطابق.`);
            }
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`🎉 تم تحديث ${updatedCount} كورس بنجاح!`);
    } else {
        console.log("👍 جميع الكورسات سليمة، لا يوجد شيء لتحديثه.");
    }

  } catch (error) {
    console.error("❌ حدث خطأ:", error);
  }
}

migrateCourses();