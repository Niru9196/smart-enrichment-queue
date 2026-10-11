import type { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import {
  statusesThatCanMoveTo,
  canTransition,
  simulateEnrichment,
  type EnrichmentOutcome,
  type QueueStatus,
} from '../domain/queue/transitions.js';
import type { Criteria } from '../domain/scoring/criteria.js';
import { scoreCompany, type ScoringResult } from '../domain/scoring/score.js';
import { AppError, notFoundError } from '../errors.js';
import { prisma } from '../lib/prisma.js';
import type { QueueQuery } from '../schemas/queue.js';
import { companySelect, mapCompanyRowToDto, type CompanyDto } from './companies.js';

export interface QueueItemDto {
  id: string;
  status: QueueStatus;
  statusReason: string | null;
  estimatedCredits: number;
  addedAt: string;
  updatedAt: string;
  company: CompanyDto;
  scoring: ScoringResult;
}

export interface QueueSummary {
  byStatus: Record<QueueStatus, number>;
  total: number;
  plannedCredits: number;
  creditsUsed: number;
  creditsPerEnrichment: number;
  simulated: true;
}

export interface QueueList {
  items: QueueItemDto[];
  page: number;
  pageSize: number;
  /** Items matching the status filter (summary.total counts every status). */
  total: number;
  summary: QueueSummary;
}

/** Upper bound for a single CSV export of the queue. */
export const MAX_QUEUE_EXPORT_ROWS = 5000;

const queueItemSelect = {
  id: true,
  status: true,
  statusReason: true,
  estimatedCredits: true,
  addedAt: true,
  updatedAt: true,
  company: { select: companySelect },
} satisfies Prisma.QueueItemSelect;

type QueueItemRow = Prisma.QueueItemGetPayload<{ select: typeof queueItemSelect }>;

const queueItemOrder = [
  { addedAt: 'asc' },
  { id: 'asc' },
] satisfies Prisma.QueueItemOrderByWithRelationInput[];

function mapQueueItemRowToDto(row: QueueItemRow, criteria: Criteria): QueueItemDto {
  const company = mapCompanyRowToDto(row.company);
  return {
    id: row.id,
    status: row.status,
    statusReason: row.statusReason,
    estimatedCredits: row.estimatedCredits,
    addedAt: row.addedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    company,
    scoring: scoreCompany(company, criteria),
  };
}

export type AddOutcome = 'added' | 'duplicate' | 'not_found';

export interface AddToQueueResult {
  results: { companyId: string; outcome: AddOutcome }[];
  added: number;
  duplicates: number;
  notFound: number;
}

export interface QueueItemStatus {
  id: string;
  status: QueueStatus;
  updatedAt: string;
}

export interface EnrichResult {
  enriched: number;
  failed: number;
  creditsUsed: number;
  simulated: true;
}

export async function loadQueuePage(
  userId: string,
  criteria: Criteria,
  query: QueueQuery,
): Promise<QueueList> {
  const statusFilter = { userId, ...(query.status ? { status: query.status } : {}) };
  const [itemRows, matchingItemCount, summary] = await Promise.all([
    prisma.queueItem.findMany({
      where: statusFilter,
      select: queueItemSelect,
      orderBy: queueItemOrder,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.queueItem.count({ where: statusFilter }),
    loadQueueSummary(userId),
  ]);

  return {
    items: itemRows.map((row) => mapQueueItemRowToDto(row, criteria)),
    page: query.page,
    pageSize: query.pageSize,
    total: matchingItemCount,
    summary,
  };
}

export async function listQueueForExport(
  userId: string,
  criteria: Criteria,
  status?: QueueStatus,
): Promise<QueueItemDto[]> {
  const itemRows = await prisma.queueItem.findMany({
    where: { userId, ...(status ? { status } : {}) },
    select: queueItemSelect,
    orderBy: queueItemOrder,
    take: MAX_QUEUE_EXPORT_ROWS + 1,
  });

  if (itemRows.length > MAX_QUEUE_EXPORT_ROWS) {
    throw new AppError(
      422,
      'RESULT_SET_TOO_LARGE',
      `More than ${MAX_QUEUE_EXPORT_ROWS} queue items; export one status at a time`,
    );
  }

  return itemRows.map((row) => mapQueueItemRowToDto(row, criteria));
}

async function loadQueueSummary(userId: string): Promise<QueueSummary> {
  const statusGroups = await prisma.queueItem.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
    _sum: { estimatedCredits: true },
  });

  const byStatus: Record<QueueStatus, number> = { queued: 0, enriched: 0, failed: 0, skipped: 0 };
  let plannedCredits = 0;
  let creditsUsed = 0;
  for (const group of statusGroups) {
    byStatus[group.status] = group._count._all;
    if (group.status === 'queued') plannedCredits = group._sum.estimatedCredits ?? 0;
    if (group.status === 'enriched') creditsUsed = group._sum.estimatedCredits ?? 0;
  }

  return {
    byStatus,
    total: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
    plannedCredits,
    creditsUsed,
    creditsPerEnrichment: env.CREDITS_PER_ENRICHMENT,
    simulated: true,
  };
}

function classifyQueueAddOutcome(
  companyId: string,
  existingCompanyIds: Set<string>,
  insertedCompanyIds: Set<string>,
): AddOutcome {
  if (!existingCompanyIds.has(companyId)) return 'not_found';
  return insertedCompanyIds.has(companyId) ? 'added' : 'duplicate';
}

/**
 * Per-item outcomes, not all-or-nothing. The unique (user_id, company_id) constraint is the
 * duplicate guard: rows skipped by ON CONFLICT DO NOTHING are reported as duplicates, including
 * ones inserted by a concurrent request.
 */
export async function addCompaniesToQueue(
  userId: string,
  companyIds: string[],
): Promise<AddToQueueResult> {
  const uniqueCompanyIds = [...new Set(companyIds)];
  const existingCompanies = await prisma.company.findMany({
    where: { id: { in: uniqueCompanyIds } },
    select: { id: true },
  });
  const existingCompanyIds = new Set(existingCompanies.map((company) => company.id));

  const insertedItems = await prisma.queueItem.createManyAndReturn({
    data: [...existingCompanyIds].map((companyId) => ({
      userId,
      companyId,
      estimatedCredits: env.CREDITS_PER_ENRICHMENT,
    })),
    skipDuplicates: true,
    select: { companyId: true },
  });
  const insertedCompanyIds = new Set(insertedItems.map((item) => item.companyId));

  const results = uniqueCompanyIds.map((companyId) => ({
    companyId,
    outcome: classifyQueueAddOutcome(companyId, existingCompanyIds, insertedCompanyIds),
  }));
  const countOutcome = (outcome: AddOutcome): number =>
    results.filter((result) => result.outcome === outcome).length;

  return {
    results,
    added: countOutcome('added'),
    duplicates: countOutcome('duplicate'),
    notFound: countOutcome('not_found'),
  };
}

export async function updateQueueItemStatus(
  userId: string,
  queueItemId: string,
  nextStatus: QueueStatus,
): Promise<QueueItemStatus> {
  const currentItem = await prisma.queueItem.findFirst({
    where: { id: queueItemId, userId },
    select: { status: true, updatedAt: true },
  });
  if (!currentItem) throw notFoundError('Queue item');

  if (currentItem.status === nextStatus) {
    return { id: queueItemId, status: nextStatus, updatedAt: currentItem.updatedAt.toISOString() };
  }

  if (!canTransition(currentItem.status, nextStatus, 'user')) {
    throw new AppError(
      409,
      'INVALID_TRANSITION',
      `Cannot change status from ${currentItem.status} to ${nextStatus}`,
    );
  }

  // Guarded on the status we validated against, so a concurrent change is never overwritten.
  const [updatedItem] = await prisma.queueItem.updateManyAndReturn({
    where: { id: queueItemId, userId, status: currentItem.status },
    data: { status: nextStatus, statusReason: null },
    select: { id: true, status: true, updatedAt: true },
  });
  if (!updatedItem) throw new AppError(409, 'CONFLICT', 'Queue item changed; reload and retry');

  return { ...updatedItem, updatedAt: updatedItem.updatedAt.toISOString() };
}

/** Not idempotent: deleting an item that does not exist (or is not yours) returns 404. */
export async function removeQueueItem(userId: string, queueItemId: string): Promise<void> {
  const { count: deletedCount } = await prisma.queueItem.deleteMany({
    where: { id: queueItemId, userId },
  });
  if (deletedCount === 0) throw notFoundError('Queue item');
}

/**
 * Runs simulated enrichment over the user's eligible items (optionally limited to itemIds).
 * Counts and credits come from rows actually updated, so concurrent runs cannot double-report.
 */
export async function runSimulatedEnrichment(
  userId: string,
  itemIds?: string[],
): Promise<EnrichResult> {
  const enrichableStatuses = statusesThatCanMoveTo('enriched', 'enrichment');
  const candidateItems = await prisma.queueItem.findMany({
    where: {
      userId,
      status: { in: enrichableStatuses },
      ...(itemIds ? { id: { in: itemIds } } : {}),
    },
    select: { id: true, company: { select: { domain: true } } },
  });

  type EnrichmentStatus = EnrichmentOutcome['status'];
  const itemIdsByStatus: Record<EnrichmentStatus, string[]> = { enriched: [], failed: [] };
  const reasonByStatus: Record<EnrichmentStatus, string> = { enriched: '', failed: '' };
  for (const candidate of candidateItems) {
    const outcome = simulateEnrichment(candidate.company);
    itemIdsByStatus[outcome.status].push(candidate.id);
    reasonByStatus[outcome.status] = outcome.reason;
  }

  const [enrichedItems, failedItems] = await prisma.$transaction([
    prisma.queueItem.updateManyAndReturn({
      where: {
        id: { in: itemIdsByStatus.enriched },
        userId,
        status: { in: enrichableStatuses },
      },
      data: { status: 'enriched', statusReason: reasonByStatus.enriched },
      select: { estimatedCredits: true },
    }),
    prisma.queueItem.updateManyAndReturn({
      where: { id: { in: itemIdsByStatus.failed }, userId, status: { in: enrichableStatuses } },
      data: { status: 'failed', statusReason: reasonByStatus.failed },
      select: { id: true },
    }),
  ]);

  return {
    enriched: enrichedItems.length,
    failed: failedItems.length,
    creditsUsed: enrichedItems.reduce((sum, item) => sum + item.estimatedCredits, 0),
    simulated: true,
  };
}

/** Model surface for the enrichment queue. */
export const queueService = {
  loadPage: loadQueuePage,
  listForExport: listQueueForExport,
  addCompanies: addCompaniesToQueue,
  updateStatus: updateQueueItemStatus,
  removeItem: removeQueueItem,
  runSimulatedEnrichment,
};
