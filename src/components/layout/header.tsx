'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Menu,
  ChevronDown,
  User,
  Lock,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  title: string;
  breadcrumb?: string | BreadcrumbItem[];
  notificationCount?: number;
  onMenuToggle: () => void;
}

// ─── Arabic Date/Time ─────────────────────────────────────────────────────────

function useArabicDateTime() {
  const [datetime, setDatetime] = useState('');

  useEffect(() => {
    const format = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setDatetime(`${dateStr} — ${timeStr}`);
    };

    format();
    const interval = setInterval(format, 60_000);
    return () => clearInterval(interval);
  }, []);

  return datetime;
}

// ─── User Dropdown ────────────────────────────────────────────────────────────

interface UserDropdownProps {
  name: string;
  email?: string;
}

function UserDropdown({ name, email }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleProfile = () => {
    setOpen(false);
    router.push('/settings/profile');
  };

  const handleChangePassword = () => {
    setOpen(false);
    router.push('/settings/change-password');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {name.charAt(0)}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{name}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown */}
          <div className="absolute left-0 z-20 mt-2 w-52 origin-top-left rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
            {/* User info header */}
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
              {email && (
                <p className="text-xs text-gray-500 truncate">{email}</p>
              )}
            </div>

            <button
              onClick={handleProfile}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <User className="h-4 w-4 text-gray-400" />
              الملف الشخصي
            </button>

            <button
              onClick={handleChangePassword}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Lock className="h-4 w-4 text-gray-400" />
              تغيير كلمة المرور
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────

interface NotificationBellProps {
  count: number;
}

function NotificationBell({ count }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`الإشعارات — ${count} جديد`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 z-20 mt-2 w-80 origin-top-left rounded-xl border border-gray-100 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">الإشعارات</h3>
              {count > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                  {count} جديد
                </span>
              )}
            </div>
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {/* Notification items rendered server-side in real usage */}
                <div className="px-4 py-3 hover:bg-gray-50">
                  <p className="text-sm text-gray-700">لديك فواتير معلقة تحتاج مراجعة</p>
                  <p className="mt-1 text-xs text-gray-400">منذ قليل</p>
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                عرض جميع الإشعارات
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Header Component ─────────────────────────────────────────────────────────

export function Header({
  title,
  breadcrumb,
  notificationCount = 0,
  onMenuToggle,
}: HeaderProps) {
  const { data: session } = useSession();
  const datetime = useArabicDateTime();

  const userName = session?.user?.name ?? 'المستخدم';
  const userEmail = session?.user?.email ?? undefined;

  const breadcrumbs: BreadcrumbItem[] = typeof breadcrumb === 'string'
    ? [{ label: breadcrumb }]
    : Array.isArray(breadcrumb)
    ? breadcrumb
    : [];

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title + Breadcrumb */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">
            {title}
          </h1>
          {breadcrumbs.length > 0 && (
            <nav aria-label="مسار التنقل" className="hidden sm:flex items-center gap-1 mt-0.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-300 text-xs">/</span>}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Date/Time */}
          <span className="hidden xl:inline text-xs text-gray-400 whitespace-nowrap">
            {datetime}
          </span>

          {/* Notification Bell */}
          <NotificationBell count={notificationCount} />

          {/* User Dropdown */}
          <UserDropdown name={userName} email={userEmail} />
        </div>
      </div>
    </header>
  );
}
