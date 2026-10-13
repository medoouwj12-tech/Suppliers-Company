import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const returnDoc = await prisma.return.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!returnDoc) {
      return NextResponse.json({ error: 'مستند المرتجع غير موجود' }, { status: 404 });
    }

    if (returnDoc.status !== 'PENDING') {
      return NextResponse.json({ error: 'تم اعتماد أو معالجة هذا المرتجع مسبقاً' }, { status: 400 });
    }

    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { status: 'ACTIVE' },
    });

    const approvedReturn = await prisma.$transaction(async (tx) => {
      for (const item of returnDoc.items) {
        const targetWarehouseId = item.warehouseId || defaultWarehouse?.id;

        if (item.condition === 'SELLABLE' && targetWarehouseId) {
          // إعادة البضاعة الصالحة للمخزن المتاح للبيع
          const balance = await tx.stockBalance.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: targetWarehouseId,
                productId: item.productId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              warehouseId: targetWarehouseId,
              productId: item.productId,
              quantity: item.quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              warehouseId: targetWarehouseId,
              productId: item.productId,
              type: returnDoc.type === 'FROM_MERCHANT' ? 'RETURN_FROM_MERCHANT' : 'RETURN_FROM_REP',
              quantity: item.quantity,
              quantityBefore: balance.quantity - item.quantity,
              quantityAfter: balance.quantity,
              referenceType: 'Return',
              referenceId: returnDoc.id,
              referenceNo: returnDoc.returnNo,
              userId: session!.user.id,
              notes: `مرتجع بضاعة صالحة لإعادة البيع بموجب مستند رقم ${returnDoc.returnNo}`,
            },
          });
        } else if (item.condition === 'DAMAGED' && targetWarehouseId) {
          // تسجيل حركة تالف دون إضافته للمخزون الصالح للبيع
          const balance = await tx.stockBalance.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: targetWarehouseId,
                productId: item.productId,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              warehouseId: targetWarehouseId,
              productId: item.productId,
              type: 'DAMAGE',
              quantity: 0, // لا يضاف للرصيد الصالح
              quantityBefore: balance?.quantity ?? 0,
              quantityAfter: balance?.quantity ?? 0,
              referenceType: 'Return',
              referenceId: returnDoc.id,
              referenceNo: returnDoc.returnNo,
              userId: session!.user.id,
              notes: `بضاعة تالفة مسترجعة (غير قابلة للبيع) - ${item.notes || 'تالف أثناء النقل أو التخزين'}`,
            },
          });
        }
      }

      return tx.return.update({
        where: { id: returnDoc.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      message: 'تم اعتماد المرتجع وتحديث الأرصدة بنجاح',
      return: approvedReturn,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
