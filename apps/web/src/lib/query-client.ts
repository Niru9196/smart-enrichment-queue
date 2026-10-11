import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, userMessage } from '@/services/http';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Prefix for the error toast, e.g. "Couldn't save the profile". */
      errorTitle?: string;
    };
  }
}

/** Network failures and 5xx may succeed on retry; 4xx, bad responses and config errors won't. */
const isTransient = (error: Error): boolean =>
  !(error instanceof ApiError) || error.code === 'NETWORK_ERROR' || error.status >= 500;

/**
 * The single place where request failures are handled. Queries retry transient errors and render
 * them inline via `ErrorAlert`; every failed mutation is reported here as a toast.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Anything that isn't an ApiError is a client bug, not a server response; keep the details.
        if (!(error instanceof ApiError)) console.error(error);
        toast.error(`${mutation.meta?.errorTitle ?? 'Action failed'}: ${userMessage(error)}`);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => count < 2 && isTransient(error),
      },
    },
  });
}
