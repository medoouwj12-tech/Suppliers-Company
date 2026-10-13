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
    default: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700 border border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border border-rose-100',
  };

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-600 truncate">{title}</span>
        {icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconVariants[variant])}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          {trend.isNeutral ? (
            <Minus className="h-3.5 w-3.5 text-slate-400" />
          ) : trend.isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          )}
          <span
            className={cn(
              trend.isNeutral && 'text-slate-500',
              trend.isPositive && 'text-emerald-700',
              !trend.isPositive && !trend.isNeutral && 'text-rose-700'
            )}
          >
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-400 font-normal">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
