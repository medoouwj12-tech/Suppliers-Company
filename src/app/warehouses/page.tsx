'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDateTime, translateStockMovementType } from '@/lib/utils';
import { Warehouse as WarehouseIcon, Package, ArrowRightLeft, History, RefreshCw, AlertTriangle } from 'lucide-react';

export default function WarehousesPage() {
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<'stock' | 'movements'>('stock');

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
  const { data: stockData, isLoading: isStockLoading, refetch: refetchStock } = useQuery({
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
  const { data: movementsData, isLoading: isMovementsLoading, refetch: refetchMovements } = useQuery({
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

  return (
    <AdminLayout title="إدارة المخازن وحركة البضائع" breadcrumb="المخازن">
      <div className="space-y-6">
        {/* Warehouses Selector Cards (Multi-Warehouse 1-3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isWarehousesLoading ? (
            <div className="col-span-3 text-center py-6 text-slate-400">جاري تحميل المخازن...</div>
          ) : (
            warehouses?.map((wh: any) => {
              const isSelected = wh.id === selectedWarehouseId;
              return (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer text-right ${
                    isSelected
                      ? 'border-[#1e3a5f] bg-blue-50/40 shadow-md ring-2 ring-[#1e3a5f]/10'
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
                    <WarehouseIcon className={`h-5 w-5 ${isSelected ? 'text-[#1e3a5f]' : 'text-slate-400'}`} />
                    <h3 className="font-extrabold text-slate-900 text-base">{wh.name}</h3>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{wh.address || 'العنوان غير محدد'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>عدد الأصناف: <strong>{wh._count?.stockBalances ?? 0}</strong></span>
                    <span>المندوبين: <strong>{wh._count?.representatives ?? 0}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Warehouse Details & Navigation Tabs */}
        {currentWarehouse && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{currentWarehouse.name}</h3>
                <p className="text-xs text-slate-500 font-mono">الكود: {currentWarehouse.code} • هاتف: {currentWarehouse.phone || '—'}</p>
              </div>

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
    </AdminLayout>
  );
}
