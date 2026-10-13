import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// تنسيق العملة
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' ج.م'
}

// تنسيق التاريخ
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// تنسيق التاريخ والوقت
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// تحويل الكميات: من وحدات إلى كراتين + وحدات
export function unitsToCartonsAndUnits(
  units: number,
  unitsPerCarton: number
): { cartons: number; units: number } {
  const cartons = Math.floor(units / unitsPerCarton)
  const remainingUnits = units % unitsPerCarton
  return { cartons, units: remainingUnits }
}

// تحويل كراتين + وحدات إلى وحدات
export function cartonsAndUnitsToUnits(
  cartons: number,
  units: number,
  unitsPerCarton: number
): number {
  return cartons * unitsPerCarton + units
}

// عرض الكمية بشكل مقروء
export function formatQuantity(
  units: number,
  unitsPerCarton: number,
  unitName: string = 'وحدة',
  cartonName: string = 'كرتونة'
): string {
  const { cartons, units: remainingUnits } = unitsToCartonsAndUnits(units, unitsPerCarton)
  if (cartons === 0) return `${remainingUnits} ${unitName}`
  if (remainingUnits === 0) return `${cartons} ${cartonName}`
  return `${cartons} ${cartonName} و${remainingUnits} ${unitName}`
}

// توليد رقم مستند فريد
export function generateDocumentNumber(prefix: string, sequence: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(sequence).padStart(5, '0')}`
}

// حساب حالة الدفع
export function calculatePaymentStatus(total: number, paid: number): 'PAID' | 'PARTIAL' | 'UNPAID' {
  if (paid >= total) return 'PAID'
  if (paid > 0) return 'PARTIAL'
  return 'UNPAID'
}

// ترجمة حالة الدفع
export function translatePaymentStatus(status: string): string {
  const map: Record<string, string> = {
    PAID: 'مدفوعة',
    PARTIAL: 'مدفوعة جزئياً',
    UNPAID: 'غير مدفوعة',
  }
  return map[status] ?? status
}

// ترجمة دور المستخدم
export function translateRole(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'مدير',
    REPRESENTATIVE: 'مندوب',
  }
  return map[role] ?? role
}

// ترجمة حالة المستخدم
export function translateUserStatus(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'نشط',
    INACTIVE: 'غير نشط',
    SUSPENDED: 'موقوف',
  }
  return map[status] ?? status
}

// ترجمة حالة المخزون
export function translateInvoiceStatus(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'مسودة',
    APPROVED: 'معتمدة',
    CANCELLED: 'ملغاة',
  }
  return map[status] ?? status
}

// ترجمة نوع حركة المخزون
export function translateStockMovementType(type: string): string {
  const map: Record<string, string> = {
    PURCHASE_IN: 'وارد مشتريات',
    SALE_OUT: 'صادر مبيعات',
    DELIVERY_OUT: 'تسليم لمندوب',
    RETURN_FROM_REP: 'مرتجع من مندوب',
    RETURN_FROM_MERCHANT: 'مرتجع من تاجر',
    TRANSFER_IN: 'تحويل وارد',
    TRANSFER_OUT: 'تحويل صادر',
    DAMAGE: 'تالف',
    ADJUSTMENT_IN: 'تسوية - زيادة',
    ADJUSTMENT_OUT: 'تسوية - نقص',
    INITIAL_STOCK: 'رصيد أول',
  }
  return map[type] ?? type
}
