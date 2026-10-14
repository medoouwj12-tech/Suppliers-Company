'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toaster';
import { FolderTree, Plus, Search, Edit2, Trash2, RefreshCw, X, Package } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  icon: string | null;
  color: string | null;
  productCount: number;
}

export default function CategoriesPage() {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Category | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    nameAr: '',
    color: '#1e3a5f',
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const res = await fetch('/api/products/categories');
      if (!res.ok) throw new Error('فشل جلب التصنيفات');
      return res.json();
    },
  });

  const filtered = React.useMemo(() => {
    const list: Category[] = data?.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nameAr && c.nameAr.includes(search))
    );
  }, [data, search]);

  const openAdd = () => {
    setEditing(null);
    setFormData({ name: '', nameAr: '', color: '#1e3a5f' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormData({ name: cat.name, nameAr: cat.nameAr ?? '', color: cat.color ?? '#1e3a5f' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editing ? `/api/products/categories/${editing.id}` : '/api/products/categories';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr || null,
          color: formData.color,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'حدث خطأ');

      success(editing ? 'تم تعديل التصنيف بنجاح!' : 'تم إضافة التصنيف بنجاح!', formData.name);
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/categories/${deleteTarget.id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'فشل الحذف');

      success('تم حذف التصنيف بنجاح!', deleteTarget.name);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      refetch();
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="إدارة تصنيفات المنتجات" breadcrumb="المنتجات / التصنيفات">
      <div className="space-y-5">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم التصنيف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              loading={isRefetching}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              تحديث
            </Button>
            <Button size="sm" onClick={openAdd} leftIcon={<Plus className="h-4 w-4" />}>
              إضافة تصنيف جديد
            </Button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم التصنيف (إنجليزي)</TableHead>
                <TableHead>الاسم بالعربي</TableHead>
                <TableHead className="text-center">اللون</TableHead>
                <TableHead className="text-center">عدد المنتجات</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                    جاري تحميل التصنيفات...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                    <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    لا توجد تصنيفات مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold text-slate-900">{c.name}</TableCell>
                    <TableCell className="text-slate-600">{c.nameAr ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-slate-200"
                        style={{ backgroundColor: c.color || '#1e3a5f' }}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.productCount > 0 ? 'success' : 'secondary'}>
                        <Package className="h-3 w-3" />
                        {c.productCount} منتج
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-[#1e3a5f]" />
                {editing ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف (إنجليزي) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Pasta, Oil, Dairy..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالعربي</label>
                <input
                  type="text"
                  placeholder="مثال: مكرونة، زيوت، ألبان..."
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اللون المميز</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-14 rounded-xl border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button type="submit" loading={isSubmitting} className="flex-1">
                  {editing ? 'حفظ التعديلات' : 'إضافة التصنيف'}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-lg font-bold text-red-600">تأكيد الحذف</h3>
            <p className="text-sm text-slate-600">
              هل أنت متأكد من حذف التصنيف <b>"{deleteTarget.nameAr || deleteTarget.name}"</b>؟
            </p>
            {deleteTarget.productCount > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-xl">
                يوجد {deleteTarget.productCount} منتج مرتبط بهذا التصنيف — لن تتمكن من الحذف حتى تفك ارتباطها.
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="danger" loading={isSubmitting} onClick={handleDelete} className="flex-1">
                نعم، احذف
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
