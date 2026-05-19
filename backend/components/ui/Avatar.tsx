/**
 * Avatar component for the ScholarBridge interface.
 */

import { HTMLAttributes } from 'react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({
  name = '',
  src,
  size = 'md',
  className = '',
  ...props
}: AvatarProps) {
  const sizeStyles = {
    sm: 'w-[36px] h-[36px] text-xs',
    md: 'w-[50px] h-[50px] text-sm',
    lg: 'w-[85px] h-[85px] text-xl'
  };

  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <div
        className={`rounded-full object-cover flex-shrink-0 ${sizeStyles[size]} ${className}`}
        {...props}
      >
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      </div>
    );
  }

  const gradientStyles = 'bg-[linear-gradient(135deg,#2C5F7C_0%,#4A8AA8_100%)]';

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold ${gradientStyles} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {initials}
    </div>
  );
}
