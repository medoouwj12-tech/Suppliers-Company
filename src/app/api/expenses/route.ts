import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateSequentialNumber, handleApiError, requireAdmin } from '@/lib/api-helpers';

const DEFAULT_CATEGORIES = [
  { name: 'رواتب الموظفين', affectsProfit: true },
  { name: 'سلف الموظفين', affectsProfit: false },
  { name: 'إيجار المكتب', affectsProfit: true },
  { name: 'إيجار المخازن', affectsProfit: true },
  { name: 'كهرباء ومياه', affectsProfit: true },
  { name: 'اتصالات وإنترنت', affectsProfit: true },
  { name: 'نقل وشحن', affectsProfit: true },
  { name: 'صيانة', affectsProfit: true },
  { name: 'نثريات', affectsProfit: true },
  { name: 'أخرى', affectsProfit: true },
];

async function ensureDefaultCategories() {
  await Promise.all(DEFAULT_CATEGORIES.map(({ name, affectsProfit }) =>
    prisma.expenseCategory.upsert({
      where: { name },
      create: { name, affectsProfit },
      update: { affectsProfit },
    })
  ));
}

const expenseSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().trim().min(2, 'اكتب البيان أو اسم الموظف'),
  expenseDate: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;
    await ensureDefaultCategories();

    const params = request.nextUrl.searchParams;
    const where: any = {};
    const from = params.get('from');
    const to = params.get('to');
    const categoryId = params.get('categoryId');
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(`${from}T00:00:00`);
      if (to) where.expenseDate.lte = new Date(`${to}T23:59:59.999`);
    }
    if (categoryId) where.categoryId = categoryId;

    const [expenses, categories] = await Promise.all([
      prisma.expense.findMany({ where, include: { category: true, createdBy: { select: { name: true } } }, orderBy: { expenseDate: 'desc' } }),
      prisma.expenseCategory.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const profitExpenses = expenses.filter((expense) => expense.category?.affectsProfit).reduce((sum, expense) => sum + Number(expense.amount), 0);
    const advances = expenses.filter((expense) => expense.category && !expense.category.affectsProfit).reduce((sum, expense) => sum + Number(expense.amount), 0);
    return NextResponse.json({ data: expenses, categories, summary: { totalExpenses, profitExpenses, advances } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;
    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'بيانات المصروف غير صحيحة' }, { status: 400 });
    const values = parsed.data;
    const category = await prisma.expenseCategory.findUnique({ where: { id: values.categoryId } });
    if (!category) return NextResponse.json({ error: 'اختر بند مصروف صحيح' }, { status: 400 });
    const expenseNo = await generateSequentialNumber(prisma, 'EXP', 'expense');
    const expense = await prisma.expense.create({
      data: {
        expenseNo,
        categoryId: values.categoryId,
        amount: values.amount,
        description: values.description,
        expenseDate: new Date(`${values.expenseDate}T12:00:00`),
        notes: values.notes || null,
        createdById: session!.user.id,
      },
      include: { category: true },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
