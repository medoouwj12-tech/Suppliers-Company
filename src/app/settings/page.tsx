'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { User, Lock, Save, Eye, EyeOff, Building2, UserPlus } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [supplierUsername, setSupplierUsername] = React.useState('');
  const [supplierPassword, setSupplierPassword] = React.useState('');
  const [selectedSupplierId, setSelectedSupplierId] = React.useState('');
  const [isCreatingSupplierAccount, setIsCreatingSupplierAccount] = React.useState(false);

  const user = session?.user as any;

  const { data: suppliersData, isLoading: isLoadingSuppliers, isError: isSupplierLoadError, refetch: refetchSuppliers } = useQuery({
    queryKey: ['settings-supplier-accounts'],
    enabled: user?.role === 'ADMIN',
    queryFn: async () => {
      const response = await fetch('/api/suppliers?limit=100');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر تحميل الموردين');
      return body;
    },
  });

  const suppliers = suppliersData?.data ?? [];
  const activeSupplierCount = suppliers.filter((supplier: any) => supplier.status === 'ACTIVE').length;
  const suppliersWithoutAccount = suppliers.filter((supplier: any) => supplier.status === 'ACTIVE' && !supplier.user);
  const suppliersWithAccount = suppliers.filter((supplier: any) => supplier.user);

  const handleCreateSupplierAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSupplierAccount(true);
    try {
      const response = await fetch('/api/users/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          username: supplierUsername,
          password: supplierPassword,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر إنشاء حساب المورد');

      success('تم إنشاء حساب المورد بنجاح');
      setSelectedSupplierId('');
      setSupplierUsername('');
      setSupplierPassword('');
      await refetchSuppliers();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsCreatingSupplierAccount(false);
    }
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'مدير النظام';
      case 'REPRESENTATIVE': return 'مندوب مبيعات';
      case 'SUPPLIER': return 'مورد';
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
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-[#103c47]" />
            الملف الشخصي
          </h2>
          <div className="grid grid-cols-1 gap-5 text-[15px] sm:grid-cols-2">
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
              <span className="font-bold text-[#103c47]">{roleLabel(user?.role)}</span>
            </div>
          </div>
        </div>

        {/* Supplier Portal Accounts */}
        {user?.role === 'ADMIN' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-l from-emerald-50/80 to-white px-6 py-5">
              <h2 className="flex items-center gap-2.5 text-[18px] font-extrabold text-slate-900">
                <Building2 className="h-5 w-5 text-emerald-700" />
                حسابات بوابة الموردين
              </h2>
              <p className="mt-1.5 text-[14px] leading-7 text-slate-600">
                أنشئ لكل مورد اسم مستخدم وكلمة مرور لعرض فواتيره ومدفوعاته ورصيده الخاص.
              </p>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
              <form onSubmit={handleCreateSupplierAccount} className="space-y-4">
                <div>
                  <label htmlFor="supplier-account-supplier" className="mb-1.5 block text-[14px] font-bold text-slate-700">المورد</label>
                  {isSupplierLoadError && (
                    <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] leading-6 text-rose-700">
                      تعذر تحميل الموردين. تأكد من تحديث مخطط قاعدة البيانات ثم أعد تحميل الصفحة.
                    </p>
                  )}
                  <select
                    id="supplier-account-supplier"
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    disabled={isLoadingSuppliers || suppliersWithoutAccount.length === 0}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-50"
                  >
                    <option value="">{isLoadingSuppliers ? 'جارٍ تحميل الموردين…' : 'اختر المورد'}</option>
                    {suppliersWithoutAccount.map((supplier: any) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.code})</option>
                    ))}
                  </select>
                  {!isLoadingSuppliers && suppliersWithoutAccount.length === 0 && (
                    <p className="mt-2 text-[13px] leading-6 text-amber-700">
                      {suppliers.length === 0
                        ? 'أضف موردًا من صفحة الموردين أولًا، ثم أنشئ له حساب الدخول.'
                        : activeSupplierCount === 0
                          ? 'لا يوجد مورد نشط لإنشاء حساب له.'
                          : 'كل الموردين النشطين لديهم حساب دخول بالفعل.'}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="supplier-account-username" className="mb-1.5 block text-[14px] font-bold text-slate-700">اسم المستخدم</label>
                    <input
                      id="supplier-account-username"
                      required
                      minLength={3}
                      maxLength={32}
                      pattern="[A-Za-z0-9._-]+"
                      autoComplete="username"
                      value={supplierUsername}
                      onChange={(e) => setSupplierUsername(e.target.value)}
                      placeholder="مثال: alnoor_supplier"
                      className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[14px] outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                    />
                    <p className="mt-1 text-[12px] leading-6 text-slate-500">أحرف إنجليزية وأرقام و . _ - فقط.</p>
                  </div>
                  <div>
                    <label htmlFor="supplier-account-password" className="mb-1.5 block text-[14px] font-bold text-slate-700">كلمة المرور</label>
                    <input
                      id="supplier-account-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={supplierPassword}
                      onChange={(e) => setSupplierPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[14px] outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>
                <Button type="submit" loading={isCreatingSupplierAccount} disabled={suppliersWithoutAccount.length === 0} leftIcon={<UserPlus className="h-4 w-4" />}>
                  إنشاء حساب دخول للمورد
                </Button>
              </form>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-extrabold text-slate-800">حسابات الموردين الحالية</h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-slate-600 shadow-sm">{suppliersWithAccount.length}</span>
                </div>
                {isLoadingSuppliers ? (
                  <p className="py-5 text-[13px] text-slate-500">جارٍ تحميل الحسابات…</p>
                ) : suppliersWithAccount.length ? (
                  <ul className="space-y-2.5">
                    {suppliersWithAccount.map((supplier: any) => (
                      <li key={supplier.id} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Building2 className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold text-slate-800">{supplier.name}</span>
                          <span className="mt-0.5 block text-[12px] text-slate-500">المستخدم: <bdi className="font-mono">{supplier.user.username}</bdi></span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${supplier.status === 'ACTIVE' && supplier.user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {supplier.status === 'ACTIVE' && supplier.user.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-[13px] leading-7 text-slate-500">لم يتم إنشاء حسابات موردين بعد.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-[#103c47]" />
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
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none pl-10"
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
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none pl-10"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة *</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none pl-10"
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
