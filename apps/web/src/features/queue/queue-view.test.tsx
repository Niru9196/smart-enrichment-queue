import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'sonner';
import { createQueryClient } from '@/lib/query-client';
import { errorResponse, jsonResponse, queueItem, queueResponse } from '@/test/fixtures';
import { QueueView } from './queue-view';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderQueue() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  render(
    <QueryClientProvider client={client}>
      <QueueView onBrowseLeads={vi.fn()} />
      <Toaster />
    </QueryClientProvider>,
  );
}

describe('QueueView', () => {
  it('announces loading, then shows an empty state with a way back to the leads', async () => {
    fetchMock.mockResolvedValue(jsonResponse(queueResponse([])));
    renderQueue();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the enrichment queue…');
    expect(await screen.findByText('Your enrichment queue is empty')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick high-fit leads to queue' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Enrich 0 queued/ })).toBeDisabled();
  });

  it('explains an empty status tab and links back to all items', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(queueResponse([]))));
    renderQueue();
    await screen.findByText('Your enrichment queue is empty');
    await userEvent.click(screen.getByTestId('queue-filter-skipped'));
    expect(await screen.findByText('No skipped leads')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show all queue items' }));
    expect(await screen.findByText('Your enrichment queue is empty')).toBeInTheDocument();
    expect(screen.getByTestId('queue-filter-all')).toHaveAttribute('aria-selected', 'true');
  });

  it('shows a load error and recovers on retry', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong on our side.'),
    );
    renderQueue();
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument();

    fetchMock.mockResolvedValue(jsonResponse(queueResponse([queueItem()])));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('queue-row')).toHaveTextContent('Acme Software');
    expect(screen.queryByText('Something went wrong on our side.')).not.toBeInTheDocument();
  });

  it('asks before removing a queued lead', async () => {
    fetchMock.mockResolvedValue(jsonResponse(queueResponse([queueItem()])));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderQueue();
    await screen.findByTestId('queue-row');
    const callsBefore = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Remove Acme Software from queue' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    confirm.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Acme Software from queue' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true),
    );
    confirm.mockRestore();
  });

  it('reports a failed enrichment without claiming success, then reloads the real state', async () => {
    fetchMock.mockImplementation((_url, init) =>
      Promise.resolve(
        init?.method === 'POST'
          ? errorResponse(503, 'SERVICE_UNAVAILABLE', 'The database is unavailable.')
          : jsonResponse(queueResponse([queueItem()])),
      ),
    );
    renderQueue();
    const row = await screen.findByTestId('queue-row');
    const getsBefore = fetchMock.mock.calls.filter(([, init]) => !init?.method).length;

    await userEvent.click(screen.getByRole('button', { name: /Enrich 1 queued/ }));
    expect(
      await screen.findByText('Action failed: The database is unavailable.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Simulated enrichment:/)).not.toBeInTheDocument();
    expect(within(row).getByText('Queued')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([, init]) => !init?.method).length).toBeGreaterThan(
        getsBefore,
      ),
    );
  });
});
