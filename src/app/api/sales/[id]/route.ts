import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        merchant: true,
        representative: { include: { user: true } },
        items: { include: { product: true } },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: { recordedBy: { select: { name: true } } },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    if (
      session!.user.role === 'REPRESENTATIVE' &&
      invoice.representativeId !== session!.user.representativeId
    ) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة هذه الفاتورة' }, { status: 403 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}
