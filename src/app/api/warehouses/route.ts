import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const createWarehouseSchema = z.object({
  code: z.string().trim().min(1, 'كود المخزن مطلوب').max(20, 'كود المخزن طويل جدًا'),
  name: z.string().trim().min(1, 'اسم المخزن مطلوب').max(100, 'اسم المخزن طويل جدًا'),
  address: z.string().trim().max(200, 'العنوان طويل جدًا').optional().nullable(),
  phone: z.string().trim().max(30, 'رقم الهاتف طويل جدًا').optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().trim().max(500, 'الملاحظات طويلة جدًا').optional().nullable(),
});

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: {
            stockBalances: true,
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
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createWarehouseSchema.parse(body);

    const existing = await prisma.warehouse.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return NextResponse.json({ error: 'كود المخزن مستخدم بالفعل' }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.create({
      data: validated,
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
