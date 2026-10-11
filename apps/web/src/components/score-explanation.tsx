import { AlertTriangleIcon, BanIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPercent } from '@/lib/format';
import type { FactorKey, ScoringResult } from '@/lib/api-schemas';
import { ConfidenceMeter, PriorityBadge } from './badges';

const FACTOR_LABELS: Record<FactorKey, string> = {
  industry: 'Industry fit',
  location: 'Location',
  size: 'Company size',
  revenue: 'Revenue',
  completeness: 'Data completeness',
};

export function ScoreExplanation({ scoring }: { scoring: ScoringResult }) {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Fit score
          </p>
          <p className="text-4xl font-semibold tabular-nums" data-testid="detail-score">
            {scoring.score === null ? 'n/a' : Math.round(scoring.score)}
            {scoring.score !== null && (
              <span className="text-base text-muted-foreground">/100</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <PriorityBadge priority={scoring.priority} />
          <ConfidenceMeter confidence={scoring.confidence} coverage={scoring.coverage} />
          <span className="text-xs text-muted-foreground">
            {formatPercent(scoring.coverage)} evidence coverage
          </span>
        </div>
      </div>

      {scoring.disqualificationReasons.length > 0 && (
        <Alert variant="destructive">
          <BanIcon />
          <AlertTitle>Disqualified by a strict rule</AlertTitle>
          <AlertDescription>
            <ul className="list-disc ps-4">
              {scoring.disqualificationReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {scoring.reviewReasons.length > 0 && (
        <Alert className="border-primary/30 bg-primary/8">
          <AlertTriangleIcon />
          <AlertTitle>Verify before spending a credit</AlertTitle>
          <AlertDescription>
            <ul className="list-disc ps-4">
              {scoring.reviewReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="factors-heading">
        <h3 id="factors-heading" className="mb-2 text-sm font-semibold">
          How the score was built
        </h3>
        {scoring.matchedFactors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weighted factor has known data.</p>
        ) : (
          <ul className="space-y-3">
            {scoring.matchedFactors.map((f) => (
              <li key={f.key} data-testid={`factor-${f.key}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    +{f.contribution.toFixed(1)} pts · weight {f.weight} · {formatPercent(f.match)}{' '}
                    match
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${f.match * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scoring.missingFactors.length > 0 && (
        <section aria-labelledby="missing-heading">
          <h3 id="missing-heading" className="mb-1 text-sm font-semibold">
            Unknown data (excluded from the score)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {scoring.missingFactors.map((key) => (
              <span
                key={key}
                className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
              >
                {FACTOR_LABELS[key]}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
