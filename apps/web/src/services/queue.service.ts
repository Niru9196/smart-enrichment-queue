import {
  addToQueueResponseSchema,
  enrichResponseSchema,
  queueItemStatusSchema,
  queueResponseSchema,
  type QueueStatus,
} from '@/lib/api-schemas';
import { downloadCsv, json, request, requestNoContent, toSearch } from './http';

export interface QueueQuery {
  status?: QueueStatus;
  page?: number;
  pageSize?: number;
}

/** The enrichment queue: listing, status changes, and simulated enrichment. */
export const queueService = {
  list: (query: QueueQuery = {}, signal?: AbortSignal) =>
    request(`/queue${toSearch({ ...query })}`, queueResponseSchema, { signal }),

  add: (companyIds: string[]) =>
    request('/queue/items', addToQueueResponseSchema, json('POST', { companyIds })),

  updateStatus: (id: string, status: QueueStatus) =>
    request(`/queue/items/${id}`, queueItemStatusSchema, json('PATCH', { status })),

  remove: (id: string) => requestNoContent(`/queue/items/${id}`, { method: 'DELETE' }),

  enrich: () => request('/queue/enrich', enrichResponseSchema, json('POST', {})),

  exportCsv: (status?: QueueStatus) =>
    downloadCsv(`/queue/export${toSearch({ status })}`, 'enrichment-queue.csv'),
};
