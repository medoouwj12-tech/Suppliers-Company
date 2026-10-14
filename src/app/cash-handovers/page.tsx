'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Wallet, Plus, CheckCircle2, RefreshCw, X, AlertCircle } from 'lucide-react';

export default function CashHandoversPage() {
  const { success, error: toastError } = useToast();
  const [showAddModal, setShowAddModal] = React.useState(false);

  // Form state
  const [selectedRep, setSelectedRep] = React.useState('');
  const [amount, setAmount] = React.useState<number>(0);
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [repId, setRepId] = React.useState('');

  // قراءة ?representativeId= من الرابط
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('representativeId');
    if (rid) setRepId(rid);
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cash-handovers-list', repId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '30', ...(repId ? { representativeId: repId } : {}) });
      const res = await fetch(`/api/cash-handovers?${params.toString()}`);
      if (!res.ok) throw new Error('فشل جلب تسويات الخزينة');
      return res.json();
    },
  });

  const { data: reps } = useQuery({
    queryKey: ['reps-dropdown'],
    queryFn: async () => (await fetch('/api/representatives')).json(),
  });

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || amount <= 0) {
      toastError('يرجى اختيار المندوب وتحديد مبلغ صالح');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cash-handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representativeId: selectedRep,
          amount,
          notes,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل تسجيل التوريد');

      success('تم تسجيل استلام النقدية في خزينة الشركة بنجاح!', resData.handoverNo);
      setShowAddModal(false);
      setAmount(0);
      setNotes('');
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء تسجيل التوريد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="تسويات النقدية وتوريدات الخزينة" breadcrumb="الخزينة">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">سجل توريدات النقدية من المندوبين للخزينة</h2>
            <p className="text-xs text-slate-500">
              تأكيد استلام المبالغ المحصلة من المندوبين وإيداعها رسمياً في خزينة الشركة
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
            <Button size="sm" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              تسجيل استلام نقدية
            </Button>
          </div>
        </div>

        {/* Handovers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم إذن التوريد</TableHead>
                <TableHead>المندوب المورّد</TableHead>
                <TableHead>تاريخ ووقت التوريد</TableHead>
                <TableHead className="text-left">المبلغ المودع بالخزينة</TableHead>
                <TableHead>المستلم بالخزينة</TableHead>
                <TableHead>حالة التوريد</TableHead>
                <TableHead>البيان / ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    جاري تحميل التوريدات...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    لا توجد توريدات نقدية مسجلة بعد
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono font-bold text-blue-900">{h.handoverNo}</TableCell>
                    <TableCell className="font-bold text-slate-900">{h.representative.user.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{formatDateTime(h.handoverDate)}</TableCell>
                    <TableCell className="font-mono font-black text-left text-emerald-800 text-sm">
                      {formatCurrency(h.amount)}
                    </TableCell>
                    <TableCell className="text-slate-700 text-xs">{h.receivedBy?.name || 'الخزينة'}</TableCell>
                    <TableCell>
                      <Badge variant="success">مؤكد ومودع بالخزينة</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{h.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Handover Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-700" />
                تسجيل توريد نقدية إلى الخزينة
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المندوب المورّد *</label>
                <select
                  required
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-white font-medium"
                >
                  <option value="">اختر المندوب...</option>
                  {reps?.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (في حوزته: {formatCurrency(r.cashInHand)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المبلغ المستلم نقداً (ج.م) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="أدخل المبلغ المستلم..."
                  className="w-full p-3 text-lg font-bold border-2 border-emerald-300 bg-emerald-50/50 rounded-xl focus:outline-none font-mono text-emerald-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بيان / ملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات التسوية..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="submit" loading={isSubmitting} className="flex-1 bg-emerald-700 hover:bg-emerald-800">
                  تأكيد إيداع المبلغ بالخزينة
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
