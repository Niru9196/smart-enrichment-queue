import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Bordered table scrollport. The page stays put; rows scroll inside this frame.
 * Announces the first load to screen readers and dims stale rows while the next
 * page or filter result loads.
 */
export function TableFrame({
  isLoading,
  isRefreshing,
  loadingLabel,
  className,
  children,
}: {
  isLoading: boolean;
  isRefreshing: boolean;
  loadingLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'min-h-0 overflow-auto overscroll-contain rounded-lg border border-border bg-card shadow-[inset_-1rem_0_1rem_-1rem_oklch(0.22_0.02_250/0.18)] transition-opacity',
        isRefreshing && 'opacity-60',
        className,
      )}
      aria-busy={isLoading || isRefreshing}
    >
      {isLoading && (
        <p role="status" className="sr-only">
          Loading {loadingLabel}…
        </p>
      )}
      {children}
    </div>
  );
}

/** Full-width table row explaining why there is nothing to show, with an optional next step. */
export function TableEmptyRow({
  colSpan,
  icon: Icon,
  title,
  description,
  action,
}: {
  colSpan: number;
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-14 text-center whitespace-normal">
        <Icon className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action && (
          <Button variant="link" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
