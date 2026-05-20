/**
 * Badge component for the ScholarBridge interface.
 */

import { HTMLAttributes } from 'react';

type BadgeVariant = 'gold' | 'green' | 'blue' | 'red';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  variant = 'blue',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    gold: 'bg-[#F5EDE0] text-[#8B6914] border border-[#E0D0A0]',
    green: 'bg-[#E8F5EE] text-[#2D7A4F] border border-[#B8E0CC]',
    blue: 'bg-[#EBF3F8] text-[#2C5F7C] border border-[#A8D0E8]',
    red: 'bg-[#FEEEEE] text-[#C53030] border border-[#F0C0C0]'
  };

  const dotStyles: Record<BadgeVariant, string> = {
    gold: 'bg-[#B8941F]',
    green: 'bg-[#3DA859]',
    blue: 'bg-[#2C5F7C]',
    red: 'bg-[#C53030]'
  };

  return (
    <span
      className={`inline-flex items-center gap-[5px] text-xs py-[4px] px-[10px] rounded font-semibold tracking-[0.02em] ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-[6px] h-[6px] rounded-full ${dotStyles[variant]}`} />
      )}
      {children}
    </span>
  );
}
