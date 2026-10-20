'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toaster';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDateTime, translateStockMovementType } from '@/lib/utils';
import { Warehouse as WarehouseIcon, Package, History, Plus, Pencil, Trash2 } from 'lucide-react';

type WarehouseForm = {
  code: string;
  name: string;
  address: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes: string;
};

const emptyWarehouseForm: WarehouseForm = {
  code: '',
  name: '',
  address: '',
  phone: '',
  status: 'ACTIVE',
  notes: '',
};

export default function WarehousesPage() {
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<'stock' | 'movements'>('stock');
  const [warehouseDialogOpen, setWarehouseDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = React.useState<string | null>(null);
  const [warehouseForm, setWarehouseForm] = React.useState<WarehouseForm>(emptyWarehouseForm);
  const [isSavingWarehouse, setIsSavingWarehouse] = React.useState(false);
  const [isDeletingWarehouse, setIsDeletingWarehouse] = React.useState(false);

  // قراءة ?tab= من الرابط
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'movements') setActiveTab('movements');
    else if (tab === 'stock') setActiveTab('stock');
  }, []);

  // جلب قائمة المخازن
  const { data: warehouses, isLoading: isWarehousesLoading, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: async () => {
      const res = await fetch('/api/warehouses');
      if (!res.ok) throw new Error('فشل جلب المخازن');
      const data = await res.json();
      if (data && data.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(data[0].id);
      }
      return data;
    },
  });

  // تعيين أول مخزن افتراضياً عند التحميل
  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // جلب أرصدة المخزن المختار
  const { data: stockData, isLoading: isStockLoading } = useQuery({
    queryKey: ['warehouse-stock', selectedWarehouseId],
    queryFn: async () => {
      if (!selectedWarehouseId) return { data: [] };
      const res = await fetch(`/api/warehouses/${selectedWarehouseId}/stock?limit=50`);
      if (!res.ok) throw new Error('فشل جلب أرصدة المخزن');
      return res.json();
    },
    enabled: !!selectedWarehouseId,
  });

  // جلب سجل الحركات المخزنية
  const { data: movementsData, isLoading: isMovementsLoading } = useQuery({
    queryKey: ['warehouse-movements', selectedWarehouseId],
    queryFn: async () => {
      if (!selectedWarehouseId) return { data: [] };
      const res = await fetch(`/api/warehouses/${selectedWarehouseId}/movements?limit=30`);
      if (!res.ok) throw new Error('فشل جلب حركات المخزن');
      return res.json();
    },
    enabled: !!selectedWarehouseId && activeTab === 'movements',
  });

  const currentWarehouse = warehouses?.find((w: any) => w.id === selectedWarehouseId);

  const openCreateWarehouse = () => {
    setEditingWarehouseId(null);
    setWarehouseForm(emptyWarehouseForm);
    setWarehouseDialogOpen(true);
  };

  const openEditWarehouse = (warehouse: any) => {
    setEditingWarehouseId(warehouse.id);
    setWarehouseForm({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address ?? '',
      phone: warehouse.phone ?? '',
      status: warehouse.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      notes: warehouse.notes ?? '',
    });
    setWarehouseDialogOpen(true);
  };

  const handleSaveWarehouse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingWarehouse(true);
    try {
      const response = await fetch(editingWarehouseId ? `/api/warehouses/${editingWarehouseId}` : '/api/warehouses', {
        method: editingWarehouseId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseForm),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر حفظ بيانات المخزن');

      success(editingWarehouseId ? 'تم تعديل بيانات المخزن' : 'تم إضافة المخزن بنجاح', body.name);
      setWarehouseDialogOpen(false);
      setWarehouseForm(emptyWarehouseForm);
      setEditingWarehouseId(null);
      setSelectedWarehouseId(body.id);
      await refetchWarehouses();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء حفظ المخزن');
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!currentWarehouse) return;
    setIsDeletingWarehouse(true);
    try {
      const response = await fetch(`/api/warehouses/${currentWarehouse.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر حذف المخزن');

      success('تم حذف المخزن');
      setDeleteDialogOpen(false);
      setSelectedWarehouseId('');
      const result = await refetchWarehouses();
      setSelectedWarehouseId(result.data?.[0]?.id ?? '');
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء حذف المخزن');
    } finally {
      setIsDeletingWarehouse(false);
    }
  };

  return (
    <AdminLayout title="إدارة المخازن وحركة البضائع" breadcrumb="المخازن">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">مخازن الشركة</h2>
            <p className="mt-1 text-sm text-slate-500">إدارة أسماء المخازن وبياناتها، ومتابعة الرصيد والحركة لكل مخزن.</p>
          </div>
          {isAdmin && (
            <Button onClick={openCreateWarehouse} leftIcon={<Plus className="h-4 w-4" />}>
              إضافة مخزن
            </Button>
          )}
        </div>

        {/* Warehouse selector cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isWarehousesLoading ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white py-10 text-center text-slate-400">جاري تحميل المخازن...</div>
          ) : warehouses?.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <WarehouseIcon className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 font-bold text-slate-700">لا توجد مخازن مضافة حتى الآن</p>
              {isAdmin && <p className="mt-1 text-sm text-slate-500">اضغط «إضافة مخزن» لبدء تنظيم الأرصدة والحركات.</p>}
            </div>
          ) : (
            warehouses?.map((wh: any) => {
              const isSelected = wh.id === selectedWarehouseId;
              return (
                <button
                  type="button"
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  aria-pressed={isSelected}
                  className={`w-full p-5 rounded-2xl border-2 transition-all cursor-pointer text-right ${
                    isSelected
                      ? 'border-[#103c47] bg-blue-50/40 shadow-md ring-2 ring-[#103c47]/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">{wh.code}</span>
                    <Badge variant={wh.status === 'ACTIVE' ? 'success' : 'outline'}>
                      {wh.status === 'ACTIVE' ? 'مخزن نشط' : 'معطّل'}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <WarehouseIcon className={`h-5 w-5 ${isSelected ? 'text-[#103c47]' : 'text-slate-400'}`} />
                    <h3 className="font-extrabold text-slate-900 text-base">{wh.name}</h3>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{wh.address || 'العنوان غير محدد'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>عدد الأصناف: <strong>{wh._count?.stockBalances ?? 0}</strong></span>
                    <span>المندوبين: <strong>{wh._count?.representatives ?? 0}</strong></span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Warehouse Details & Navigation Tabs */}
        {currentWarehouse && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{currentWarehouse.name}</h3>
                <p className="text-xs text-slate-500">الكود: <span className="font-mono">{currentWarehouse.code}</span> • هاتف: {currentWarehouse.phone || '—'}</p>
              </div>

              <div className="flex w-full flex-wrap items-center justify-between gap-3 xl:w-auto xl:justify-end">
              {/* Sub-Tabs: Stock vs Movements */}
              <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('stock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'stock'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  أرصدة الأصناف بالمخزن
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('movements')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'movements'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="h-4 w-4" />
                  سجل حركة المخزن الموثقة
                </button>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditWarehouse(currentWarehouse)} leftIcon={<Pencil className="h-4 w-4" />}>
                    تعديل بيانات المخزن
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteDialogOpen(true)} leftIcon={<Trash2 className="h-4 w-4" />}>
                    حذف
                  </Button>
                </div>
              )}
              </div>
            </div>

            {/* Content Tab 1: Stock Balances */}
            {activeTab === 'stock' && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>كود الصنف</TableHead>
                      <TableHead>اسم الصنف</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead className="text-center">الوحدات بالكرتونة</TableHead>
                      <TableHead className="text-center">الرصيد بالكراتين</TableHead>
                      <TableHead className="text-center">الرصيد بالوحدات</TableHead>
                      <TableHead className="text-center">إجمالي الوحدات المتاحة</TableHead>
                      <TableHead>القيمة بالتكلفة</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isStockLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                          جاري تحميل الأرصدة...
                        </TableCell>
                      </TableRow>
                    ) : stockData?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                          لا توجد أصناف في هذا المخزن بعد
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockData?.data?.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono font-bold text-blue-900">{b.product.sku}</TableCell>
                          <TableCell className="font-bold text-slate-900">{b.product.name}</TableCell>
                          <TableCell className="text-slate-600">{b.product.category?.name ?? 'عام'}</TableCell>
                          <TableCell className="font-mono text-center font-bold">
                            {b.product.unitsPerCarton} {b.product.unitName}
                          </TableCell>
                          <TableCell className="text-center font-bold font-mono text-slate-900 text-sm">
                            {b.cartons} {b.product.cartonName}
                          </TableCell>
                          <TableCell className="text-center font-bold font-mono text-blue-900 text-sm">
                            {b.units} {b.product.unitName}
                          </TableCell>
                          <TableCell className="text-center font-extrabold font-mono text-slate-800">
                            {b.quantity} {b.product.unitName}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-emerald-800">
                            {formatCurrency(b.totalValue)}
                          </TableCell>
                          <TableCell>
                            {b.isLowStock ? (
                              <Badge variant="warning">نقص مخزون</Badge>
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
            )}

            {/* Content Tab 2: Stock Movements History */}
            {activeTab === 'movements' && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ والوقت</TableHead>
                      <TableHead>نوع الحركة</TableHead>
                      <TableHead>الصنف</TableHead>
                      <TableHead className="text-center">الكمية المتحركة</TableHead>
                      <TableHead className="text-center">الرصيد قبل</TableHead>
                      <TableHead className="text-center">الرصيد بعد</TableHead>
                      <TableHead>المستند المرجعي</TableHead>
                      <TableHead>المستخدم المنفذ</TableHead>
                      <TableHead>البيان / السبب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isMovementsLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                          جاري تحميل سجل الحركات...
                        </TableCell>
                      </TableRow>
                    ) : movementsData?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                          لا توجد حركات مسجلة لهذا المخزن
                        </TableCell>
                      </TableRow>
                    ) : (
                      movementsData?.data?.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs text-slate-500">{formatDateTime(m.createdAt)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                m.type === 'PURCHASE_IN' || m.type === 'TRANSFER_IN' || m.type === 'RETURN_FROM_MERCHANT'
                                  ? 'success'
                                  : m.type === 'DELIVERY_OUT' || m.type === 'TRANSFER_OUT' || m.type === 'SALE_OUT'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {translateStockMovementType(m.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">{m.product.name}</TableCell>
                          <TableCell className="text-center font-bold font-mono">
                            <span className={m.quantity > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.product.unitName}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-slate-500">{m.quantityBefore}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-slate-900">{m.quantityAfter}</TableCell>
                          <TableCell className="font-mono text-xs text-blue-900">{m.referenceNo || '—'}</TableCell>
                          <TableCell className="text-xs text-slate-700">{m.user?.name || 'النظام'}</TableCell>
                          <TableCell className="text-xs text-slate-500">{m.notes || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWarehouseId ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}</DialogTitle>
            <DialogDescription>أدخل بيانات المخزن كما ستظهر في الفواتير والتقارير.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveWarehouse} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="كود المخزن"
                value={warehouseForm.code}
                onChange={(event) => setWarehouseForm((form) => ({ ...form, code: event.target.value }))}
                placeholder="مثال: WH-01"
                required
                disabled={Boolean(editingWarehouseId)}
              />
              <Input
                label="اسم المخزن"
                value={warehouseForm.name}
                onChange={(event) => setWarehouseForm((form) => ({ ...form, name: event.target.value }))}
                placeholder="مثال: مخزن القاهرة الرئيسي"
                required
                maxLength={100}
              />
              <Input
                label="العنوان"
                value={warehouseForm.address}
                onChange={(event) => setWarehouseForm((form) => ({ ...form, address: event.target.value }))}
                placeholder="المدينة أو العنوان بالتفصيل"
              />
              <Input
                label="رقم الهاتف"
                value={warehouseForm.phone}
                onChange={(event) => setWarehouseForm((form) => ({ ...form, phone: event.target.value }))}
                placeholder="رقم التواصل"
                dir="ltr"
              />
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                حالة المخزن
                <select
                  value={warehouseForm.status}
                  onChange={(event) => setWarehouseForm((form) => ({ ...form, status: event.target.value as WarehouseForm['status'] }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-[#0e7268] focus:ring-4 focus:ring-[#0e7268]/10"
                >
                  <option value="ACTIVE">نشط</option>
                  <option value="INACTIVE">معطّل</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                ملاحظات
                <textarea
                  value={warehouseForm.notes}
                  onChange={(event) => setWarehouseForm((form) => ({ ...form, notes: event.target.value }))}
                  rows={3}
                  maxLength={500}
                  placeholder="ملاحظات داخلية عن المخزن (اختياري)"
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0e7268] focus:ring-4 focus:ring-[#0e7268]/10"
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWarehouseDialogOpen(false)} disabled={isSavingWarehouse}>
                إلغاء
              </Button>
              <Button type="submit" loading={isSavingWarehouse}>
                {editingWarehouseId ? 'حفظ التعديلات' : 'إضافة المخزن'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !isDeletingWarehouse && setDeleteDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف المخزن</DialogTitle>
            <DialogDescription>
              سيتم حذف «{currentWarehouse?.name}» إذا لم يكن مرتبطًا بحركات أو فواتير أو مندوبين، وإذا كان رصيده فارغًا. لا يمكن التراجع عن الحذف.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            إذا كان للمخزن سجل تشغيلي، سيمنع النظام حذفه حفاظًا على التقارير؛ غيّر حالته إلى «معطّل» بدلًا من ذلك.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingWarehouse}>
              رجوع
            </Button>
            <Button type="button" variant="danger" loading={isDeletingWarehouse} onClick={handleDeleteWarehouse}>
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
