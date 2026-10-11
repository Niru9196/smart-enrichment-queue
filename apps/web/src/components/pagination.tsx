import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Previous / page x of y / Next. `children` is an optional summary shown on the left. */
export function Pagination({
  label,
  page,
  totalPages,
  onPageChange,
  children,
}: {
  label: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex items-center gap-2 text-sm',
        children ? 'justify-between' : 'justify-end',
      )}
    >
      {children}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-7"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-7"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
