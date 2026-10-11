import type { QueueStatus } from '../domain/queue/transitions.js';
import type { Criteria } from '../domain/scoring/criteria.js';
import { rankCompanies, type Priority, type ScoringResult } from '../domain/scoring/score.js';
import { AppError } from '../errors.js';
import { prisma } from '../lib/prisma.js';
import type { CompanyFilters } from '../schemas/common.js';
import type { LeadsExportQuery, RankedLeadsQuery } from '../schemas/leads.js';
import {
  companyWhereFromFilters,
  companySelect,
  mapCompanyRowToDto,
  type CompanyDto,
} from './companies.js';

/**
 * Ranking scores the whole filtered set in-process before paginating, so ranks are globally
 * correct. The set is bounded; beyond it, move scoring into SQL or a batch job.
 */
export const MAX_RANKED_COMPANIES = 5000;

export interface ScoredCompany {
  company: CompanyDto;
  scoring: ScoringResult;
}

export interface RankedLead extends ScoredCompany {
  rank: number;
  queueStatus: QueueStatus | null;
}

export interface RankedLeadsPage {
  items: RankedLead[];
  page: number;
  pageSize: number;
  total: number;
  summary: Record<Priority, number> & { total: number };
}

export async function rankMatchingCompanies(
  filters: CompanyFilters,
  criteria: Criteria,
): Promise<ScoredCompany[]> {
  const companyRows = await prisma.company.findMany({
    where: companyWhereFromFilters(filters),
    select: companySelect,
    take: MAX_RANKED_COMPANIES + 1,
  });

  if (companyRows.length > MAX_RANKED_COMPANIES) {
    throw new AppError(
      422,
      'RESULT_SET_TOO_LARGE',
      `More than ${MAX_RANKED_COMPANIES} companies match; narrow the filters`,
    );
  }

  return rankCompanies(companyRows.map(mapCompanyRowToDto), criteria);
}

function filterLeadsByPriority(rankedLeads: ScoredCompany[], priority?: Priority): ScoredCompany[] {
  return priority ? rankedLeads.filter((lead) => lead.scoring.priority === priority) : rankedLeads;
}

/** Every matching lead in ranked order, optionally limited to one priority, for CSV export. */
export async function listRankedLeadsForExport(
  criteria: Criteria,
  query: LeadsExportQuery,
): Promise<ScoredCompany[]> {
  const { priority, ...filters } = query;
  return filterLeadsByPriority(await rankMatchingCompanies(filters, criteria), priority);
}

export async function loadRankedLeadsPage(
  userId: string,
  criteria: Criteria,
  query: RankedLeadsQuery,
): Promise<RankedLeadsPage> {
  const rankedLeads = await rankMatchingCompanies(query, criteria);

  const countsByPriority: Record<Priority, number> = {
    high: 0,
    medium: 0,
    low: 0,
    needs_review: 0,
    disqualified: 0,
  };
  for (const lead of rankedLeads) countsByPriority[lead.scoring.priority] += 1;

  const leadsInPriority = filterLeadsByPriority(rankedLeads, query.priority);

  const pageStart = (query.page - 1) * query.pageSize;
  const leadsOnPage = leadsInPriority.slice(pageStart, pageStart + query.pageSize);

  const queueEntries = await prisma.queueItem.findMany({
    where: { userId, companyId: { in: leadsOnPage.map((lead) => lead.company.id) } },
    select: { companyId: true, status: true },
  });
  const queueStatusByCompanyId = new Map(
    queueEntries.map((entry) => [entry.companyId, entry.status]),
  );

  return {
    items: leadsOnPage.map((lead, indexOnPage) => ({
      rank: pageStart + indexOnPage + 1,
      company: lead.company,
      scoring: lead.scoring,
      queueStatus: queueStatusByCompanyId.get(lead.company.id) ?? null,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total: leadsInPriority.length,
    summary: { ...countsByPriority, total: rankedLeads.length },
  };
}

/** Model surface for globally ranked lead lists. */
export const rankingService = {
  loadPage: loadRankedLeadsPage,
  listForExport: listRankedLeadsForExport,
};
