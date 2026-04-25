'use client';

import { useEffect } from 'react';

export default function SkillLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // 覆盖主layout的overflow-hidden样式，允许skill详情页滚动
    document.body.style.overflow = 'auto';

    // 清理函数：组件卸载时恢复原始样式
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return <>{children}</>;
}
