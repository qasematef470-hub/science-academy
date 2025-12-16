'use server'

// 👇 1. ضفنا adminMessaging للاستيراد
import { adminDb, adminAuth, adminMessaging } from "@/lib/firebase-admin-config";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";

// ==========================================================
// 🔔 SEND NOTIFICATION (إرسال إشعار)
// ==========================================================

export async function sendNotification({ recipientId, title, body, type = 'info', link = '/' }) {
    try {
        if (!recipientId || !title) return { success: false, message: "بيانات ناقصة" };

        // أ. التخزين في الداتابيز (عشان الجرس الداخلي يشتغل)
        const notificationData = {
            recipientId,
            title,
            body,
            type,
            link,
            read: false,
            createdAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection('notifications').add(notificationData);

        // ب. الإرسال للموبايل/الكروم (Push Notification) - 🔥 الكود الجديد
        try {
            // بنجيب بيانات المستخدم عشان نشوف التوكنات بتاعته
            const userDoc = await adminDb.collection('users').doc(recipientId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // لو المستخدم عنده توكنات مسجلة (يعني وافق على الإشعارات)
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
                    
                    const messagePayload = {
                        notification: {
                            title: title,
                            body: body,
                        },
                        data: {
                            // الداتا دي عشان لما يدوس على الإشعار يفتح اللينك الصح
                            url: link || '/' 
                        },
                        tokens: userData.fcmTokens, // بنبعت لكل أجهزته (موبايل ولابتوب)
                    };

                    // الإرسال الفعلي
                    const response = await adminMessaging.sendEachForMulticast(messagePayload);
                    
                    // (اختياري) تنظيف التوكنات القديمة لو فشل الإرسال لبعضها
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                failedTokens.push(userData.fcmTokens[idx]);
                            }
                        });
                        // ممكن هنا نكتب كود يحذف التوكنات البايظة بس مش ضروري دلوقتي
                        console.log('List of stale tokens:', failedTokens);
                    }
                }
            }
        } catch (pushError) {
            // لو فشل البوش، مش مشكلة، المهم الداتابيز اتحفظت
            console.error("Push Notification Failed:", pushError);
        }

        return { success: true };
    } catch (error) {
        console.error("Notification Error:", error);
        return { success: false, message: error.message };
    }
}

// ==========================================================
// 📢 BROADCAST (إرسال لمجموعة طلاب)
// ==========================================================
export async function broadcastNotification({ filters, title, body, type, link }) {
    try {
        let query = adminDb.collection('users').where('role', '==', 'student');

        if (filters?.courseId) {
             // منطق الفلترة (متروك ليك حسب هيكلة الداتا)
        }
        
        // حالياً الدالة دي بترجع نجاح وهمي لحد ما تظبط اللوجيك بتاعها
        return { success: true, message: "تم التجهيز" };

    } catch (error) {
        return { success: false };
    }
}

// ==========================================================
// 👁️ MARK AS READ (تحديد كمقروء)
// ==========================================================
export async function markNotificationAsRead(notificationId) {
    try {
        await adminDb.collection('notifications').doc(notificationId).update({
            read: true
        });
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function markAllAsRead(userId) {
    try {
        const batch = adminDb.batch();
        const snapshot = await adminDb.collection('notifications')
            .where('recipientId', '==', userId)
            .where('read', '==', false)
            .get();

        if (snapshot.empty) return { success: true };

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

// ==========================================================
// 🗑️ DELETE NOTIFICATION (حذف)
// ==========================================================
export async function deleteNotification(notificationId) {
    try {
        await adminDb.collection('notifications').doc(notificationId).delete();
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}