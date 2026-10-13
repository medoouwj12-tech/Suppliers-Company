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
      <div className="space-y-4 max-w-lg mx-auto pb-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/rep/dashboard" className="text-slate-500 hover:text-slate-900">
              <ChevronRight className="h-5 w-5" />
            </Link>
            <h2 className="text-lg font-bold text-slate-900">فاتورة بيع جديدة</h2>
          </div>
          <Badge variant="outline">نظام العهدة الفورية</Badge>
        </div>

        {/* 1. اختيار التاجر */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Store className="h-4 w-4 text-[#1e3a5f]" />
            الخطوة 1: اختيار التاجر / المحل
          </h3>

          {selectedMerchant ? (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-blue-950">{selectedMerchant.businessName}</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  {selectedMerchant.ownerName} • {selectedMerchant.phone}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">الرصيد الحالي:</span>
                  <span className="text-xs font-bold text-rose-700 font-mono">
                    {formatCurrency(selectedMerchant.currentBalance)}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
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
                  placeholder="ابحث باسم المحل أو التاجر أو الهاتف..."
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
                        <span className="text-slate-400 text-[11px]">{m.ownerName || m.phone}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">{m.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. إضافة الأصناف من العهدة */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-[#1e3a5f]" />
              الخطوة 2: إضافة الأصناف من عهدتك
            </h3>
            <span className="text-[11px] text-blue-600 font-semibold">
              {inventoryData?.length ?? 0} صنف متاح
            </span>
          </div>

          {/* Quick Item Picker Dropdown / Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {inventoryData?.map((prod: any) => (
              <button
                key={prod.productId}
                type="button"
                onClick={() => handleAddItem(prod)}
                disabled={prod.totalQuantityUnits <= 0}
                className="shrink-0 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-right text-xs transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span className="font-bold text-slate-900 block truncate max-w-[140px]">{prod.productName}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  متاح: {prod.cartons} {prod.cartonName} و {prod.remainderUnits} {prod.unitName}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 block mt-1 font-mono">
                  {prod.sellingPriceCarton} ج.م / كرتونة
                </span>
              </button>
            ))}
          </div>

          {/* Items In Invoice */}
          {items.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              اضغط على صنف من القائمة أعلاه لإضافته للفاتورة
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {items.map((item) => {
                const totalReq = item.cartons * item.unitsPerCarton + item.units;
                const isOver = totalReq > item.availableUnits;
                const itemTotal = item.cartons * item.cartonPrice + item.units * item.unitPrice - item.itemDiscount;

                return (
                  <div key={item.productId} className="pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          الكرتونة بها {item.unitsPerCarton} {item.unitName} • متاح: {item.availableUnits} {item.unitName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Cartons and Units inputs with big controls */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">
                          عدد الكراتين ({item.cartonPrice} ج.م)
                        </label>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'cartons', item.cartons - 1)}
                            className="h-8 w-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 active:bg-slate-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-sm font-mono">{item.cartons}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'cartons', item.cartons + 1)}
                            className="h-8 w-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 active:bg-slate-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">
                          أكياس مفردة ({item.unitPrice} ج.م)
                        </label>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'units', item.units - 1)}
                            className="h-8 w-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 active:bg-slate-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-sm font-mono">{item.units}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.productId, 'units', item.units + 1)}
                            className="h-8 w-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 active:bg-slate-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">
                        إجمالي الوحدات: <strong className="font-mono">{totalReq}</strong> {item.unitName}
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(itemTotal)}
                      </span>
                    </div>

                    {isOver && (
                      <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500">الخطوة 3: التسوية المالية والسداد</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخصم (إن وجد)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المسدد الآن</label>
                <input
                  type="number"
                  min="0"
                  max={finalTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2.5 text-sm border border-emerald-300 bg-emerald-50/50 rounded-xl font-bold text-emerald-900 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Quick full pay button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPaidAmount(finalTotal)}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                سداد كامل المبلغ كاش ({formatCurrency(finalTotal)})
              </button>
            </div>

            {/* Final Calculation Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-200/80 text-sm">
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
              <div className="flex justify-between text-base font-extrabold border-t border-slate-200 pt-2 text-slate-900">
                <span>صافي الفاتورة:</span>
                <span className="text-blue-900 font-mono">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>المدفوع نقداً:</span>
                <span className="font-mono">{formatCurrency(paidAmount)}</span>
              </div>
              {remainingAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>المتبقي على حساب التاجر (آجل):</span>
                  <span className="font-mono">{formatCurrency(remainingAmount)}</span>
                </div>
              )}
            </div>

            {/* Big Submit Button */}
            <Button
              className="w-full h-14 text-base font-extrabold rounded-2xl shadow-lg mt-2 bg-[#1e3a5f] hover:bg-[#16304f]"
              onClick={handleSubmitInvoice}
              loading={isSubmitting}
              leftIcon={<CheckCircle2 className="h-5 w-5" />}
            >
              تأكيد وحفظ الفاتورة ({formatCurrency(finalTotal)})
            </Button>
          </div>
        )}
      </div>
    </RepLayout>
  );
}
