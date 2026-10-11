import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleHelpIcon,
  ClockIcon,
  MinusIcon,
  SkipForwardIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Confidence, Priority, QueueStatus } from '@/lib/api-schemas';

interface Style {
  label: string;
  icon: LucideIcon;
  className: string;
}

/** One copper accent plus ink. Icons carry meaning so color is never the only signal. */
export const PRIORITY_STYLES: Record<Priority, Style> = {
  high: {
    label: 'High fit',
    icon: ArrowUpIcon,
    className: 'bg-primary text-primary-foreground',
  },
  medium: {
    label: 'Medium fit',
    icon: MinusIcon,
    className: 'bg-foreground/6 text-foreground ring-1 ring-inset ring-foreground/15',
  },
  low: {
    label: 'Low fit',
    icon: ArrowDownIcon,
    className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  },
  needs_review: {
    label: 'Needs review',
    icon: CircleHelpIcon,
    className: 'text-primary ring-1 ring-inset ring-primary/40',
  },
  disqualified: {
    label: 'Disqualified',
    icon: BanIcon,
    className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  },
};

const STATUS_STYLES: Record<QueueStatus, Style> = {
  queued: {
    label: 'Queued',
    icon: ClockIcon,
    className: 'text-primary ring-1 ring-inset ring-primary/40',
  },
  enriched: {
    label: 'Enriched',
    icon: CheckCircle2Icon,
    className: 'bg-foreground text-background',
  },
  failed: {
    label: 'Failed',
    icon: XCircleIcon,
    className: 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/35',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForwardIcon,
    className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  },
};

function Pill({ style, className }: { style: Style; className?: string }) {
  const Icon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        style.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {style.label}
    </span>
  );
}

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Pill style={PRIORITY_STYLES[priority]} />
);

export const StatusBadge = ({ status }: { status: QueueStatus }) => (
  <Pill style={STATUS_STYLES[status]} />
);

const CONFIDENCE_BARS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export function ConfidenceMeter({
  confidence,
  coverage,
}: {
  confidence: Confidence;
  coverage: number;
}) {
  const filled = CONFIDENCE_BARS[confidence];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={`${Math.round(coverage * 100)}% of scoring weight has known data`}
    >
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              'w-1 rounded-sm',
              bar === 1 ? 'h-1.5' : bar === 2 ? 'h-2.5' : 'h-3.5',
              bar <= filled ? 'bg-primary' : 'bg-foreground/15',
            )}
          />
        ))}
      </span>
      <span className="capitalize">{confidence}</span>
    </span>
  );
}

export function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CircleDashedIcon className="size-3.5" aria-hidden /> No score
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-8 text-end font-mono text-sm font-semibold tabular-nums">
        {Math.round(score)}
      </span>
      <span className="h-1.5 w-14 overflow-hidden rounded-sm bg-muted" aria-hidden>
        <span className="block h-full rounded-sm bg-primary" style={{ width: `${score}%` }} />
      </span>
    </span>
  );
}
