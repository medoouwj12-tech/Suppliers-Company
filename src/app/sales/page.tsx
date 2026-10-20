'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate, translatePaymentStatus } from '@/lib/utils';
import { ShoppingCart, Plus, Search, Filter, Eye, Printer, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function SalesPage() {
  const [search, setSearch] = React.useState('');
  const [paymentStatus, setPaymentStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [repId, setRepId] = React.useState('');

  // قراءة ?representativeId= من الرابط
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('representativeId');
    if (rid) setRepId(rid);
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales-invoices', page, search, paymentStatus, repId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search ? { search } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(repId ? { representativeId: repId } : {}),
      });
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error('فشل جلب فواتير المبيعات');
      return res.json();
    },
  });

  return (
    <AdminLayout title="إدارة المبيعات والفواتير" breadcrumb="المبيعات">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم التاجر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none"
              />
            </div>

            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="p-2 text-xs border border-slate-300 rounded-xl focus:border-[#103c47] focus:outline-none bg-white font-medium"
            >
              <option value="">جميع حالات السداد</option>
              <option value="PAID">مدفوعة بالكامل</option>
              <option value="PARTIAL">مدفوعة جزئياً</option>
              <option value="UNPAID">غير مدفوعة (آجل)</option>
            </select>
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
            <Link href="/rep/new-sale">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                فاتورة بيع جديدة
              </Button>
            </Link>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاجر / المحل</TableHead>
                <TableHead>المندوب</TableHead>
                <TableHead>تاريخ الفاتورة</TableHead>
                <TableHead>عدد الأصناف</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>المدفوع</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>حالة السداد</TableHead>
                <TableHead className="text-center">معاينة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-400">
                    جاري تحميل الفواتير...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-400">
                    لا توجد فواتير مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{inv.invoiceNo}</TableCell>
                    <TableCell className="font-bold text-slate-900">{inv.merchant.businessName}</TableCell>
                    <TableCell className="text-slate-600">{inv.representative.user.name}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-xs">{formatDate(inv.invoiceDate)}</TableCell>
                    <TableCell className="font-mono text-center">{inv.items.length}</TableCell>
                    <TableCell className="font-bold font-mono text-slate-900">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="font-bold font-mono text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                    <TableCell className={`font-bold font-mono ${inv.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
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
                    <TableCell className="text-center">
                      <Link href={`/sales/${inv.id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                          عرض
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                صفحة {data.pagination.page} من {data.pagination.totalPages} ({data.pagination.total} فاتورة)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
