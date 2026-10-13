'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: string | BreadcrumbItem[];
  notificationCount?: number;
}

// ─── AdminLayout Component ────────────────────────────────────────────────────

export function AdminLayout({
  children,
  title,
  breadcrumb,
  notificationCount = 0,
}: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          title={title}
          breadcrumb={breadcrumb}
          notificationCount={notificationCount}
          onMenuToggle={() => setMobileOpen((p) => !p)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
