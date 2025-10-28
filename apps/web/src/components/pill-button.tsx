/**
 * Pill Button Component
 * Based on design guide with gradient border and hollow outline style
 */

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function PillButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: PillButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  if (variant === 'primary') {
    return (
      <div className={`inline-block rounded-full bg-gradient-to-r from-echo-magenta to-echo-cyan p-[2px] ${className}`}>
        <button
          className={`
            w-full h-full rounded-full bg-arena-bg font-orbitron font-semibold tracking-wide uppercase
            text-echo-text transition-all duration-300
            hover:bg-gradient-to-r hover:from-echo-magenta/10 hover:to-echo-cyan/10
            disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
          `}
          disabled={disabled}
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }

  const variantClasses = {
    secondary: 'border-2 border-gray-500 hover:border-echo-cyan hover:bg-echo-cyan/5',
    danger: 'border-2 border-red-500 hover:border-red-400 hover:bg-red-500/10',
  };

  return (
    <button
      className={`
        rounded-full font-orbitron font-semibold tracking-wide uppercase
        text-echo-text transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant as 'secondary' | 'danger']}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
