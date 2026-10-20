'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Users, Package, Wallet, Plus, RefreshCw, ShoppingCart, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

export default function RepresentativesPage() {
  const { data: reps, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['representatives-list'],
    queryFn: async () => {
      const res = await fetch('/api/representatives');
      if (!res.ok) throw new Error('فشل جلب المندوبين');
      return res.json();
    },
  });

  return (
    <AdminLayout title="إدارة المندوبين ومتابعة العهد" breadcrumb="المندوبون">
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">سجل مندوبي التوزيع والمبيعات</h2>
            <p className="text-xs text-slate-500">متابعة أرصدة بضاعة العهدة والتحصيلات والنقدية المعلقة في حوزة كل مندوب</p>
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
            <Link href="/delivery-orders">
              <Button size="sm" leftIcon={<Package className="h-4 w-4" />}>
                تسليم عهدة بضاعة
              </Button>
            </Link>
          </div>
        </div>

        {/* Reps Cards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="col-span-2 text-center py-10 text-slate-400">جاري تحميل بيانات المندوبين...</div>
          ) : (
            reps?.map((rep: any) => (
              <div
                key={rep.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-right"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-[#103c47] text-white flex items-center justify-center font-bold text-lg">
                      {rep.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{rep.name}</h3>
                      <span className="text-xs text-slate-400 font-mono">
                        {rep.employeeCode} • {rep.phone || 'بدون هاتف'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={rep.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {rep.status === 'ACTIVE' ? 'نشط' : 'معطّل'}
                  </Badge>
                </div>

                {/* 4 Performance Indicators */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">إجمالي المبيعات المحققة</span>
                    <span className="text-base font-extrabold text-blue-950 font-mono">
                      {formatCurrency(rep.totalSales)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">إجمالي ما تم تحصيله</span>
                    <span className="text-base font-extrabold text-emerald-700 font-mono">
                      {formatCurrency(rep.totalCollected)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">مبالغ سلمت للخزينة</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">
                      {formatCurrency(rep.totalHandedOver)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">نقدية في حوزته الآن</span>
                    <span className="text-base font-extrabold text-amber-700 font-mono">
                      {formatCurrency(rep.cashInHand)}
                    </span>
                  </div>
                </div>

                {/* Custody stock status */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span>المخزن المخصص: <strong>{rep.warehouseName}</strong></span>
                  <span>
                    العهدة الحالية: <strong className="text-blue-900 font-mono">{rep.inventoryTotalUnits} وحدة</strong> ({rep.inventoryItemsCount} أصناف)
                  </span>
                </div>

                {/* Quick actions for this rep */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link href={`/delivery-orders?representativeId=${rep.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      أذونات التسليم
                    </Button>
                  </Link>
                  <Link href={`/cash-handovers?representativeId=${rep.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      تسويات الخزينة
                    </Button>
                  </Link>
                  <Link href={`/sales?representativeId=${rep.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      فواتير المندوب
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
