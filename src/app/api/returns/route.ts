import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, getPaginationParams, paginatedResponse, generateSequentialNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const returnItemSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().optional().nullable(),
  quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().min(0),
  condition: z.enum(['SELLABLE', 'DAMAGED', 'EXPIRED']),
  notes: z.string().optional().nullable(),
});

const createReturnSchema = z.object({
  type: z.enum(['FROM_MERCHANT', 'FROM_REPRESENTATIVE']),
  salesInvoiceId: z.string().optional().nullable(),
  returnDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(returnItemSchema).min(1, 'يجب إضافة بند واحد على الأقل'),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: { select: { name: true } },
          salesInvoice: { select: { invoiceNo: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true, unitName: true } },
              warehouse: { select: { name: true } },
            },
          },
        },
        orderBy: { returnDate: 'desc' },
      }),
      prisma.return.count({ where }),
    ]);

    return paginatedResponse(returns, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const validated = createReturnSchema.parse(body);

    const totalValue = validated.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const ret = await prisma.$transaction(async (tx) => {
      const returnNo = await generateSequentialNumber(tx, 'RET', 'return');

      return tx.return.create({
        data: {
          returnNo,
          type: validated.type,
          status: 'PENDING',
          salesInvoiceId: validated.salesInvoiceId || null,
          returnDate: validated.returnDate ? new Date(validated.returnDate) : new Date(),
          totalValue,
          createdById: session!.user.id,
          notes: validated.notes,
          items: {
            create: validated.items.map((i) => ({
              productId: i.productId,
              warehouseId: i.warehouseId || null,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.quantity * i.unitPrice,
              condition: i.condition,
              notes: i.notes,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });
    });

    return NextResponse.json(ret, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
