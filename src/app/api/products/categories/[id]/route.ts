import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'اسم التصنيف مطلوب').optional(),
  nameAr: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    if (validated.name) {
      const existing = await prisma.productCategory.findUnique({
        where: { name: validated.name },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'اسم التصنيف مستخدم بالفعل' }, { status: 400 });
      }
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف التصنيف — يوجد ${productCount} منتج مرتبط به` },
        { status: 400 }
      );
    }

    await prisma.productCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
