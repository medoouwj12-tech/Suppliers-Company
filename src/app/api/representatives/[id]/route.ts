import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRepresentativeAccess, handleApiError } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireRepresentativeAccess(id);
    if (error) return error;

    const rep = await prisma.representative.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, phone: true, status: true } },
        warehouse: true,
        inventory: {
          include: {
            product: { include: { category: true } },
          },
        },
        merchants: true,
      },
    });

    if (!rep) {
      return NextResponse.json({ error: 'المندوب غير موجود' }, { status: 404 });
    }

    // إحصائيات مالية
    const [sales, payments, handovers] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { representativeId: id, status: 'APPROVED' },
        _sum: { total: true, paidAmount: true, remainingAmount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { representativeId: id, direction: 'IN' },
        _sum: { amount: true },
      }),
      prisma.cashHandover.aggregate({
        where: { representativeId: id, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
    ]);

    const totalCollected = payments._sum.amount ?? 0;
    const totalHandedOver = handovers._sum.amount ?? 0;
    const cashInHand = Math.max(0, totalCollected - totalHandedOver);

    return NextResponse.json({
      rep,
      stats: {
        totalSales: sales._sum.total ?? 0,
        invoicesCount: sales._count.id ?? 0,
        totalCollected,
        totalHandedOver,
        cashInHand,
        uncollectedFromMerchants: sales._sum.remainingAmount ?? 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
