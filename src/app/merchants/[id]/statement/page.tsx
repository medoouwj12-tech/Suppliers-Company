'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Printer, ArrowRight, Store, Filter, RefreshCw } from 'lucide-react';

export default function MerchantStatementPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['merchant-statement', merchantId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      const res = await fetch(`/api/merchants/${merchantId}/statement?${p.toString()}`);
      if (!res.ok) throw new Error('فشل جلب كشف الحساب');
      return res.json();
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        جاري إعداد كشف الحساب...
      </div>
    );
  }

  const merchant = data?.merchant;
  const entries = data?.entries || [];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      {/* Action and Filter Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowRight className="h-4 w-4" />}
          >
            رجوع
          </Button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="p-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
            <span className="text-xs text-slate-400">إلى</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="p-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              تصفية
            </Button>
          </div>
        </div>

        <Button size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />} className="bg-[#1e3a5f]">
          طباعة كشف الحساب
        </Button>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-lg border border-slate-200/80 space-y-6 text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none">
        {/* Header */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
          <div>
            <h1 className="text-xl font-black text-[#1e3a5f]">SupplyPro ERP</h1>
            <p className="text-xs text-slate-500 font-bold">شركة النور للتوريدات الغذائية بالجملة</p>
            <p className="text-[11px] text-slate-400 mt-1">القاهرة • هاتف: 01012345678</p>
          </div>

          <div className="text-left font-mono">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">كشف حساب تاجر</h2>
            <p className="text-xs text-slate-500 mt-1 font-cairo">
              تاريخ الاستخراج: {formatDateTime(new Date())}
            </p>
          </div>
        </div>

        {/* Merchant Box */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-bold block mb-1">التاجر / العميل:</span>
            <h3 className="text-base font-extrabold text-slate-900">{merchant?.businessName}</h3>
            <p className="text-slate-600 mt-0.5">المسؤول: {merchant?.ownerName || '—'}</p>
            <p className="text-slate-600">الهاتف: {merchant?.phone || '—'}</p>
            <p className="text-slate-600">العنوان: {merchant?.address || '—'}</p>
          </div>

          <div className="text-left font-mono space-y-1">
            <p className="text-slate-700">كود التاجر: <strong>{merchant?.code}</strong></p>
            <p className="text-slate-700 font-cairo">المندوب المباشر: <strong>{merchant?.representativeName || '—'}</strong></p>
            <p className="text-slate-700">الحد الائتماني: <strong>{merchant?.creditLimit ? formatCurrency(merchant.creditLimit) : 'غير محدد'}</strong></p>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-cairo block text-[11px]">الرصيد المستحق الحالي:</span>
              <span className={`text-base font-black ${data?.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(data?.currentBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Statement Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-50 text-slate-700 font-bold">
                <th className="py-2.5 px-3">التاريخ</th>
                <th className="py-2.5 px-3">نوع الحركة</th>
                <th className="py-2.5 px-3">رقم المستند</th>
                <th className="py-2.5 px-3 text-left">مدين (+) مشتريات</th>
                <th className="py-2.5 px-3 text-left">دائن (-) سدادات</th>
                <th className="py-2.5 px-3 text-left font-bold">الرصيد التراكمي</th>
                <th className="py-2.5 px-3">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-mono text-slate-500">{formatDate(entry.date)}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{entry.typeAr}</td>
                  <td className="py-3 px-3 font-mono text-blue-900">{entry.docNo}</td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-slate-900">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-black text-slate-900 bg-slate-50/80">
                    {formatCurrency(entry.balance)}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">{entry.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statement Bottom Footer */}
        <div className="pt-6 border-t-2 border-slate-900 flex justify-between items-center text-xs text-slate-500">
          <div>
            <p>يعتبر هذا الكشف نهائياً وصحيحاً ما لم يصلنا اعتراض خطي خلال 15 يوماً من تاريخه.</p>
          </div>
          <div className="text-left font-mono">
            <span>توقيع وختم الحسابات: ............................</span>
          </div>
        </div>
      </div>
    </div>
  );
}
