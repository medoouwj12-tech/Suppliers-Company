import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const representativeId = searchParams.get('representativeId');
    const merchantId = searchParams.get('merchantId');

    const where: any = { status: 'APPROVED' };
    if (representativeId) where.representativeId = representativeId;
    if (merchantId) where.merchantId = merchantId;

    if (fromStr || toStr) {
      where.invoiceDate = {};
      if (fromStr) where.invoiceDate.gte = new Date(fromStr);
      if (toStr) {
        const to = new Date(toStr);
        to.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = to;
      }
    }

    const invoices = await prisma.salesInvoice.findMany({
      where,
      include: {
        merchant: { select: { businessName: true, ownerName: true, code: true } },
        representative: { include: { user: { select: { name: true } } } },
        items: {
          include: {
            product: { select: { name: true, purchasePrice: true } },
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    let totalSales = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    const formattedInvoices = invoices.map((inv) => {
      let invCost = 0;
      for (const item of inv.items) {
        invCost += item.quantity * item.product.purchasePrice;
      }

      const invProfit = inv.total - invCost;

      totalSales += inv.total;
      totalCost += invCost;
      totalDiscount += inv.discount;
      totalPaid += inv.paidAmount;
      totalRemaining += inv.remainingAmount;

      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        merchantName: inv.merchant.businessName,
        representativeName: inv.representative.user.name,
        subtotal: inv.subtotal,
        discount: inv.discount,
        total: inv.total,
        cost: Math.round(invCost * 100) / 100,
        estimatedProfit: Math.round(invProfit * 100) / 100,
        paidAmount: inv.paidAmount,
        remainingAmount: inv.remainingAmount,
        paymentStatus: inv.paymentStatus,
      };
    });

    const netProfit = totalSales - totalCost;

    return NextResponse.json({
      summary: {
        totalInvoices: invoices.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: totalSales > 0 ? Math.round((netProfit / totalSales) * 1000) / 10 : 0,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalRemaining: Math.round(totalRemaining * 100) / 100,
      },
      invoices: formattedInvoices,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
