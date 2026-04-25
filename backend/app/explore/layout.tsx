'use client';

import { useEffect } from 'react';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // 覆盖主layout的overflow-hidden样式，允许explore页面滚动
    document.body.style.overflow = 'auto';

    // 清理函数：组件卸载时恢复原始样式
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return <>{children}</>;
}
