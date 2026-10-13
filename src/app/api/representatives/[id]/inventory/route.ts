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

    const inventory = await prisma.representativeInventory.findMany({
      where: { representativeId: id },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    const formatted = inventory.map((item) => {
      const p = item.product;
      const cartons = Math.floor(item.quantity / p.unitsPerCarton);
      const remainderUnits = item.quantity % p.unitsPerCarton;

      return {
        id: item.id,
        productId: item.productId,
        productName: p.name,
        sku: p.sku,
        categoryName: p.category?.name ?? 'عام',
        unitsPerCarton: p.unitsPerCarton,
        unitName: p.unitName,
        cartonName: p.cartonName,
        sellingPriceUnit: p.sellingPriceUnit,
        sellingPriceCarton: p.sellingPriceCarton,
        totalQuantityUnits: item.quantity,
        cartons,
        remainderUnits,
        totalValue: item.quantity * p.sellingPriceUnit,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    return handleApiError(error);
  }
}
