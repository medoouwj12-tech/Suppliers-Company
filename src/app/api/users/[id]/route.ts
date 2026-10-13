import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['ADMIN', 'REPRESENTATIVE']).optional(),
  password: z.string().min(6).optional(),
  warehouseId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin();
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id },
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
          include: { warehouse: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const data: any = {
      ...(validated.name && { name: validated.name }),
      ...(validated.email !== undefined && { email: validated.email }),
      ...(validated.phone !== undefined && { phone: validated.phone }),
      ...(validated.status && { status: validated.status }),
      ...(validated.role && { role: validated.role }),
    };

    if (validated.password) {
      data.passwordHash = await bcrypt.hash(validated.password, 10);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data,
      });

      if (validated.warehouseId !== undefined) {
        await tx.representative.updateMany({
          where: { userId: id },
          data: { warehouseId: validated.warehouseId },
        });
      }

      return u;
    });

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      name: updated.name,
      role: updated.role,
      status: updated.status,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
