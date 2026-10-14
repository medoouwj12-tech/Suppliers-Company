'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-xl transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none whitespace-nowrap',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-[#1e3a5f] text-white hover:bg-[#163050] active:bg-[#0e2640] focus-visible:ring-[#1e3a5f] shadow-[0_1px_3px_rgba(30,58,95,0.3)] hover:shadow-[0_2px_8px_rgba(30,58,95,0.35)]',
        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
        outline:
          'border-[1.5px] border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        ghost:
          'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-400',
        danger:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-[0_1px_3px_rgba(220,38,38,0.3)]',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-[0_1px_3px_rgba(5,150,105,0.3)]',
      },
      size: {
        sm: 'h-8 px-3 text-[12px] rounded-lg',
        md: 'h-10 px-4 text-[13px]',
        lg: 'h-12 px-6 text-[14px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const spinnerSizeMap: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const spinnerSize = spinnerSizeMap[size ?? 'md'];

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner className={spinnerSize} />
            {loadingText ?? children}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
