import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. مبيعات اليوم والشهر
    const todaySalesData = await prisma.salesInvoice.aggregate({
      where: {
        status: 'APPROVED',
        invoiceDate: { gte: startOfToday },
      },
      _sum: { total: true, paidAmount: true },
      _count: { id: true },
    });

    const monthSalesData = await prisma.salesInvoice.aggregate({
      where: {
        status: 'APPROVED',
        invoiceDate: { gte: startOfMonth },
      },
      _sum: { total: true },
    });

    // 2. التحصيلات اليومية (سندات القبض الواردة)
    const todayPayments = await prisma.payment.aggregate({
      where: {
        direction: 'IN',
        paymentDate: { gte: startOfToday },
      },
      _sum: { amount: true },
    });

    // 3. النقدية المسلّمة للخزينة اليوم
    const todayCashDelivered = await prisma.cashHandover.aggregate({
      where: {
        status: 'CONFIRMED',
        handoverDate: { gte: startOfToday },
      },
      _sum: { amount: true },
    });

    // 4. النقدية المعلقة في عهدة المندوبين (إجمالي تحصيلاتهم ناقص ما تم تسليمه للخزينة)
    const totalCollectedByReps = await prisma.payment.aggregate({
      where: {
        direction: 'IN',
        representativeId: { not: null },
      },
      _sum: { amount: true },
    });

    const totalHandedOver = await prisma.cashHandover.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { amount: true },
    });

    const pendingCashInRepHands = Math.max(
      0,
      (totalCollectedByReps._sum.amount ?? 0) - (totalHandedOver._sum.amount ?? 0)
    );

    // 5. إجمالي الديون المستحقة على التجار
    const unpaidInvoices = await prisma.salesInvoice.aggregate({
      where: {
        status: 'APPROVED',
      },
      _sum: { remainingAmount: true },
    });

    const merchantOpeningBalances = await prisma.merchant.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { openingBalance: true },
    });

    const totalReceivables = (unpaidInvoices._sum.remainingAmount ?? 0) + (merchantOpeningBalances._sum.openingBalance ?? 0);

    // 6. قيمة المخزون الحالية وتنبيهات النواقص
    const stockBalances = await prisma.stockBalance.findMany({
      include: { product: true },
    });

    let totalStockValue = 0;
    let lowStockCount = 0;

    for (const sb of stockBalances) {
      totalStockValue += sb.quantity * sb.product.purchasePrice;
      if (sb.quantity <= sb.product.minStockAlert) {
        lowStockCount++;
      }
    }

    // 7. أرصدة الموردين المستحقة
    const supplierPayables = await prisma.purchaseInvoice.aggregate({
      where: { status: 'APPROVED' },
      _sum: { total: true, paidAmount: true },
    });
    const totalPayables = Math.max(
      0,
      (supplierPayables._sum.total ?? 0) - (supplierPayables._sum.paidAmount ?? 0)
    );

    // 8. أفضل المندوبين مبيعاً
    const reps = await prisma.representative.findMany({
      include: {
        user: { select: { name: true } },
        salesInvoices: {
          where: { status: 'APPROVED' },
          select: { total: true },
        },
      },
      take: 5,
    });

    const topRepresentatives = reps.map((r) => {
      const salesSum = r.salesInvoices.reduce((acc, curr) => acc + curr.total, 0);
      return {
        id: r.id,
        name: r.user.name,
        code: r.employeeCode,
        totalSales: salesSum,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);

    // 9. آخر الفواتير المنفذة
    const recentInvoices = await prisma.salesInvoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: { select: { businessName: true, ownerName: true } },
        representative: { include: { user: { select: { name: true } } } },
      },
    });

    // 10. إحصائيات الأشهر الستة الأخيرة للرسم البياني
    const monthlyStats: Array<{ month: string; sales: number; collections: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mName = mDate.toLocaleDateString('ar-EG', { month: 'short' });

      const mSales = await prisma.salesInvoice.aggregate({
        where: {
          status: 'APPROVED',
          invoiceDate: { gte: mDate, lt: nextMDate },
        },
        _sum: { total: true },
      });

      const mPayments = await prisma.payment.aggregate({
        where: {
          direction: 'IN',
          paymentDate: { gte: mDate, lt: nextMDate },
        },
        _sum: { amount: true },
      });

      monthlyStats.push({
        month: mName,
        sales: mSales._sum.total ?? 0,
        collections: mPayments._sum.amount ?? 0,
      });
    }

    return NextResponse.json({
      todaySales: todaySalesData._sum.total ?? 0,
      monthSales: monthSalesData._sum.total ?? 0,
      todayInvoiceCount: todaySalesData._count.id ?? 0,
      todayCollections: todayPayments._sum.amount ?? 0,
      todayCashDelivered: todayCashDelivered._sum.amount ?? 0,
      pendingCashInRepHands,
      totalReceivables,
      totalPayables,
      stockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount,
      topRepresentatives,
      recentInvoices,
      monthlyChartData: monthlyStats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
