import type { Criteria, LeadFilters, QueueStatus } from '@/lib/api-schemas';

/** Every server-state cache key, so invalidation across features targets the same prefixes. */
export const queryKeys = {
  meta: ['meta'] as const,
  preferences: ['preferences'] as const,
  leads: {
    all: ['leads'] as const,
    ranked: (filters: LeadFilters, page: number) => ['leads', 'ranked', filters, page] as const,
    preview: (criteria: Criteria | undefined, filters: LeadFilters, page: number) =>
      ['leads', 'preview', criteria, filters, page] as const,
  },
  queue: {
    all: ['queue'] as const,
    list: (status: QueueStatus | 'all', page: number) => ['queue', 'list', status, page] as const,
    summary: ['queue', 'summary'] as const,
  },
};
