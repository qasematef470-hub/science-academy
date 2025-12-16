'use client';
import React, { useState } from 'react';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function PasswordModal({ onClose, isDarkMode }) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  const theme = {
    card: isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-slate-900',
    input: isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-slate-900',
    accent: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) return alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    
    setLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPass);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);
        alert("✅ تم تغيير كلمة المرور بنجاح");
        onClose();
    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert("❌ كلمة المرور الحالية غير صحيحة");
        } else {
            alert("❌ حدث خطأ: " + error.message);
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${theme.card}`}>
            <h3 className="font-bold text-xl mb-6 text-center">🔐 تغيير كلمة المرور</h3>
            <form onSubmit={handleChange} className="space-y-4">
                <div className="relative">
                    <input 
                        type={showCurrent ? "text" : "password"} 
                        placeholder="كلمة المرور الحالية" 
                        className={`w-full p-4 rounded-xl outline-none border focus:ring-2 focus:ring-indigo-500 transition ${theme.input}`} 
                        value={currentPass} 
                        onChange={e => setCurrentPass(e.target.value)} 
                        required
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute left-4 top-4 text-xs text-gray-500 font-bold">
                        {showCurrent ? 'إخفاء' : 'إظهار'}
                    </button>
                </div>
                
                <input 
                    type="password" 
                    placeholder="كلمة المرور الجديدة" 
                    className={`w-full p-4 rounded-xl outline-none border focus:ring-2 focus:ring-indigo-500 transition ${theme.input}`} 
                    value={newPass} 
                    onChange={e => setNewPass(e.target.value)} 
                    required
                />
                
                <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading} className={`flex-1 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition ${theme.accent}`}>
                            {loading ? 'جاري التحديث...' : 'تأكيد'}
                        </button>
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition">
                            إلغاء
                        </button>
                </div>
            </form>
        </div>
    </div>
  );
}