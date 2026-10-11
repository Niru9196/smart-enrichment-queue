import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/demo-user.js';
import { idParamSchema } from '../schemas/common.js';
import {
  addQueueItemsBodySchema,
  enrichQueueBodySchema,
  queueExportQuerySchema,
  queueQuerySchema,
  updateQueueItemBodySchema,
} from '../schemas/queue.js';
import { preferenceService } from '../services/preferences.js';
import { queueService } from '../services/queue.js';
import { sendCsvAttachment } from '../views/csv.js';
import { renderQueueCsv } from '../views/csv-exports.js';

async function listQueue(req: Request, res: Response): Promise<void> {
  const query = queueQuerySchema.parse(req.query);
  const userId = currentUserId(res);
  const scoringCriteria = await preferenceService.loadActiveScoringCriteria(userId);
  res.json(await queueService.loadPage(userId, scoringCriteria, query));
}

/** 201 when at least one item was inserted; 200 when every id was a duplicate or unknown. */
async function addQueueItems(req: Request, res: Response): Promise<void> {
  const { companyIds } = addQueueItemsBodySchema.parse(req.body);
  const addResult = await queueService.addCompanies(currentUserId(res), companyIds);
  res.status(addResult.added > 0 ? 201 : 200).json(addResult);
}

async function updateQueueItem(req: Request, res: Response): Promise<void> {
  const { id: queueItemId } = idParamSchema.parse(req.params);
  const { status: nextStatus } = updateQueueItemBodySchema.parse(req.body);
  res.json(await queueService.updateStatus(currentUserId(res), queueItemId, nextStatus));
}

async function removeQueueItem(req: Request, res: Response): Promise<void> {
  const { id: queueItemId } = idParamSchema.parse(req.params);
  await queueService.removeItem(currentUserId(res), queueItemId);
  res.status(204).end();
}

async function enrichQueue(req: Request, res: Response): Promise<void> {
  const { itemIds } = enrichQueueBodySchema.parse(req.body ?? {});
  res.json(await queueService.runSimulatedEnrichment(currentUserId(res), itemIds));
}

async function exportQueue(req: Request, res: Response): Promise<void> {
  const { status } = queueExportQuerySchema.parse(req.query);
  const userId = currentUserId(res);
  const scoringCriteria = await preferenceService.loadActiveScoringCriteria(userId);
  const queueItems = await queueService.listForExport(userId, scoringCriteria, status);
  sendCsvAttachment(res, 'enrichment-queue', renderQueueCsv(queueItems));
}

/** Thin HTTP adapter: validate input, call a service, write the response. */
export const queueController = {
  listQueue,
  addQueueItems,
  updateQueueItem,
  removeQueueItem,
  enrichQueue,
  exportQueue,
};
