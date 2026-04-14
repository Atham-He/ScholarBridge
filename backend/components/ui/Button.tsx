/**
 * Button组件 - 基于ScholarBridge设计
 */

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'gold',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold cursor-pointer transition-all duration-200 ease border-none rounded font-family-body';

  const variantStyles = {
    gold: 'bg-[#2C5F7C] text-white hover:bg-[#4A8AA8] shadow-hover',
    outline: 'bg-white text-[#1A1A1A] border border-[#E0D8CC] hover:border-[#2C5F7C] hover:text-[#2C5F7C]',
    ghost: 'bg-transparent border border-[#E0D8CC] text-[#6B6B6B] hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)]'
  };

  const sizeStyles = {
    sm: 'text-xs py-[7px] px-[14px] rounded',
    md: 'text-[13px] py-[10px] px-[20px] rounded',
    lg: 'text-base py-[12px] px-[24px] rounded'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
