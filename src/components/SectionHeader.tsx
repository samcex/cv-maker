import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function SectionHeader({ title, icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {icon}
      <span className="font-semibold text-xs tracking-[0.5px] uppercase text-[var(--text-muted)]">{title}</span>
      {action}
    </div>
  );
}
