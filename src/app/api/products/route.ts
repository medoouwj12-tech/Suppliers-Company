import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, getPaginationParams, paginatedResponse } from '@/lib/api-helpers';
import { z } from 'zod';

const createProductSchema = z.object({
  sku: z.string().min(1, 'كود الصنف مطلوب'),
  name: z.string().min(1, 'اسم الصنف مطلوب'),
  nameAr: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  purchasePrice: z.number().min(0, 'سعر الشراء يجب أن يكون صفر أو أكثر'),
  sellingPriceCarton: z.number().min(0, 'سعر بيع الكرتونة يجب أن يكون صفر أو أكثر'),
  sellingPriceUnit: z.number().min(0, 'سعر بيع الوحدة يجب أن يكون صفر أو أكثر'),
  unitsPerCarton: z.number().int().min(1, 'عدد الوحدات بالكرتونة يجب أن يكون 1 على الأقل'),
  unitName: z.string().default('وحدة'),
  cartonName: z.string().default('كرتونة'),
  minStockAlert: z.number().int().min(0).default(10),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, nameAr: true } },
          stockBalances: {
            include: { warehouse: { select: { id: true, name: true, code: true } } },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const transformed = products.map((p) => {
      const totalUnits = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
      const cartons = Math.floor(totalUnits / p.unitsPerCarton);
      const remainderUnits = totalUnits % p.unitsPerCarton;

      return {
        ...p,
        totalStockUnits: totalUnits,
        totalStockCartons: cartons,
        totalStockRemainderUnits: remainderUnits,
        isLowStock: totalUnits <= p.minStockAlert,
      };
    });

    return paginatedResponse(transformed, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createProductSchema.parse(body);

    const existing = await prisma.product.findUnique({
      where: { sku: validated.sku },
    });
    if (existing) {
      return NextResponse.json({ error: 'كود الصنف (SKU) مستخدم بالفعل' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: validated,
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
