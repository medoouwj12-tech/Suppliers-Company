'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const user = session?.user as any;

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'مدير النظام';
      case 'REPRESENTATIVE': return 'مندوب مبيعات';
      default: return 'مستخدم';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toastError('كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');

      success('تم تغيير كلمة المرور بنجاح!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="الإعدادات والملف الشخصي" breadcrumb="الإعدادات">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-[#1e3a5f]" />
            الملف الشخصي
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs text-slate-400 mb-1">الاسم</span>
              <span className="font-bold text-slate-900">{user?.name ?? '—'}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 mb-1">اسم المستخدم</span>
              <span className="font-mono font-bold text-slate-900">{user?.username ?? '—'}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 mb-1">البريد الإلكتروني</span>
              <span className="text-slate-700">{user?.email ?? '—'}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 mb-1">الصلاحية</span>
              <span className="font-bold text-[#1e3a5f]">{roleLabel(user?.role)}</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-[#1e3a5f]" />
            تغيير كلمة المرور
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الحالية *</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none pl-10"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة *</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none pl-10"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة *</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none pl-10"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((p) => !p)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPasswords ? 'إخفاء' : 'إظهار'} كلمات المرور
            </button>

            <Button type="submit" loading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>
              حفظ كلمة المرور الجديدة
            </Button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
