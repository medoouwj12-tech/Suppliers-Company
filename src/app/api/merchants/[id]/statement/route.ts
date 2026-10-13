import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        representative: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'التاجر غير موجود' }, { status: 404 });
    }

    if (
      session!.user.role === 'REPRESENTATIVE' &&
      merchant.representativeId !== session!.user.representativeId
    ) {
      return NextResponse.json({ error: 'غير مصرح لك بعرض كشف حساب هذا التاجر' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fromDateStr = searchParams.get('from');
    const toDateStr = searchParams.get('to');

    const dateFilter: any = {};
    if (fromDateStr) dateFilter.gte = new Date(fromDateStr);
    if (toDateStr) {
      const to = new Date(toDateStr);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }

    const [invoices, payments] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: {
          merchantId: id,
          status: 'APPROVED',
          ...(fromDateStr || toDateStr ? { invoiceDate: dateFilter } : {}),
        },
        orderBy: { invoiceDate: 'asc' },
        include: {
          representative: { include: { user: { select: { name: true } } } },
          items: { include: { product: true } },
        },
      }),
      prisma.payment.findMany({
        where: {
          merchantId: id,
          direction: 'IN',
          ...(fromDateStr || toDateStr ? { paymentDate: dateFilter } : {}),
        },
        orderBy: { paymentDate: 'asc' },
        include: {
          recordedBy: { select: { name: true } },
        },
      }),
    ]);

    // دمج الحركات وترتيبها زمنياً لحساب الرصيد التراكمي
    type StatementEntry = {
      id: string;
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'OPENING';
      typeAr: string;
      docNo: string;
      debit: number;   // مدين (مشتريات/فواتير)
      credit: number;  // دائن (سدادات وتحصيلات)
      balance: number; // الرصيد التراكمي
      notes?: string | null;
      details?: any;
    };

    const entries: StatementEntry[] = [];
    let runningBalance = merchant.openingBalance;

    // إضافة الرصيد الافتتاحي كأول حركة
    entries.push({
      id: 'opening',
      date: merchant.createdAt,
      type: 'OPENING',
      typeAr: 'رصيد افتتاحي',
      docNo: 'OPENING',
      debit: merchant.openingBalance > 0 ? merchant.openingBalance : 0,
      credit: merchant.openingBalance < 0 ? Math.abs(merchant.openingBalance) : 0,
      balance: runningBalance,
      notes: 'رصيد أول المدة',
    });

    // دمج الفواتير والمدفوعات
    const combined: Array<{ date: Date; item: any; kind: 'INV' | 'PAY' }> = [
      ...invoices.map((inv) => ({ date: inv.invoiceDate, item: inv, kind: 'INV' as const })),
      ...payments.map((p) => ({ date: p.paymentDate, item: p, kind: 'PAY' as const })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const record of combined) {
      if (record.kind === 'INV') {
        const inv = record.item;
        runningBalance += inv.total;
        entries.push({
          id: inv.id,
          date: inv.invoiceDate,
          type: 'INVOICE',
          typeAr: 'فاتورة مبيعات',
          docNo: inv.invoiceNo,
          debit: inv.total,
          credit: 0,
          balance: runningBalance,
          notes: inv.notes,
          details: {
            itemsCount: inv.items.length,
            paidAmount: inv.paidAmount,
            remainingAmount: inv.remainingAmount,
          },
        });
      } else {
        const pay = record.item;
        runningBalance -= pay.amount;
        entries.push({
          id: pay.id,
          date: pay.paymentDate,
          type: 'PAYMENT',
          typeAr: 'سند قبض / سداد',
          docNo: pay.receiptNo,
          debit: 0,
          credit: pay.amount,
          balance: runningBalance,
          notes: pay.notes,
          details: {
            paymentType: pay.paymentType,
          },
        });
      }
    }

    return NextResponse.json({
      merchant: {
        id: merchant.code,
        code: merchant.code,
        businessName: merchant.businessName,
        ownerName: merchant.ownerName,
        phone: merchant.phone,
        address: merchant.address,
        area: merchant.area,
        openingBalance: merchant.openingBalance,
        creditLimit: merchant.creditLimit,
        representativeName: merchant.representative?.user.name,
      },
      currentBalance: runningBalance,
      entries,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
