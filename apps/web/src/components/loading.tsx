import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/** Wraps skeleton placeholders so screen readers hear one "Loading …" instead of nothing. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading {label}…</span>
      {children}
    </div>
  );
}

/**
 * Table rows shaped like real rows. `columns` lists a width class per cell; 'name' renders the
 * two-line company cell.
 */
export function SkeletonRows({ rows, columns }: { rows: number; columns: string[] }) {
  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} aria-hidden className="hover:bg-transparent">
      {columns.map((width, col) => (
        <TableCell key={col} className={width === 'name' ? undefined : width}>
          {width === 'name' ? (
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : (
            <Skeleton className="h-4 w-full max-w-24" />
          )}
        </TableCell>
      ))}
    </TableRow>
  ));
}

/** Placeholder for a stat value; shows "n/a" (with an explanation) once loading has failed. */
export function StatValue({
  value,
  isLoading,
  className,
}: {
  value: number | undefined;
  isLoading: boolean;
  className?: string;
}) {
  if (value !== undefined) return <span className={className}>{value}</span>;
  if (isLoading) return <Skeleton className="my-1 h-6 w-10" />;
  return (
    <span className={className} title="Couldn't load this figure">
      n/a<span className="sr-only">unavailable</span>
    </span>
  );
}
