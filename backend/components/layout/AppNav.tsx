'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface AppNavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  variant?: 'primary' | 'secondary';
}

interface AppNavProps {
  items?: AppNavItem[];
}

const displayFont = {
  fontFamily: '"Cormorant Garamond", Georgia, serif',
};

function getItemClassName(item: AppNavItem) {
  const isPrimary = item.variant === 'primary' || item.active;
  const base = 'grid h-9 place-items-center rounded-[8px] px-2 text-[12px] transition sm:h-[44px] sm:px-5 sm:text-[14px]';
  const secondary = 'min-w-[58px] border border-[#e2d8cd] bg-[#fffdf9] font-medium text-[#2b241d] shadow-[0_4px_16px_rgba(60,42,27,0.035)] hover:border-[#8d633f] sm:min-w-[88px]';
  const primary = 'min-w-[78px] border border-[#8b603b] bg-[#8b603b] font-semibold text-white shadow-[0_10px_22px_rgba(80,51,28,0.2)] hover:bg-[#765233] sm:min-w-[118px]';

  return `${base} ${isPrimary ? primary : secondary}`;
}

export function AppNav({ items = [] }: AppNavProps) {
  return (
    <nav className="h-[88px] border-b border-[#eee6dc] bg-[#fbf8f3]">
      <div className="flex h-full w-full items-center justify-between pl-0 pr-2 sm:pr-[40px]">
        <Link
          href="/"
          className="flex origin-left translate-y-[3px] items-center gap-2 text-[#17120e] sm:gap-2.5"
        >
          <Image
            src="/images/scholarbridge-icon-handdrawn-v2.png"
            alt=""
            width={512}
            height={320}
            priority
            className="h-8 w-[52px] shrink-0 object-contain sm:h-[42px] sm:w-[68px]"
          />
          <span
            className="origin-left scale-x-[1.04] font-serif text-[20px] font-semibold leading-none tracking-[-0.02em] sm:scale-x-[1.14] sm:text-[34px]"
            style={displayFont}
          >
            ScholarBridge
          </span>
        </Link>

        <div className="flex translate-y-[3px] items-center gap-1.5 sm:gap-4">
          {items.map((item) => {
            const className = getItemClassName(item);

            if (item.href) {
              return (
                <Link key={`${item.label}-${item.href}`} href={item.href} className={className}>
                  {item.label}
                </Link>
              );
            }

            return (
              <button key={item.label} type="button" className={className} onClick={item.onClick}>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
