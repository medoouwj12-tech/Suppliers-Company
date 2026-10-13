'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { RotateCcw, Plus, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';

export default function ReturnsPage() {
  const { success, error: toastError } = useToast();
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['returns-list'],
    queryFn: async () => {
      const res = await fetch('/api/returns?limit=30');
      if (!res.ok) throw new Error('فشل جلب المرتجعات');
      return res.json();
    },
  });

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/returns/${id}/approve`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل اعتماد المرتجع');

      success('تم اعتماد المرتجع وتحديث الأرصدة بنجاح!');
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء اعتماد المرتجع');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <AdminLayout title="إدارة المرتجعات والتالف" breadcrumb="المرتجعات">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">سجل مرتجعات البضائع والتالف</h2>
            <p className="text-xs text-slate-500">
              إعادة البضاعة الصالحة للمخزن، وفصل البضاعة التالفة بعيداً عن المخزون القابل للبيع
            </p>
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
          </div>
        </div>

        {/* Returns Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المرتجع</TableHead>
                <TableHead>نوع المرتجع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الأصناف والكميات وحالتها</TableHead>
                <TableHead className="text-left">القيمة المالية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    جاري تحميل المرتجعات...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    لا توجد مرتجعات مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((ret: any) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{ret.returnNo}</TableCell>
                    <TableCell className="font-bold">
                      {ret.type === 'FROM_MERCHANT' ? 'مرتجع من تاجر' : 'مرتجع من مندوب للمخزن'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{formatDateTime(ret.returnDate)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {ret.items.map((item: any) => (
                          <div key={item.id} className="text-xs flex items-center gap-2">
                            <span className="font-bold text-slate-800">{item.product.name}:</span>
                            <span className="font-mono font-semibold">{item.quantity} {item.product.unitName}</span>
                            <Badge
                              variant={
                                item.condition === 'SELLABLE'
                                  ? 'success'
                                  : item.condition === 'DAMAGED'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {item.condition === 'SELLABLE' ? 'صالح للبيع' : 'تالف'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-left text-slate-900">
                      {formatCurrency(ret.totalValue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ret.status === 'APPROVED' ? 'success' : 'warning'}>
                        {ret.status === 'APPROVED' ? 'معتمد' : 'في الانتظار'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {ret.status === 'PENDING' ? (
                        <Button
                          size="sm"
                          variant="success"
                          loading={approvingId === ret.id}
                          onClick={() => handleApprove(ret.id)}
                          leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        >
                          اعتماد المرتجع
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">معتمد ومسوّى</span>
                      )}
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
