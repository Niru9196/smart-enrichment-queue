import { errorResponse, jsonResponse, queueItem, queueResponse } from '@/test/fixtures';
import { ApiError } from './http';
import { leadsService } from './leads.service';
import { queueService } from './queue.service';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await promise.catch((e: unknown) => e);
  if (!(error instanceof ApiError)) throw new Error('Expected an ApiError');
  return error;
}

describe('services', () => {
  it('returns validated data and forwards the abort signal', async () => {
    const body = queueResponse([queueItem()]);
    fetchMock.mockResolvedValue(jsonResponse(body));
    const controller = new AbortController();

    await expect(queueService.list({ status: 'queued' }, controller.signal)).resolves.toEqual(body);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/queue\?status=queued$/);
    expect(init?.signal).toBe(controller.signal);
  });

  it('rejects responses that do not match the contract', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: 'not-an-array' }));
    const error = await captureError(queueService.list());
    expect(error.code).toBe('INVALID_RESPONSE');
  });

  it('surfaces the API error envelope', async () => {
    fetchMock.mockResolvedValue(errorResponse(409, 'CONFLICT', 'Item changed; refresh'));
    const error = await captureError(queueService.updateStatus('q1', 'skipped'));
    expect(error).toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Item changed; refresh',
    });
  });

  it('maps network failures to a readable error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await captureError(leadsService.meta());
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('downloads CSV exports with the server-provided filename', async () => {
    fetchMock.mockResolvedValue(
      new Response('a,b\n1,2\n', {
        headers: { 'content-disposition': 'attachment; filename="enrichment-queue-2026.csv"' },
      }),
    );
    const result = await queueService.exportCsv('enriched');
    expect(result.filename).toBe('enrichment-queue-2026.csv');
    expect(await result.blob.text()).toBe('a,b\n1,2\n');
  });
});
