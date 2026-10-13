import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  nameAr: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  purchasePrice: z.number().min(0).optional(),
  sellingPriceCarton: z.number().min(0).optional(),
  sellingPriceUnit: z.number().min(0).optional(),
  unitsPerCarton: z.number().int().min(1).optional(),
  unitName: z.string().optional(),
  cartonName: z.string().optional(),
  minStockAlert: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAuth();
    if (error) return error;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockBalances: {
          include: { warehouse: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });
    }

    const totalUnits = product.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
    const cartons = Math.floor(totalUnits / product.unitsPerCarton);
    const remainderUnits = totalUnits % product.unitsPerCarton;

    return NextResponse.json({
      ...product,
      totalStockUnits: totalUnits,
      totalStockCartons: cartons,
      totalStockRemainderUnits: remainderUnits,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    const updated = await prisma.product.update({
      where: { id },
      data: validated,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin();
    if (error) return error;

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({ message: 'تم تعطيل الصنف بنجاح', product: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
