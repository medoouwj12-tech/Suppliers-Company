import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, getPaginationParams, paginatedResponse } from '@/lib/api-helpers';
import { z } from 'zod';

const createSupplierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'اسم المورد مطلوب'),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const search = request.nextUrl.searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, username: true, status: true, lastLoginAt: true },
          },
          purchaseInvoices: {
            where: { status: 'APPROVED' },
            select: { total: true, paidAmount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    const formatted = suppliers.map((sup) => {
      const totalPurchases = sup.purchaseInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = sup.purchaseInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const currentBalance = sup.openingBalance + (totalPurchases - totalPaid);

      return {
        ...sup,
        totalPurchases,
        totalPaid,
        currentBalance,
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
    const validated = createSupplierSchema.parse(body);

    let code = validated.code;
    if (!code) {
      const count = await prisma.supplier.count();
      code = `SUP-${String(count + 1).padStart(3, '0')}`;
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...validated,
        code,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
