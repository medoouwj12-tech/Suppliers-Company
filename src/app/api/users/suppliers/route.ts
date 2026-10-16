import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireAdmin } from '@/lib/api-helpers';

const createSupplierUserSchema = z.object({
  supplierId: z.string().min(1, 'اختر المورد'),
  username: z
    .string()
    .trim()
    .min(3, 'اسم المستخدم يجب ألا يقل عن 3 أحرف')
    .max(32, 'اسم المستخدم طويل جدًا')
    .regex(/^[a-zA-Z0-9._-]+$/, 'استخدم أحرفًا إنجليزية أو أرقامًا أو . _ - فقط')
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(8, 'كلمة المرور يجب ألا تقل عن 8 أحرف')),
});

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createSupplierUserSchema.parse(body);

    const supplier = await prisma.supplier.findUnique({
      where: { id: validated.supplierId },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        user: { select: { id: true } },
      },
    });

    if (!supplier || supplier.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'المورد غير موجود أو غير نشط' }, { status: 404 });
    }
    if (supplier.user) {
      return NextResponse.json({ error: 'لدى هذا المورد حساب دخول بالفعل' }, { status: 409 });
    }

    const usernameExists = await prisma.user.findUnique({
      where: { username: validated.username },
      select: { id: true },
    });
    if (usernameExists) {
      return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);
    const user = await prisma.user.create({
      data: {
        supplierId: supplier.id,
        username: validated.username,
        name: supplier.name,
        phone: supplier.phone,
        passwordHash,
        role: 'SUPPLIER',
        status: 'ACTIVE',
      },
      select: { id: true, username: true, name: true, role: true, status: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'اسم المستخدم أو المورد مرتبط بحساب آخر' }, { status: 409 });
    }
    return handleApiError(error);
  }
}
