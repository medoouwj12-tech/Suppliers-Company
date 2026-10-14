'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Plus, Package, User, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Bottom Nav Items ─────────────────────────────────────────────────────────

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  highlight?: boolean;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    label: 'الرئيسية',
    href: '/rep/dashboard',
    icon: Home,
    exact: true,
  },
  {
    label: 'فاتورة جديدة',
    href: '/rep/new-sale',
    icon: Plus,
    highlight: true,
  },
  {
    label: 'عهدتي',
    href: '/rep/inventory',
    icon: Package,
  },
  {
    label: 'حسابي',
    href: '/rep/collections',
    icon: User,
  },
];

// ─── RepLayout Component ──────────────────────────────────────────────────────

interface RepLayoutProps {
  children: React.ReactNode;
}

export function RepLayout({ children }: RepLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? 'المندوب';

  const isActive = (item: BottomNavItem): boolean => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6fb]" dir="rtl">
      {/* Top Header */}
      <header
        className="sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #163050 100%)' }}
      >
        <div className="flex h-16 items-center justify-between px-5">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Truck className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-[14px] font-bold text-white block">SupplyPro ERP</span>
              <span className="text-[10px] text-blue-200/60">نظام المندوب</span>
            </div>
          </div>

          {/* User Name */}
          <div className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-[12px] font-bold text-white">
              {userName.charAt(0)}
            </div>
            <span className="text-[13px] text-white/90 max-w-[120px] truncate font-medium">
              {userName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto max-w-xl px-5 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
        aria-label="التنقل الرئيسي"
      >
        <div className="flex h-[68px] items-stretch max-w-xl mx-auto">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            if (item.highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center gap-1"
                  aria-label={item.label}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_2px_8px_rgba(30,58,95,0.35)] -mt-4 transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a7a 100%)' }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1.5 transition-colors',
                  active ? 'text-[#1e3a5f]' : 'text-slate-400 hover:text-slate-600'
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon
                  className={cn(
                    'h-[22px] w-[22px] transition-transform',
                    active && 'scale-110'
                  )}
                />
                <span
                  className={cn(
                    'text-[10.5px]',
                    active ? 'font-bold' : 'font-medium'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
