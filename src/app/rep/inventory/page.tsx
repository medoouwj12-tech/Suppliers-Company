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
      <div className="space-y-4 max-w-lg mx-auto pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/rep/dashboard" className="text-slate-500 hover:text-slate-900">
              <ChevronRight className="h-5 w-5" />
            </Link>
            <h2 className="text-lg font-bold text-slate-900">البضاعة في عهدتي</h2>
          </div>
          <Badge variant="default">{inventory?.length ?? 0} أصناف</Badge>
        </div>

        {/* Total Custody Summary Banner */}
        <div className="bg-[#1e3a5f] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-200 block">إجمالي الوحدات في سيارتك</span>
            <span className="text-xl font-extrabold">{totalUnits} وحدة</span>
          </div>
          <div className="text-left">
            <span className="text-xs text-blue-200 block">القيمة بسعر البيع</span>
            <span className="text-xl font-extrabold">{formatCurrency(totalValue)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في أصناف عهدتك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none bg-white"
          />
        </div>

        {/* Inventory Items List */}
        {isLoading ? (
          <div className="text-center py-10 text-slate-400 text-sm">جاري تحميل الأصناف...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">لا توجد بضائع في عهدتك حالياً</p>
            <p className="text-xs text-slate-400">
              قم بالتواصل مع مدير المخزن لتسجيل إذن تسليم بضاعة جديد
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item: any) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.productName}</h3>
                    <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                  </div>
                  <Badge variant={item.totalQuantityUnits > 0 ? 'success' : 'danger'}>
                    {item.totalQuantityUnits > 0 ? 'متاح' : 'نفذ'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الكراتين الكاملة:</span>
                    <span className="font-extrabold text-slate-900 text-base font-mono">
                      {item.cartons} {item.cartonName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الوحدات المفردة:</span>
                    <span className="font-extrabold text-blue-900 text-base font-mono">
                      {item.remainderUnits} {item.unitName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">
                    الكرتونة: <strong className="font-mono">{item.sellingPriceCarton} ج.م</strong>
                  </span>
                  <span className="text-slate-500">
                    الوحدة: <strong className="font-mono">{item.sellingPriceUnit} ج.م</strong>
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
