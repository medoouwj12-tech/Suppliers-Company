'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { RepLayout } from '@/components/layout/rep-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, translatePaymentStatus } from '@/lib/utils';
import {
  PlusCircle,
  Package,
  Receipt,
  Store,
  Wallet,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function RepDashboardPage() {
  const { data: session } = useSession();
  const repId = session?.user?.representativeId;

  // إحصائيات المندوب
  const { data: repData, isLoading } = useQuery({
    queryKey: ['rep-summary', repId],
    queryFn: async () => {
      if (!repId) return null;
      const res = await fetch(`/api/representatives/${repId}`);
      if (!res.ok) throw new Error('فشل جلب بيانات المندوب');
      return res.json();
    },
    enabled: !!repId,
  });

  // عهدة المندوب
  const { data: inventoryData } = useQuery({
    queryKey: ['rep-inventory', repId],
    queryFn: async () => {
      if (!repId) return [];
      const res = await fetch(`/api/representatives/${repId}/inventory`);
      if (!res.ok) throw new Error('فشل جلب العهدة');
      return res.json();
    },
    enabled: !!repId,
  });

  // آخر فواتير المندوب
  const { data: salesData } = useQuery({
    queryKey: ['rep-sales', repId],
    queryFn: async () => {
      if (!repId) return { data: [] };
      const res = await fetch(`/api/sales?representativeId=${repId}&limit=5`);
      if (!res.ok) throw new Error('فشل جلب المبيعات');
      return res.json();
    },
    enabled: !!repId,
  });

  const stats = repData?.stats;
  const totalCustodyUnits = inventoryData?.reduce((sum: number, item: any) => sum + item.totalQuantityUnits, 0) ?? 0;

  return (
    <RepLayout>
      <div className="space-y-6 pb-4">
        {/* Welcome card */}
        <div className="rounded-2xl p-6 text-white shadow-[0_4px_16px_rgba(30,58,95,0.25)]" style={{ background: 'linear-gradient(135deg, #103c47 0%, #2a4a7a 100%)' }}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-200/80 block">مرحباً بك</span>
              <h2 className="text-[22px] font-extrabold tracking-tight">{session?.user?.name || 'مندوب التوزيع'}</h2>
              <p className="text-[12px] text-blue-200/70 mt-1">جاهز لرحلة التوزيع اليومية</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Store className="h-6.5 w-6.5 text-white" />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-white/15 grid grid-cols-2 gap-4 text-right">
            <div>
              <span className="text-[11px] text-blue-200/80 block mb-1">نقدية بحوزتك للآن</span>
              <span className="text-[19px] font-extrabold">{formatCurrency(stats?.cashInHand ?? 0)}</span>
            </div>
            <div>
              <span className="text-[11px] text-blue-200/80 block mb-1">إجمالي مبيعاتك</span>
              <span className="text-[19px] font-extrabold">{formatCurrency(stats?.totalSales ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Big Action Buttons (Mobile-First) */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/rep/new-sale" className="block">
            <div className="w-full p-5 rounded-2xl shadow-[0_2px_12px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center gap-2.5 transition-all active:scale-95 h-full" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <span className="text-[15px] font-bold text-white">فاتورة بيع جديدة</span>
              <span className="text-[11px] text-emerald-100/90">تسجيل وتوريد فوري</span>
            </div>
          </Link>

          <Link href="/rep/collections" className="block">
            <div className="w-full p-5 rounded-2xl shadow-[0_2px_12px_rgba(30,58,95,0.25)] flex flex-col items-center justify-center gap-2.5 transition-all active:scale-95 h-full" style={{ background: 'linear-gradient(135deg, #103c47 0%, #2a4a7a 100%)' }}>
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-[15px] font-bold text-white">تحصيل دفعة</span>
              <span className="text-[11px] text-blue-200/80">سند قبض وتخفيض ديون</span>
            </div>
          </Link>
        </div>

        {/* Quick Custody Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-[14px]">البضاعة في عهدتك الآن</h3>
            </div>
            <Link href="/rep/inventory" className="text-[12px] text-blue-600 font-semibold hover:text-blue-800 transition-colors">
              عرض التفاصيل
            </Link>
          </div>

          <div className="bg-[#f8fafc]/70 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">إجمالي الأصناف المتاحة</span>
              <span className="text-[17px] font-extrabold text-slate-900">{inventoryData?.length ?? 0} أصناف</span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-500 block mb-1">إجمالي الوحدات</span>
              <span className="text-[17px] font-extrabold text-[#103c47]">{totalCustodyUnits} وحدة</span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Receipt className="h-4 w-4 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-[14px]">آخر الفواتير التي أصدرتها</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-lg">{salesData?.data?.length ?? 0} فواتير</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-[12px]">جاري التحميل...</div>
          ) : salesData?.data?.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-[12px] border-2 border-dashed border-slate-200 rounded-xl">لم تسجل أي فواتير بعد اليوم</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {salesData?.data?.map((inv: any) => (
                <Link
                  key={inv.id}
                  href={`/sales/${inv.id}`}
                  className="py-3.5 flex items-center justify-between hover:bg-[#f8fafc] rounded-xl px-2 -mx-2 transition-colors block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] text-slate-900">{inv.merchant.businessName}</span>
                      <Badge
                        variant={
                          inv.paymentStatus === 'PAID'
                            ? 'success'
                            : inv.paymentStatus === 'PARTIAL'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {translatePaymentStatus(inv.paymentStatus)}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {inv.invoiceNo} • {formatDate(inv.invoiceDate)}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="font-bold text-[14px] text-slate-900 block font-mono">{formatCurrency(inv.total)}</span>
                    {inv.remainingAmount > 0 && (
                      <span className="text-[10px] text-rose-600 block mt-0.5">
                        متبقي: {formatCurrency(inv.remainingAmount)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </RepLayout>
  );
}
