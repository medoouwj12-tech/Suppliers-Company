import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// التحقق من المصادقة وإرجاع الجلسة
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 }) }
  }
  return { session }
}

// التحقق من صلاحية المدير
export async function requireAdmin() {
  const { session, error } = await requireAuth()
  if (error) return { error }
  if (session!.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'هذه العملية تتطلب صلاحية المدير' }, { status: 403 }) }
  }
  return { session }
}

export async function requireSupplier() {
  const { session, error } = await requireAuth()
  if (error) return { error }

  if (session!.user.role !== 'SUPPLIER' || !session!.user.supplierId) {
    return { error: NextResponse.json({ error: 'هذه الصفحة مخصصة لحسابات الموردين' }, { status: 403 }) }
  }

  return { session, supplierId: session!.user.supplierId }
}

// التحقق من أن المندوب يصل لبياناته فقط
export async function requireRepresentativeAccess(representativeId: string) {
  const { session, error } = await requireAuth()
  if (error) return { error }
  
  const user = session!.user
  if (user.role === 'ADMIN') return { session }  // المدير لديه صلاحية كاملة
  
  if (user.role === 'REPRESENTATIVE' && user.representativeId !== representativeId) {
    return { error: NextResponse.json({ error: 'لا يمكنك الوصول لبيانات مندوب آخر' }, { status: 403 }) }
  }
  
  return { session }
}

// معالجة الأخطاء الموحدة
export function handleApiError(error: unknown) {
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
}

// استخراج بيانات Pagination
export function getPaginationParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

// بناء response مع pagination
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  })
}

// توليد رقم مستند بشكل آمن ومتزامن
export async function generateSequentialNumber(
  prismaClient: any,
  prefix: string,
  modelName: 'salesInvoice' | 'purchaseInvoice' | 'payment' | 'cashHandover' | 'deliveryOrder' | 'return' | 'stockTransfer' | 'expense'
): Promise<string> {
  const year = new Date().getFullYear();
  const searchPrefix = `${prefix}-${year}-`;
  
  // Find highest number with this prefix
  const fieldMap: Record<string, string> = {
    salesInvoice: 'invoiceNo',
    purchaseInvoice: 'invoiceNo',
    payment: 'receiptNo',
    cashHandover: 'handoverNo',
    deliveryOrder: 'orderNo',
    return: 'returnNo',
    stockTransfer: 'transferNo',
    expense: 'expenseNo',
  };

  const field = fieldMap[modelName] || 'id';
  const model = prismaClient[modelName];

  const lastRecord = await model.findFirst({
    where: {
      [field]: {
        startsWith: searchPrefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      [field]: true,
    },
  });

  let nextSeq = 1;
  if (lastRecord && lastRecord[field]) {
    const parts = lastRecord[field].split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;
}
