'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatDateTime } from '@/lib/utils';
import { Package, Plus, CheckCircle2, Clock, RefreshCw, X, AlertCircle } from 'lucide-react';

export default function DeliveryOrdersPage() {
  const { success, error: toastError } = useToast();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  // جلب أذونات التسليم
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['delivery-orders-list'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-orders?limit=30');
      if (!res.ok) throw new Error('فشل جلب أذونات التسليم');
      return res.json();
    },
  });

  // جلب المندوبين والمخازن والأصناف للمودال
  const { data: reps } = useQuery({
    queryKey: ['reps-dropdown'],
    queryFn: async () => (await fetch('/api/representatives')).json(),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-dropdown'],
    queryFn: async () => (await fetch('/api/warehouses')).json(),
  });

  const { data: products } = useQuery({
    queryKey: ['products-dropdown'],
    queryFn: async () => (await fetch('/api/products?limit=100')).json(),
  });

  // Form state
  const [selectedRep, setSelectedRep] = React.useState('');
  const [selectedWarehouse, setSelectedWarehouse] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState('');
  const [cartons, setCartons] = React.useState<number>(10);
  const [units, setUnits] = React.useState<number>(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // اعتماد إذن التسليم فورياً
  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/delivery-orders/${id}/approve`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل اعتماد إذن التسليم');

      success('تم اعتماد إذن التسليم بنجاح!', 'تم خصم البضاعة من المخزن وإضافتها لعهدة المندوب');
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء اعتماد الإذن');
    } finally {
      setApprovingId(null);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || !selectedWarehouse || !selectedProduct) {
      toastError('يرجى اختيار المندوب والمخزن والصنف');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        representativeId: selectedRep,
        warehouseId: selectedWarehouse,
        items: [
          {
            productId: selectedProduct,
            cartons,
            units,
          },
        ],
      };

      const res = await fetch('/api/delivery-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل إنشاء إذن التسليم');

      success('تم إنشاء إذن التسليم!', resData.orderNo);
      setShowAddModal(false);
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء إنشاء إذن التسليم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="أذونات تسليم البضاعة للمندوبين" breadcrumb="أذونات التسليم">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">أذونات تسليم عهدة بضاعة (بداية اليوم)</h2>
            <p className="text-xs text-slate-500">تسجيل تسليم البضاعة من المخزن واعتماد نقلها لحوزة المندوب</p>
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
              إذن تسليم جديد
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الإذن</TableHead>
                <TableHead>المندوب المستلم</TableHead>
                <TableHead>المخزن المصدر</TableHead>
                <TableHead>تاريخ التسليم</TableHead>
                <TableHead>الأصناف والكميات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    جاري تحميل أذونات التسليم...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    لا توجد أذونات تسليم مسجلة بعد
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{order.orderNo}</TableCell>
                    <TableCell className="font-bold text-slate-900">{order.representative.user.name}</TableCell>
                    <TableCell className="text-slate-700">{order.warehouse.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{formatDateTime(order.deliveryDate)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.items.map((item: any) => {
                          const p = item.product;
                          const c = Math.floor(item.quantity / p.unitsPerCarton);
                          const u = item.quantity % p.unitsPerCarton;
                          return (
                            <div key={item.id} className="text-xs">
                              <span className="font-bold text-slate-800">{p.name}: </span>
                              <span className="font-mono font-semibold text-blue-900">
                                {c > 0 ? `${c} ${p.cartonName} ` : ''}
                                {u > 0 ? `و ${u} ${p.unitName}` : ''}
                              </span>
                              <span className="text-slate-400 text-[10px] mr-1">({item.quantity} وحدة)</span>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'APPROVED' ? 'success' : 'warning'}>
                        {order.status === 'APPROVED' ? 'معتمد ومُسلّم' : 'في انتظار الاعتماد'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.status === 'PENDING' ? (
                        <Button
                          size="sm"
                          variant="success"
                          loading={approvingId === order.id}
                          onClick={() => handleApprove(order.id)}
                          leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        >
                          اعتماد وتسليم
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">معتمد</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-[#1e3a5f]" />
                إذن تسليم بضاعة للمندوب
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المندوب المستلم *</label>
                <select
                  required
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-white font-medium"
                >
                  <option value="">اختر المندوب...</option>
                  {reps?.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المخزن المصدر *</label>
                <select
                  required
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-white font-medium"
                >
                  <option value="">اختر المخزن...</option>
                  {warehouses?.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصنف المراد تسليمه *</label>
                <select
                  required
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-white font-medium"
                >
                  <option value="">اختر الصنف...</option>
                  {products?.data?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (الكرتونة: {p.unitsPerCarton} {p.unitName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد الكراتين</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cartons}
                    onChange={(e) => setCartons(parseInt(e.target.value) || 0)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وحدات مفردة إضافية</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={units}
                    onChange={(e) => setUnits(parseInt(e.target.value) || 0)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button type="submit" loading={isSubmitting} className="flex-1">
                  إنشاء إذن التسليم
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
