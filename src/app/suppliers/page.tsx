'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Truck, Plus, CheckCircle2, RefreshCw, X, Store } from 'lucide-react';

export default function SuppliersPage() {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = React.useState<'suppliers' | 'purchases'>('suppliers');
  const [showAddSupplierModal, setShowAddSupplierModal] = React.useState(false);
  const [approvingPurchaseId, setApprovingPurchaseId] = React.useState<string | null>(null);

  // Form
  const [formData, setFormData] = React.useState({
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
    openingBalance: 0,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: suppliersData, isLoading: isSuppliersLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers');
      if (!res.ok) throw new Error('فشل جلب الموردين');
      return res.json();
    },
  });

  const { data: purchasesData, isLoading: isPurchasesLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ['purchases-list'],
    queryFn: async () => {
      const res = await fetch('/api/purchases');
      if (!res.ok) throw new Error('فشل جلب فواتير المشتريات');
      return res.json();
    },
    enabled: activeTab === 'purchases',
  });

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة المورد');

      success('تم إضافة المورد بنجاح!', data.name);
      setShowAddSupplierModal(false);
      setFormData({ name: '', contactPerson: '', phone: '', address: '', openingBalance: 0 });
      refetchSuppliers();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء إضافة المورد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePurchase = async (id: string) => {
    setApprovingPurchaseId(id);
    try {
      const res = await fetch(`/api/purchases/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل اعتماد فاتورة المشتريات');

      success('تم اعتماد فاتورة الشراء وتوريد البضاعة للمخزن بنجاح!');
      refetchPurchases();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء اعتماد الفاتورة');
    } finally {
      setApprovingPurchaseId(null);
    }
  };

  return (
    <AdminLayout title="إدارة المشتريات والموردين" breadcrumb="الموردون">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'suppliers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              قائمة الموردين
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'purchases' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              فواتير المشتريات والتوريد
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (activeTab === 'suppliers' ? refetchSuppliers() : refetchPurchases())}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              تحديث
            </Button>
            {activeTab === 'suppliers' && (
              <Button size="sm" onClick={() => setShowAddSupplierModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
                إضافة مورد جديد
              </Button>
            )}
          </div>
        </div>

        {/* Tab 1: Suppliers List */}
        {activeTab === 'suppliers' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>كود المورد</TableHead>
                  <TableHead>اسم شركة التوريد</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead className="text-left">إجمالي المشتريات</TableHead>
                  <TableHead className="text-left">المسدد للمورد</TableHead>
                  <TableHead className="text-left font-bold">الرصيد المستحق للمورد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSuppliersLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      جاري تحميل الموردين...
                    </TableCell>
                  </TableRow>
                ) : suppliersData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      لا يوجد موردون مسجلون بعد
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliersData?.data?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-bold text-blue-900">{s.code}</TableCell>
                      <TableCell className="font-bold text-slate-900">{s.name}</TableCell>
                      <TableCell className="text-slate-600">{s.contactPerson || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{s.phone || '—'}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{s.address || '—'}</TableCell>
                      <TableCell className="font-mono text-left font-bold text-slate-900">
                        {formatCurrency(s.totalPurchases)}
                      </TableCell>
                      <TableCell className="font-mono text-left font-bold text-emerald-700">
                        {formatCurrency(s.totalPaid)}
                      </TableCell>
                      <TableCell className="font-mono text-left font-black text-rose-700 text-sm">
                        {formatCurrency(s.currentBalance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 2: Purchases Invoices */}
        {activeTab === 'purchases' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المخزن المستلم</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الأصناف والكميات</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPurchasesLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      جاري تحميل فواتير الشراء...
                    </TableCell>
                  </TableRow>
                ) : purchasesData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      لا توجد فواتير شراء مسجلة بعد
                    </TableCell>
                  </TableRow>
                ) : (
                  purchasesData?.data?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-bold text-blue-900">{p.invoiceNo}</TableCell>
                      <TableCell className="font-bold text-slate-900">{p.supplier.name}</TableCell>
                      <TableCell className="text-slate-700">{p.warehouse.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{formatDateTime(p.invoiceDate)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {p.items.map((i: any) => (
                            <span key={i.id} className="block text-slate-700">
                              {i.product.name} ({i.quantity} {i.product.unitName})
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-left text-slate-900">
                        {formatCurrency(p.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'APPROVED' ? 'success' : 'warning'}>
                          {p.status === 'APPROVED' ? 'معتمدة ومورّدة' : 'مسودة'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {p.status === 'DRAFT' ? (
                          <Button
                            size="sm"
                            variant="success"
                            loading={approvingPurchaseId === p.id}
                            onClick={() => handleApprovePurchase(p.id)}
                            leftIcon={<CheckCircle2 className="h-4 w-4" />}
                          >
                            اعتماد وتوريد للمخزن
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">معتمدة</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#1e3a5f]" />
                إضافة مورد جديد
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم شركة التوريد / المصنع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة صافولا للأغذية"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم المندوب أو المدير..."
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان أو المصنع</label>
                <input
                  type="text"
                  placeholder="المدينة الصناعية..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي المستحق للمورد (ج.م)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button type="submit" loading={isSubmitting} className="flex-1">
                  حفظ المورد
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowAddSupplierModal(false)}>
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
