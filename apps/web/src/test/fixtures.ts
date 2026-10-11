import type {
  Company,
  QueueItem,
  QueueResponse,
  RankedLead,
  ScoringResult,
} from '@/lib/api-schemas';

export const company = (overrides: Partial<Company> = {}): Company => ({
  id: 'c1',
  name: 'Acme Software',
  domain: 'acme.test',
  industry: 'Software',
  city: 'Austin',
  state: 'TX',
  country: 'United States',
  employeeCount: 120,
  estimatedRevenue: 12_000_000,
  revenueSource: 'reported',
  source: 'synthetic_demo_seed',
  linkedinUrl: null,
  description: null,
  foundedYear: null,
  ...overrides,
});

export const scoring = (overrides: Partial<ScoringResult> = {}): ScoringResult => ({
  score: 82,
  priority: 'high',
  confidence: 'high',
  coverage: 0.9,
  matchedFactors: [],
  missingFactors: [],
  disqualificationReasons: [],
  reviewReasons: [],
  ...overrides,
});

export const rankedLead = (overrides: Partial<RankedLead> = {}): RankedLead => ({
  rank: 1,
  company: company(),
  scoring: scoring(),
  queueStatus: null,
  ...overrides,
});

export const queueItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'q1',
  status: 'queued',
  statusReason: null,
  estimatedCredits: 1,
  addedAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
  company: company(),
  scoring: scoring(),
  ...overrides,
});

export const queueResponse = (items: QueueItem[]): QueueResponse => ({
  items,
  page: 1,
  pageSize: 25,
  total: items.length,
  summary: {
    byStatus: {
      queued: items.filter((i) => i.status === 'queued').length,
      enriched: items.filter((i) => i.status === 'enriched').length,
      failed: items.filter((i) => i.status === 'failed').length,
      skipped: items.filter((i) => i.status === 'skipped').length,
    },
    total: items.length,
    plannedCredits: items.filter((i) => i.status === 'queued').length,
    creditsUsed: 0,
    creditsPerEnrichment: 1,
    simulated: true,
  },
});

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const errorResponse = (status: number, code: string, message: string) =>
  jsonResponse({ error: { code, message, requestId: 'req-test' } }, status);
