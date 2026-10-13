import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, getPaginationParams, paginatedResponse, generateSequentialNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().min(0, 'سعر الوحدة غير صالح'),
  discount: z.number().min(0).default(0),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'المورد مطلوب'),
  warehouseId: z.string().min(1, 'المخزن مطلوب'),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;

    const [purchases, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: { select: { name: true, code: true, phone: true } },
          warehouse: { select: { name: true, code: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true, unitName: true } },
            },
          },
        },
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.purchaseInvoice.count({ where }),
    ]);

    return paginatedResponse(purchases, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createPurchaseSchema.parse(body);

    const subtotal = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
      0
    );
    const total = subtotal - validated.discount + validated.tax;

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNo = await generateSequentialNumber(tx, 'PUR', 'purchaseInvoice');

      return tx.purchaseInvoice.create({
        data: {
          invoiceNo,
          supplierId: validated.supplierId,
          warehouseId: validated.warehouseId,
          status: 'DRAFT',
          paymentStatus: 'UNPAID',
          invoiceDate: validated.invoiceDate ? new Date(validated.invoiceDate) : new Date(),
          dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
          subtotal,
          discount: validated.discount,
          tax: validated.tax,
          total,
          paidAmount: 0,
          createdById: session!.user.id,
          notes: validated.notes,
          items: {
            create: validated.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              total: i.quantity * i.unitPrice - i.discount,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
          warehouse: true,
        },
      });
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
