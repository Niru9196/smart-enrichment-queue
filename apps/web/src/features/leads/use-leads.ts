import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCsvExport } from '@/hooks/use-csv-export';
import type { Criteria, LeadFilters } from '@/lib/api-schemas';
import { leadsService } from '@/services/leads.service';
import { queryKeys } from '@/services/query-keys';
import { queueService } from '@/services/queue.service';

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: ({ signal }) => leadsService.meta(signal),
    staleTime: Infinity,
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: ({ signal }) => leadsService.preferences(signal),
  });
}

/**
 * Globally ranked leads for one page. While previewing, ranks with the unsaved `previewCriteria`
 * and waits while they are invalid (`undefined`), keeping the last result on screen.
 */
export function useRankedLeads({
  filters,
  page,
  pageSize,
  isPreview,
  previewCriteria,
}: {
  filters: LeadFilters;
  page: number;
  pageSize: number;
  isPreview: boolean;
  previewCriteria: Criteria | undefined;
}) {
  return useQuery({
    queryKey: isPreview
      ? queryKeys.leads.preview(previewCriteria, filters, page)
      : queryKeys.leads.ranked(filters, page),
    queryFn: ({ signal }) =>
      isPreview && previewCriteria
        ? leadsService.preview(previewCriteria, filters, page, pageSize, signal)
        : leadsService.ranked(filters, page, pageSize, signal),
    enabled: !isPreview || previewCriteria !== undefined,
    placeholderData: keepPreviousData,
  });
}

export function useSavePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (criteria: Criteria) => leadsService.savePreferences(criteria),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.preferences, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.queue.all });
      toast.success('Profile saved. Rankings, queue scores, and exports now use it.');
    },
    meta: { errorTitle: "Couldn't save the profile" },
  });
}

export function useAddToQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => queueService.add(ids),
    onSuccess: (result) => {
      const parts = [`${result.added} added to the enrichment queue`];
      if (result.duplicates) parts.push(`${result.duplicates} already queued`);
      if (result.notFound) parts.push(`${result.notFound} no longer exist`);
      (result.added > 0 ? toast.success : toast.info)(parts.join(' · '));
    },
    meta: { errorTitle: "Couldn't add to the queue" },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.queue.all });
    },
  });
}

export const useExportLeads = () => useCsvExport(leadsService.exportCsv);
