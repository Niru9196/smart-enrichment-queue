import {
  InboxIcon,
  Loader2Icon,
  RotateCcwIcon,
  SkipForwardIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { PriorityBadge, ScoreBar, StatusBadge } from '@/components/badges';
import { TableEmptyRow, TableFrame } from '@/components/data-table';
import { ErrorAlert } from '@/components/error-alert';
import { ExportButton } from '@/components/export-button';
import { SkeletonRows, StatValue } from '@/components/loading';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { QueueItem, QueueStatus } from '@/lib/api-schemas';
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useExportQueue, useQueueActions, useQueueList } from './use-queue';

const PAGE_SIZE = 25;

const SKELETON_COLUMNS = [
  'name',
  'w-20',
  'w-20 rounded-full',
  'w-16 hidden md:table-cell',
  'w-20 rounded-full',
  'w-6 ms-auto',
  'w-24 ms-auto',
];

const EMPTY_HINTS: Record<QueueStatus, string> = {
  queued: 'Nothing is waiting for enrichment right now.',
  enriched: 'Run enrichment on queued leads to see results here.',
  failed: 'No enrichment attempts have failed.',
  skipped: 'Leads you skip stay here, out of enrichment, until you re-queue them.',
};

const FILTERS: { value: QueueStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'enriched', label: 'Enriched' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
];

