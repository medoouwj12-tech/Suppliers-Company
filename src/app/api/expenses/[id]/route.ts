import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireAdmin } from '@/lib/api-helpers';

const expenseSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().trim().min(2),
  expenseDate: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { id } = await context.params;
    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'بيانات المصروف غير صحيحة' }, { status: 400 });
    const data = parsed.data;
    const expense = await prisma.expense.update({
      where: { id },
      data: { ...data, expenseDate: new Date(`${data.expenseDate}T12:00:00`), notes: data.notes || null },
      include: { category: true },
    });
    return NextResponse.json(expense);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    const { id } = await context.params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
