'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RepLayout } from '@/components/layout/rep-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  Store,
  Package,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface SelectedItem {
  productId: string;
  name: string;
  sku: string;
  unitName: string;
  cartonName: string;
  unitsPerCarton: number;
  availableUnits: number;
  cartonPrice: number;
  unitPrice: number;
  cartons: number;
  units: number;
  itemDiscount: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();
  const repId = session?.user?.representativeId;

  // Search and selected merchant
  const [merchantSearch, setMerchantSearch] = React.useState('');
  const [selectedMerchant, setSelectedMerchant] = React.useState<any>(null);

  // Cart items
  const [items, setItems] = React.useState<SelectedItem[]>([]);

  // Financial fields
  const [discount, setDiscount] = React.useState<number>(0);
  const [paidAmount, setPaidAmount] = React.useState<number>(0);
  const [paymentType, setPaymentType] = React.useState<'CASH' | 'CREDIT' | 'PARTIAL' | 'TRANSFER'>('CASH');
  const [notes, setNotes] = React.useState('');

  // Submitting state & result
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createdInvoice, setCreatedInvoice] = React.useState<any>(null);
  const [idempotencyKey] = React.useState(() => Math.random().toString(36).substring(2) + Date.now().toString(36));

  // 1. جلب قائمة التجار التابعين للمندوب
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

  // 2. جلب عهدة المندوب من البضائع
  const { data: inventoryData } = useQuery({
    queryKey: ['rep-inventory', repId],
    queryFn: async () => {
      if (!repId) return [];
      const res = await fetch(`/api/representatives/${repId}/inventory`);
      if (!res.ok) throw new Error('فشل جلب العهدة');
      return res.json();
    },
    enabled: !!repId,
  });

  // تصفية التجار بالبحث
  const filteredMerchants = React.useMemo(() => {
    if (!merchantsData?.data) return [];
    if (!merchantSearch) return merchantsData.data;
    const q = merchantSearch.toLowerCase();
    return merchantsData.data.filter(
      (m: any) =>
        m.businessName.toLowerCase().includes(q) ||
        m.ownerName?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.code?.toLowerCase().includes(q)
    );
  }, [merchantsData, merchantSearch]);

  // إضافة صنف للفاتورة
  const handleAddItem = (product: any) => {
    const existing = items.find((i) => i.productId === product.productId);
    if (existing) {
      toastError('الصنف مضاف بالفعل', 'يمكنك تعديل الكمية مباشرة من الجدول');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: product.productId,
        name: product.productName,
        sku: product.sku,
        unitName: product.unitName,
        cartonName: product.cartonName,
        unitsPerCarton: product.unitsPerCarton,
        availableUnits: product.totalQuantityUnits,
        cartonPrice: product.sellingPriceCarton,
        unitPrice: product.sellingPriceUnit,
        cartons: 1,
        units: 0,
        itemDiscount: 0,
      },
    ]);
  };

  const handleUpdateItem = (productId: string, field: 'cartons' | 'units' | 'itemDiscount', value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        const updated = { ...item, [field]: Math.max(0, value) };
        const totalUnitsReq = updated.cartons * updated.unitsPerCarton + updated.units;

        if (totalUnitsReq > updated.availableUnits) {
          toastError(
            'تجاوز رصيد العهدة',
            `المتاح في عهدتك فقط ${updated.availableUnits} وحدة (${Math.floor(updated.availableUnits / updated.unitsPerCarton)} كرتونة)`
          );
        }

        return updated;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // الحسابات المالية اللحظية
  const subtotal = React.useMemo(() => {
    return items.reduce((sum, item) => {
      const itemSub = item.cartons * item.cartonPrice + item.units * item.unitPrice - item.itemDiscount;
      return sum + Math.max(0, itemSub);
    }, 0);
  }, [items]);

  const finalTotal = Math.max(0, subtotal - discount);
  const remainingAmount = Math.max(0, finalTotal - paidAmount);

  // تحديث نوع الدفع التلقائي بناءً على المدفوع
  React.useEffect(() => {
    if (paidAmount >= finalTotal && finalTotal > 0) {
      setPaymentType('CASH');
    } else if (paidAmount > 0) {
      setPaymentType('PARTIAL');
    } else {
      setPaymentType('CREDIT');
    }
  }, [paidAmount, finalTotal]);

  // إرسال الفاتورة لقاعدة البيانات
  const handleSubmitInvoice = async () => {
    if (!selectedMerchant) {
      toastError('يرجى اختيار التاجر أولاً');
      return;
    }

    if (items.length === 0) {
      toastError('يرجى إضافة صنف واحد على الأقل للفاتورة');
      return;
    }

    // فحص الكميات
    for (const item of items) {
      const totalUnits = item.cartons * item.unitsPerCarton + item.units;
      if (totalUnits <= 0) {
        toastError('كمية غير صالحة', `يرجى تحديد كمية للصنف [${item.name}]`);
        return;
      }
      if (totalUnits > item.availableUnits) {
        toastError('كمية غير متاحة', `الكمية المطلوبة من [${item.name}] أكبر من المتاح في عهدتك`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        merchantId: selectedMerchant.id,
        representativeId: repId,
        idempotencyKey,
        paymentType,
        paidAmount,
        discount,
        notes,
        items: items.map((i) => ({
          productId: i.productId,
          cartons: i.cartons,
          units: i.units,
          unitPrice: i.unitPrice,
          cartonPrice: i.cartonPrice,
          discount: i.itemDiscount,
        })),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ الفاتورة');
      }

      success('تم إصدار الفاتورة بنجاح!', `رقم الفاتورة: ${data.invoiceNo}`);
      setCreatedInvoice(data);
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // شاشة النجاح بعد الحفظ
  if (createdInvoice) {
    return (
      <RepLayout>
        <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-lg text-center space-y-5 animate-slide-in">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900">تم حفظ واعتماد الفاتورة!</h2>
            <p className="text-sm text-slate-500 mt-1 font-mono font-bold text-blue-900">
              {createdInvoice.invoiceNo}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl text-right space-y-2 text-sm border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">التاجر:</span>
              <span className="font-bold">{createdInvoice.merchant.businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">إجمالي الفاتورة:</span>
              <span className="font-bold">{formatCurrency(createdInvoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المبلغ المدفوع:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(createdInvoice.paidAmount)}</span>
            </div>
            {createdInvoice.remainingAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">المتبقي كدين:</span>
                <span className="font-bold text-rose-600">{formatCurrency(createdInvoice.remainingAmount)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Link href={`/sales/${createdInvoice.id}`} className="block">
              <Button className="w-full" leftIcon={<Printer className="h-4 w-4" />}>
                عرض وطباعة الفاتورة (PDF)
              </Button>
            </Link>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCreatedInvoice(null);
                setSelectedMerchant(null);
                setItems([]);
                setDiscount(0);
                setPaidAmount(0);
                setNotes('');
              }}
            >
              تسجيل فاتورة جديدة لتاجر آخر
            </Button>

            <Link href="/rep/dashboard" className="block">
              <Button variant="ghost" className="w-full text-slate-500">
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout>
      <div className="space-y-6 pb-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/rep/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </Link>
            <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight">فاتورة بيع جديدة</h2>
          </div>
          <Badge variant="info">نظام العهدة</Badge>
        </div>

        {/* 1. اختيار التاجر */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Store className="h-4 w-4 text-blue-600" />
            </div>
            الخطوة 1: اختيار التاجر
          </h3>

          {selectedMerchant ? (
            <div className="p-4 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-bold text-[14px] text-blue-950">{selectedMerchant.businessName}</h4>
                <p className="text-[12px] text-blue-700/80 mt-0.5">
                  {selectedMerchant.ownerName} • {selectedMerchant.phone}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">الرصيد الحالي:</span>
                  <span className="text-[12px] font-bold text-rose-700 font-mono">
                    {formatCurrency(selectedMerchant.currentBalance)}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
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
                  placeholder="ابحث باسم المحل أو التاجر أو الهاتف..."
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
                        <span className="text-slate-400 text-[11px]">{m.ownerName || m.phone}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{m.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. إضافة الأصناف من العهدة */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              الخطوة 2: إضافة الأصناف
            </h3>
            <span className="text-[12px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              {inventoryData?.length ?? 0} صنف
            </span>
          </div>

          {/* Quick Item Picker */}
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {inventoryData?.map((prod: any) => (
              <button
                key={prod.productId}
                type="button"
                onClick={() => handleAddItem(prod)}
                disabled={prod.totalQuantityUnits <= 0}
                className="shrink-0 p-3.5 rounded-xl border border-slate-200 bg-[#f8fafc] hover:bg-white hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-right transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none min-w-[160px]"
              >
                <span className="font-bold text-[12px] text-slate-900 block truncate">{prod.productName}</span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  متاح: {prod.cartons} {prod.cartonName}
                </span>
                <span className="text-[12px] font-bold text-emerald-700 block mt-1.5 font-mono">
                  {prod.sellingPriceCarton} ج.م
                </span>
              </button>
            ))}
          </div>

          {/* Items In Invoice */}
          {items.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[12px]">
              اضغط على صنف من القائمة أعلاه لإضافته
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const totalReq = item.cartons * item.unitsPerCarton + item.units;
                const isOver = totalReq > item.availableUnits;
                const itemTotal = item.cartons * item.cartonPrice + item.units * item.unitPrice - item.itemDiscount;

                return (
                  <div key={item.productId} className="p-4 bg-[#f8fafc]/70 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[13px] text-slate-900">{item.name}</h4>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {item.unitsPerCarton} {item.unitName}/كرتونة • متاح: {item.availableUnits}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                        <label className="text-[11px] text-slate-500 font-semibold block mb-2">
                          كراتين ({item.cartonPrice} ج.م)
                        </label>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'cartons', item.cartons - 1)}
                            className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-[16px] font-mono text-slate-900">{item.cartons}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'cartons', item.cartons + 1)}
                            className="h-9 w-9 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center font-bold hover:bg-[#163050] active:scale-95 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                        <label className="text-[11px] text-slate-500 font-semibold block mb-2">
                          أكياس ({item.unitPrice} ج.م)
                        </label>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'units', item.units - 1)}
                            className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-[16px] font-mono text-slate-900">{item.units}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'units', item.units + 1)}
                            className="h-9 w-9 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center font-bold hover:bg-[#163050] active:scale-95 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[12px] pt-1">
                      <span className="text-slate-500">
                        الإجمالي: <strong className="font-mono text-slate-700">{totalReq}</strong> وحدة
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-[14px]">
                        {formatCurrency(itemTotal)}
                      </span>
                    </div>

                    {isOver && (
                      <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        الكمية تتجاوز الرصيد المتاح في عهدتك!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. الخصم والدفع */}
        {items.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              الخطوة 3: التسوية المالية
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">الخصم</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-3 text-[13px] border border-slate-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-[#f8fafc]/50 focus:bg-white transition-colors"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">المدفوع الآن</label>
                <input
                  type="number"
                  min="0"
                  max={finalTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-3 text-[13px] border border-emerald-300/80 bg-emerald-50/50 rounded-xl font-bold text-emerald-900 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPaidAmount(finalTotal)}
              className="w-full text-[12px] text-blue-600 font-bold hover:text-blue-800 py-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              سداد كامل المبلغ ({formatCurrency(finalTotal)})
            </button>

            {/* Summary */}
            <div className="bg-[#f8fafc] p-4 rounded-xl space-y-2.5 border border-slate-100 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي البنود:</span>
                <span className="font-bold font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم:</span>
                  <span className="font-bold font-mono">- {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-extrabold border-t border-slate-200 pt-2.5 text-slate-900">
                <span>الإجمالي:</span>
                <span className="text-[#1e3a5f] font-mono">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>المدفوع:</span>
                <span className="font-mono">{formatCurrency(paidAmount)}</span>
              </div>
              {remainingAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>المتبقي (آجل):</span>
                  <span className="font-mono">{formatCurrency(remainingAmount)}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full h-14 text-[15px] font-extrabold rounded-2xl shadow-[0_2px_12px_rgba(30,58,95,0.3)]"
              onClick={handleSubmitInvoice}
              loading={isSubmitting}
              leftIcon={<CheckCircle2 className="h-5 w-5" />}
            >
              حفظ الفاتورة ({formatCurrency(finalTotal)})
            </Button>
          </div>
        )}
      </div>
    </RepLayout>
  );
}
