'use client';

import { useEffect } from 'react';

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return <>{children}</>;
}
