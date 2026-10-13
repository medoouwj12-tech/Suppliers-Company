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
      <div className="space-y-4 max-w-lg mx-auto pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/rep/dashboard" className="text-slate-500 hover:text-slate-900">
              <ChevronRight className="h-5 w-5" />
            </Link>
            <h2 className="text-lg font-bold text-slate-900">تسجيل تحصيل دفعة</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. اختيار التاجر */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#1e3a5f]" />
              التاجر المستلم منه المبلغ
            </h3>

            {selectedMerchant ? (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-blue-950">{selectedMerchant.businessName}</h4>
                  <p className="text-xs text-blue-700 mt-0.5">{selectedMerchant.ownerName}</p>
                  <p className="text-xs font-bold text-rose-700 mt-1">
                    الدين المستحق: {formatCurrency(selectedMerchant.currentBalance)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedMerchant(null)}
                  className="bg-white text-xs h-8"
                >
                  تغيير
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث باسم المحل أو التاجر..."
                    value={merchantSearch}
                    onChange={(e) => setMerchantSearch(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {filteredMerchants.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-400">لا يوجد تاجر مطابق</p>
                  ) : (
                    filteredMerchants.map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMerchant(m)}
                        className="w-full p-2.5 text-right hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{m.businessName}</span>
                          <span className="text-rose-600 font-bold text-[11px]">
                            مستحق: {formatCurrency(m.currentBalance)}
                          </span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">{m.code}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. بيانات السند */}
          {selectedMerchant && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full p-3 text-lg font-bold border-2 border-emerald-300 bg-emerald-50/40 rounded-xl focus:border-emerald-600 focus:outline-none font-mono text-emerald-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'نقداً كاش' },
                    { id: 'BANK_TRANSFER', label: 'تحويل بنكي / محفظة' },
                    { id: 'CHECK', label: 'شيك' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentType(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        paymentType === m.id
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التحصيل</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل إضافية عن السداد..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full h-12 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700"
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
