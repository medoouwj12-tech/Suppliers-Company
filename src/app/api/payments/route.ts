import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, getPaginationParams, paginatedResponse, generateSequentialNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const createPaymentSchema = z.object({
  merchantId: z.string().min(1, 'التاجر مطلوب'),
  representativeId: z.string().optional().nullable(),
  salesInvoiceId: z.string().optional().nullable(),
  amount: z.number().positive('مبلغ التحصيل يجب أن يكون أكبر من صفر'),
  paymentType: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'OTHER']).default('CASH'),
  paymentDate: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const merchantId = searchParams.get('merchantId');
    const representativeId = searchParams.get('representativeId');

    const where: any = { direction: 'IN' };

    if (session!.user.role === 'REPRESENTATIVE') {
      where.representativeId = session!.user.representativeId;
    } else if (representativeId) {
      where.representativeId = representativeId;
    }

    if (merchantId) where.merchantId = merchantId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: { select: { businessName: true, ownerName: true, phone: true } },
          representative: { include: { user: { select: { name: true } } } },
          salesInvoice: { select: { invoiceNo: true, total: true, remainingAmount: true } },
          recordedBy: { select: { name: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    return paginatedResponse(payments, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const validated = createPaymentSchema.parse(body);

    const repId = session!.user.role === 'REPRESENTATIVE'
      ? session!.user.representativeId
      : validated.representativeId || null;

    const result = await prisma.$transaction(async (tx) => {
      const receiptNo = await generateSequentialNumber(tx, 'REC', 'payment');

      // 1. تسجيل سند القبض
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          direction: 'IN',
          paymentType: validated.paymentType,
          amount: validated.amount,
          merchantId: validated.merchantId,
          representativeId: repId,
          salesInvoiceId: validated.salesInvoiceId || null,
          paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
          recordedById: session!.user.id,
          notes: validated.notes,
        },
      });

      // 2. إذا كان السند مرتبطاً بفاتورة مبيعات، تحديث رصيد الفاتورة وحالة الدفع
      if (validated.salesInvoiceId) {
        const inv = await tx.salesInvoice.findUnique({
          where: { id: validated.salesInvoiceId },
        });

        if (inv) {
          const newPaid = inv.paidAmount + validated.amount;
          const newRemaining = Math.max(0, inv.total - newPaid);
          const newStatus = newPaid >= inv.total ? 'PAID' : 'PARTIAL';

          await tx.salesInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              paymentStatus: newStatus,
            },
          });
        }
      }

      return payment;
    });

    const fullPayment = await prisma.payment.findUnique({
      where: { id: result.id },
      include: {
        merchant: true,
        representative: { include: { user: true } },
        salesInvoice: true,
      },
    });

    return NextResponse.json(fullPayment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
