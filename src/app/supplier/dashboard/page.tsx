'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Building2, FileText, MapPin, PackageCheck, Phone, RefreshCw, Wallet } from 'lucide-react';
import { SupplierLayout } from '@/components/layout/supplier-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate, formatDateTime, translatePaymentStatus } from '@/lib/utils';

interface SupplierPortalData {
  supplier: {
    code: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  summary: {
    openingBalance: number;
    totalPurchases: number;
    totalPaid: number;
    currentBalance: number;
    invoiceCount: number;
  };
  invoices: Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    dueDate: string | null;
    paymentStatus: string;
    total: number;
    paidAmount: number;
    warehouse: { name: string };
    items: Array<{
      quantity: number;
      total: number;
      product: { name: string; unitName: string };
    }>;
  }>;
  payments: Array<{
    id: string;
    receiptNo: string;
    amount: number;
    paymentType: string;
    paymentDate: string;
    purchaseInvoice: { invoiceNo: string } | null;
  }>;
}

export default function SupplierDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SupplierPortalData>({
    queryKey: ['supplier-portal'],
    queryFn: async () => {
      const response = await fetch('/api/supplier-portal');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر تحميل بيانات المورد');
      return body;
    },
  });

  return (
    <SupplierLayout>
      <div className="space-y-7 sm:space-y-9">
        <section className="relative isolate overflow-hidden rounded-[26px] bg-[#102f43] px-5 py-6 shadow-[0_18px_44px_rgba(16,47,67,0.15)] sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_10%_0%,rgba(31,155,119,0.4),transparent_43%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,0.04)_100%)]" />
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-[13px] font-semibold text-emerald-100">
                <Building2 className="h-4 w-4" /> بوابة حساب المورد
              </div>
              <h1 className="text-[23px] font-extrabold leading-relaxed text-white sm:text-[29px]">
                أهلاً، {data?.supplier.name ?? 'بكم'}
              </h1>
              <p className="mt-1 text-[14px] leading-7 text-slate-200/80">
                تابع فواتير التوريد والمدفوعات والرصيد الخاص بشركتك.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              loading={isFetching}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              className="border-white/20 bg-white/10 text-white shadow-none hover:border-white/35 hover:bg-white/15 hover:text-white"
            >
              تحديث البيانات
            </Button>
          </div>
        </section>

        {isError ? (
          <div className="rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
            <p className="text-[15px] font-bold text-slate-800">تعذر تحميل بيانات حساب المورد</p>
            <p className="mt-2 text-[13px] leading-6 text-slate-500">حاول تحديث الصفحة أو تواصل مع الشركة.</p>
            <Button className="mt-5" onClick={() => refetch()}>إعادة المحاولة</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="إجمالي فواتير التوريد" value={isLoading ? '…' : formatCurrency(data?.summary.totalPurchases)} subtitle={`${data?.summary.invoiceCount ?? 0} فاتورة معتمدة`} icon={<FileText className="h-5 w-5" />} variant="blue" />
              <StatCard title="إجمالي ما تم سداده" value={isLoading ? '…' : formatCurrency(data?.summary.totalPaid)} subtitle="المدفوع على فواتير التوريد" icon={<Banknote className="h-5 w-5" />} variant="emerald" />
              <StatCard title="الرصيد الافتتاحي" value={isLoading ? '…' : formatCurrency(data?.summary.openingBalance)} subtitle="الرصيد المسجل عند بدء التعامل" icon={<Wallet className="h-5 w-5" />} variant="amber" />
              <StatCard title="الرصيد المستحق" value={isLoading ? '…' : formatCurrency(data?.summary.currentBalance)} subtitle="المتبقي بعد احتساب المدفوعات" icon={<PackageCheck className="h-5 w-5" />} variant="rose" />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-[17px] font-extrabold text-slate-900">فواتير التوريد</h2>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">الفواتير المعتمدة المسجلة على حساب شركتك.</p>
                </div>
                <Badge variant="secondary">{data?.invoices.length ?? 0} فاتورة</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المخزن</TableHead>
                    <TableHead>الأصناف</TableHead>
                    <TableHead className="text-left">الإجمالي</TableHead>
                    <TableHead className="text-left">المدفوع</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-slate-500">جارٍ تحميل الفواتير…</TableCell></TableRow>
                  ) : data?.invoices.length ? data.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-bold text-emerald-800">{invoice.invoiceNo}</TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{invoice.warehouse.name}</TableCell>
                      <TableCell>
                        <div className="max-w-[320px] space-y-1.5 py-1">
                          {invoice.items.map((item, index) => (
                            <p key={`${invoice.id}-${index}`} className="leading-6 text-slate-600">
                              {item.product.name} · {item.quantity} {item.product.unitName}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-left font-mono font-bold">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="text-left font-mono text-emerald-700">{formatCurrency(invoice.paidAmount)}</TableCell>
                      <TableCell><Badge variant={invoice.paymentStatus === 'PAID' ? 'success' : invoice.paymentStatus === 'PARTIAL' ? 'warning' : 'danger'}>{translatePaymentStatus(invoice.paymentStatus)}</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="py-12 text-center text-[14px] text-slate-500">لا توجد فواتير توريد معتمدة حتى الآن.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <h2 className="text-[17px] font-extrabold text-slate-900">المدفوعات المستلمة</h2>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">سجل المبالغ التي تم صرفها لشركتك.</p>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>رقم السند</TableHead><TableHead>التاريخ</TableHead><TableHead>الفاتورة</TableHead><TableHead className="text-left">المبلغ</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-500">جارٍ تحميل المدفوعات…</TableCell></TableRow>
                    ) : data?.payments.length ? data.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono font-semibold">{payment.receiptNo}</TableCell>
                        <TableCell>{formatDateTime(payment.paymentDate)}</TableCell>
                        <TableCell>{payment.purchaseInvoice?.invoiceNo ?? '—'}</TableCell>
                        <TableCell className="text-left font-mono font-bold text-emerald-700">{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center text-[14px] text-slate-500">لا توجد مدفوعات مسجلة حتى الآن.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-[17px] font-extrabold text-slate-900">بيانات المورد</h2>
                <div className="mt-5 space-y-4 text-[14px]">
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="كود المورد" value={data?.supplier.code ?? '—'} />
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="مسؤول التواصل" value={data?.supplier.contactPerson ?? '—'} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="رقم الهاتف" value={data?.supplier.phone ?? '—'} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="العنوان" value={data?.supplier.address ?? '—'} />
                  {data?.supplier.email && <InfoRow icon={<span className="text-[12px] font-bold">@</span>} label="البريد الإلكتروني" value={data.supplier.email} />}
                </div>
                <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-[13px] leading-7 text-emerald-900">
                  هذه البوابة تعرض بيانات حساب شركتك للقراءة والمتابعة. لتعديل بيانات المورد، يرجى التواصل مع إدارة الشركة.
                </p>
              </section>
            </div>
          </>
        )}
      </div>
    </SupplierLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] leading-6 text-slate-500">{label}</p>
        <p className="break-words font-semibold leading-7 text-slate-800">{value}</p>
      </div>
    </div>
  );
}
