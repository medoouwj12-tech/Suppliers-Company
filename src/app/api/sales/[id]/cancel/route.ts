import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const cancelSchema = z.object({
  reason: z.string().min(3, 'سبب الإلغاء مطلوب للتسجيل في السجل الرقابي'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const validated = cancelSchema.parse(body);

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    if (invoice.status === 'CANCELLED') {
      return NextResponse.json({ error: 'الفاتورة ملغاة بالفعل مسبقاً' }, { status: 400 });
    }

    // التنفيذ داخل معاملة مصرفية لإرجاع المخزون وتسجيل الإلغاء
    const result = await prisma.$transaction(async (tx) => {
      // 1. إعادة البضاعة إلى عهدة المندوب
      for (const item of invoice.items) {
        await tx.representativeInventory.upsert({
          where: {
            representativeId_productId: {
              representativeId: invoice.representativeId,
              productId: item.productId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
            representativeId: invoice.representativeId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      // 2. تحديث حالة الفاتورة
      const updated = await tx.salesInvoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: validated.reason,
        },
      });

      // 3. تسجيل في Audit Log
      await tx.auditLog.create({
        data: {
          userId: session!.user.id,
          action: 'CANCEL_INVOICE',
          entity: 'SalesInvoice',
          entityId: invoice.id,
          newValues: JSON.stringify({ reason: validated.reason, invoiceNo: invoice.invoiceNo }),
        },
      });

      return updated;
    });

    return NextResponse.json({ message: 'تم إلغاء الفاتورة وإعادة البضاعة للعهدة بنجاح', invoice: result });
  } catch (error) {
    return handleApiError(error);
  }
}
