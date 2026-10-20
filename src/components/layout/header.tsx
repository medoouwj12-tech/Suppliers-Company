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
    router.push('/settings');
  };

  const handleChangePassword = () => {
    setOpen(false);
    router.push('/settings');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:bg-slate-50 hover:border-slate-300/80 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: '#0e7268' }}
        >
          {name.charAt(0)}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate text-[13px]">{name}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
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
          <div className="absolute left-0 z-20 mt-2 w-56 origin-top-left rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-scale-in">
            {/* User info header */}
            <div className="border-b border-slate-100 px-4 py-3.5">
              <p className="text-[13px] font-semibold text-slate-900 truncate">{name}</p>
              {email && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{email}</p>
              )}
            </div>

            <div className="py-1">
              <button
                onClick={handleProfile}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <User className="h-4 w-4 text-slate-400" />
                الملف الشخصي والإعدادات
              </button>

              <button
                onClick={handleChangePassword}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Lock className="h-4 w-4 text-slate-400" />
                تغيير كلمة المرور
              </button>
            </div>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
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
        className="relative rounded-xl border border-slate-200/80 bg-white p-2.5 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300/80"
        aria-label={`الإشعارات — ${count} جديد`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 ring-2 ring-white">
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
                className="text-xs font-semibold text-[#0e7268] hover:underline"
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
      <header className="sticky top-0 z-30 border-b border-[#dce8e5] bg-white/90 shadow-[0_6px_24px_rgba(16,60,71,0.045)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-[78px] items-center gap-4 px-4 sm:px-5 lg:px-8">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden transition-colors"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title + Breadcrumb */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[19px] font-extrabold text-[#132f38] leading-tight truncate tracking-tight sm:text-[21px]">
            {title}
          </h1>
          {breadcrumbs.length > 0 && (
            <nav aria-label="مسار التنقل" className="hidden sm:flex items-center gap-1.5 mt-0.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-300 text-[10px]">›</span>}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-[12px] font-semibold text-[#0e7268] hover:text-[#103c47] hover:underline transition-colors"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-[12px] text-slate-400">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Date/Time */}
          <span className="hidden xl:inline text-[12px] text-slate-500 whitespace-nowrap bg-[#f5f9f8] px-3.5 py-2 rounded-xl border border-[#e2ece9]">
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
