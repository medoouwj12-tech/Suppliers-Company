import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, getPaginationParams, paginatedResponse } from '@/lib/api-helpers';
import { z } from 'zod';

const createMerchantSchema = z.object({
  code: z.string().optional(),
  businessName: z.string().min(2, 'الاسم التجاري للمحل مطلوب'),
  ownerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  representativeId: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
  creditLimit: z.number().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const repIdParam = searchParams.get('representativeId');

    const where: any = {};

    // إذا كان المستخدم مندوباً، يعرض فقط التجار التابعين له
    if (session!.user.role === 'REPRESENTATIVE') {
      where.representativeId = session!.user.representativeId;
    } else if (repIdParam) {
      where.representativeId = repIdParam;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { ownerName: { contains: search } },
        { phone: { contains: search } },
        { code: { contains: search } },
        { area: { contains: search } },
      ];
    }

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        skip,
        take: limit,
        include: {
          representative: {
            include: { user: { select: { name: true, phone: true } } },
          },
          salesInvoices: {
            where: { status: 'APPROVED' },
            select: { total: true, paidAmount: true, remainingAmount: true },
          },
          payments: {
            where: { direction: 'IN' },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.merchant.count({ where }),
    ]);

    const formatted = merchants.map((m) => {
      const totalSales = m.salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = m.payments.reduce((sum, p) => sum + p.amount, 0);
      const unpaidInvoicesBalance = m.salesInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
      const currentBalance = m.openingBalance + unpaidInvoicesBalance;

      return {
        id: m.id,
        code: m.code,
        businessName: m.businessName,
        ownerName: m.ownerName,
        phone: m.phone,
        phone2: m.phone2,
        address: m.address,
        area: m.area,
        representativeId: m.representativeId,
        representativeName: m.representative?.user.name ?? 'غير محدد',
        openingBalance: m.openingBalance,
        creditLimit: m.creditLimit,
        status: m.status,
        notes: m.notes,
        totalSales,
        totalPaid,
        currentBalance,
        isOverCreditLimit: m.creditLimit ? currentBalance > m.creditLimit : false,
      };
    });

    return paginatedResponse(formatted, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createMerchantSchema.parse(body);

    let code = validated.code;
    if (!code) {
      const count = await prisma.merchant.count();
      code = `M-${String(count + 101).padStart(4, '0')}`;
    }

    const existing = await prisma.merchant.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json({ error: 'كود التاجر مستخدم بالفعل' }, { status: 400 });
    }

    const merchant = await prisma.merchant.create({
      data: {
        ...validated,
        code,
      },
      include: {
        representative: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(merchant, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
