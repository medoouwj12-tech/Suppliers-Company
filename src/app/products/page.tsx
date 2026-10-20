'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import { Package, Plus, Search, Filter, Edit2, AlertTriangle, RefreshCw, X } from 'lucide-react';

export default function ProductsPage() {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form fields
  const [formData, setFormData] = React.useState({
    sku: '',
    name: '',
    brand: '',
    purchasePrice: 0,
    sellingPriceCarton: 0,
    sellingPriceUnit: 0,
    unitsPerCarton: 1,
    unitName: 'كيس',
    cartonName: 'كرتونة',
    minStockAlert: 10,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['products-list', search],
    queryFn: async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=50`);
      if (!res.ok) throw new Error('فشل جلب المنتجات');
      return res.json();
    },
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل إضافة المنتج');

      success('تم إضافة المنتج بنجاح!', resData.name);
      setShowAddModal(false);
      setFormData({
        sku: '',
        name: '',
        brand: '',
        purchasePrice: 0,
        sellingPriceCarton: 0,
        sellingPriceUnit: 0,
        unitsPerCarton: 1,
        unitName: 'وحدة',
        cartonName: 'كرتونة',
        minStockAlert: 10,
      });
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء إضافة المنتج');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="إدارة الأصناف والمنتجات الغذائية" breadcrumb="المنتجات">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الصنف أو الكود SKU أو الماركة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none"
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
              إضافة صنف جديد
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود الصنف (SKU)</TableHead>
                <TableHead>اسم الصنف</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead className="text-center">الوحدات بالكرتونة</TableHead>
                <TableHead>سعر الشراء</TableHead>
                <TableHead>سعر الكرتونة</TableHead>
                <TableHead>سعر الوحدة</TableHead>
                <TableHead className="text-center">إجمالي المخزون المتاح</TableHead>
                <TableHead>حالة الصنف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    جاري تحميل الأصناف...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    لا توجد أصناف مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{p.sku}</TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {p.name}
                      {p.brand && <span className="block text-xs text-slate-400 font-normal">{p.brand}</span>}
                    </TableCell>
                    <TableCell className="text-slate-600">{p.category?.name ?? 'عام'}</TableCell>
                    <TableCell className="font-mono text-center font-bold">
                      {p.unitsPerCarton} {p.unitName} / {p.cartonName}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">{formatCurrency(p.purchasePrice)}</TableCell>
                    <TableCell className="font-mono font-bold text-emerald-800">{formatCurrency(p.sellingPriceCarton)}</TableCell>
                    <TableCell className="font-mono text-slate-900">{formatCurrency(p.sellingPriceUnit)}</TableCell>
                    <TableCell className="text-center">
                      <div className="font-bold text-xs text-slate-900">
                        {p.totalStockCartons} {p.cartonName} و {p.totalStockRemainderUnits} {p.unitName}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        (إجمالي: {p.totalStockUnits} {p.unitName})
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.isLowStock ? (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          نقص مخزون
                        </Badge>
                      ) : (
                        <Badge variant="success">متوفر</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-[#103c47]" />
                إضافة منتج غذائي جديد
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كود الصنف (SKU) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: PASTA-400G"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العلامة التجارية</label>
                  <input
                    type="text"
                    placeholder="مثال: حواء، كريستال..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مكرونة حواء خواتم 400 جم"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none"
                />
              </div>

              {/* Carton & Unit Packing (Critical core feature) */}
              <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 space-y-2">
                <h4 className="text-xs font-bold text-blue-950">نظام التعبئة والكرتونة (أساسي للحسابات)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">عدد الوحدات بالكرتونة *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.unitsPerCarton}
                      onChange={(e) => setFormData({ ...formData, unitsPerCarton: parseInt(e.target.value) || 1 })}
                      className="w-full p-2 text-xs border border-blue-300 rounded-lg focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">اسم الوحدة المفردة</label>
                    <input
                      type="text"
                      placeholder="كيس / زجاجة / علبة"
                      value={formData.unitName}
                      onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                      className="w-full p-2 text-xs border border-blue-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">اسم العبوة الكبيرة</label>
                    <input
                      type="text"
                      placeholder="كرتونة / باكتة / شيكارة"
                      value={formData.cartonName}
                      onChange={(e) => setFormData({ ...formData, cartonName: e.target.value })}
                      className="w-full p-2 text-xs border border-blue-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سعر الشراء (للوحدة)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سعر بيع الكرتونة *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPriceCarton}
                    onChange={(e) => setFormData({ ...formData, sellingPriceCarton: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none font-mono font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سعر بيع الوحدة *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPriceUnit}
                    onChange={(e) => setFormData({ ...formData, sellingPriceUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حد التنبيه لنقص المخزون (بالوحدات)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockAlert}
                  onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button type="submit" loading={isSubmitting} className="flex-1">
                  حفظ الصنف
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
