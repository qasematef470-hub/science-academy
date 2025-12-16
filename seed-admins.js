const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

// تهيئة التطبيق
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// 👨‍🏫 بيانات الدكاترة (الأدمن)
const adminsList = [
  {
    name: "د. طه علي جميل",
    email: "taha@science-academy.com",
    phone: "01014946210",
    subjects: ["Botany", "Zoology", "Anatomy", "Physiology"],
    role: "admin"
  },
  {
    name: "د. عبدالرحمن علي فؤاد",
    email: "abdelrahman@science-academy.com",
    phone: "01064577084",
    subjects: ["Chemistry"],
    role: "admin"
  },
  {
    name: "م. القاسم عاطف شريف",
    email: "qasem@science-academy.com",
    phone: "01100588901",
    subjects: ["Math", "Computer"],
    role: "admin"
  }
];

const DEFAULT_PASSWORD = "123456789"; // 🔑 باسورد موحد للتجربة

async function seedAdmins() {
  console.log("🚀 جاري إنشاء حسابات الدكاترة...");

  for (const adminData of adminsList) {
    try {
      let userRecord;
      
      // 1. محاولة البحث عن المستخدم أولاً
      try {
        userRecord = await auth.getUserByEmail(adminData.email);
        console.log(`⚠️ المستخدم ${adminData.name} موجود بالفعل، جاري التحديث...`);
      } catch (e) {
        // لو مش موجود، ننشئه
        userRecord = await auth.createUser({
          email: adminData.email,
          password: DEFAULT_PASSWORD,
          displayName: adminData.name,
          emailVerified: true
        });
        console.log(`✅ تم إنشاء حساب: ${adminData.name}`);
      }

      // 2. إعطاء صلاحيات الأدمن (Custom Claims)
      await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });

      // 3. حفظ البيانات في Firestore (مع التخصص ورقم الهاتف)
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: adminData.name,
        email: adminData.email,
        phone: adminData.phone,
        role: "admin",
        subjects: adminData.subjects, // المواد اللي بيدرسها
        createdAt: new Date(),
        isLocked: false
      }, { merge: true });

    } catch (error) {
      console.error(`❌ فشل مع ${adminData.name}:`, error.message);
    }
  }

  console.log("---------------------------------------------------");
  console.log("🎉 تمت العملية بنجاح!");
  console.log(`🔑 كلمة المرور الموحدة للكل: ${DEFAULT_PASSWORD}`);
  console.log("⬇️ بيانات الدخول:");
  adminsList.forEach(a => console.log(`📧 ${a.name}: ${a.email}`));
}

seedAdmins();