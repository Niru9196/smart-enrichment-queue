export const QUEUE_STATUSES = ['queued', 'enriched', 'failed', 'skipped'] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

/** Who is changing the status: a user action, or the (simulated) enrichment run. */
export type TransitionActor = 'user' | 'enrichment';

const TRANSITIONS: Record<TransitionActor, Record<QueueStatus, readonly QueueStatus[]>> = {
  user: {
    queued: ['skipped'],
    skipped: ['queued'],
    failed: ['queued'],
    // Enriched is terminal: the credit has been spent.
    enriched: [],
  },
  enrichment: {
    queued: ['enriched', 'failed'],
    skipped: [],
    failed: [],
    enriched: [],
  },
};

export function canTransition(from: QueueStatus, to: QueueStatus, actor: TransitionActor): boolean {
  return TRANSITIONS[actor][from].includes(to);
}

/** Statuses from which `actor` may move an item to `to`. */
export function statusesThatCanMoveTo(to: QueueStatus, actor: TransitionActor): QueueStatus[] {
  return QUEUE_STATUSES.filter((from) => canTransition(from, to, actor));
}

export interface EnrichmentOutcome {
  status: Extract<QueueStatus, 'enriched' | 'failed'>;
  reason: string;
}

/**
 * Simulated enrichment; no provider is called. A lead without a website domain fails because a
 * real provider would have nothing to match on.
 */
export function simulateEnrichment(company: { domain: string | null }): EnrichmentOutcome {
  return company.domain
    ? { status: 'enriched', reason: 'Simulated enrichment (no provider called)' }
    : { status: 'failed', reason: 'No website domain to match against' };
}
