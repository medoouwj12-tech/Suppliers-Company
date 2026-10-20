'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut, Truck } from 'lucide-react';

export function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3f7f6] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#dce8e5] bg-white/90 shadow-[0_8px_24px_rgba(16,60,71,0.05)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3ca99a] to-[#0e7268] text-white shadow-lg shadow-emerald-900/15">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold tracking-tight text-[#103c47]">SupplyPro</p>
              <p className="text-[12px] text-slate-500">بوابة الموردين</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-[13px] font-bold text-slate-800">{session?.user?.name ?? 'حساب المورد'}</p>
              <p className="text-[11px] text-slate-500">حساب مورد</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        {children}
      </main>
    </div>
  );
}
