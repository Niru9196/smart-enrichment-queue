import { z } from 'zod';
import { QUEUE_STATUSES } from '../domain/queue/transitions.js';
import { MAX_BULK_IDS, paginationFields } from './common.js';

export const queueExportQuerySchema = z.object({ status: z.enum(QUEUE_STATUSES).optional() });
export type QueueExportQuery = z.infer<typeof queueExportQuerySchema>;

export const queueQuerySchema = queueExportQuerySchema.extend(paginationFields);
export type QueueQuery = z.infer<typeof queueQuerySchema>;

export const addQueueItemsBodySchema = z
  .object({ companyIds: z.array(z.uuid()).min(1).max(MAX_BULK_IDS) })
  .strict();

export const updateQueueItemBodySchema = z.object({ status: z.enum(QUEUE_STATUSES) }).strict();

export const enrichQueueBodySchema = z
  .object({ itemIds: z.array(z.uuid()).min(1).max(MAX_BULK_IDS).optional() })
  .strict();
