import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env.js';
import type { QueueStatus } from '../domain/queue/transitions.js';
import type { Criteria } from '../domain/scoring/criteria.js';
import {
  CONFIDENCE_THRESHOLDS,
  PRIORITY_THRESHOLDS,
  scoreCompany,
  type ScorableCompany,
  type ScoringResult,
} from '../domain/scoring/score.js';
import { notFoundError } from '../errors.js';
import { prisma } from '../lib/prisma.js';
import type { CompanyFilters } from '../schemas/common.js';
import type { CompaniesQuery } from '../schemas/leads.js';

export interface CompanyDto extends ScorableCompany {
  city: string | null;
  state: string | null;
  revenueSource: string | null;
  source: string;
  description: string | null;
  foundedYear: number | null;
}

/** Columns the API exposes; timestamps and source record ids stay internal. */
export const companySelect = {
  id: true,
  name: true,
  domain: true,
  industry: true,
  city: true,
  state: true,
  country: true,
  employeeCount: true,
  estimatedRevenue: true,
  revenueSource: true,
  source: true,
  attributes: true,
} satisfies Prisma.CompanySelect;

export type CompanyRow = Prisma.CompanyGetPayload<{ select: typeof companySelect }>;

// attributes is free-form JSONB; read only known keys and drop anything malformed.
const attributesSchema = z.object({
  linkedinUrl: z.string().min(1).nullish().catch(null),
  description: z.string().min(1).nullish().catch(null),
  foundedYear: z.number().int().nullish().catch(null),
});

export function mapCompanyRowToDto(row: CompanyRow): CompanyDto {
  const attributes = attributesSchema.catch({}).parse(row.attributes ?? {});
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    city: row.city,
    state: row.state,
    country: row.country,
    employeeCount: row.employeeCount,
    estimatedRevenue: row.estimatedRevenue === null ? null : Number(row.estimatedRevenue),
    revenueSource: row.revenueSource,
    source: row.source,
    linkedinUrl: attributes.linkedinUrl ?? null,
    description: attributes.description ?? null,
    foundedYear: attributes.foundedYear ?? null,
  };
}

export function companyWhereFromFilters(filters: CompanyFilters): Prisma.CompanyWhereInput {
  const where: Prisma.CompanyWhereInput = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { domain: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.industry) where.industry = { equals: filters.industry, mode: 'insensitive' };
  if (filters.country) where.country = { equals: filters.country, mode: 'insensitive' };
  return where;
}

export interface CompanyPage {
  items: CompanyDto[];
  page: number;
  pageSize: number;
  total: number;
}

export async function listCompanyPage(query: CompaniesQuery): Promise<CompanyPage> {
  const companyFilter = companyWhereFromFilters(query);
  const [companyRows, matchingCompanyCount] = await Promise.all([
    prisma.company.findMany({
      where: companyFilter,
      select: companySelect,
      orderBy: [{ [query.sort]: { sort: query.order, nulls: 'last' } }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.company.count({ where: companyFilter }),
  ]);

  return {
    items: companyRows.map(mapCompanyRowToDto),
    page: query.page,
    pageSize: query.pageSize,
    total: matchingCompanyCount,
  };
}

export interface CompanyDetail {
  company: CompanyDto;
  scoring: ScoringResult;
  queueStatus: QueueStatus | null;
}

export async function loadCompanyDetail(
  userId: string,
  companyId: string,
  criteria: Criteria,
): Promise<CompanyDetail> {
  const [companyRow, queueItem] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: companySelect }),
    prisma.queueItem.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { status: true },
    }),
  ]);
  if (!companyRow) throw notFoundError('Company');

  const company = mapCompanyRowToDto(companyRow);
  return {
    company,
    scoring: scoreCompany(company, criteria),
    queueStatus: queueItem?.status ?? null,
  };
}

export interface LeadMetadata {
  industries: string[];
  countries: string[];
  creditsPerEnrichment: number;
  thresholds: {
    priority: typeof PRIORITY_THRESHOLDS;
    confidence: typeof CONFIDENCE_THRESHOLDS;
  };
  demo: { syntheticData: true; simulatedEnrichment: true; authentication: false };
}

export async function loadLeadCatalogMetadata(): Promise<LeadMetadata> {
  const [industryRows, countryRows] = await Promise.all([
    prisma.company.findMany({
      where: { industry: { not: null } },
      distinct: ['industry'],
      select: { industry: true },
      orderBy: { industry: 'asc' },
    }),
    prisma.company.findMany({
      where: { country: { not: null } },
      distinct: ['country'],
      select: { country: true },
      orderBy: { country: 'asc' },
    }),
  ]);

  return {
    industries: industryRows.flatMap((row) => (row.industry ? [row.industry] : [])),
    countries: countryRows.flatMap((row) => (row.country ? [row.country] : [])),
    creditsPerEnrichment: env.CREDITS_PER_ENRICHMENT,
    thresholds: { priority: PRIORITY_THRESHOLDS, confidence: CONFIDENCE_THRESHOLDS },
    demo: { syntheticData: true, simulatedEnrichment: true, authentication: false },
  };
}

/** Model surface for company catalogue reads. */
export const companyService = {
  listPage: listCompanyPage,
  loadDetail: loadCompanyDetail,
  loadCatalogMetadata: loadLeadCatalogMetadata,
};
