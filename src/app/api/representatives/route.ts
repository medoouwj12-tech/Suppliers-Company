import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const reps = await prisma.representative.findMany({
      include: {
        user: { select: { name: true, username: true, email: true, status: true, phone: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        inventory: {
          include: {
            product: { select: { name: true, sku: true, unitsPerCarton: true, sellingPriceCarton: true, sellingPriceUnit: true } },
          },
        },
        salesInvoices: {
          where: { status: 'APPROVED' },
          select: { total: true, paidAmount: true, remainingAmount: true },
        },
        payments: {
          where: { direction: 'IN' },
          select: { amount: true },
        },
        cashHandovers: {
          where: { status: 'CONFIRMED' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = reps.map((rep) => {
      const totalSales = rep.salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalCollected = rep.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalHandedOver = rep.cashHandovers.reduce((sum, h) => sum + h.amount, 0);
      const cashInHand = Math.max(0, totalCollected - totalHandedOver);

      const inventoryTotalUnits = rep.inventory.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: rep.id,
        userId: rep.userId,
        employeeCode: rep.employeeCode,
        name: rep.user.name,
        username: rep.user.username,
        phone: rep.user.phone,
        status: rep.user.status,
        warehouseName: rep.warehouse?.name ?? 'غير محدد',
        totalSales,
        totalCollected,
        totalHandedOver,
        cashInHand,
        inventoryItemsCount: rep.inventory.length,
        inventoryTotalUnits,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    return handleApiError(error);
  }
}
