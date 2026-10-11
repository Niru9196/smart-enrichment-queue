import { ExternalLinkIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  formatLocation,
  formatNumber,
  formatUsd,
  REVENUE_SOURCE_LABELS,
  SOURCE_LABELS,
} from '@/lib/format';
import { StatusBadge } from '@/components/badges';
import { ScoreExplanation } from '@/components/score-explanation';
import type { RankedLead } from '@/lib/api-schemas';

interface Props {
  lead: RankedLead | null;
  isPreview: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToQueue: (companyId: string) => void;
  isAdding: boolean;
}

export function LeadDetailSheet({ lead, isPreview, onOpenChange, onAddToQueue, isAdding }: Props) {
  const company = lead?.company;
  return (
    <Sheet open={lead !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {lead && company && (
          <>
            <SheetHeader>
              <p className="text-xs text-muted-foreground">Rank #{lead.rank}</p>
              <SheetTitle className="text-lg">{company.name}</SheetTitle>
              <SheetDescription>
                {company.description ?? 'No description available.'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4">
              {isPreview && (
                <p className="rounded-sm bg-primary/8 px-3 py-2 text-xs">
                  Showing scores for your unsaved profile changes.
                </p>
              )}
              <ScoreExplanation scoring={lead.scoring} />

              <section aria-labelledby="facts-heading">
                <h3 id="facts-heading" className="mb-2 text-sm font-semibold">
                  Company data
                </h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <Fact label="Domain">{company.domain ?? <Unknown />}</Fact>
                  <Fact label="Industry">{company.industry ?? <Unknown />}</Fact>
                  <Fact label="Location">{formatLocation(company)}</Fact>
                  <Fact label="Employees">
                    {company.employeeCount === null ? (
                      <Unknown />
                    ) : (
                      formatNumber(company.employeeCount)
                    )}
                  </Fact>
                  <Fact label="Revenue">
                    {company.estimatedRevenue === null ? (
                      <Unknown />
                    ) : (
                      <>
                        {formatUsd(company.estimatedRevenue)}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({REVENUE_SOURCE_LABELS[company.revenueSource ?? ''] ?? 'source unknown'})
                        </span>
                      </>
                    )}
                  </Fact>
                  <Fact label="Founded">{company.foundedYear ?? <Unknown />}</Fact>
                  <Fact label="LinkedIn">
                    {company.linkedinUrl ? (
                      <a
                        href={company.linkedinUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                      >
                        Profile <ExternalLinkIcon className="size-3" aria-hidden />
                      </a>
                    ) : (
                      <Unknown />
                    )}
                  </Fact>
                  <Fact label="Source">{SOURCE_LABELS[company.source] ?? company.source}</Fact>
                </dl>
              </section>
            </div>

            <SheetFooter>
              {lead.queueStatus ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  In enrichment queue: <StatusBadge status={lead.queueStatus} />
                </div>
              ) : (
                <Button
                  onClick={() => onAddToQueue(company.id)}
                  disabled={isAdding || lead.scoring.priority === 'disqualified'}
                >
                  <PlusIcon /> Add to enrichment queue
                </Button>
              )}
              {!lead.queueStatus && lead.scoring.priority === 'disqualified' && (
                <p className="text-xs text-muted-foreground">
                  Disqualified leads can't be queued from here. Relax the strict rule to include it.
                </p>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </>
  );
}

const Unknown = () => <span className="text-muted-foreground italic">Unknown</span>;
