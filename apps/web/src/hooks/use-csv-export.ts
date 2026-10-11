import { useMutation } from '@tanstack/react-query';
import { saveBlob } from '@/lib/download';
import type { CsvDownload } from '@/services/http';

/** Downloads a CSV from a service call and saves it; failures are toasted by the query client. */
export function useCsvExport<TArgs>(download: (args: TArgs) => Promise<CsvDownload>) {
  return useMutation({
    mutationFn: download,
    onSuccess: ({ blob, filename }) => saveBlob(blob, filename),
    meta: { errorTitle: 'Export failed' },
  });
}
