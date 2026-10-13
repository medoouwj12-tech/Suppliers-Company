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

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'فاتورة المشتريات غير موجودة' }, { status: 404 });
    }

    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'تم اعتماد هذه الفاتورة مسبقاً' }, { status: 400 });
    }

    const approvedInvoice = await prisma.$transaction(async (tx) => {
      // 1. إضافة الكميات لمخزون المخزن المختار وتسجيل الحركات
      for (const item of invoice.items) {
        const balance = await tx.stockBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: invoice.warehouseId,
              productId: item.productId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
            warehouseId: invoice.warehouseId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            warehouseId: invoice.warehouseId,
            productId: item.productId,
            type: 'PURCHASE_IN',
            quantity: item.quantity,
            quantityBefore: balance.quantity - item.quantity,
            quantityAfter: balance.quantity,
            referenceType: 'PurchaseInvoice',
            referenceId: invoice.id,
            referenceNo: invoice.invoiceNo,
            userId: session!.user.id,
            notes: `وارد مشتريات بموجب فاتورة رقم ${invoice.invoiceNo}`,
          },
        });
      }

      // 2. تحديث حالة الفاتورة إلى معتمدة
      return tx.purchaseInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
        include: {
          supplier: true,
          warehouse: true,
          items: { include: { product: true } },
        },
      });
    });

    return NextResponse.json({
      message: 'تم اعتماد فاتورة المشتريات وإضافة البضاعة للمخزن بنجاح',
      invoice: approvedInvoice,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
