import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [warehouses, products, repInventories] = await Promise.all([
      prisma.warehouse.findMany({
        where: { status: 'ACTIVE' },
        include: {
          stockBalances: {
            include: { product: true },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: {
          category: true,
          stockBalances: true,
          representativeInventory: true,
        },
      }),
      prisma.representativeInventory.findMany({
        include: {
          representative: { include: { user: { select: { name: true } } } },
          product: true,
        },
      }),
    ]);

    let totalInventoryValue = 0;
    let totalWarehouseUnits = 0;
    let totalRepUnits = 0;

    const productSummaries = products.map((p) => {
      const warehouseUnits = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
      const repUnits = p.representativeInventory.reduce((sum, r) => sum + r.quantity, 0);
      const totalUnits = warehouseUnits + repUnits;
      const totalValue = totalUnits * p.purchasePrice;

      totalWarehouseUnits += warehouseUnits;
      totalRepUnits += repUnits;
      totalInventoryValue += totalValue;

      const cartons = Math.floor(totalUnits / p.unitsPerCarton);
      const remainder = totalUnits % p.unitsPerCarton;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category?.name ?? 'عام',
        unitsPerCarton: p.unitsPerCarton,
        unitName: p.unitName,
        cartonName: p.cartonName,
        purchasePrice: p.purchasePrice,
        sellingPriceUnit: p.sellingPriceUnit,
        warehouseUnits,
        repUnits,
        totalUnits,
        cartons,
        remainder,
        totalValue: Math.round(totalValue * 100) / 100,
        minStockAlert: p.minStockAlert,
        isLowStock: totalUnits <= p.minStockAlert,
      };
    });

    return NextResponse.json({
      summary: {
        totalProductsCount: products.length,
        totalWarehouseUnits,
        totalRepUnits,
        totalUnits: totalWarehouseUnits + totalRepUnits,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        lowStockItemsCount: productSummaries.filter((p) => p.isLowStock).length,
      },
      products: productSummaries,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
