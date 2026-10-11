import { LoadingRegion } from '@/components/loading';
import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the workspace layout (profile sidebar, stats, toolbar, table) to avoid layout shift. */
export function WorkspaceSkeleton() {
  return (
    <LoadingRegion
      label="your lead workspace"
      className="grid h-full min-h-0 gap-8 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]"
    >
      <div className="space-y-5 rounded-lg border border-border bg-card p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2.5">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2 bg-card px-3 py-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 min-w-48 flex-1" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-4" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
