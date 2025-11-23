import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StudentCardSkeletonProps {
  lines?: number;
  withHeader?: boolean;
  className?: string;
}

export function StudentCardSkeleton({ lines = 3, withHeader = true, className }: StudentCardSkeletonProps) {
  return (
    <div className={cn('student-surface border-0 bg-transparent p-6 shadow-none', className)}>
      {withHeader ? (
        <div className="mb-6 space-y-3">
          <Skeleton className="h-4 w-40 rounded-full bg-white/10" />
          <Skeleton className="h-3 w-24 rounded-full bg-white/10" />
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-2xl bg-white/10" />
        ))}
      </div>
    </div>
  );
}

interface StudentMetricSkeletonProps {
  className?: string;
}

export function StudentMetricSkeleton({ className }: StudentMetricSkeletonProps) {
  return (
    <div className={cn('student-surface border-0 bg-transparent p-6 shadow-none', className)}>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full bg-white/10" />
        <Skeleton className="h-8 w-24 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

interface StudentListSkeletonProps {
  items?: number;
  avatar?: boolean;
  className?: string;
}

export function StudentListSkeleton({ items = 5, avatar = false, className }: StudentListSkeletonProps) {
  return (
    <div className={cn('student-surface border-0 bg-transparent p-4 shadow-none', className)}>
      <div className="space-y-3">
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            {avatar ? <Skeleton className="h-10 w-10 rounded-xl bg-white/10" /> : null}
            <Skeleton className="h-10 flex-1 rounded-2xl bg-white/10" />
            <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface StudentTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function StudentTableSkeleton({ rows = 6, columns = 4, className }: StudentTableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-none backdrop-blur-sm sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-3 w-full rounded-full bg-white/10" />
          ))}
        </div>
      ))}
    </div>
  );
}
