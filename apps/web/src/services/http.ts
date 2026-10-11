import type { z } from 'zod';
import { errorEnvelopeSchema } from '@/lib/api-schemas';

const configuredBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;

/** Dev falls back to the local API; production builds must set VITE_API_BASE_URL. */
export const API_BASE_URL = (
  configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '')
).replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Safe text for the UI: server-curated messages for API errors, generic text otherwise. */
export function userMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_BASE_URL) {
    throw new ApiError(0, 'CONFIG_ERROR', 'The app is missing its API URL (VITE_API_BASE_URL).');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      // Only send a JSON content type with a body, so simple GETs skip the CORS preflight.
      headers: init.body ? { 'content-type': 'application/json', ...init.headers } : init.headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const parsed = errorEnvelopeSchema.safeParse(body);
    throw parsed.success
      ? new ApiError(
          res.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.requestId,
        )
      : new ApiError(res.status, 'HTTP_ERROR', `The server returned an error (${res.status}).`);
  }

  return res;
}

/** Sends a request and validates the JSON body against `schema`. */
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await send(path, init);
  const body: unknown = await res.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(res.status, 'INVALID_RESPONSE', 'The server sent an unexpected response.');
  }

  return parsed.data;
}

export async function requestNoContent(path: string, init?: RequestInit): Promise<void> {
  await send(path, init);
}

export const json = (method: string, body: unknown, signal?: AbortSignal): RequestInit => ({
  method,
  body: JSON.stringify(body),
  signal,
});

type Query = Record<string, string | number | undefined>;

export function toSearch(params: Query): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export interface CsvDownload {
  blob: Blob;
  filename: string;
}

export async function downloadCsv(path: string, fallbackName: string): Promise<CsvDownload> {
  const res = await send(path);
  const disposition = res.headers.get('content-disposition') ?? '';
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  return { blob: await res.blob(), filename };
}
