'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { markNotificationAsRead, markAllAsRead, deleteNotification } from '@/app/actions/notifications';
import Link from 'next/link';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState(null);
    const dropdownRef = useRef(null);

    // 1. التحقق من المستخدم الحالي
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) setUserId(user.uid);
            else setUserId(null);
        });
        return () => unsub();
    }, []);

    // 2. الاستماع للإشعارات لحظياً (Real-time)
    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, 'notifications'),
            where('recipientId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(20) // نجيب آخر 20 بس لتقليل التكلفة
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));

            // 🛡️ Filter duplicates to fix double-firing bug (React StrictMode / Network overlap)
            const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());

            setNotifications(uniqueData);
            setUnreadCount(uniqueData.filter(n => !n.read).length);
        });

        return () => {
            unsubscribe();
        };
    }, [userId]);

    // غلق القائمة عند الضغط خارجها
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id, link) => {
        await markNotificationAsRead(id);
        setIsOpen(false); // اختياري: نقفل القائمة ولا لأ
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead(userId);
    };

    // Helper: تنسيق الوقت
    const formatTime = (date) => {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds
        if (diff < 60) return 'الآن';
        if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
        return date.toLocaleDateString('ar-EG');
    };

    // Helper: أيقونة حسب النوع
    const getIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '🛑';
            case 'exam': return '📝';
            default: return '📢';
        }
    };

    if (!userId) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 🔔 زر الجرس */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            {/* 📜 القائمة المنسدلة */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 md:w-96 bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[100] overflow-hidden animate-fade-in origin-top-left">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-[#0f172a]">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">الإشعارات</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:text-blue-600 font-bold">
                                تحديد الكل كمقروء
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                <span className="text-4xl mb-2">🔕</span>
                                <p className="text-sm">لا توجد إشعارات جديدة</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition relative group ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 text-lg">{getIcon(n.type)}</div>
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-bold mb-1 ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {n.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                                                    {n.body}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-400">{formatTime(n.createdAt)}</span>
                                                    {n.link && (
                                                        <Link
                                                            href={n.link}
                                                            onClick={() => handleMarkRead(n.id)}
                                                            className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 font-bold"
                                                        >
                                                            عرض التفاصيل ⬅️
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* زر الحذف بيظهر بس لما تقف على العنصر */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                            className="absolute top-2 left-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                            title="حذف الإشعار"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}