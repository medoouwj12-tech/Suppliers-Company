'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart3, TrendingUp, Clock, Package, Printer, Download, RefreshCw, Wallet } from 'lucide-react';

const asDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function ReportsPage() {
  const [activeReport, setActiveReport] = React.useState<'sales' | 'debts' | 'inventory'>('sales');
  const now = new Date();
  const [from, setFrom] = React.useState(asDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = React.useState(asDateInput(now));

  // قراءة ?tab= من الرابط
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'sales' || tab === 'debts' || tab === 'inventory') setActiveReport(tab);
  }, []);

  // Sales report query
  const { data: salesReport, isLoading: isSalesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['report-sales', from, to],
    queryFn: async () => {
      const res = await fetch(`/api/reports/sales?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('فشل جلب تقرير المبيعات');
      return res.json();
    },
    enabled: activeReport === 'sales',
  });

  // Debts report query
  const { data: debtsReport, isLoading: isDebtsLoading, refetch: refetchDebts } = useQuery({
    queryKey: ['report-debts'],
    queryFn: async () => {
      const res = await fetch('/api/reports/debts');
      if (!res.ok) throw new Error('فشل جلب تقرير الديون');
      return res.json();
    },
    enabled: activeReport === 'debts',
  });

  // Inventory report query
  const { data: inventoryReport, isLoading: isInventoryLoading, refetch: refetchInventory } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/reports/inventory');
      if (!res.ok) throw new Error('فشل جلب تقرير المخزون');
      return res.json();
    },
    enabled: activeReport === 'inventory',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout title="مركز التقارير المالية والمخزنية" breadcrumb="التقارير">
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveReport('sales')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeReport === 'sales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              تقرير المبيعات والأرباح
            </button>
            <button
              onClick={() => setActiveReport('debts')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeReport === 'debts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Clock className="h-4 w-4" />
              تقرير الديون وأعمار الديون
            </button>
            <button
              onClick={() => setActiveReport('inventory')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeReport === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Package className="h-4 w-4" />
              تقرير تقييم المخزون والعهد
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeReport === 'sales') refetchSales();
                if (activeReport === 'debts') refetchDebts();
                if (activeReport === 'inventory') refetchInventory();
              }}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              تحديث
            </Button>
            <Button size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />} className="bg-[#103c47]">
              طباعة التقرير
            </Button>
          </div>
        </div>

        {/* ==================== Report 1: Sales & Profits ==================== */}
        {activeReport === 'sales' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm no-print">
              <div className="w-48"><label className="mb-2 block text-sm font-semibold text-slate-700">من تاريخ</label><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></div>
              <div className="w-48"><label className="mb-2 block text-sm font-semibold text-slate-700">إلى تاريخ</label><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></div>
              <div className="mr-auto flex items-center gap-2 text-sm font-medium text-slate-600"><Wallet className="h-4 w-4 text-emerald-700" />صافي الربح للفترة بعد خصم تكلفة البضاعة والمصروفات التشغيلية</div>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">إجمالي المبيعات</span>
                <span className="text-xl font-black text-blue-950 font-mono mt-1 block">
                  {formatCurrency(salesReport?.summary?.totalSales ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {salesReport?.summary?.totalInvoices ?? 0} فواتير معتمدة
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">تكلفة البضاعة المباعة (COGS)</span>
                <span className="text-xl font-black text-slate-700 font-mono mt-1 block">
                  {formatCurrency(salesReport?.summary?.totalCost ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">بسعر شراء المصنع</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">مجمل الربح قبل المصروفات</span>
                <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                  {formatCurrency(salesReport?.summary?.grossProfit ?? 0)}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                  قبل الرواتب والإيجار والمرافق
                </span>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
                <span className="text-xs text-amber-800 font-bold block">المصروفات التشغيلية</span>
                <span className="text-xl font-black text-amber-900 font-mono mt-1 block">{formatCurrency(salesReport?.summary?.profitExpenses ?? 0)}</span>
                <span className="text-[11px] text-amber-800 mt-1 block">السلف المعلقة لا تخصم</span>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                <span className="text-xs text-emerald-800 font-bold block">صافي الربح بعد المصروفات</span>
                <span className="text-xl font-black text-emerald-900 font-mono mt-1 block">{formatCurrency(salesReport?.summary?.netProfit ?? 0)}</span>
                <span className="text-[11px] text-emerald-700 font-bold mt-1 block">هامش صافي: {salesReport?.summary?.profitMargin ?? 0}%</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">الديون المتبقية من المبيعات</span>
                <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                  {formatCurrency(salesReport?.summary?.totalRemaining ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">آجل لدى التجار</span>
              </div>
            </div>

            {salesReport?.summary?.expensesByCategory?.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 font-extrabold text-slate-900">تفصيل المصروفات حسب البند</h3><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{salesReport.summary.expensesByCategory.map((item: any) => <div key={item.name} className="rounded-xl bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-600">{item.name}{!item.affectsProfit && <span className="mr-1 text-[11px] text-amber-700">(سلفة لا تخصم)</span>}</div><div className="mt-1 font-mono font-black text-slate-900">{formatCurrency(item.amount)}</div></div>)}</div></div>}

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>التاجر</TableHead>
                    <TableHead>المندوب</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-left">قيمة البيع</TableHead>
                    <TableHead className="text-left">تكلفة الشراء</TableHead>
                    <TableHead className="text-left font-bold text-emerald-800">مجمل ربح الفاتورة</TableHead>
                    <TableHead className="text-left">المسدد</TableHead>
                    <TableHead className="text-left">المتبقي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSalesLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                        جاري إعداد التقرير...
                      </TableCell>
                    </TableRow>
                  ) : salesReport?.invoices?.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-bold text-blue-900">{inv.invoiceNo}</TableCell>
                      <TableCell className="font-bold">{inv.merchantName}</TableCell>
                      <TableCell className="text-slate-600">{inv.representativeName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{formatDate(inv.invoiceDate)}</TableCell>
                      <TableCell className="font-mono text-left font-bold">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="font-mono text-left text-slate-500">{formatCurrency(inv.cost)}</TableCell>
                      <TableCell className="font-mono text-left font-black text-emerald-700 bg-emerald-50/50">
                        {formatCurrency(inv.estimatedProfit)}
                      </TableCell>
                      <TableCell className="font-mono text-left text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                      <TableCell className={`font-mono text-left ${inv.remainingAmount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        {formatCurrency(inv.remainingAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ==================== Report 2: Debt Aging ==================== */}
        {activeReport === 'debts' && (
          <div className="space-y-6">
            {/* Aging Bracket Highlights */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">تحليل أعمار ديون التجار (Debt Aging)</h3>
                  <p className="text-xs text-slate-500">تصنيف المبالغ المستحقة وفق الفترات الزمنية لتقييم السيولة</p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-slate-400 block">إجمالي الديون القائمة</span>
                  <span className="text-xl font-black text-rose-700">
                    {formatCurrency(debtsReport?.summary?.grandTotalDebt ?? 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] text-emerald-800 font-bold block">حديثة (0 - 30 يوم)</span>
                  <span className="text-base font-black text-emerald-900 font-mono mt-1 block">
                    {formatCurrency(debtsReport?.summary?.agingSummary?.age0to30 ?? 0)}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[11px] text-blue-800 font-bold block">متوسطة (31 - 60 يوم)</span>
                  <span className="text-base font-black text-blue-900 font-mono mt-1 block">
                    {formatCurrency(debtsReport?.summary?.agingSummary?.age31to60 ?? 0)}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[11px] text-amber-800 font-bold block">متأخرة (61 - 90 يوم)</span>
                  <span className="text-base font-black text-amber-900 font-mono mt-1 block">
                    {formatCurrency(debtsReport?.summary?.agingSummary?.age61to90 ?? 0)}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[11px] text-rose-800 font-bold block">حرجة (أكثر من 90 يوم)</span>
                  <span className="text-base font-black text-rose-900 font-mono mt-1 block">
                    {formatCurrency(debtsReport?.summary?.agingSummary?.ageOver90 ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Debtors List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>كود التاجر</TableHead>
                    <TableHead>اسم المحل / التاجر</TableHead>
                    <TableHead>المندوب المسؤول</TableHead>
                    <TableHead className="text-left font-bold">إجمالي الدين المستحق</TableHead>
                    <TableHead className="text-left">0 - 30 يوم</TableHead>
                    <TableHead className="text-left">31 - 60 يوم</TableHead>
                    <TableHead className="text-left">61 - 90 يوم</TableHead>
                    <TableHead className="text-left font-bold text-rose-700">+90 يوم</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDebtsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                        جاري إعداد تقرير الديون...
                      </TableCell>
                    </TableRow>
                  ) : debtsReport?.merchants?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                        لا توجد ديون مستحقة على التجار
                      </TableCell>
                    </TableRow>
                  ) : (
                    debtsReport?.merchants?.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono font-bold text-blue-900">{m.code}</TableCell>
                        <TableCell className="font-bold text-slate-900">{m.businessName}</TableCell>
                        <TableCell className="text-slate-600">{m.representativeName}</TableCell>
                        <TableCell className="font-mono text-left font-black text-slate-900 text-sm bg-slate-50">
                          {formatCurrency(m.totalDebt)}
                        </TableCell>
                        <TableCell className="font-mono text-left text-emerald-700">{formatCurrency(m.age0to30)}</TableCell>
                        <TableCell className="font-mono text-left text-blue-800">{formatCurrency(m.age31to60)}</TableCell>
                        <TableCell className="font-mono text-left text-amber-700">{formatCurrency(m.age61to90)}</TableCell>
                        <TableCell className="font-mono text-left font-bold text-rose-700">{formatCurrency(m.ageOver90)}</TableCell>
                        <TableCell>
                          {m.isOverLimit ? (
                            <Badge variant="danger">تجاوز الائتمان</Badge>
                          ) : (
                            <Badge variant="outline">ضمن الحدود</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ==================== Report 3: Inventory Valuation ==================== */}
        {activeReport === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">إجمالي قيمة البضاعة</span>
                <span className="text-xl font-black text-blue-950 font-mono mt-1 block">
                  {formatCurrency(inventoryReport?.summary?.totalInventoryValue ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">بالتكلفة الشرائية</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">رصيد المخازن المركزية</span>
                <span className="text-xl font-black text-slate-800 font-mono mt-1 block">
                  {inventoryReport?.summary?.totalWarehouseUnits ?? 0} وحدة
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">في المخازن الثلاثة</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">رصيد عهد المندوبين المتنقلة</span>
                <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                  {inventoryReport?.summary?.totalRepUnits ?? 0} وحدة
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">في سيارات التوزيع</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold block">أصناف شارفت على النفاد</span>
                <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                  {inventoryReport?.summary?.lowStockItemsCount ?? 0} صنف
                </span>
                <span className="text-[11px] text-rose-600 mt-1 block">تحت حد الأمان</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>كود الصنف</TableHead>
                    <TableHead>اسم الصنف</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead className="text-center">بالمخازن</TableHead>
                    <TableHead className="text-center">بعهد المندوبين</TableHead>
                    <TableHead className="text-center font-bold">إجمالي (كراتين + وحدات)</TableHead>
                    <TableHead className="text-left">سعر التكلفة</TableHead>
                    <TableHead className="text-left font-bold">إجمالي القيمة</TableHead>
                    <TableHead>حالة المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInventoryLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                        جاري إعداد تقرير المخزون...
                      </TableCell>
                    </TableRow>
                  ) : inventoryReport?.products?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-bold text-blue-900">{p.sku}</TableCell>
                      <TableCell className="font-bold text-slate-900">{p.name}</TableCell>
                      <TableCell className="text-slate-600">{p.category}</TableCell>
                      <TableCell className="font-mono text-center text-slate-700">{p.warehouseUnits} {p.unitName}</TableCell>
                      <TableCell className="font-mono text-center text-blue-900 font-bold">{p.repUnits} {p.unitName}</TableCell>
                      <TableCell className="font-mono text-center font-extrabold text-slate-900 bg-slate-50">
                        {p.cartons} {p.cartonName} و {p.remainder} {p.unitName}
                      </TableCell>
                      <TableCell className="font-mono text-left text-slate-500">{formatCurrency(p.purchasePrice)}</TableCell>
                      <TableCell className="font-mono text-left font-black text-emerald-800">
                        {formatCurrency(p.totalValue)}
                      </TableCell>
                      <TableCell>
                        {p.isLowStock ? (
                          <Badge variant="warning">تحت حد الأمان</Badge>
                        ) : (
                          <Badge variant="success">متوفر</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
