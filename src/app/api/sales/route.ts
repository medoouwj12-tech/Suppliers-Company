import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, getPaginationParams, paginatedResponse, generateSequentialNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const saleItemSchema = z.object({
  productId: z.string().min(1, 'معرف الصنف مطلوب'),
  cartons: z.number().int().min(0).default(0),
  units: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0, 'سعر الوحدة غير صالح'),
  cartonPrice: z.number().min(0, 'سعر الكرتونة غير صالح'),
  discount: z.number().min(0).default(0),
});

const createSaleSchema = z.object({
  merchantId: z.string().min(1, 'التاجر مطلوب'),
  representativeId: z.string().min(1, 'المندوب مطلوب'),
  idempotencyKey: z.string().optional().nullable(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  paymentType: z.enum(['CASH', 'CREDIT', 'PARTIAL', 'TRANSFER']).default('CASH'),
  paidAmount: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const merchantId = searchParams.get('merchantId');
    const repIdParam = searchParams.get('representativeId');
    const paymentStatus = searchParams.get('paymentStatus');
    const status = searchParams.get('status');

    const where: any = {};

    if (session!.user.role === 'REPRESENTATIVE') {
      where.representativeId = session!.user.representativeId;
    } else if (repIdParam) {
      where.representativeId = repIdParam;
    }

    if (merchantId) where.merchantId = merchantId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { merchant: { businessName: { contains: search } } },
        { merchant: { ownerName: { contains: search } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: { select: { id: true, code: true, businessName: true, ownerName: true, phone: true } },
          representative: { include: { user: { select: { name: true } } } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unitName: true, cartonName: true, unitsPerCarton: true } },
            },
          },
          _count: { select: { payments: true } },
        },
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.salesInvoice.count({ where }),
    ]);

    return paginatedResponse(invoices, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const validated = createSaleSchema.parse(body);

    // 1. التحقق من صلاحية المندوب
    if (session!.user.role === 'REPRESENTATIVE') {
      if (validated.representativeId !== session!.user.representativeId) {
        return NextResponse.json({ error: 'لا يمكنك إصدار فاتورة باسم مندوب آخر' }, { status: 403 });
      }
    }

    // 2. فحص idempotency لمنع تكرار الفاتورة بسبب ضعف الشبكة أو النقر المتكرر
    if (validated.idempotencyKey) {
      const existingInvoice = await prisma.salesInvoice.findUnique({
        where: { idempotencyKey: validated.idempotencyKey },
        include: {
          merchant: true,
          representative: { include: { user: true } },
          items: { include: { product: true } },
        },
      });

      if (existingInvoice) {
        return NextResponse.json(existingInvoice, { status: 200 });
      }
    }

    // 3. التحقق من وجود التاجر وحالته
    const merchant = await prisma.merchant.findUnique({
      where: { id: validated.merchantId },
    });
    if (!merchant || merchant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'التاجر المحدد غير موجود أو حسابه موقوف' }, { status: 400 });
    }

    // 4. فحص توفر كميات العهدة لدى المندوب بدقة
    const repInventoryItems = await prisma.representativeInventory.findMany({
      where: {
        representativeId: validated.representativeId,
        productId: { in: validated.items.map((i) => i.productId) },
      },
      include: { product: true },
    });

    const inventoryMap = new Map<string, { quantity: number; product: any }>();
    for (const item of repInventoryItems) {
      inventoryMap.set(item.productId, { quantity: item.quantity, product: item.product });
    }

    // التحقق من الحسابات والكميات
    const calculatedItems: Array<{
      productId: string;
      totalUnits: number;
      cartons: number;
      units: number;
      unitPrice: number;
      cartonPrice: number;
      unitsPerCarton: number;
      discount: number;
      total: number;
    }> = [];

    let calculatedSubtotal = 0;

    for (const item of validated.items) {
      const stock = inventoryMap.get(item.productId);
      if (!stock) {
        return NextResponse.json(
          { error: `الصنف غير موجود إطلاقاً في عهدة المندوب` },
          { status: 400 }
        );
      }

      const p = stock.product;
      const totalUnitsRequested = item.cartons * p.unitsPerCarton + item.units;

      if (totalUnitsRequested <= 0) {
        return NextResponse.json(
          { error: `الكمية المطلوبة للصنف ${p.name} يجب أن تكون أكبر من صفر` },
          { status: 400 }
        );
      }

      // شرط حاسم: منع بيع كمية أكبر من المتاح في عهدة المندوب
      if (totalUnitsRequested > stock.quantity) {
        const availableCartons = Math.floor(stock.quantity / p.unitsPerCarton);
        const availableRemainder = stock.quantity % p.unitsPerCarton;
        return NextResponse.json(
          {
            error: `الرصيد المتاح في عهدتك من [${p.name}] غير كافٍ. المتاح: ${availableCartons} كرتونة و ${availableRemainder} وحدة، والمطلوب: ${item.cartons} كرتونة و ${item.units} وحدة`,
          },
          { status: 400 }
        );
      }

      // حساب القيمة: (الكراتين * سعر الكرتونة) + (الوحدات * سعر الوحدة) - الخصم
      const itemSubtotal = item.cartons * item.cartonPrice + item.units * item.unitPrice;
      const itemTotal = Math.max(0, itemSubtotal - item.discount);

      calculatedSubtotal += itemTotal;

      calculatedItems.push({
        productId: item.productId,
        totalUnits: totalUnitsRequested,
        cartons: item.cartons,
        units: item.units,
        unitPrice: item.unitPrice,
        cartonPrice: item.cartonPrice,
        unitsPerCarton: p.unitsPerCarton,
        discount: item.discount,
        total: itemTotal,
      });
    }

    const finalTotal = Math.max(0, calculatedSubtotal - validated.discount);
    const paidAmount = Math.min(finalTotal, validated.paidAmount);
    const remainingAmount = finalTotal - paidAmount;

    let paymentStatus = 'UNPAID';
    if (paidAmount >= finalTotal) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIAL';
    }

    // 5. التنفيذ داخل Transaction ذرية واحدة
    const createdInvoice = await prisma.$transaction(async (tx) => {
      // توليد رقم فاتورة فريد
      const invoiceNo = await generateSequentialNumber(tx, 'INV', 'salesInvoice');

      // إنشاء الفاتورة
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNo,
          merchantId: validated.merchantId,
          representativeId: validated.representativeId,
          status: 'APPROVED',
          paymentStatus,
          paymentType: validated.paymentType,
          invoiceDate: validated.invoiceDate ? new Date(validated.invoiceDate) : new Date(),
          dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
          subtotal: calculatedSubtotal,
          discount: validated.discount,
          total: finalTotal,
          paidAmount,
          remainingAmount,
          idempotencyKey: validated.idempotencyKey || null,
          createdById: session!.user.id,
          notes: validated.notes,
        },
      });

      // إنشاء بنود الفاتورة وخصم العهدة
      for (const item of calculatedItems) {
        await tx.salesInvoiceItem.create({
          data: {
            salesInvoiceId: invoice.id,
            productId: item.productId,
            quantity: item.totalUnits,
            unitPrice: item.unitPrice,
            cartonPrice: item.cartonPrice,
            unitsPerCarton: item.unitsPerCarton,
            discount: item.discount,
            total: item.total,
          },
        });

        // خصم الكمية من عهدة المندوب
        await tx.representativeInventory.update({
          where: {
            representativeId_productId: {
              representativeId: validated.representativeId,
              productId: item.productId,
            },
          },
          data: {
            quantity: {
              decrement: item.totalUnits,
            },
          },
        });
      }

      // تسجيل سند قبض تلقائي إذا كان هناك سداد فوري
      if (paidAmount > 0) {
        const receiptNo = await generateSequentialNumber(tx, 'REC', 'payment');
        await tx.payment.create({
          data: {
            receiptNo,
            direction: 'IN',
            paymentType: validated.paymentType === 'TRANSFER' ? 'BANK_TRANSFER' : 'CASH',
            amount: paidAmount,
            merchantId: validated.merchantId,
            representativeId: validated.representativeId,
            salesInvoiceId: invoice.id,
            recordedById: session!.user.id,
            notes: `تحصيل مسدد مع الفاتورة رقم ${invoiceNo}`,
          },
        });
      }

      return invoice;
    });

    // استرجاع الفاتورة الكاملة مع بياناتها
    const fullInvoice = await prisma.salesInvoice.findUnique({
      where: { id: createdInvoice.id },
      include: {
        merchant: true,
        representative: { include: { user: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });

    return NextResponse.json(fullInvoice, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
