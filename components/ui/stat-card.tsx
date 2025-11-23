import { Card } from '@/components/ui/card';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: typeof LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accent?: 'blue' | 'emerald' | 'violet' | 'amber';
  className?: string;
}

const accentStyles = {
  blue: {
    iconBg: 'bg-gradient-to-br from-sky-500/45 via-blue-500/45 to-indigo-500/45 text-sky-50',
    halo: 'bg-gradient-to-br from-sky-500/50 via-indigo-500/40 to-transparent',
  },
  emerald: {
    iconBg: 'bg-gradient-to-br from-emerald-500/45 via-teal-500/45 to-cyan-500/45 text-emerald-50',
    halo: 'bg-gradient-to-br from-emerald-400/50 via-teal-400/40 to-transparent',
  },
  violet: {
    iconBg: 'bg-gradient-to-br from-fuchsia-500/45 via-purple-500/45 to-violet-500/45 text-fuchsia-50',
    halo: 'bg-gradient-to-br from-fuchsia-400/55 via-purple-500/40 to-transparent',
  },
  amber: {
    iconBg: 'bg-gradient-to-br from-amber-400/45 via-orange-500/45 to-rose-500/45 text-amber-50',
    halo: 'bg-gradient-to-br from-amber-400/55 via-orange-400/40 to-transparent',
  },
} as const;

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  accent = 'blue',
  className,
}: StatCardProps) {
  const accentTokens = accentStyles[accent] ?? accentStyles.blue;

  return (
    <Card className={cn('student-surface flex h-full flex-col gap-6 p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400/70">
            {title}
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          {description ? (
            <p className="mt-1 text-sm text-slate-300/75">{description}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className={cn('relative flex h-14 w-14 items-center justify-center rounded-2xl', accentTokens.iconBg)}>
            <Icon className="h-6 w-6" />
            <span className={cn('absolute -z-10 h-14 w-14 rounded-full blur-[50px]', accentTokens.halo)} />
          </div>
        ) : null}
      </div>
      {trend ? (
        <div
          className={cn(
            'flex items-center gap-2 text-xs font-medium',
            trend.isPositive ? 'text-emerald-300' : 'text-rose-300'
          )}
        >
          <span>
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-slate-400/70">from last term</span>
        </div>
      ) : null}
    </Card>
  );
}