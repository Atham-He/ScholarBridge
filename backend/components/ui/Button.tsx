/**
 * Button component for the ScholarBridge interface.
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
  const baseStyles = 'inline-flex items-center justify-center border font-semibold cursor-pointer transition-all duration-200 ease rounded font-family-body disabled:cursor-not-allowed';

  const variantStyles = {
    gold: 'bg-[#2C5F7C] text-white border-[#2C5F7C] hover:bg-[#4A8AA8] hover:border-[#4A8AA8] shadow-hover disabled:bg-[#D8D0C5] disabled:border-[#D8D0C5] disabled:text-[#1A1A1A] disabled:shadow-none',
    outline: 'bg-white text-[#1A1A1A] border border-[#E0D8CC] hover:border-[#2C5F7C] hover:text-[#2C5F7C] disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B] disabled:border-[#E0D8CC]',
    ghost: 'bg-transparent border border-[#E0D8CC] text-[#1A1A1A] hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:bg-[rgba(44,95,124,0.04)] disabled:bg-[#F5F2ED] disabled:text-[#6B6B6B] disabled:border-[#E0D8CC]'
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
