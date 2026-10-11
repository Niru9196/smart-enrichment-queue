import { render, screen, within } from '@testing-library/react';
import type { ScoringResult } from '@/lib/api-schemas';
import { ScoreExplanation } from './score-explanation';

const base: ScoringResult = {
  score: 82.5,
  priority: 'high',
  confidence: 'medium',
  coverage: 0.7,
  matchedFactors: [
    {
      key: 'industry',
      label: 'Industry fit',
      match: 1,
      weight: 8,
      contribution: 50,
      explanation: 'Software is a target industry',
    },
  ],
  missingFactors: ['revenue'],
  disqualificationReasons: [],
  reviewReasons: [],
};

describe('ScoreExplanation', () => {
  it('shows the score, priority, and each factor with its explanation', () => {
    render(<ScoreExplanation scoring={base} />);
    expect(screen.getByTestId('detail-score')).toHaveTextContent('83/100');
    expect(screen.getByText('High fit')).toBeInTheDocument();
    expect(screen.getByText('70% evidence coverage')).toBeInTheDocument();
    const factor = screen.getByTestId('factor-industry');
    expect(within(factor).getByText('Software is a target industry')).toBeInTheDocument();
    expect(within(factor).getByText(/\+50\.0 pts · weight 8/)).toBeInTheDocument();
  });

  it('lists unknown data separately rather than as a mismatch', () => {
    render(<ScoreExplanation scoring={base} />);
    expect(screen.getByText('Unknown data (excluded from the score)')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('explains disqualification and review reasons', () => {
    render(
      <ScoreExplanation
        scoring={{
          ...base,
          priority: 'disqualified',
          disqualificationReasons: ['Strict rule: Germany is not a target country'],
          reviewReasons: ['Company size is a strict requirement but the value is unknown'],
        }}
      />,
    );
    expect(screen.getByText('Disqualified by a strict rule')).toBeInTheDocument();
    expect(screen.getByText('Strict rule: Germany is not a target country')).toBeInTheDocument();
    expect(screen.getByText('Verify before spending a credit')).toBeInTheDocument();
  });

  it('renders a null score as a dash', () => {
    render(
      <ScoreExplanation
        scoring={{ ...base, score: null, priority: 'needs_review', matchedFactors: [] }}
      />,
    );
    expect(screen.getByTestId('detail-score')).toHaveTextContent('n/a');
    expect(screen.getByText('No weighted factor has known data.')).toBeInTheDocument();
  });
});
