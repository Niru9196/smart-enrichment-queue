import { render, screen, within } from '@testing-library/react';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('explains the four steps and links into the workspace', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { name: 'Stop guessing which leads deserve your credits.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Knowing which ones are worth your time/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'When every scraped company looks like an opportunity' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/high-potential opportunities go unnoticed/)).toBeInTheDocument();
    expect(screen.getByText(/prioritized, explainable action plan/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How you use it' })).toBeInTheDocument();
    expect(screen.getByText('Say who you want')).toBeInTheDocument();
    expect(screen.getByText('Run simulated enrichment')).toBeInTheDocument();
    expect(screen.getByText('Fit score')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    const nav = screen.getByRole('navigation', { name: 'Landing' });
    expect(within(nav).getByRole('link', { name: 'The problem' })).toHaveAttribute(
      'href',
      '#the-problem',
    );
    expect(within(nav).getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    const workspaceLinks = screen.getAllByRole('link', { name: 'Open the workspace' });
    expect(workspaceLinks.length).toBeGreaterThan(0);
    expect(workspaceLinks[0]).toHaveAttribute('href', '/?view=leads');
  });
});
