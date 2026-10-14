'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { RepLayout } from '@/components/layout/rep-layout';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Package, Search, ChevronRight, AlertCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function RepInventoryPage() {
  const { data: session } = useSession();
  const repId = session?.user?.representativeId;
  const [search, setSearch] = React.useState('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['rep-inventory', repId],
    queryFn: async () => {
      if (!repId) return [];
      const res = await fetch(`/api/representatives/${repId}/inventory`);
      if (!res.ok) throw new Error('فشل جلب العهدة');
      return res.json();
    },
    enabled: !!repId,
  });

  const filtered = React.useMemo(() => {
    if (!inventory) return [];
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(
      (item: any) =>
        item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const totalValue = inventory?.reduce((sum: number, item: any) => sum + item.totalValue, 0) ?? 0;
  const totalUnits = inventory?.reduce((sum: number, item: any) => sum + item.totalQuantityUnits, 0) ?? 0;

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
            <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight">البضاعة في عهدتي</h2>
          </div>
          <Badge variant="info">{inventory?.length ?? 0} أصناف</Badge>
        </div>

        {/* Total Custody Summary Banner */}
        <div className="rounded-2xl p-5 shadow-[0_2px_12px_rgba(30,58,95,0.25)] flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a7a 100%)' }}>
          <div>
            <span className="text-[11px] text-blue-200/80 block mb-1">إجمالي الوحدات في سيارتك</span>
            <span className="text-[22px] font-extrabold text-white">{totalUnits} وحدة</span>
          </div>
          <div className="text-left">
            <span className="text-[11px] text-blue-200/80 block mb-1">القيمة بسعر البيع</span>
            <span className="text-[22px] font-extrabold text-white">{formatCurrency(totalValue)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في أصناف عهدتك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-3 text-[13px] border border-slate-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-white transition-colors"
          />
        </div>

        {/* Inventory Items List */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-[12px]">جاري تحميل الأصناف...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/70 p-6 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 mx-auto">
              <Package className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-[14px] font-bold text-slate-600">لا توجد بضائع في عهدتك حالياً</p>
            <p className="text-[12px] text-slate-400">
              قم بالتواصل مع مدير المخزن لتسجيل إذن تسليم بضاعة جديد
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item: any) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-[14px] text-slate-900">{item.productName}</h3>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{item.sku}</span>
                  </div>
                  <Badge variant={item.totalQuantityUnits > 0 ? 'success' : 'danger'}>
                    {item.totalQuantityUnits > 0 ? 'متاح' : 'نفذ'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#f8fafc]/70 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">الكراتين الكاملة:</span>
                    <span className="font-extrabold text-slate-900 text-[16px] font-mono">
                      {item.cartons} {item.cartonName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">الوحدات المفردة:</span>
                    <span className="font-extrabold text-[#1e3a5f] text-[16px] font-mono">
                      {item.remainderUnits} {item.unitName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[12px] pt-2 border-t border-slate-100">
                  <span className="text-slate-500">
                    الكرتونة: <strong className="font-mono text-slate-700">{item.sellingPriceCarton} ج.م</strong>
                  </span>
                  <span className="text-slate-500">
                    الوحدة: <strong className="font-mono text-slate-700">{item.sellingPriceUnit} ج.م</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RepLayout>
  );
}
