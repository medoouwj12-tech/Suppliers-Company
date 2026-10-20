import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'default';
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  onClick,
  className,
}: StatCardProps) {
  const iconVariants = {
    default: 'bg-[#eef4f3] text-[#456064]',
    blue: 'bg-[#eaf3f6] text-[#2b6573]',
    emerald: 'bg-[#e7f5f1] text-[#0e7268]',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={cn(
        'group relative overflow-hidden rounded-[22px] border border-[#dce8e5] bg-white p-6 shadow-[0_8px_24px_rgba(16,60,71,0.045)] transition-all duration-300 sm:p-7',
        onClick && 'cursor-pointer hover:shadow-[0_14px_32px_rgba(16,60,71,0.1)] hover:border-[#b8d3cd] hover:-translate-y-0.5 active:translate-y-0',
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#536b6d] leading-relaxed">{title}</p>
          <h3 className="mt-3 text-[27px] font-extrabold tracking-tight text-[#132f38] leading-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-2.5 text-[12px] text-slate-500 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/[0.025] transition-transform duration-300 group-hover:scale-110',
              iconVariants[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="relative mt-4 flex items-center gap-1.5 text-xs font-medium">
          {trend.isNeutral ? (
            <Minus className="h-3.5 w-3.5 text-slate-400" />
          ) : trend.isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span
            className={cn(
              trend.isNeutral && 'text-slate-400',
              trend.isPositive && 'text-emerald-600',
              !trend.isPositive && !trend.isNeutral && 'text-rose-500'
            )}
          >
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-400">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
