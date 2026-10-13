import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, getPaginationParams, paginatedResponse } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    const where: any = {
      warehouseId: id,
    };

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      };
    }

    const [balances, total] = await Promise.all([
      prisma.stockBalance.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.stockBalance.count({ where }),
    ]);

    const formatted = balances.map((b) => {
      const cartons = Math.floor(b.quantity / b.product.unitsPerCarton);
      const units = b.quantity % b.product.unitsPerCarton;
      return {
        ...b,
        cartons,
        units,
        isLowStock: b.quantity <= b.product.minStockAlert,
        totalValue: b.quantity * b.product.purchasePrice,
      };
    });

    return paginatedResponse(formatted, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}
