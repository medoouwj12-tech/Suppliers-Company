'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate, translatePaymentStatus } from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  Store,
  ShoppingCart,
  ArrowUpRight,
  Truck,
  Plus,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('فشل تحميل بيانات لوحة التحكم');
      return res.json();
    },
  });

  return (
    <AdminLayout title="لوحة التحكم الرئيسية" breadcrumb="الرئيسية">
      <div className="space-y-8">
        {/* Operations overview */}
        <section className="relative isolate overflow-hidden rounded-[26px] bg-[#102f43] px-6 py-7 shadow-[0_18px_44px_rgba(16,47,67,0.17)] sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_0%,rgba(31,155,119,0.42),transparent_42%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,0.04)_100%)]" />
          <div className="pointer-events-none absolute -left-16 -top-28 -z-10 h-72 w-72 rounded-full border border-white/10 shadow-[0_0_0_28px_rgba(255,255,255,0.025),0_0_0_58px_rgba(255,255,255,0.02)]" />
          <div className="flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-100">
                <Truck className="h-4 w-4" />
                <span>إدارة التوريدات والتوزيع</span>
              </div>
              <h2 className="text-[24px] font-extrabold leading-relaxed tracking-tight text-white sm:text-[29px]">
                كل حركة شركتك، في مكان واحد
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-7 text-slate-200/80 sm:text-[14px]">
                تابع المبيعات والمخزون والتحصيلات من المورد إلى المخزن ثم إلى التاجر، بصورة واضحة ومحدثة.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-slate-200/75">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" /> بيانات الشركة</span>
                <span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-emerald-200" /> مخازن ومبيعات وموردون</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto lg:shrink-0">
              <Button
                variant="outline"
                size="md"
                className="border-white/20 bg-white/10 text-white shadow-none hover:border-white/35 hover:bg-white/15 hover:text-white"
                onClick={() => refetch()}
                loading={isRefetching}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                تحديث البيانات
              </Button>
              <Link href="/rep/new-sale">
                <Button size="md" className="bg-emerald-400 text-[#102f43] shadow-[0_8px_20px_rgba(4,21,31,0.18)] hover:bg-emerald-300">
                  <Plus className="h-4 w-4" />
                  فاتورة جديدة
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 8 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="مبيعات اليوم"
            value={isLoading ? '...' : formatCurrency(data?.todaySales)}
            subtitle={`${data?.todayInvoiceCount ?? 0} فاتورة معتمدة اليوم`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="blue"
            trend={{ value: 'اليوم', isPositive: true }}
          />

          <StatCard
            title="مبيعات الشهر الحالية"
            value={isLoading ? '...' : formatCurrency(data?.monthSales)}
            subtitle="إجمالي الفواتير المعتمدة هذا الشهر"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="emerald"
            trend={{ value: 'الشهر الحالي', isPositive: true }}
          />

          <StatCard
            title="التحصيلات النقدية اليوم"
            value={isLoading ? '...' : formatCurrency(data?.todayCollections)}
            subtitle="سندات القبض المسجلة اليوم"
            icon={<DollarSign className="h-5 w-5" />}
            variant="emerald"
          />

          <StatCard
            title="نقدية في عهدة المندوبين"
            value={isLoading ? '...' : formatCurrency(data?.pendingCashInRepHands)}
            subtitle="مبالغ محصلة لم تسلم للخزينة بعد"
            icon={<Users className="h-5 w-5" />}
            variant="amber"
            trend={{ value: 'تتطلب توريد', isNeutral: true }}
          />

          <StatCard
            title="ديون التجار المستحقة"
            value={isLoading ? '...' : formatCurrency(data?.totalReceivables)}
            subtitle="إجمالي المتبقي على المحلات"
            icon={<Store className="h-5 w-5" />}
            variant="rose"
          />

          <StatCard
            title="مستحقات الموردين"
            value={isLoading ? '...' : formatCurrency(data?.totalPayables)}
            subtitle="التزامات فواتير المشتريات"
            icon={<Truck className="h-5 w-5" />}
            variant="default"
          />

          <StatCard
            title="قيمة المخزون الإجمالية"
            value={isLoading ? '...' : formatCurrency(data?.stockValue)}
            subtitle="بسعر تكلفة الشراء الحالية"
            icon={<Package className="h-5 w-5" />}
            variant="blue"
          />

          <StatCard
            title="تنبيهات نواقص المخزون"
            value={isLoading ? '...' : `${data?.lowStockCount ?? 0} صنف`}
            subtitle="أصناف وصلت للحد الأدنى للطلب"
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={data?.lowStockCount > 0 ? 'rose' : 'default'}
          />
        </div>

        {/* Charts and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Sales vs Collections Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">حركة المبيعات والتحصيلات</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">مقارنة بين إجمالي المبيعات والمبالغ المحصلة فعلياً</p>
              </div>
              <Badge variant="outline">آخر 6 أشهر</Badge>
            </div>

            <div className="h-72 w-full pt-2">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400">جاري تحميل الرسم البياني...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.monthlyChartData || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', direction: 'rtl', textAlign: 'right', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="sales" name="المبيعات (ج.م)" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="collections" name="التحصيلات (ج.م)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Representatives */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-900">أفضل المندوبين مبيعاً</h3>
              <Link href="/representatives" className="text-[12px] text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                عرض الكل
              </Link>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
              ) : data?.topRepresentatives?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">لا توجد عمليات بيع بعد</div>
              ) : (
                data?.topRepresentatives?.map((rep: any, idx: number) => (
                  <div key={rep.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8fafc] border border-slate-100/80 hover:border-slate-200/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e3a5f] text-white text-[12px] font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-900">{rep.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">{rep.code}</span>
                      </div>
                    </div>
                    <div className="text-left font-bold text-[13px] text-emerald-700">
                      {formatCurrency(rep.totalSales)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick links */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[12px] font-semibold text-slate-400 mb-2.5">روابط سريعة</h4>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/delivery-orders" className="p-2.5 text-[12px] font-medium text-slate-600 bg-[#f8fafc] rounded-xl hover:bg-slate-100 hover:text-slate-900 text-center block transition-colors border border-slate-100/80">
                  تسليم عهدة
                </Link>
                <Link href="/cash-handovers" className="p-2.5 text-[12px] font-medium text-slate-600 bg-[#f8fafc] rounded-xl hover:bg-slate-100 hover:text-slate-900 text-center block transition-colors border border-slate-100/80">
                  توريد نقدية
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">آخر فواتير المبيعات</h3>
              <p className="text-[12px] text-slate-400 mt-0.5">الفواتير الأخيرة الصادرة من المندوبين</p>
            </div>
            <Link href="/sales">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
                عرض الكل
              </Button>
            </Link>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاجر</TableHead>
                <TableHead>المندوب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>المدفوع</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>حالة السداد</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    جاري تحميل الفواتير...
                  </TableCell>
                </TableRow>
              ) : data?.recentInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    لا توجد فواتير بعد
                  </TableCell>
                </TableRow>
              ) : (
                data?.recentInvoices?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{inv.invoiceNo}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{inv.merchant.businessName}</TableCell>
                    <TableCell className="text-slate-600">{inv.representative.user.name}</TableCell>
                    <TableCell className="text-slate-500">{formatDate(inv.invoiceDate)}</TableCell>
                    <TableCell className="font-bold text-slate-900">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="text-emerald-700 font-semibold">{formatCurrency(inv.paidAmount)}</TableCell>
                    <TableCell className={inv.remainingAmount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                      {formatCurrency(inv.remainingAmount)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Link href={`/sales/${inv.id}`}>
                        <Button variant="ghost" size="sm">
                          عرض
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
    </AdminLayout>
  );
}
