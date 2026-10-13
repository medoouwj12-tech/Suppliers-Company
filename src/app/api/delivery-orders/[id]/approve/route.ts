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

    const order = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'إذن التسليم غير موجود' }, { status: 404 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'تم اعتماد هذا الإذن أو إلغاؤه مسبقاً' }, { status: 400 });
    }

    // 1. فحص كفاية رصيد المخزن المصدر لكل صنف قبل الخصم
    for (const item of order.items) {
      const balance = await prisma.stockBalance.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: order.warehouseId,
            productId: item.productId,
          },
        },
      });

      const currentQty = balance?.quantity ?? 0;
      if (currentQty < item.quantity) {
        return NextResponse.json(
          {
            error: `رصيد المخزن من [${item.product.name}] غير كافٍ. المتاح بالمخزن: ${currentQty} وحدة، والمطلوب تسليمه: ${item.quantity} وحدة`,
          },
          { status: 400 }
        );
      }
    }

    // 2. التنفيذ داخل Transaction ذرية موثقة
    const approvedOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // أ. خصم من رصيد المخزن
        const oldBalance = await tx.stockBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: order.warehouseId,
              productId: item.productId,
            },
          },
        });
        const qtyBefore = oldBalance?.quantity ?? 0;
        const qtyAfter = qtyBefore - item.quantity;

        await tx.stockBalance.update({
          where: {
            warehouseId_productId: {
              warehouseId: order.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            quantity: qtyAfter,
          },
        });

        // ب. تسجيل حركة مخزنية رسمية
        await tx.stockMovement.create({
          data: {
            warehouseId: order.warehouseId,
            productId: item.productId,
            type: 'DELIVERY_OUT',
            quantity: -item.quantity,
            quantityBefore: qtyBefore,
            quantityAfter: qtyAfter,
            referenceType: 'DeliveryOrder',
            referenceId: order.id,
            referenceNo: order.orderNo,
            userId: session!.user.id,
            notes: `تسليم عهدة للمندوب بموجب إذن رقم ${order.orderNo}`,
          },
        });

        // ج. إضافة الكمية إلى عهدة المندوب
        await tx.representativeInventory.upsert({
          where: {
            representativeId_productId: {
              representativeId: order.representativeId,
              productId: item.productId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
            representativeId: order.representativeId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      // د. تحديث حالة الإذن إلى معتمد
      return tx.deliveryOrder.update({
        where: { id: order.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedById: session!.user.id,
        },
        include: {
          items: { include: { product: true } },
          representative: { include: { user: true } },
          warehouse: true,
        },
      });
    });

    return NextResponse.json({
      message: 'تم اعتماد إذن التسليم ونقل البضاعة لعهدة المندوب بنجاح',
      order: approvedOrder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
