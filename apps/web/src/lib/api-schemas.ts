import { z } from 'zod';
import { criteriaShape } from './criteria-schema';

// Runtime schemas for API responses (contracts in apps/api/src/services and domain/scoring).
// TypeScript types are inferred from these, so the client cannot drift from what it validates.

export type { Criteria } from './criteria-schema';

export const PRIORITIES = ['high', 'medium', 'low', 'needs_review', 'disqualified'] as const;
export const QUEUE_STATUSES = ['queued', 'enriched', 'failed', 'skipped'] as const;
const FACTOR_KEYS = ['industry', 'location', 'size', 'revenue', 'completeness'] as const;

const priority = z.enum(PRIORITIES);
const confidence = z.enum(['high', 'medium', 'low']);
const queueStatus = z.enum(QUEUE_STATUSES);
const factorKey = z.enum(FACTOR_KEYS);
const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export type Priority = z.infer<typeof priority>;
export type Confidence = z.infer<typeof confidence>;
export type QueueStatus = z.infer<typeof queueStatus>;
export type FactorKey = z.infer<typeof factorKey>;

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: nullableString,
  industry: nullableString,
  city: nullableString,
  state: nullableString,
  country: nullableString,
  employeeCount: nullableNumber,
  estimatedRevenue: nullableNumber,
  revenueSource: nullableString,
  source: z.string(),
  linkedinUrl: nullableString,
  description: nullableString,
  foundedYear: nullableNumber,
});
export type Company = z.infer<typeof companySchema>;

const scoreFactorSchema = z.object({
  key: factorKey,
  label: z.string(),
  match: z.number(),
  weight: z.number(),
  contribution: z.number(),
  explanation: z.string(),
});
export type ScoreFactor = z.infer<typeof scoreFactorSchema>;

export const scoringResultSchema = z.object({
  score: nullableNumber,
  priority,
  confidence,
  coverage: z.number(),
  matchedFactors: z.array(scoreFactorSchema),
  missingFactors: z.array(factorKey),
  disqualificationReasons: z.array(z.string()),
  reviewReasons: z.array(z.string()),
});
export type ScoringResult = z.infer<typeof scoringResultSchema>;

const rankedLeadSchema = z.object({
  rank: z.number(),
  company: companySchema,
  scoring: scoringResultSchema,
  queueStatus: queueStatus.nullable(),
});
export type RankedLead = z.infer<typeof rankedLeadSchema>;

const pageFields = { page: z.number(), pageSize: z.number(), total: z.number() };

export const rankedResponseSchema = z.object({
  items: z.array(rankedLeadSchema),
  ...pageFields,
  summary: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    needs_review: z.number(),
    disqualified: z.number(),
    total: z.number(),
  }),
});
export type RankedResponse = z.infer<typeof rankedResponseSchema>;

export const preferencesSchema = z.object({
  criteria: criteriaShape,
  isDefault: z.boolean(),
  updatedAt: nullableString,
});
export type Preferences = z.infer<typeof preferencesSchema>;

const queueItemSchema = z.object({
  id: z.string(),
  status: queueStatus,
  statusReason: nullableString,
  estimatedCredits: z.number(),
  addedAt: z.string(),
  updatedAt: z.string(),
  company: companySchema,
  scoring: scoringResultSchema,
});
export type QueueItem = z.infer<typeof queueItemSchema>;

export const queueResponseSchema = z.object({
  items: z.array(queueItemSchema),
  ...pageFields,
  summary: z.object({
    byStatus: z.object({
      queued: z.number(),
      enriched: z.number(),
      failed: z.number(),
      skipped: z.number(),
    }),
    total: z.number(),
    plannedCredits: z.number(),
    creditsUsed: z.number(),
    creditsPerEnrichment: z.number(),
    simulated: z.literal(true),
  }),
});
export type QueueResponse = z.infer<typeof queueResponseSchema>;
export type QueueSummary = QueueResponse['summary'];

export const addToQueueResponseSchema = z.object({
  results: z.array(
    z.object({ companyId: z.string(), outcome: z.enum(['added', 'duplicate', 'not_found']) }),
  ),
  added: z.number(),
  duplicates: z.number(),
  notFound: z.number(),
});
export type AddToQueueResponse = z.infer<typeof addToQueueResponseSchema>;

export const queueItemStatusSchema = z.object({
  id: z.string(),
  status: queueStatus,
  updatedAt: z.string(),
});

export const enrichResponseSchema = z.object({
  enriched: z.number(),
  failed: z.number(),
  creditsUsed: z.number(),
  simulated: z.literal(true),
});
export type EnrichResponse = z.infer<typeof enrichResponseSchema>;

export const metaSchema = z.object({
  industries: z.array(z.string()),
  countries: z.array(z.string()),
  creditsPerEnrichment: z.number(),
  thresholds: z.object({
    priority: z.object({ high: z.number(), medium: z.number() }),
    confidence: z.object({ high: z.number(), medium: z.number() }),
  }),
});
export type Meta = z.infer<typeof metaSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export interface LeadFilters {
  q?: string;
  industry?: string;
  country?: string;
  priority?: Priority;
}
