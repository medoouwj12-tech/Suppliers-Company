'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Truck,
  LayoutDashboard,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
  Package,
  BarChart,
  Settings,
  ChevronDown,
  ChevronLeft,
  LogOut,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  subItems?: SubItem[];
}

// ─── Navigation Definition ────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    label: 'لوحة التحكم',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'المبيعات',
    href: '/sales',
    icon: ShoppingCart,
    subItems: [
      { label: 'فواتير البيع', href: '/sales' },
      { label: 'إضافة فاتورة', href: '/rep/new-sale' },
    ],
  },
  {
    label: 'التجار',
    href: '/merchants',
    icon: Store,
  },
  {
    label: 'المندوبون',
    href: '/representatives',
    icon: Users,
    subItems: [
      { label: 'قائمة المندوبين', href: '/representatives' },
      { label: 'تسليمات المندوبين', href: '/delivery-orders' },
      { label: 'تسويات الخزينة', href: '/cash-handovers' },
    ],
  },
  {
    label: 'المخازن',
    href: '/warehouses',
    icon: Warehouse,
    subItems: [
      { label: 'المخازن والأرصدة', href: '/warehouses' },
      { label: 'حركة المخزون', href: '/warehouses?tab=movements' },
      { label: 'المرتجعات', href: '/returns' },
    ],
  },
  {
    label: 'المنتجات',
    href: '/products',
    icon: Package,
    subItems: [
      { label: 'قائمة المنتجات', href: '/products' },
      { label: 'التصنيفات', href: '/products/categories' },
    ],
  },
  {
    label: 'المشتريات',
    href: '/suppliers',
    icon: Truck,
    subItems: [
      { label: 'الموردون', href: '/suppliers' },
      { label: 'فواتير الشراء', href: '/purchases' },
    ],
  },
  {
    label: 'التقارير',
    href: '/reports',
    icon: BarChart,
    subItems: [
      { label: 'تقرير المبيعات', href: '/reports?tab=sales' },
      { label: 'تقرير الديون', href: '/reports?tab=debts' },
      { label: 'تقرير المخزون', href: '/reports?tab=inventory' },
    ],
  },
  {
    label: 'الإعدادات',
    href: '/settings',
    icon: Settings,
  },
];

// ─── NavGroup Component ───────────────────────────────────────────────────────

interface NavGroupProps {
  item: NavItem;
  isCollapsed: boolean;
  onMobileClose?: () => void;
}

function NavGroup({ item, isCollapsed, onMobileClose }: NavGroupProps) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.subItems && item.subItems.length > 0;

  const [isOpen, setIsOpen] = useState<boolean>(isActive);

  const Icon = item.icon;

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onMobileClose}
        className={cn(
          'flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-semibold transition-all duration-200',
          isActive
            ? 'bg-gradient-to-l from-emerald-300/20 to-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(4,24,31,0.12)] ring-1 ring-inset ring-emerald-100/20'
            : 'text-emerald-50/80 hover:bg-white/8 hover:text-white',
          isCollapsed && 'justify-center px-2.5'
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-semibold transition-all duration-200',
          isActive
            ? 'bg-gradient-to-l from-emerald-300/20 to-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(4,24,31,0.12)] ring-1 ring-inset ring-emerald-100/20'
            : 'text-emerald-50/80 hover:bg-white/8 hover:text-white',
          isCollapsed && 'justify-center px-2.5'
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-right">{item.label}</span>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </>
        )}
      </button>

      {!isCollapsed && isOpen && (
        <div className="mt-1 space-y-0.5 pr-9">
          {item.subItems!.map((sub) => {
            const subActive = pathname === sub.href;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onMobileClose}
                className={cn(
              'block rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                  subActive
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-emerald-100/70 hover:bg-white/8 hover:text-white'
                )}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { data: session } = useSession();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'مدير النظام';
      case 'ACCOUNTANT':
        return 'محاسب';
      case 'WAREHOUSE_MANAGER':
        return 'مدير مخزن';
      case 'REPRESENTATIVE':
        return 'مندوب مبيعات';
      case 'SUPPLIER':
        return 'مورد';
      default:
        return 'مستخدم';
    }
  };

  const SidebarContent = ({
    collapsed,
    isMobile,
  }: {
    collapsed: boolean;
    isMobile: boolean;
  }) => (
    <div
      className="flex h-full flex-col"
      style={{ background: 'radial-gradient(ellipse at 12% 0%, rgba(44,142,120,0.44) 0%, transparent 43%), radial-gradient(ellipse at 100% 92%, rgba(215,169,75,0.08) 0%, transparent 35%), linear-gradient(180deg, #103744 0%, #0d2c3a 58%, #0b2633 100%)' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-white/10 px-5 py-6',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300/30 to-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-sm">
          <Truck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold text-white tracking-tight">SupplyPro ERP</p>
            <p className="text-[11px] text-blue-200/70 mt-0.5">نظام إدارة التوريدات</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="mr-auto text-blue-200 hover:text-white"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {!isMobile && (
          <button
            onClick={() => setDesktopCollapsed((p) => !p)}
            className={cn(
              'text-blue-200 hover:text-white transition-colors',
              collapsed ? '' : 'mr-auto'
            )}
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5">
        {NAV_ITEMS.map((item) => (
          <NavGroup
            key={item.href}
            item={item}
            isCollapsed={collapsed}
            onMobileClose={isMobile ? onMobileClose : undefined}
          />
        ))}
      </nav>

      {/* User Info */}
      <div className="border-t border-white/10 px-3 py-5">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white">
                {session?.user?.name?.charAt(0) ?? 'م'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">
                  {session?.user?.name ?? 'المستخدم'}
                </p>
                <p className="truncate text-[11px] text-blue-200/60 mt-0.5">
                  {roleLabel((session?.user as { role?: string })?.role)}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] text-blue-200/70 transition-all hover:bg-white/8 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="flex w-full justify-center rounded-xl p-2.5 text-blue-200/70 transition-all hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 transition-all duration-300',
          desktopCollapsed ? 'w-[76px]' : 'w-[280px]'
        )}
      >
        <SidebarContent collapsed={desktopCollapsed} isMobile={false} />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <SidebarContent collapsed={false} isMobile={true} />
      </aside>
    </>
  );
}
