const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function listAdmins() {
  console.log("🔍 جاري البحث عن الدكاترة...");
  const snapshot = await db.collection("users").where("role", "==", "admin").get();
  snapshot.forEach(doc => {
      console.log(`👤 الاسم: "${doc.data().name}"`);
  });
}
listAdmins();