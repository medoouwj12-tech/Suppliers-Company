import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const updateWarehouseSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
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

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        stockBalances: {
          include: { product: true },
        },
        representatives: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: 'المخزن غير موجود' }, { status: 404 });
    }

    return NextResponse.json(warehouse);
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
    const validated = updateWarehouseSchema.parse(body);

    const updated = await prisma.warehouse.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
