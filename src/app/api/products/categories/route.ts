import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'اسم التصنيف مطلوب'),
  nameAr: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        icon: c.icon,
        color: c.color,
        productCount: c._count.products,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createCategorySchema.parse(body);

    const existing = await prisma.productCategory.findUnique({
      where: { name: validated.name },
    });
    if (existing) {
      return NextResponse.json({ error: 'اسم التصنيف مستخدم بالفعل' }, { status: 400 });
    }

    const category = await prisma.productCategory.create({ data: validated });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
