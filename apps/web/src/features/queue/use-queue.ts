import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCsvExport } from '@/hooks/use-csv-export';
import type { QueueStatus } from '@/lib/api-schemas';
import { queryKeys } from '@/services/query-keys';
import { queueService } from '@/services/queue.service';

/** Queue totals for badges and overview stats; the summary covers every item regardless of page. */
export function useQueueSummary() {
  return useQuery({
    queryKey: queryKeys.queue.summary,
    queryFn: ({ signal }) => queueService.list({ pageSize: 1 }, signal),
    select: (data) => data.summary,
  });
}

export function useQueueList(status: QueueStatus | 'all', page: number, pageSize: number) {
  return useQuery({
    queryKey: queryKeys.queue.list(status, page),
    queryFn: ({ signal }) =>
      queueService.list({ status: status === 'all' ? undefined : status, page, pageSize }, signal),
    placeholderData: keepPreviousData,
  });
}

/** Enrich, change status, and remove. Failures are toasted by the query client. */
export function useQueueActions() {
  const queryClient = useQueryClient();
  // Refetch after failures too: a 404/409 means the list on screen is stale, and after a network
  // error only the server knows whether the change landed.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.queue.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
  };

  const enrich = useMutation({
    mutationFn: () => queueService.enrich(),
    onSuccess: (r) =>
      toast.success(
        `Simulated enrichment: ${r.enriched} enriched (${r.creditsUsed} credits), ${r.failed} failed`,
      ),
    onSettled: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: QueueStatus }) =>
      queueService.updateStatus(id, next),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => queueService.remove(id),
    onSuccess: () => toast.success('Removed from queue'),
    onSettled: refresh,
  });

  return { enrich, update, remove };
}

export const useExportQueue = () => useCsvExport(queueService.exportCsv);
