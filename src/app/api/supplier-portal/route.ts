import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireSupplier } from '@/lib/api-helpers';

export async function GET() {
  try {
    const { session, supplierId, error } = await requireSupplier();
    if (error) return error;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        code: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        address: true,
        openingBalance: true,
        status: true,
        purchaseInvoices: {
          where: { status: 'APPROVED' },
          orderBy: { invoiceDate: 'desc' },
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            dueDate: true,
            paymentStatus: true,
            total: true,
            paidAmount: true,
            warehouse: { select: { name: true } },
            items: {
              select: {
                quantity: true,
                total: true,
                product: { select: { name: true, unitName: true } },
              },
            },
          },
        },
        payments: {
          where: { direction: 'OUT' },
          orderBy: { paymentDate: 'desc' },
          take: 100,
          select: {
            id: true,
            receiptNo: true,
            amount: true,
            paymentType: true,
            paymentDate: true,
            purchaseInvoice: { select: { invoiceNo: true } },
          },
        },
      },
    });

    if (!supplier || supplier.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'حساب المورد غير متاح' }, { status: 403 });
    }

    const totalPurchases = supplier.purchaseInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalPaid = supplier.purchaseInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
      },
      summary: {
        openingBalance: supplier.openingBalance,
        totalPurchases,
        totalPaid,
        currentBalance: supplier.openingBalance + totalPurchases - totalPaid,
        invoiceCount: supplier.purchaseInvoices.length,
      },
      invoices: supplier.purchaseInvoices,
      payments: supplier.payments,
      accountName: session!.user.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
