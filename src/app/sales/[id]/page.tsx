'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate, formatDateTime, translatePaymentStatus } from '@/lib/utils';
import { Printer, ArrowRight, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SingleInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();
  const invoiceId = params.id as string;

  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [showCancelModal, setShowCancelModal] = React.useState(false);

  const { data: invoice, isLoading, refetch } = useQuery({
    queryKey: ['sales-invoice', invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/sales/${invoiceId}`);
      if (!res.ok) throw new Error('فشل جلب بيانات الفاتورة');
      return res.json();
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim()) {
      toastError('يرجى ذكر سبب الإلغاء');
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/sales/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إلغاء الفاتورة');

      success('تم إلغاء الفاتورة وإعادة البضاعة لعهدة المندوب بنجاح');
      setShowCancelModal(false);
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء إلغاء الفاتورة');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        جاري تحميل الفاتورة...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 font-bold mb-4">الفاتورة غير موجودة</p>
        <Link href="/sales">
          <Button>العودة للفواتير</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowRight className="h-4 w-4" />}
          >
            رجوع
          </Button>
          <span className="text-xs text-slate-500 font-mono">#{invoice.invoiceNo}</span>
        </div>

        <div className="flex items-center gap-2">
          {session?.user?.role === 'ADMIN' && invoice.status !== 'CANCELLED' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              إلغاء الفاتورة
            </Button>
          )}

          <Button
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
            className="bg-[#1e3a5f]"
          >
            طباعة الفاتورة
          </Button>
        </div>
      </div>

      {/* Invoice Printable Sheet */}
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-lg border border-slate-200/80 space-y-8 text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none">
        {/* Header with Company Logo & Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-slate-900 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-[#1e3a5f] text-white rounded-xl flex items-center justify-center font-bold text-lg">
                SP
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#1e3a5f]">سوبلاي برو ERP</h1>
                <p className="text-xs text-slate-500 font-medium">شركة النور للتوريدات الغذائية بالجملة</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              القاهرة، التجمع الخامس • هاتف: 01012345678 • س.ت: 123456
            </p>
          </div>

          <div className="text-left font-mono">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">فاتورة مبيعات</h2>
            <div className="mt-1 flex items-center gap-2 justify-end">
              <span className="text-sm font-bold text-blue-900">{invoice.invoiceNo}</span>
              <Badge
                variant={
                  invoice.status === 'CANCELLED'
                    ? 'danger'
                    : invoice.paymentStatus === 'PAID'
                    ? 'success'
                    : invoice.paymentStatus === 'PARTIAL'
                    ? 'warning'
                    : 'danger'
                }
              >
                {invoice.status === 'CANCELLED' ? 'فاتورة ملغاة' : translatePaymentStatus(invoice.paymentStatus)}
              </Badge>
            </div>
            <span className="text-xs text-slate-400 block mt-1">{formatDateTime(invoice.invoiceDate)}</span>
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {invoice.status === 'CANCELLED' && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900">
            <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">هذه الفاتورة ملغاة رسمياً</h4>
              <p className="text-xs text-rose-700 mt-0.5">السبب: {invoice.cancellationReason || 'إلغاء إداري مصرح'}</p>
            </div>
          </div>
        )}

        {/* Merchant & Representative Info Box */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-bold block mb-1">بيانات العميل / التاجر:</span>
            <h3 className="text-base font-extrabold text-slate-900">{invoice.merchant.businessName}</h3>
            <p className="text-slate-600 mt-0.5 font-medium">
              الاسم: {invoice.merchant.ownerName || '—'}
            </p>
            <p className="text-slate-600 font-medium">الهاتف: {invoice.merchant.phone || '—'}</p>
            <p className="text-slate-600 font-medium">العنوان: {invoice.merchant.address || '—'}</p>
          </div>

          <div className="text-left font-mono">
            <span className="text-slate-400 font-bold block mb-1">بيانات العملية:</span>
            <p className="text-slate-700">المندوب: <strong className="font-cairo">{invoice.representative.user.name}</strong></p>
            <p className="text-slate-700">كود المندوب: <strong>{invoice.representative.employeeCode}</strong></p>
            <p className="text-slate-700">طريقة الدفع: <strong className="font-cairo">{invoice.paymentType === 'CASH' ? 'نقدي' : invoice.paymentType === 'CREDIT' ? 'آجل' : 'جزئي'}</strong></p>
            {invoice.notes && <p className="text-slate-500 text-[11px] mt-1 font-cairo">ملاحظات: {invoice.notes}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 font-bold">
                <th className="py-2 pr-2">#</th>
                <th className="py-2">الصنف</th>
                <th className="py-2 text-center">الكراتين</th>
                <th className="py-2 text-center">الوحدات المفردة</th>
                <th className="py-2 text-center">إجمالي الكمية</th>
                <th className="py-2 text-left">سعر الكرتونة</th>
                <th className="py-2 text-left">سعر الوحدة</th>
                <th className="py-2 text-left pl-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item: any, idx: number) => {
                const cartons = Math.floor(item.quantity / item.unitsPerCarton);
                const remainderUnits = item.quantity % item.unitsPerCarton;

                return (
                  <tr key={item.id} className="text-slate-800">
                    <td className="py-3 pr-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 font-bold">
                      {item.product.name}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">
                        {item.product.sku}
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono font-bold">{cartons}</td>
                    <td className="py-3 text-center font-mono font-bold text-blue-900">{remainderUnits}</td>
                    <td className="py-3 text-center font-mono text-slate-600">
                      {item.quantity} {item.product.unitName}
                    </td>
                    <td className="py-3 text-left font-mono">{formatCurrency(item.cartonPrice)}</td>
                    <td className="py-3 text-left font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-left pl-2 font-bold font-mono text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-4 border-t-2 border-slate-200 gap-6">
          <div className="text-xs text-slate-500 max-w-sm space-y-1">
            <p className="font-bold text-slate-700">شروط الاستلام:</p>
            <p>تم استلام البضاعة بحالة جيدة ومطابقة للمواصفات والأسعار المذكورة أعلاه.</p>
            <p className="pt-4 font-bold text-slate-700">توقيع المستلم: ................................</p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-bold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>الخصم الممنوح:</span>
                <span className="font-mono font-bold">- {formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
              <span>صافي الفاتورة:</span>
              <span className="font-mono text-blue-950">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>المبلغ المدفوع:</span>
              <span className="font-mono">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            {invoice.remainingAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-bold bg-rose-50 p-2 rounded-lg">
                <span>المتبقي على الحساب:</span>
                <span className="font-mono">{formatCurrency(invoice.remainingAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-6 border-t border-slate-100">
          شكراً لتعاملكم معنا • تم إصدار هذه الفاتورة بواسطة نظام SupplyPro ERP
        </div>
      </div>

      {/* Cancel Modal (Admin only) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-xl space-y-4 text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">تأكيد إلغاء الفاتورة</h3>
            </div>
            <p className="text-xs text-slate-500">
              سيؤدي إلغاء الفاتورة إلى إعادة الأصناف المباعة إلى عهدة المندوب فوراً وتعديل رصيد التاجر.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإلغاء *</label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="أدخل سبب الإلغاء لتسجيله في السجل الرقابي..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-rose-600 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleCancelInvoice}
                loading={isCancelling}
              >
                تأكيد الإلغاء وإعادة البضاعة
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                تراجع
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
