import type { ReactNode } from 'react';

interface ProfileStat {
  label: string;
  value: ReactNode;
  helper?: string;
}

interface ProfileFrameProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: ProfileStat[];
  children: ReactNode;
  maxWidthClassName?: string;
}

interface ProfilePanelProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function ProfileFrame({
  eyebrow,
  title,
  description,
  actions,
  stats = [],
  children,
  maxWidthClassName = 'max-w-7xl',
}: ProfileFrameProps) {
  return (
    <main className={`mx-auto ${maxWidthClassName} px-4 py-8 sm:px-6 lg:px-10`}>
      <section className="mb-6 rounded-[8px] border border-[#E0D8CC] bg-[#fffdf9] p-6 shadow-[0_1px_3px_rgba(60,42,27,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b603b]">{eyebrow}</p>
            <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-[#17120e] sm:text-[40px]">
              {title}
            </h1>
            {description && (
              <div className="mt-3 max-w-3xl text-sm leading-6 text-[#5B5148]">{description}</div>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>

        {stats.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[8px] border border-[#eee6dc] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a8178]">{stat.label}</p>
                <div className="mt-1 text-[24px] font-semibold leading-none text-[#17120e]">{stat.value}</div>
                {stat.helper && <p className="mt-2 text-xs leading-5 text-[#5B5148]">{stat.helper}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {children}
    </main>
  );
}

export function ProfilePanel({ title, description, actions, children, className = '', bodyClassName = '' }: ProfilePanelProps) {
  return (
    <section className={`flex flex-col rounded-[8px] border border-[#E0D8CC] bg-white shadow-[0_1px_3px_rgba(60,42,27,0.05)] ${className}`}>
      <div className="flex flex-col gap-3 border-b border-[#eee6dc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[17px] font-semibold text-[#17120e]">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6 text-[#5B5148]">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      <div className={`min-h-0 flex-1 p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
