import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queueResponse } from '@/test/fixtures';
import { OverviewStrip } from './overview-strip';

const summary = { high: 12, medium: 30, low: 50, needs_review: 8, disqualified: 5, total: 105 };

describe('OverviewStrip', () => {
  it('shows placeholders while loading and values once loaded', () => {
    const { rerender } = render(<OverviewStrip isLeadsLoading isQueueLoading />);
    expect(screen.getByTestId('stat-high-fit')).not.toHaveTextContent(/\d/);

    rerender(
      <OverviewStrip
        summary={summary}
        queue={queueResponse([]).summary}
        isLeadsLoading={false}
        isQueueLoading={false}
      />,
    );
    expect(screen.getByTestId('stat-high-fit')).toHaveTextContent('12');
    expect(screen.getByTestId('stat-queued')).toHaveTextContent('0');
  });

  it('marks figures that failed to load as unavailable instead of loading forever', () => {
    render(<OverviewStrip summary={summary} isLeadsLoading={false} isQueueLoading={false} />);
    expect(within(screen.getByTestId('stat-queued')).getByText('unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('stat-high-fit')).toHaveTextContent('12');
  });

  it('lets a user filter by a KPI and open the queue from Queued', async () => {
    const onPriority = vi.fn();
    const onQueued = vi.fn();
    const user = userEvent.setup();
    render(
      <OverviewStrip
        summary={summary}
        queue={queueResponse([]).summary}
        isLeadsLoading={false}
        isQueueLoading={false}
        onPriority={onPriority}
        onQueued={onQueued}
      />,
    );
    await user.click(screen.getByRole('button', { name: /High fit/ }));
    expect(onPriority).toHaveBeenCalledWith('high');
    await user.click(screen.getByRole('button', { name: /Queued/ }));
    expect(onQueued).toHaveBeenCalledOnce();
  });
});
