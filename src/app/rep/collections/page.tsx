'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RepLayout } from '@/components/layout/rep-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Store, Search, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function RepCollectionsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();
  const repId = session?.user?.representativeId;

  const [merchantSearch, setMerchantSearch] = React.useState('');
  const [selectedMerchant, setSelectedMerchant] = React.useState<any>(null);
  const [amount, setAmount] = React.useState<number>(0);
  const [paymentType, setPaymentType] = React.useState<'CASH' | 'BANK_TRANSFER' | 'CHECK'>('CASH');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // جلب قائمة التجار التابعين للمندوب
  const { data: merchantsData } = useQuery({
    queryKey: ['rep-merchants', repId],
    queryFn: async () => {
      if (!repId) return { data: [] };
      const res = await fetch(`/api/merchants?representativeId=${repId}`);
      if (!res.ok) throw new Error('فشل جلب قائمة التجار');
      return res.json();
    },
    enabled: !!repId,
  });

  const filteredMerchants = React.useMemo(() => {
    if (!merchantsData?.data) return [];
    if (!merchantSearch) return merchantsData.data;
    const q = merchantSearch.toLowerCase();
    return merchantsData.data.filter(
      (m: any) =>
        m.businessName.toLowerCase().includes(q) ||
        m.ownerName?.toLowerCase().includes(q) ||
        m.phone?.includes(q)
    );
  }, [merchantsData, merchantSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMerchant) {
      toastError('يرجى اختيار التاجر أولاً');
      return;
    }

    if (amount <= 0) {
      toastError('المبلغ غير صالح', 'يرجى إدخال مبلغ تحصيل أكبر من صفر');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: selectedMerchant.id,
          representativeId: repId,
          amount,
          paymentType,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ سند القبض');

      success('تم تسجيل التحصيل بنجاح!', `سند رقم: ${data.receiptNo}`);
      router.push('/rep/dashboard');
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء حفظ التحصيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RepLayout>
      <div className="space-y-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/rep/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </Link>
            <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight">تسجيل تحصيل دفعة</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. اختيار التاجر */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Store className="h-4 w-4 text-blue-600" />
              </div>
              التاجر المستلم منه المبلغ
            </h3>

            {selectedMerchant ? (
              <div className="p-4 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-[14px] text-blue-950">{selectedMerchant.businessName}</h4>
                  <p className="text-[12px] text-blue-700/80 mt-0.5">{selectedMerchant.ownerName}</p>
                  <p className="text-[12px] font-bold text-rose-700 mt-2">
                    الدين المستحق: {formatCurrency(selectedMerchant.currentBalance)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedMerchant(null)}
                  className="bg-white shrink-0"
                >
                  تغيير
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث باسم المحل أو التاجر..."
                    value={merchantSearch}
                    onChange={(e) => setMerchantSearch(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 text-[13px] border border-slate-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-[#f8fafc]/50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl">
                  {filteredMerchants.length === 0 ? (
                    <p className="text-center py-6 text-[12px] text-slate-400">لا يوجد تاجر مطابق</p>
                  ) : (
                    filteredMerchants.map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMerchant(m)}
                        className="w-full px-4 py-3 text-right hover:bg-blue-50/50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-[13px] text-slate-900 block">{m.businessName}</span>
                          <span className="text-rose-600 font-bold text-[11px] mt-0.5 block">
                            مستحق: {formatCurrency(m.currentBalance)}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{m.code}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. بيانات السند */}
          {selectedMerchant && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
              <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                بيانات سند القبض
              </h3>

              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                  المبلغ المحصل (ج.م) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="أدخل المبلغ المحصل..."
                  className="w-full p-4 text-[20px] font-extrabold border border-emerald-300/80 bg-emerald-50/50 rounded-xl focus:border-emerald-500 focus:outline-none font-mono text-emerald-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-2">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'CASH', label: 'نقداً كاش' },
                    { id: 'BANK_TRANSFER', label: 'تحويل بنكي' },
                    { id: 'CHECK', label: 'شيك' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentType(m.id as any)}
                      className={`py-3 px-2 rounded-xl border text-[12px] font-bold transition-all active:scale-95 ${
                        paymentType === m.id
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-[0_2px_8px_rgba(30,58,95,0.25)]'
                          : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">ملاحظات التحصيل</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل إضافية عن السداد..."
                  className="w-full p-3 text-[13px] border border-slate-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-[#f8fafc]/50 focus:bg-white transition-colors"
                />
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full h-14 text-[15px] font-extrabold rounded-2xl shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                leftIcon={<CheckCircle2 className="h-5 w-5" />}
              >
                تأكيد تسجيل سند القبض ({formatCurrency(amount)})
              </Button>
            </div>
          )}
        </form>
      </div>
    </RepLayout>
  );
}
