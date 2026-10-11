import { StatValue } from '@/components/loading';
import type { Priority, QueueSummary, RankedResponse } from '@/lib/api-schemas';
import { cn } from '@/lib/utils';

interface Props {
  summary?: RankedResponse['summary'];
  queue?: QueueSummary;
  isLeadsLoading: boolean;
  isQueueLoading: boolean;
  activePriority?: Priority;
  onPriority?: (priority: Priority | undefined) => void;
  onQueued?: () => void;
}

export function OverviewStrip({
  summary,
  queue,
  isLeadsLoading,
  isQueueLoading,
  activePriority,
  onPriority,
  onQueued,
}: Props) {
  const toggle = (priority: Priority) => {
    onPriority?.(activePriority === priority ? undefined : priority);
  };

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
      <StatTile
        testId="stat-high-fit"
        label="High fit"
        value={summary?.high}
        isLoading={isLeadsLoading}
        featured
        pressed={activePriority === 'high'}
        hint="Show high-fit leads"
        onClick={onPriority ? () => toggle('high') : undefined}
      />
      <StatTile
        testId="stat-medium-fit"
        label="Medium fit"
        value={summary?.medium}
        isLoading={isLeadsLoading}
        pressed={activePriority === 'medium'}
        hint="Show medium-fit leads"
        onClick={onPriority ? () => toggle('medium') : undefined}
      />
      <StatTile
        testId="stat-needs-review"
        label="Needs review"
        value={summary?.needs_review}
        isLoading={isLeadsLoading}
        pressed={activePriority === 'needs_review'}
        hint="Show leads that need review"
        onClick={onPriority ? () => toggle('needs_review') : undefined}
      />
      <StatTile
        testId="stat-disqualified"
        label="Disqualified"
        value={summary?.disqualified}
        isLoading={isLeadsLoading}
        pressed={activePriority === 'disqualified'}
        hint="Show disqualified leads"
        onClick={onPriority ? () => toggle('disqualified') : undefined}
      />
      <StatTile
        testId="stat-queued"
        label="Queued"
        value={queue?.byStatus.queued}
        isLoading={isQueueLoading}
        hint="Open the enrichment queue"
        onClick={onQueued}
      />
      <StatTile
        testId="stat-credits-planned"
        label="Credits planned"
        value={queue?.plannedCredits}
        isLoading={isQueueLoading}
        note="simulated"
      />
    </div>
  );
}

function StatTile({
  testId,
  label,
  value,
  isLoading,
  featured,
  pressed,
  hint,
  note,
  onClick,
}: {
  testId: string;
  label: string;
  value?: number;
  isLoading: boolean;
  featured?: boolean;
  pressed?: boolean;
  hint?: string;
  note?: string;
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
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {note && (
          <span className="rounded-sm bg-muted px-1 font-mono text-xs uppercase">{note}</span>
        )}
      </p>
      <div
        className={cn(
          'mt-0.5 font-mono text-2xl tracking-tight tabular-nums',
          featured && 'text-primary',
        )}
      >
        <StatValue value={value} isLoading={isLoading} />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        className={className}
        aria-pressed={pressed}
        title={hint}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div data-testid={testId} className={className}>
      {body}
    </div>
  );
}
