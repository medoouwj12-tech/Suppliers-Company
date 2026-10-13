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
    const type = searchParams.get('type');
    const productId = searchParams.get('productId');

    const where: any = {
      warehouseId: id,
    };
    if (type) where.type = type;
    if (productId) where.productId = productId;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { name: true, sku: true, unitName: true, unitsPerCarton: true, cartonName: true } },
          user: { select: { name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return paginatedResponse(movements, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}
