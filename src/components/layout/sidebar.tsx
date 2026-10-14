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
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-white/15 text-white'
            : 'text-blue-100 hover:bg-white/10 hover:text-white',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-white/15 text-white'
            : 'text-blue-100 hover:bg-white/10 hover:text-white',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-right">{item.label}</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronLeft className="h-4 w-4 shrink-0" />
            )}
          </>
        )}
      </button>

      {!isCollapsed && isOpen && (
        <div className="mt-1 space-y-1 pr-8">
          {item.subItems!.map((sub) => {
            const subActive = pathname === sub.href;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onMobileClose}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-all duration-150',
                  subActive
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
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
      style={{ backgroundColor: '#1e3a5f' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-white/10 px-4 py-5',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <Truck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-base font-bold text-white">SupplyPro ERP</p>
            <p className="text-xs text-blue-200">نظام إدارة التوزيع</p>
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
      <div className="border-t border-white/10 px-3 py-4">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {session?.user?.name?.charAt(0) ?? 'م'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {session?.user?.name ?? 'المستخدم'}
                </p>
                <p className="truncate text-xs text-blue-200">
                  {roleLabel((session?.user as { role?: string })?.role)}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="flex w-full justify-center rounded-lg p-2 text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
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
          desktopCollapsed ? 'w-16' : 'w-64'
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
