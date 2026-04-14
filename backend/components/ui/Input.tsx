/**
 * Input组件 - 基于ScholarBridge设计
 */

import { InputHTMLAttributes } from 'react';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const baseStyles = 'w-full py-[10px] px-[14px] border border-[#E0D8CC] rounded text-[14px] text-[#1A1A1A] outline-none font-family-body transition-all duration-200 ease bg-white';

  const focusStyles = 'focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]';

  return (
    <input
      className={`${baseStyles} ${focusStyles} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLTextAreaElement>) {
  const baseStyles = 'w-full py-[10px] px-[14px] border border-[#E0D8CC] rounded text-[14px] text-[#1A1A1A] outline-none font-family-body transition-all duration-200 ease bg-white resize-y min-h-[80px]';

  const focusStyles = 'focus:border-[#2C5F7C] focus:shadow-[0_0_0_3px_rgba(44,95,124,0.1)]';

  return (
    <textarea
      className={`${baseStyles} ${focusStyles} ${className}`}
      {...props}
    />
  );
}
