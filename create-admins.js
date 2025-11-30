const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

// التأكد من عدم تهيئة التطبيق مرتين
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

const admins = [
  {
    email: "qasem@science.academy.com",
    password: "password123", // 👈 غير الباسورد ده بعدين
    name: "م. القاسم عاطف شريف",
    role: "admin",
    access: ["math_physics", "math_biology", "computer_physics"] // موادك
  },
  {
    email: "taha@science.academy.com",
    password: "password123", // 👈 غير الباسورد
    name: "د. طه جميل",
    role: "admin",
    access: ["botany_physics", "botany_biology", "zoology_biology"] // مواده
  },
  {
    email: "abdulrahman@science.academy.com",
    password: "password123", // 👈 غير الباسورد
    name: "د. عبدالرحمن الحصري",
    role: "admin",
    access: ["chemistry_physics", "chemistry_biology"] // مواده
  }
];

async function createAdmins() {
  console.log("🚀 جاري إنشاء حسابات الدكاترة...");

  for (const adminData of admins) {
    try {
      // 1. إنشاء المستخدم في Auth (أو تحديثه لو موجود)
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(adminData.email);
        console.log(`✅ المستخدم ${adminData.name} موجود بالفعل، سيتم تحديث الصلاحيات.`);
      } catch (e) {
        userRecord = await auth.createUser({
          email: adminData.email,
          password: adminData.password,
          displayName: adminData.name
        });
        console.log(`🎉 تم إنشاء حساب جديد لـ: ${adminData.name}`);
      }

      // 2. ضبط البيانات في Firestore
      await db.collection("users").doc(userRecord.uid).set({
        name: adminData.name,
        email: adminData.email,
        role: "admin",
        access: adminData.access, // دي المصفوفة اللي هنستخدمها عشان نفلتر المواد
        createdAt: admin.firestore.Timestamp.now()
      }, { merge: true });

    } catch (error) {
      console.error(`❌ خطأ مع ${adminData.name}:`, error.message);
    }
  }
  console.log("🏁 تم الانتهاء!");
}

createAdmins();