'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Banknote, Building2, CalendarDays, Pencil, Plus, ReceiptText, RefreshCw, Trash2, Wallet } from 'lucide-react';

type Category = { id: string; name: string; affectsProfit: boolean };
type Expense = { id: string; expenseNo: string; categoryId: string | null; amount: number; description: string | null; expenseDate: string; notes: string | null; category?: Category | null; createdBy?: { name: string } };
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function ExpensesPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = React.useState(localDate(firstOfMonth));
  const [to, setTo] = React.useState(localDate(today));
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ categoryId: '', amount: '', description: '', expenseDate: localDate(today), notes: '' });
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['expenses', from, to];
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/expenses?from=${from}&to=${to}`);
      if (!response.ok) throw new Error('فشل تحميل المصروفات');
      return response.json();
    },
  });
  const categories: Category[] = data?.categories ?? [];
  const expenses: Expense[] = data?.data ?? [];

  React.useEffect(() => {
    if (!form.categoryId && categories.length) setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
  }, [categories, form.categoryId]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ categoryId: categories[0]?.id ?? '', amount: '', description: '', expenseDate: localDate(new Date()), notes: '' });
  };
  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(editingId ? `/api/expenses/${editingId}` : '/api/expenses', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر حفظ المصروف');
      success(editingId ? 'تم تعديل المصروف' : 'تم تسجيل المصروف');
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['report-sales'] });
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };
  const editExpense = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({ categoryId: expense.categoryId ?? '', amount: String(expense.amount), description: expense.description ?? '', expenseDate: localDate(new Date(expense.expenseDate)), notes: expense.notes ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const deleteExpense = async (expense: Expense) => {
    if (!window.confirm(`حذف المصروف ${expense.expenseNo}؟`)) return;
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر حذف المصروف');
      success('تم حذف المصروف');
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['report-sales'] });
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <AdminLayout title="إدارة المصروفات" breadcrumb="المصروفات">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-[#d9e8e3] bg-[radial-gradient(ellipse_at_top_left,_rgba(18,122,105,0.12),_transparent_42%),linear-gradient(135deg,#ffffff,#f1f8f5)] p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[#103c47] p-3 text-white"><ReceiptText className="h-6 w-6" /></div>
            <div><h1 className="text-xl font-black text-[#103c47]">سجل المصروفات والتشغيل</h1><p className="mt-1 text-sm text-slate-600">الرواتب والإيجارات والمرافق والسلف، مع احتساب أثر كل بند على صافي الربح.</p></div>
          </div>
          <form onSubmit={submitExpense} className="grid grid-cols-1 gap-4 rounded-2xl border border-white bg-white/90 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-2 text-sm font-semibold text-slate-700"><span>بند المصروف</span><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="h-11 w-full rounded-xl border border-[#dce8e5] bg-white px-3 text-sm outline-none focus:border-[#0e7268]">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.affectsProfit ? '' : ' (سلفة)'}</option>)}</select></label>
            <Input label="المبلغ بالجنيه" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" />
            <Input label="التاريخ" type="date" required value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} />
            <Input label="البيان / اسم الموظف" required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="مثال: راتب أكتوبر - أحمد" />
            <Input label="ملاحظات" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="اختياري" />
            <div className="flex items-end gap-2"><Button type="submit" disabled={submitting} className="w-full bg-[#103c47] hover:bg-[#155766]" leftIcon={editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>{submitting ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'تسجيل المصروف'}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>}</div>
          </form>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">السلف تُسجل للمتابعة النقدية، لكنها لا تخصم من صافي الربح حتى تُسوّى ضمن الرواتب أو المصروفات.</div>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3"><div className="w-44"><Input label="من تاريخ" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className="w-44"><Input label="إلى تاريخ" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></div>
          <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>تحديث السجل</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard title="إجمالي المدفوعات" amount={data?.summary?.totalExpenses ?? 0} icon={<Wallet />} tone="blue" />
          <SummaryCard title="مصروفات تخصم من الربح" amount={data?.summary?.profitExpenses ?? 0} icon={<Building2 />} tone="emerald" />
          <SummaryCard title="سلف موظفين معلقة" amount={data?.summary?.advances ?? 0} icon={<Banknote />} tone="amber" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><CalendarDays className="h-5 w-5 text-[#0e7268]" /><h2 className="font-extrabold text-slate-900">حركة المصروفات للفترة المحددة</h2><span className="mr-auto text-sm text-slate-500">{expenses.length} سجل</span></div>
          <Table><TableHeader><TableRow><TableHead>رقم السند</TableHead><TableHead>البند</TableHead><TableHead>البيان / الموظف</TableHead><TableHead>التاريخ</TableHead><TableHead>سجل بواسطة</TableHead><TableHead className="text-left">المبلغ</TableHead><TableHead className="text-center">إجراءات</TableHead></TableRow></TableHeader>
            <TableBody>{isLoading ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-slate-500">جارٍ تحميل المصروفات...</TableCell></TableRow> : expenses.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-slate-500">لا توجد مصروفات في الفترة المحددة.</TableCell></TableRow> : expenses.map((expense) => <TableRow key={expense.id}>
              <TableCell className="font-mono font-bold text-[#103c47]">{expense.expenseNo}</TableCell><TableCell><span className="font-semibold">{expense.category?.name ?? 'بدون تصنيف'}</span>{expense.category && !expense.category.affectsProfit && <span className="mr-2 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">سلفة</span>}</TableCell><TableCell className="max-w-64 whitespace-normal">{expense.description}{expense.notes && <div className="mt-1 text-xs text-slate-500">{expense.notes}</div>}</TableCell><TableCell>{formatDate(expense.expenseDate)}</TableCell><TableCell>{expense.createdBy?.name ?? '—'}</TableCell><TableCell className="text-left font-mono font-extrabold text-slate-900">{formatCurrency(expense.amount)}</TableCell><TableCell><div className="flex justify-center gap-1"><button onClick={() => editExpense(expense)} title="تعديل" className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"><Pencil className="h-4 w-4" /></button><button onClick={() => deleteExpense(expense)} title="حذف" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></div></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, amount, icon, tone }: { title: string; amount: number; icon: React.ReactNode; tone: 'blue' | 'emerald' | 'amber' }) {
  const colors = { blue: 'bg-sky-50 text-sky-800 border-sky-100', emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100', amber: 'bg-amber-50 text-amber-800 border-amber-100' }[tone];
  return <div className={`rounded-2xl border p-5 ${colors}`}><div className="flex items-center justify-between"><span className="text-sm font-bold">{title}</span><span className="rounded-xl bg-white/80 p-2">{icon}</span></div><div className="mt-3 font-mono text-2xl font-black">{formatCurrency(amount)}</div></div>;
}
