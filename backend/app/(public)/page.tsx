/**
 * Public landing page converted from the provided reference UI.
 */

import Image from 'next/image';
import Link from 'next/link';
import { AppNav } from '@/components/layout/AppNav';

const displayFont = {
  fontFamily: '"Cormorant Garamond", Georgia, serif',
};

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M3.75 8.35 12 4.2l8.25 4.15L12 12.5 3.75 8.35Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M6.85 10.1v4.95c1.4 1.45 3.1 2.15 5.15 2.15s3.75-.7 5.15-2.15V10.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M20.25 8.45v4.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh+60px)] [overflow-x:clip] bg-[#fbf8f3] text-[#15110d]">
      <AppNav
        items={[
          { label: 'Log In', href: '/login' },
          { label: 'Sign Up', href: '/register', variant: 'primary' },
        ]}
      />

      <section className="relative mx-auto min-h-[760px] max-w-[1447px] px-10 pt-[32px] text-center">
        <h1
          className="relative z-10 mx-auto max-w-[740px] translate-x-[11px] translate-y-[4px] font-serif text-[55px] font-bold leading-[1.08] tracking-normal text-[#110d09]"
          style={displayFont}
        >
          Better Research Connections.
          <span className="block">Stronger Academic Futures.</span>
        </h1>
        <p className="relative z-10 mx-auto mt-[12px] max-w-[560px] origin-center scale-x-[0.902] text-[16px] leading-[1.55] text-[#4b433b]">
          Discover research opportunities.
          <br />
          Find the right labs.
          <br />
          Recruit motivated collaborators faster.
        </p>

        <div className="relative z-20 mx-auto mt-[67px] flex w-fit -translate-x-[7px] items-center">
          <Link
            href="/browse"
            className="inline-flex h-[52px] w-[290px] items-center justify-center gap-3 rounded-[7px] border border-[#8b603b] bg-[#8b603b] text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(80,51,28,0.18)] transition hover:bg-[#765233]"
          >
            <GraduationCapIcon />
            Start Your Academic Journey
          </Link>
        </div>

        <div className="pointer-events-none absolute left-1/2 bottom-[-34px] z-0 w-[1188px] -translate-x-1/2">
          <Image
            src="/images/landing-generated-scene-v5.png"
            alt=""
            width={1926}
            height={817}
            priority
            sizes="1320px"
            className="h-auto w-full max-w-none select-none"
          />
        </div>
      </section>
    </main>
  );
}
