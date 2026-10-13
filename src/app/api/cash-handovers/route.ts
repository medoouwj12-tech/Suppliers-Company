import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, getPaginationParams, paginatedResponse, generateSequentialNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const createHandoverSchema = z.object({
  representativeId: z.string().min(1, 'المندوب مطلوب'),
  amount: z.number().positive('المبلغ المسلم يجب أن يكون أكبر من صفر'),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const repId = searchParams.get('representativeId');

    const where: any = {};
    if (session!.user.role === 'REPRESENTATIVE') {
      where.representativeId = session!.user.representativeId;
    } else if (repId) {
      where.representativeId = repId;
    }

    const [handovers, total] = await Promise.all([
      prisma.cashHandover.findMany({
        where,
        skip,
        take: limit,
        include: {
          representative: { include: { user: { select: { name: true, phone: true } } } },
          receivedBy: { select: { name: true } },
        },
        orderBy: { handoverDate: 'desc' },
      }),
      prisma.cashHandover.count({ where }),
    ]);

    return paginatedResponse(handovers, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createHandoverSchema.parse(body);

    const handover = await prisma.$transaction(async (tx) => {
      const handoverNo = await generateSequentialNumber(tx, 'CSH', 'cashHandover');

      return tx.cashHandover.create({
        data: {
          handoverNo,
          representativeId: validated.representativeId,
          amount: validated.amount,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          receivedById: session!.user.id,
          notes: validated.notes,
        },
        include: {
          representative: { include: { user: true } },
          receivedBy: { select: { name: true } },
        },
      });
    });

    return NextResponse.json(handover, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