export function QueueView({ onBrowseLeads }: { onBrowseLeads: () => void }) {
  const [status, setStatus] = useState<QueueStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const queue = useQueueList(status, page, PAGE_SIZE);
  const { enrich, update, remove } = useQueueActions();
  const exportQueue = useExportQueue();
  const data = queue.data;
  const summary = data?.summary;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  // Removing or re-filtering items can leave the current page past the end.
  if (data && !queue.isPlaceholderData && page > totalPages) setPage(totalPages);

  const queuedCount = summary?.byStatus.queued ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          <Stat
            label="Queued"
            value={summary?.byStatus.queued}
            isLoading={queue.isPending}
            sub={summary && `${summary.plannedCredits} credits planned`}
            pressed={status === 'queued'}
            onClick={() => {
              setStatus((s) => (s === 'queued' ? 'all' : 'queued'));
              setPage(1);
            }}
          />
          <Stat
            label="Enriched"
            value={summary?.byStatus.enriched}
            isLoading={queue.isPending}
            sub={summary && `${summary.creditsUsed} credits used`}
            pressed={status === 'enriched'}
            onClick={() => {
              setStatus((s) => (s === 'enriched' ? 'all' : 'enriched'));
              setPage(1);
            }}
          />
          <Stat
            label="Failed"
            value={summary?.byStatus.failed}
            isLoading={queue.isPending}
            sub="No credits charged"
            pressed={status === 'failed'}
            onClick={() => {
              setStatus((s) => (s === 'failed' ? 'all' : 'failed'));
              setPage(1);
            }}
          />
          <Stat
            label="Skipped"
            value={summary?.byStatus.skipped}
            isLoading={queue.isPending}
            sub="Kept out of enrichment"
            pressed={status === 'skipped'}
            onClick={() => {
              setStatus((s) => (s === 'skipped' ? 'all' : 'skipped'));
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Queue status" className="flex flex-wrap gap-3">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                role="tab"
                aria-selected={status === f.value}
                data-testid={`queue-filter-${f.value}`}
                variant={status === f.value ? 'secondary' : 'ghost'}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="ms-auto flex gap-3">
            <ExportButton
              onExport={() => exportQueue.mutate(status === 'all' ? undefined : status)}
              isPending={exportQueue.isPending}
            />
            <Button
              onClick={() => enrich.mutate()}
              disabled={queuedCount === 0 || enrich.isPending}
              title={queuedCount === 0 ? 'Queue leads first' : undefined}
            >
              {enrich.isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
              Enrich {queuedCount} queued (simulated)
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Enrichment is simulated: no provider is called and no real credits are spent. Leads
          without a website domain fail, because a provider would have nothing to match on.
        </p>

        {queue.isError && <ErrorAlert error={queue.error} onRetry={() => void queue.refetch()} />}
      </div>

      <TableFrame
        className="min-h-0 flex-1"
        isLoading={queue.isPending}
        isRefreshing={queue.isPlaceholderData}
        loadingLabel="the enrichment queue"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Company</TableHead>
              <TableHead>Fit score</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="hidden md:table-cell">Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Credits</TableHead>
              <TableHead className="text-end">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.isPending && <SkeletonRows rows={5} columns={SKELETON_COLUMNS} />}
            {data?.items.length === 0 &&
              (status === 'all' ? (
                <TableEmptyRow
                  colSpan={7}
                  icon={InboxIcon}
                  title="Your enrichment queue is empty"
                  description="Queue high-fit leads first, so credits only go to good matches."
                  action={{ label: 'Pick high-fit leads to queue', onClick: onBrowseLeads }}
                />
              ) : (
                <TableEmptyRow
                  colSpan={7}
                  icon={InboxIcon}
                  title={`No ${status} leads`}
                  description={EMPTY_HINTS[status]}
                  action={{
                    label: 'Show all queue items',
                    onClick: () => {
                      setStatus('all');
                      setPage(1);
                    },
                  }}
                />
              ))}
            {data?.items.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                busy={update.isPending || remove.isPending}
                pending={
                  update.isPending && update.variables.id === item.id
                    ? 'status'
                    : remove.isPending && remove.variables === item.id
                      ? 'remove'
                      : null
                }
                onStatus={(next) => update.mutate({ id: item.id, next })}
                onRemove={() => remove.mutate(item.id)}
              />
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      {data && data.total > PAGE_SIZE && (
        <div className="shrink-0">
          <Pagination
            label="Queue pagination"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

function QueueRow({
  item,
  busy,
  pending,
  onStatus,
  onRemove,
}: {
  item: QueueItem;
  /** Any row action is in flight; actions are disabled everywhere until it settles. */
  busy: boolean;
  /** Which action on this row is in flight, if any. */
  pending: 'status' | 'remove' | null;
  onStatus: (next: QueueStatus) => void;
  onRemove: () => void;
}) {
  const spinner = <Loader2Icon className="animate-spin" />;
  return (
    <TableRow data-testid="queue-row" aria-busy={pending !== null}>
      <TableCell className="max-w-60">
        <p className="truncate font-medium">{item.company.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.company.domain ?? 'No domain'}
        </p>
      </TableCell>
      <TableCell>
        <ScoreBar score={item.scoring.score} />
      </TableCell>
      <TableCell>
        <PriorityBadge priority={item.scoring.priority} />
      </TableCell>
      <TableCell className="hidden tabular-nums md:table-cell">
        {formatUsd(item.company.estimatedRevenue)}
      </TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
        {item.statusReason && (
          <p className="mt-0.5 max-w-52 text-xs text-muted-foreground">{item.statusReason}</p>
        )}
      </TableCell>
      <TableCell className="text-end tabular-nums">{item.estimatedCredits}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {item.status === 'queued' && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus('skipped')}>
              {pending === 'status' ? spinner : <SkipForwardIcon />} Skip
            </Button>
          )}
          {(item.status === 'skipped' || item.status === 'failed') && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus('queued')}>
              {pending === 'status' ? spinner : <RotateCcwIcon />} Re-queue
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${item.company.name} from queue`}
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Remove ${item.company.name} from the queue? You can queue it again from the leads list.`,
                )
              ) {
                onRemove();
              }
            }}
          >
            {pending === 'remove' ? spinner : <Trash2Icon />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function Stat({
  label,
  value,
  isLoading,
  sub,
  pressed,
  onClick,
}: {
  label: string;
  value?: number;
  isLoading: boolean;
  sub?: string;
  pressed?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    'min-h-11 bg-card px-3 py-2.5 text-start transition-[color,background-color] duration-150 ease-out',
    onClick &&
      'hover:bg-muted active:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
    pressed && 'bg-primary/10',
  );
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-mono text-2xl tracking-tight tabular-nums">
        <StatValue value={value} isLoading={isLoading} />
      </div>
      {sub ? (
        <p className="text-xs text-muted-foreground">{sub}</p>
      ) : (
        isLoading && <Skeleton className="mt-1 h-3 w-24" />
      )}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={pressed}
        title={`Show ${label.toLowerCase()} leads`}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
