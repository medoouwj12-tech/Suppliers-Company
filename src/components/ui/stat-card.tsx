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
    default: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300/80 hover:-translate-y-0.5 active:translate-y-0',
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-slate-500 leading-relaxed">{title}</p>
          <h3 className="mt-2.5 text-[26px] font-extrabold tracking-tight text-slate-900 leading-none">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-2 text-[12px] text-slate-400 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
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
