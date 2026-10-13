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
    href: '/rep/sales/new',
    icon: Plus,
    highlight: true,
  },
  {
    label: 'عهدتي',
    href: '/rep/custody',
    icon: Package,
  },
  {
    label: 'حسابي',
    href: '/rep/profile',
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
    <div className="flex min-h-screen flex-col bg-gray-100" dir="rtl">
      {/* Top Header */}
      <header
        className="sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">SupplyPro ERP</span>
          </div>

          {/* User Name */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
              {userName.charAt(0)}
            </div>
            <span className="text-sm text-blue-100 max-w-[120px] truncate">
              {userName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-xl px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 border-t border-gray-200 bg-white safe-area-bottom"
        aria-label="التنقل الرئيسي"
      >
        <div className="flex h-16 items-stretch">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            if (item.highlight) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5"
                  aria-label={item.label}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full shadow-md"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">
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
                  'flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-blue-700' : 'text-gray-400 hover:text-gray-600'
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform',
                      active && 'scale-110'
                    )}
                  />
                  {active && (
                    <span
                      className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: '#1e3a5f' }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    active ? 'text-blue-700' : 'text-gray-400'
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
