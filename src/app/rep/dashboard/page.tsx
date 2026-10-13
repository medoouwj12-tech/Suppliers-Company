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
      <div className="space-y-4 max-w-lg mx-auto">
        {/* Welcome card */}
        <div className="bg-gradient-to-l from-[#1e3a5f] to-[#2563eb] rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-200">مرحباً بك</span>
              <h2 className="text-xl font-bold">{session?.user?.name || 'مندوب التوزيع'}</h2>
              <p className="text-xs text-blue-100 mt-0.5">جاهز لرحلة التوزيع اليومية 🚚</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
              <Store className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-2 gap-3 text-right">
            <div>
              <span className="text-xs text-blue-200 block">نقدية بحوزتك للآن</span>
              <span className="text-lg font-extrabold">{formatCurrency(stats?.cashInHand ?? 0)}</span>
            </div>
            <div>
              <span className="text-xs text-blue-200 block">إجمالي مبيعاتك</span>
              <span className="text-lg font-extrabold">{formatCurrency(stats?.totalSales ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Big Action Buttons (Mobile-First) */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/rep/new-sale" className="block">
            <button className="w-full bg-emerald-600 active:bg-emerald-700 text-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
              <PlusCircle className="h-7 w-7 text-white" />
              <span className="text-base font-bold">فاتورة بيع جديدة</span>
              <span className="text-[11px] text-emerald-100">تسجيل وتوريد فوري للتاجر</span>
            </button>
          </Link>

          <Link href="/rep/collections" className="block">
            <button className="w-full bg-[#1e3a5f] active:bg-[#16304f] text-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
              <Wallet className="h-7 w-7 text-white" />
              <span className="text-base font-bold">تحصيل دفعة</span>
              <span className="text-[11px] text-blue-200">سند قبض وتخفيض ديون</span>
            </button>
          </Link>
        </div>

        {/* Quick Custody Summary */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#1e3a5f]" />
              <h3 className="font-bold text-slate-900 text-sm">البضاعة في عهدتك الآن</h3>
            </div>
            <Link href="/rep/inventory" className="text-xs text-blue-600 font-semibold hover:underline">
              عرض التفاصيل
            </Link>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">إجمالي الأصناف المتاحة</span>
              <span className="text-base font-extrabold text-slate-800">{inventoryData?.length ?? 0} أصناف</span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 block">إجمالي الوحدات</span>
              <span className="text-base font-extrabold text-blue-900">{totalCustodyUnits} وحدة</span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">آخر الفواتير التي أصدرتها</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{salesData?.data?.length ?? 0} فواتير</span>
          </div>

          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">جاري التحميل...</div>
          ) : salesData?.data?.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">لم تسجل أي فواتير بعد اليوم</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {salesData?.data?.map((inv: any) => (
                <Link
                  key={inv.id}
                  href={`/sales/${inv.id}`}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-1 transition-colors block"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{inv.merchant.businessName}</span>
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
                    <span className="font-bold text-sm text-slate-900 block">{formatCurrency(inv.total)}</span>
                    {inv.remainingAmount > 0 && (
                      <span className="text-[10px] text-rose-600 block">
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
