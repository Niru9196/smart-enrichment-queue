import { ChevronRightIcon, DatabaseIcon, SearchXIcon } from 'lucide-react';
import { TableEmptyRow, TableFrame } from '@/components/data-table';
import { SkeletonRows } from '@/components/loading';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatLocation, formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ConfidenceMeter, PriorityBadge, ScoreBar, StatusBadge } from '@/components/badges';
import type { RankedLead } from '@/lib/api-schemas';

interface Props {
  items: RankedLead[];
  isLoading: boolean;
  /** Showing the previous page's rows while the next page or filter result loads. */
  isRefreshing?: boolean;
  /** Set when search or filters are active, so the empty state can offer to clear them. */
  onClearFilters?: () => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], select: boolean) => void;
  onOpen: (lead: RankedLead) => void;
  className?: string;
}

const isSelectable = (lead: RankedLead) =>
  lead.queueStatus === null && lead.scoring.priority !== 'disqualified';

const SKELETON_COLUMNS = [
  'w-4',
  'w-5',
  'name',
  'w-24 hidden xl:block',
  'w-28 hidden 2xl:block',
  'w-10 ms-auto hidden md:table-cell',
  'w-14 ms-auto hidden md:table-cell',
  'w-20',
  'w-20 rounded-full',
  'w-20 rounded-full',
  'w-16 hidden md:block',
  'w-4',
];

export function LeadTable({
  items,
  isLoading,
  isRefreshing = false,
  onClearFilters,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  className,
}: Props) {
  const selectable = items.filter(isSelectable).map((l) => l.company.id);
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
  const someSelected = selectable.some((id) => selected.has(id));
  const showSkeleton = isLoading && items.length === 0;

  return (
    <TableFrame
      className={className}
      isLoading={showSkeleton}
      isRefreshing={isRefreshing}
      loadingLabel="leads"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all queueable leads on this page"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                disabled={selectable.length === 0}
                onCheckedChange={() => onToggleAll(selectable, !allSelected)}
              />
            </TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="hidden xl:table-cell">Industry</TableHead>
            <TableHead className="hidden 2xl:table-cell">Location</TableHead>
            <TableHead className="hidden text-end md:table-cell">Employees</TableHead>
            <TableHead className="hidden text-end md:table-cell">Revenue</TableHead>
            <TableHead>Fit score</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Queue</TableHead>
            <TableHead className="hidden md:table-cell">Confidence</TableHead>
            <TableHead className="w-8">
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showSkeleton && <SkeletonRows rows={8} columns={SKELETON_COLUMNS} />}
          {!isLoading &&
            items.length === 0 &&
            (onClearFilters ? (
              <TableEmptyRow
                colSpan={12}
                icon={SearchXIcon}
                title="No leads match these filters"
                description="Try a broader search or another industry, country or priority."
                action={{ label: 'Clear search and filters', onClick: onClearFilters }}
              />
            ) : (
              <TableEmptyRow
                colSpan={12}
                icon={DatabaseIcon}
                title="No companies yet"
                description={
                  <>
                    Leads appear here once companies are imported. In this demo, run{' '}
                    <code className="rounded bg-muted px-1">npm run db:seed</code>.
                  </>
                }
              />
            ))}
          {items.map((lead) => {
            const { company, scoring } = lead;
            const canSelect = isSelectable(lead);
            return (
              <TableRow
                key={company.id}
                data-testid="lead-row"
                data-state={selected.has(company.id) ? 'selected' : undefined}
                className={cn(
                  'cursor-pointer transition-colors duration-150 hover:bg-muted',
                  scoring.priority === 'disqualified' && 'opacity-60',
                )}
                onClick={() => onOpen(lead)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canSelect ? (
                    <Checkbox
                      aria-label={`Select ${company.name}`}
                      checked={selected.has(company.id)}
                      onCheckedChange={() => onToggle(company.id)}
                    />
                  ) : lead.queueStatus ? (
                    <span className="sr-only">Already queued</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground tabular-nums">
                  {lead.rank}
                </TableCell>
                <TableCell className="max-w-56">
                  <button
                    type="button"
                    className="block w-full truncate text-start font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(lead);
                    }}
                  >
                    {company.name}
                  </button>
                  <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    {company.domain ?? 'No domain'}
                    <span className="2xl:hidden">· {company.country ?? 'Country unknown'}</span>
                  </span>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {company.industry ?? <Muted>Unknown</Muted>}
                </TableCell>
                <TableCell className="hidden max-w-48 truncate 2xl:table-cell">
                  {company.country ? formatLocation(company) : <Muted>Unknown</Muted>}
                </TableCell>
                <TableCell className="hidden text-end tabular-nums md:table-cell">
                  {company.employeeCount === null ? (
                    <Muted>n/a</Muted>
                  ) : (
                    formatNumber(company.employeeCount)
                  )}
                </TableCell>
                <TableCell className="hidden text-end tabular-nums md:table-cell">
                  {company.estimatedRevenue === null ? (
                    <Muted>n/a</Muted>
                  ) : (
                    <span
                      title={company.revenueSource === 'ai_estimate' ? 'AI estimate' : undefined}
                    >
                      {formatUsd(company.estimatedRevenue)}
                      {company.revenueSource === 'ai_estimate' && (
                        <span className="text-muted-foreground">*</span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ScoreBar score={scoring.score} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={scoring.priority} />
                </TableCell>
                <TableCell>
                  {lead.queueStatus ? <StatusBadge status={lead.queueStatus} /> : null}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <ConfidenceMeter confidence={scoring.confidence} coverage={scoring.coverage} />
                </TableCell>
                <TableCell>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableFrame>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);
