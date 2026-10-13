import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

const updateMerchantSchema = z.object({
  businessName: z.string().min(2).optional(),
  ownerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  representativeId: z.string().optional().nullable(),
  creditLimit: z.number().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireAuth();
    if (error) return error;

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        representative: {
          include: { user: { select: { name: true, phone: true } } },
        },
        salesInvoices: {
          where: { status: 'APPROVED' },
          orderBy: { invoiceDate: 'desc' },
          take: 10,
          include: {
            items: { include: { product: true } },
          },
        },
        payments: {
          where: { direction: 'IN' },
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'التاجر غير موجود' }, { status: 404 });
    }

    if (
      session!.user.role === 'REPRESENTATIVE' &&
      merchant.representativeId !== session!.user.representativeId
    ) {
      return NextResponse.json({ error: 'غير مصرح لك بعرض بيانات هذا التاجر' }, { status: 403 });
    }

    // حساب الرصيد
    const unpaidInvoicesBalance = merchant.salesInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const currentBalance = merchant.openingBalance + unpaidInvoicesBalance;

    return NextResponse.json({
      ...merchant,
      currentBalance,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = updateMerchantSchema.parse(body);

    const updated = await prisma.merchant.update({
      where: { id },
      data: validated,
      include: {
        representative: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
