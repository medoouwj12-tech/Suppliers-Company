import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const representativeId = searchParams.get('representativeId');

    const where: any = { status: 'ACTIVE' };
    if (representativeId) where.representativeId = representativeId;

    const merchants = await prisma.merchant.findMany({
      where,
      include: {
        representative: { include: { user: { select: { name: true } } } },
        salesInvoices: {
          where: {
            status: 'APPROVED',
            remainingAmount: { gt: 0 },
          },
          select: {
            invoiceNo: true,
            invoiceDate: true,
            total: true,
            remainingAmount: true,
          },
        },
      },
    });

    const now = new Date();
    let grandTotalDebt = 0;
    let grandTotal0to30 = 0;
    let grandTotal31to60 = 0;
    let grandTotal61to90 = 0;
    let grandTotalOver90 = 0;

    const merchantDebts = merchants.map((m) => {
      let d0to30 = 0;
      let d31to60 = 0;
      let d61to90 = 0;
      let dOver90 = 0;

      for (const inv of m.salesInvoices) {
        const diffDays = Math.floor(
          (now.getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 30) {
          d0to30 += inv.remainingAmount;
        } else if (diffDays <= 60) {
          d31to60 += inv.remainingAmount;
        } else if (diffDays <= 90) {
          d61to90 += inv.remainingAmount;
        } else {
          dOver90 += inv.remainingAmount;
        }
      }

      // إضافة الرصيد الافتتاحي لأقدم شريحة إن وجد
      if (m.openingBalance > 0) {
        dOver90 += m.openingBalance;
      }

      const totalMerchantDebt = d0to30 + d31to60 + d61to90 + dOver90;

      grandTotalDebt += totalMerchantDebt;
      grandTotal0to30 += d0to30;
      grandTotal31to60 += d31to60;
      grandTotal61to90 += d61to90;
      grandTotalOver90 += dOver90;

      return {
        id: m.id,
        code: m.code,
        businessName: m.businessName,
        ownerName: m.ownerName,
        phone: m.phone,
        representativeName: m.representative?.user.name ?? 'غير محدد',
        creditLimit: m.creditLimit,
        unpaidInvoicesCount: m.salesInvoices.length,
        totalDebt: Math.round(totalMerchantDebt * 100) / 100,
        age0to30: Math.round(d0to30 * 100) / 100,
        age31to60: Math.round(d31to60 * 100) / 100,
        age61to90: Math.round(d61to90 * 100) / 100,
        ageOver90: Math.round(dOver90 * 100) / 100,
        isOverLimit: m.creditLimit ? totalMerchantDebt > m.creditLimit : false,
      };
    }).filter((m) => m.totalDebt > 0);

    return NextResponse.json({
      summary: {
        totalDebtors: merchantDebts.length,
        grandTotalDebt: Math.round(grandTotalDebt * 100) / 100,
        agingSummary: {
          age0to30: Math.round(grandTotal0to30 * 100) / 100,
          age31to60: Math.round(grandTotal31to60 * 100) / 100,
          age61to90: Math.round(grandTotal61to90 * 100) / 100,
          ageOver90: Math.round(grandTotalOver90 * 100) / 100,
        },
      },
      merchants: merchantDebts.sort((a, b) => b.totalDebt - a.totalDebt),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
