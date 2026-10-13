'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import { Store, Plus, Search, FileText, AlertCircle, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';

export default function MerchantsPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    code: '',
    businessName: '',
    ownerName: '',
    phone: '',
    address: '',
    area: '',
    openingBalance: 0,
    creditLimit: 0,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['merchants-list', search],
    queryFn: async () => {
      const res = await fetch(`/api/merchants?search=${encodeURIComponent(search)}&limit=50`);
      if (!res.ok) throw new Error('فشل جلب التجار');
      return res.json();
    },
  });

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل إضافة التاجر');

      success('تم إضافة التاجر بنجاح!', resData.businessName);
      setShowAddModal(false);
      setFormData({
        code: '',
        businessName: '',
        ownerName: '',
        phone: '',
        address: '',
        area: '',
        openingBalance: 0,
        creditLimit: 0,
      });
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء إضافة التاجر');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="إدارة التجار والعملاء" breadcrumb="التجار">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم المحل أو المالك أو الهاتف أو المنطقة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isRefetching}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              تحديث
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              إضافة تاجر جديد
            </Button>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود التاجر</TableHead>
                <TableHead>اسم المحل / النشاط</TableHead>
                <TableHead>المالك / المسؤول</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>المندوب المخصص</TableHead>
                <TableHead className="text-left">الحد الائتماني</TableHead>
                <TableHead className="text-left">الرصيد المستحق (الديون)</TableHead>
                <TableHead className="text-center">كشف الحساب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    جاري تحميل التجار...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    لا يوجد تجار مطابقين للبحث
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{m.code}</TableCell>
                    <TableCell className="font-bold text-slate-900">{m.businessName}</TableCell>
                    <TableCell className="text-slate-600">{m.ownerName || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{m.phone || '—'}</TableCell>
                    <TableCell className="text-slate-600 text-xs">{m.area || '—'}</TableCell>
                    <TableCell className="text-slate-700 font-semibold">{m.representativeName}</TableCell>
                    <TableCell className="font-mono text-left text-slate-500">
                      {m.creditLimit ? formatCurrency(m.creditLimit) : 'بدون حد'}
                    </TableCell>
                    <TableCell className="font-mono text-left font-bold">
                      <span className={m.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {formatCurrency(m.currentBalance)}
                      </span>
                      {m.isOverCreditLimit && (
                        <span className="block text-[10px] text-rose-500 font-normal">
                          (تجاوز الحد الائتماني!)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/merchants/${m.id}/statement`}>
                        <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
                          كشف الحساب
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Merchant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-[#1e3a5f]" />
                إضافة تاجر أو محل جديد
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMerchant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم التجاري للمحل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سوبر ماركت السلام"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب المحل</label>
                  <input
                    type="text"
                    placeholder="اسم المسؤول..."
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="010..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة</label>
                  <input
                    type="text"
                    placeholder="مثال: المهندسين، شبرا..."
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي</label>
                  <input
                    type="text"
                    placeholder="الشارع ورقم العقار..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي (ج.م)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحد الائتماني (ج.م)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button type="submit" loading={isSubmitting} className="flex-1">
                  حفظ التاجر
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
