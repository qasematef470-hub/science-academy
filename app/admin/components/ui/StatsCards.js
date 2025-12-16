'use client';
import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function StatsCards({ stats, isDarkMode }) {
  const theme = {
    card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        {/* Pass/Fail Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm ${theme.card}`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className={`font-bold text-lg ${theme.textMain}`}>نسب النجاح</h3>
                 <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{stats.title}</span>
            </div>
            <div className="h-56">
                 {stats.passData.every(d => d.value === 0) ? 
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">لا توجد بيانات</div> : 
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.passData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {stats.passData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <RechartsTooltip contentStyle={{backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                }
            </div>
        </div>

        {/* Grades Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm ${theme.card}`}>
             <div className="flex items-center justify-between mb-6">
                <h3 className={`font-bold text-lg ${theme.textMain}`}>توزيع التقديرات</h3>
            </div>
            <div className="h-56">
                {stats.gradeData.every(d => d.count === 0) ?
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">لا توجد بيانات</div> :
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.gradeData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                }
            </div>
        </div>
    </div>
  );
}