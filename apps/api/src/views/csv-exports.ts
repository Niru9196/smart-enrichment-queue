import type { ScoringResult } from '../domain/scoring/score.js';
import type { CompanyDto } from '../services/companies.js';
import type { QueueItemDto } from '../services/queue.js';
import type { ScoredCompany } from '../services/ranking.js';
import { buildCsv, type CsvCell } from './csv.js';

const COMPANY_CSV_COLUMNS = [
  'company',
  'domain',
  'industry',
  'city',
  'state',
  'country',
  'employees',
  'estimated_revenue_usd',
  'revenue_source',
  'linkedin_url',
  'fit_score',
  'priority',
  'confidence',
  'evidence_coverage',
  'missing_factors',
  'reasons',
];

function companyAndScoreCsvCells(company: CompanyDto, scoring: ScoringResult): CsvCell[] {
  return [
    company.name,
    company.domain,
    company.industry,
    company.city,
    company.state,
    company.country,
    company.employeeCount,
    company.estimatedRevenue,
    company.revenueSource,
    company.linkedinUrl,
    scoring.score,
    scoring.priority,
    scoring.confidence,
    scoring.coverage,
    scoring.missingFactors.join('; '),
    [
      ...scoring.disqualificationReasons,
      ...scoring.reviewReasons,
      ...scoring.matchedFactors.map((factor) => factor.explanation),
    ].join('; '),
  ];
}

/** One row per lead, in ranked order; the first column is the 1-based rank. */
export function renderRankedLeadsCsv(rankedLeads: ScoredCompany[]): string {
  return buildCsv(
    ['rank', ...COMPANY_CSV_COLUMNS],
    rankedLeads.map((lead, rankIndex) => [
      rankIndex + 1,
      ...companyAndScoreCsvCells(lead.company, lead.scoring),
    ]),
  );
}

export function renderQueueCsv(queueItems: QueueItemDto[]): string {
  return buildCsv(
    [...COMPANY_CSV_COLUMNS, 'queue_status', 'status_reason', 'estimated_credits', 'added_at'],
    queueItems.map((item) => [
      ...companyAndScoreCsvCells(item.company, item.scoring),
      item.status,
      item.statusReason,
      item.estimatedCredits,
      item.addedAt,
    ]),
  );
}
