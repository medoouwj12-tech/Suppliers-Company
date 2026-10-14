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
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">مرحباً بك في نظام SupplyPro ERP 👋</h2>
            <p className="text-xs text-slate-500 mt-1">نظرة عامة على المبيعات، التحصيلات، المخازن، وديون التجار</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isRefetching}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              تحديث البيانات
            </Button>
            <Link href="/rep/new-sale">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                فاتورة مبيعات جديدة
              </Button>
            </Link>
          </div>
        </div>

        {/* 8 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">حركة المبيعات والتحصيلات (آخر 6 أشهر)</h3>
                <p className="text-xs text-slate-500">مقارنة بين إجمالي المبيعات والمبالغ المحصلة فعلياً</p>
              </div>
              <Badge variant="outline">تقرير نصف سنوي</Badge>
            </div>

            <div className="h-72 w-full pt-4">
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
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', direction: 'rtl', textAlign: 'right' }}
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
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">أفضل المندوبين مبيعاً</h3>
              <Link href="/representatives" className="text-xs text-blue-600 hover:underline">
                عرض الكل
              </Link>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-6 text-slate-400">جاري التحميل...</div>
              ) : data?.topRepresentatives?.length === 0 ? (
                <div className="text-center py-6 text-slate-400">لا توجد عمليات بيع بعد</div>
              ) : (
                data?.topRepresentatives?.map((rep: any, idx: number) => (
                  <div key={rep.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-white text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{rep.name}</h4>
                        <span className="text-xs text-slate-500 font-mono">{rep.code}</span>
                      </div>
                    </div>
                    <div className="text-left font-bold text-sm text-emerald-700">
                      {formatCurrency(rep.totalSales)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick links */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 mb-2">روابط سريعة</h4>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/delivery-orders" className="p-2 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 text-center block">
                  تسليم عهدة بضاعة
                </Link>
                <Link href="/cash-handovers" className="p-2 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 text-center block">
                  توريد نقدية الخزينة
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">آخر فواتير المبيعات الصادرة</h3>
              <p className="text-xs text-slate-500">الفواتير الأخيرة الصادرة من المندوبين ومسجلة في النظام</p>
            </div>
            <Link href="/sales">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
                عرض جميع الفواتير
              </Button>
            </Link>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاجر / المحل</TableHead>
                <TableHead>المندوب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجمالي الفاتورة</TableHead>
                <TableHead>المدفوع</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>حالة السداد</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-slate-400">
                    جاري تحميل الفواتير...
                  </TableCell>
                </TableRow>
              ) : data?.recentInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-slate-400">
                    لا توجد فواتير بعد
                  </TableCell>
                </TableRow>
              ) : (
                data?.recentInvoices?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{inv.invoiceNo}</TableCell>
                    <TableCell className="font-semibold">{inv.merchant.businessName}</TableCell>
                    <TableCell>{inv.representative.user.name}</TableCell>
                    <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(inv.total)}</TableCell>
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
