'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Truck, Plus, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  DRAFT: { label: 'مسودة', variant: 'secondary' },
  APPROVED: { label: 'معتمدة', variant: 'success' },
  CANCELLED: { label: 'ملغاة', variant: 'danger' },
};

export default function PurchasesPage() {
  const { success, error: toastError } = useToast();
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['purchase-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/purchases?limit=30');
      if (!res.ok) throw new Error('فشل جلب فواتير الشراء');
      return res.json();
    },
  });

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/purchases/${id}/approve`, { method: 'PATCH' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل اعتماد الفاتورة');
      success('تم اعتماد فاتورة الشراء بنجاح!');
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <AdminLayout title="فواتير الشراء" breadcrumb="المشتريات / فواتير الشراء">
      <div className="space-y-5">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#103c47]" />
            قائمة فواتير الشراء ({data?.pagination?.total ?? 0})
          </h2>
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
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>المدفوع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                    جاري تحميل فواتير الشراء...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                    لا توجد فواتير شراء
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((inv: any) => {
                  const st = STATUS_MAP[inv.status] ?? { label: inv.status, variant: 'secondary' };
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-bold text-blue-900">{inv.invoiceNo}</TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {inv.supplier?.name}
                        <span className="block text-xs text-slate-400 font-mono">{inv.supplier?.code}</span>
                      </TableCell>
                      <TableCell className="text-slate-600">{inv.warehouse?.name}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(inv.invoiceDate)}</TableCell>
                      <TableCell className="font-mono font-bold text-slate-900">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="font-mono text-emerald-800">{formatCurrency(inv.paidAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant as any}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {inv.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="success"
                            loading={approvingId === inv.id}
                            onClick={() => handleApprove(inv.id)}
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          >
                            اعتماد
                          </Button>
                        )}
                        {inv.status === 'APPROVED' && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 justify-center">
                            <CheckCircle2 className="h-3.5 w-3.5" /> معتمدة
                          </span>
                        )}
                        {inv.status === 'CANCELLED' && (
                          <span className="text-xs text-red-500 flex items-center gap-1 justify-center">
                            <Clock className="h-3.5 w-3.5" /> ملغاة
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
