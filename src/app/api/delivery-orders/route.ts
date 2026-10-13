import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, getPaginationParams, paginatedResponse, generateSequentialNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const deliveryItemSchema = z.object({
  productId: z.string().min(1),
  cartons: z.number().int().min(0).default(0),
  units: z.number().int().min(0).default(0),
});

const createDeliveryOrderSchema = z.object({
  representativeId: z.string().min(1, 'المندوب مطلوب'),
  warehouseId: z.string().min(1, 'المخزن مطلوب'),
  deliveryDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(deliveryItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const representativeId = searchParams.get('representativeId');
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');

    const where: any = {};
    if (representativeId) where.representativeId = representativeId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          representative: { include: { user: { select: { name: true, phone: true } } } },
          warehouse: { select: { name: true, code: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true, unitName: true, cartonName: true, unitsPerCarton: true } },
            },
          },
        },
        orderBy: { deliveryDate: 'desc' },
      }),
      prisma.deliveryOrder.count({ where }),
    ]);

    return paginatedResponse(orders, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createDeliveryOrderSchema.parse(body);

    // التحقق من الأصناف وتحويل الكميات إلى وحدات أساسية
    const productIds = validated.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const itemsToCreate: Array<{ productId: string; quantity: number }> = [];

    for (const item of validated.items) {
      const p = productMap.get(item.productId);
      if (!p) continue;
      const totalUnits = item.cartons * p.unitsPerCarton + item.units;
      if (totalUnits > 0) {
        itemsToCreate.push({ productId: item.productId, quantity: totalUnits });
      }
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ error: 'لم يتم تحديد أي كميات صالحة للتسليم' }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const orderNo = await generateSequentialNumber(tx, 'DEL', 'deliveryOrder');

      return tx.deliveryOrder.create({
        data: {
          orderNo,
          representativeId: validated.representativeId,
          warehouseId: validated.warehouseId,
          status: 'PENDING',
          deliveryDate: validated.deliveryDate ? new Date(validated.deliveryDate) : new Date(),
          createdById: session!.user.id,
          notes: validated.notes,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          representative: { include: { user: true } },
          warehouse: true,
          items: { include: { product: true } },
        },
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
