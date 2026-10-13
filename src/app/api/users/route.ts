import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, getPaginationParams, paginatedResponse } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب ألا يقل عن 3 أحرف'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().nullable(),
  name: z.string().min(2, 'الاسم مطلوب'),
  password: z.string().min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف'),
  role: z.enum(['ADMIN', 'REPRESENTATIVE']),
  phone: z.string().optional().nullable(),
  employeeCode: z.string().optional(),
  warehouseId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { page, limit, skip } = getPaginationParams(request);
    const search = request.nextUrl.searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          status: true,
          phone: true,
          createdAt: true,
          lastLoginAt: true,
          representative: {
            select: {
              id: true,
              employeeCode: true,
              warehouse: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(users, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = createUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'اسم المستخدم مسجل بالفعل' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: validated.username,
          email: validated.email,
          name: validated.name,
          passwordHash,
          role: validated.role,
          phone: validated.phone,
        },
      });

      if (validated.role === 'REPRESENTATIVE') {
        const repCount = await tx.representative.count();
        const code = validated.employeeCode || `REP-${String(repCount + 1).padStart(3, '0')}`;

        await tx.representative.create({
          data: {
            userId: user.id,
            employeeCode: code,
            phone: validated.phone,
            warehouseId: validated.warehouseId || null,
          },
        });
      }

      return user;
    });

    return NextResponse.json(
      {
        id: result.id,
        username: result.username,
        name: result.name,
        role: result.role,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
