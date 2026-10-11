import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary';

function Broken(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  it('replaces a crashed tree with a recovery action', () => {
    // React and the boundary both report the error; keep test output clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeVisible();
    expect(screen.queryByText('render failed')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
