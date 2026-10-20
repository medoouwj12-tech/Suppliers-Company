import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const updateWarehouseSchema = z.object({
  name: z.string().trim().min(1, 'اسم المخزن مطلوب').max(100, 'اسم المخزن طويل جدًا').optional(),
  address: z.string().trim().max(200, 'العنوان طويل جدًا').optional().nullable(),
  phone: z.string().trim().max(30, 'رقم الهاتف طويل جدًا').optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  notes: z.string().trim().max(500, 'الملاحظات طويلة جدًا').optional().nullable(),
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin();
    if (error) return error;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            representatives: true,
            stockMovements: true,
            deliveryOrders: true,
            purchaseInvoices: true,
            transfers: true,
            transfersTo: true,
            returnItems: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: 'المخزن غير موجود' }, { status: 404 });
    }

    const hasLinkedRecords = Object.values(warehouse._count).some((count) => count > 0);
    if (hasLinkedRecords) {
      return NextResponse.json(
        { error: 'لا يمكن حذف مخزن مرتبط بحركات أو مستندات أو مندوبين. عطّل المخزن بدلًا من ذلك للحفاظ على السجلات.' },
        { status: 409 }
      );
    }

    const hasStock = await prisma.stockBalance.findFirst({
      where: { warehouseId: id, quantity: { not: 0 } },
      select: { id: true },
    });
    if (hasStock) {
      return NextResponse.json(
        { error: 'لا يمكن حذف مخزن به رصيد. انقل الأصناف أو سوِّ الرصيد أولًا.' },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.stockBalance.deleteMany({ where: { warehouseId: id, quantity: 0 } });
      await transaction.warehouse.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { error: 'المخزن مرتبط بسجلات أخرى. عطّله بدلًا من حذفه للحفاظ على البيانات.' },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
