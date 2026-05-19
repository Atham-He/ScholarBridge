/**
 * Navigation component for the ScholarBridge interface.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  primary?: boolean;
}

function NavLink({ href, children, active = false, primary = false }: NavLinkProps) {
  const baseStyles = 'bg-white text-[#1A1A1A] border border-[#E0D8CC] py-[9px] px-[18px] rounded cursor-pointer text-[13px] font-medium transition-all duration-200 ease font-family-body hover:border-[#2C5F7C] hover:text-[#2C5F7C] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]';

  const activeStyles = active ? 'bg-[#2C5F7C] text-white border-[#2C5F7C]' : '';
  const primaryStyles = primary ? 'bg-[#2C5F7C] text-white border-[#2C5F7C] font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.1)]' : '';

  return (
    <Link href={href} className={`${baseStyles} ${activeStyles} ${primaryStyles}`}>
      {children}
    </Link>
  );
}

interface NavigationProps {
  user?: {
    email: string;
  } | null;
}

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between py-5 px-10 border-b border-[#E0D8CC] bg-[rgba(250,248,245,0.95)] backdrop-blur-[10px] sticky top-0 z-[100]">
      <Link href="/" className="font-display text-[22px] font-semibold text-[#1A1A1A] tracking-[-0.02em] cursor-pointer relative">
        ScholarBridge
        <span className="text-[#6B6B6B] text-xs font-family-body ml-2.5 font-normal">/ AI-Powered Research Matching</span>
      </Link>

      <div className="flex gap-2.5">
        {user ? (
          <>
            <NavLink href="/" active={pathname === '/'}>Home</NavLink>
            <NavLink href="/browse" active={pathname === '/browse'}>Browse</NavLink>
            <NavLink href="/profile" active={pathname === '/profile'}>Profile</NavLink>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/auth/logout'}>
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <NavLink href="/" active={pathname === '/'}>Home</NavLink>
            <NavLink href="/browse">Browse</NavLink>
            <NavLink href="/profile">Profile</NavLink>
            <Button variant="gold" size="sm" onClick={() => window.location.href = '/login'}>
              Sign In
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
