import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { company, rankedLead, scoring } from '@/test/fixtures';
import { LeadTable } from './lead-table';

const handlers = { onToggle: vi.fn(), onToggleAll: vi.fn(), onOpen: vi.fn() };

describe('LeadTable', () => {
  it('shows announced skeleton rows while the first page loads', () => {
    render(<LeadTable items={[]} isLoading selected={new Set()} {...handlers} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading leads…');
    expect(screen.queryByText(/No leads match/)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('lead-row')).toHaveLength(0);
  });

  it('offers to clear filters when filters hide every lead', async () => {
    const onClearFilters = vi.fn();
    render(
      <LeadTable
        items={[]}
        isLoading={false}
        onClearFilters={onClearFilters}
        selected={new Set()}
        {...handlers}
      />,
    );
    expect(screen.getByText('No leads match these filters')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(onClearFilters).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('checkbox', { name: 'Select all queueable leads on this page' }),
    ).toBeDisabled();
  });

  it('explains an empty catalogue when no filters are active', () => {
    render(<LeadTable items={[]} isLoading={false} selected={new Set()} {...handlers} />);
    expect(screen.getByText('No companies yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('marks stale rows as busy while the next page loads', () => {
    render(
      <LeadTable
        items={[rankedLead()]}
        isLoading={false}
        isRefreshing
        selected={new Set()}
        {...handlers}
      />,
    );
    const frame = screen.getByTestId('lead-row').closest('[aria-busy]');
    expect(frame).toHaveAttribute('aria-busy', 'true');
    expect(frame).toHaveClass('overflow-auto');
  });

  it('only offers selection for leads that can be queued', () => {
    const items = [
      rankedLead(),
      rankedLead({
        rank: 2,
        company: company({ id: 'c2', name: 'Queued Co' }),
        queueStatus: 'queued',
      }),
      rankedLead({
        rank: 3,
        company: company({ id: 'c3', name: 'Foreign GmbH' }),
        scoring: scoring({ score: 40, priority: 'disqualified' }),
      }),
    ];
    render(<LeadTable items={items} isLoading={false} selected={new Set()} {...handlers} />);
    expect(screen.getAllByTestId('lead-row')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: 'Select Acme Software' })).toBeEnabled();
    expect(screen.queryByRole('checkbox', { name: 'Select Queued Co' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Select Foreign GmbH' })).not.toBeInTheDocument();
  });

  it('shows enriched and failed queue status in their own column', () => {
    render(
      <LeadTable
        items={[
          rankedLead({
            company: company({ id: 'e1', name: 'Enriched Co' }),
            queueStatus: 'enriched',
          }),
          rankedLead({
            rank: 2,
            company: company({ id: 'f1', name: 'Failed Co' }),
            queueStatus: 'failed',
          }),
          rankedLead({
            rank: 3,
            company: company({ id: 'o1', name: 'Open Co' }),
          }),
        ]}
        isLoading={false}
        selected={new Set()}
        {...handlers}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByText('Enriched')).toBeVisible();
    expect(screen.getByText('Failed')).toBeVisible();
    expect(screen.queryByText('Not queued')).not.toBeInTheDocument();
  });
});
