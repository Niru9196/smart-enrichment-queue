import { describe, expect, it } from 'vitest';
import { criteriaSchema, DEFAULT_CRITERIA, type Criteria } from './criteria.js';
import {
  confidenceFor,
  fitPriorityFor,
  rankCompanies,
  scoreCompany,
  type ScorableCompany,
} from './score.js';

const company = (overrides: Partial<ScorableCompany> = {}): ScorableCompany => ({
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Acme',
  domain: 'acme.com',
  industry: 'Software',
  country: 'United States',
  employeeCount: 50,
  estimatedRevenue: 10_000_000,
  linkedinUrl: 'https://linkedin.com/company/acme',
  ...overrides,
});

const criteria = (overrides: Partial<Criteria> = {}): Criteria => ({
  industry: { weight: 5, strict: false, values: ['Software'] },
  location: { weight: 5, strict: false, values: ['United States'] },
  size: { weight: 5, strict: false, min: 10, max: 100 },
  revenue: { weight: 5, strict: false, min: 1_000_000, max: 20_000_000 },
  completeness: { weight: 0 },
  ...overrides,
});

describe('scoreCompany', () => {
  it('gives a perfect fit 100 with high confidence and full coverage', () => {
    const result = scoreCompany(company(), criteria());
    expect(result.score).toBe(100);
    expect(result.priority).toBe('high');
    expect(result.confidence).toBe('high');
    expect(result.coverage).toBe(1);
    expect(result.missingFactors).toEqual([]);
  });

  it('scores over known factors only and does not treat unknown as a mismatch', () => {
    const result = scoreCompany(company({ estimatedRevenue: null }), criteria());
    expect(result.score).toBe(100);
    expect(result.missingFactors).toEqual(['revenue']);
    expect(result.coverage).toBe(0.75);
    expect(result.confidence).toBe('medium');
  });

  it('gives partial credit outside a range, proportional to distance', () => {
    const result = scoreCompany(
      company({ employeeCount: 200 }),
      criteria({
        industry: { weight: 0, strict: false, values: [] },
        location: { weight: 0, strict: false, values: [] },
        revenue: { weight: 0, strict: false, min: null, max: null },
      }),
    );
    expect(result.score).toBe(50);
    expect(result.matchedFactors[0]?.explanation).toMatch(/above the target/);
  });

  it('disqualifies a known strict violation and explains why', () => {
    const result = scoreCompany(
      company({ country: 'Germany' }),
      criteria({ location: { weight: 5, strict: true, values: ['United States'] } }),
    );
    expect(result.priority).toBe('disqualified');
    expect(result.disqualificationReasons).toEqual([
      'Strict rule: Germany is not a target country',
    ]);
  });

  it('routes a missing strict field to review instead of disqualifying', () => {
    const result = scoreCompany(
      company({ country: null }),
      criteria({ location: { weight: 5, strict: true, values: ['United States'] } }),
    );
    expect(result.priority).toBe('needs_review');
    expect(result.disqualificationReasons).toEqual([]);
    expect(result.reviewReasons[0]).toMatch(/Location is a strict requirement/);
  });

  it('applies strict rules even when the factor has zero weight', () => {
    const result = scoreCompany(
      company({ employeeCount: 5000 }),
      criteria({ size: { weight: 0, strict: true, min: 10, max: 100 } }),
    );
    expect(result.priority).toBe('disqualified');
    expect(result.matchedFactors.map((f) => f.key)).not.toContain('size');
  });

  it('returns a null score when no fit factor is known, even if completeness is', () => {
    const result = scoreCompany(
      company({ industry: null, country: null, employeeCount: null, estimatedRevenue: null }),
      criteria({ completeness: { weight: 5 } }),
    );
    expect(result.score).toBeNull();
    expect(result.priority).toBe('needs_review');
    expect(result.confidence).toBe('low');
  });

  it('builds the score from the same factor contributions it reports', () => {
    const result = scoreCompany(
      company({ industry: 'Retail', employeeCount: 400 }),
      DEFAULT_CRITERIA,
    );
    const sum = result.matchedFactors.reduce((s, f) => s + f.contribution, 0);
    expect(Math.abs(sum - (result.score ?? 0))).toBeLessThanOrEqual(0.3);
  });

  it('matches list values case-insensitively', () => {
    expect(scoreCompany(company({ industry: 'software' }), criteria()).score).toBe(100);
  });
});

describe('rankCompanies', () => {
  it('orders qualified, then needs-review, then disqualified, with stable tie-breaks', () => {
    const c = criteria({ location: { weight: 5, strict: true, values: ['United States'] } });
    const ranked = rankCompanies(
      [
        company({ id: 'id-dq', name: 'Disq', country: 'France' }),
        company({ id: 'id-review', name: 'Review', country: null }),
        company({ id: 'id-b', name: 'Beta' }),
        company({ id: 'id-a', name: 'Alpha' }),
        company({ id: 'id-low', name: 'Low', industry: 'Retail', employeeCount: 1000 }),
      ],
      c,
    );
    expect(ranked.map((r) => r.company.id)).toEqual([
      'id-a',
      'id-b',
      'id-low',
      'id-review',
      'id-dq',
    ]);
  });

  it('is deterministic regardless of input order', () => {
    const list = [company({ id: 'x', name: 'Same' }), company({ id: 'y', name: 'Same' })];
    const first = rankCompanies(list, criteria()).map((r) => r.company.id);
    const second = rankCompanies([...list].reverse(), criteria()).map((r) => r.company.id);
    expect(first).toEqual(second);
  });
});

describe('thresholds', () => {
  it('uses inclusive lower bounds for priority', () => {
    expect(fitPriorityFor(75)).toBe('high');
    expect(fitPriorityFor(74.9)).toBe('medium');
    expect(fitPriorityFor(50)).toBe('medium');
    expect(fitPriorityFor(49.9)).toBe('low');
  });

  it('uses inclusive lower bounds for confidence', () => {
    expect(confidenceFor(0.8)).toBe('high');
    expect(confidenceFor(0.799)).toBe('medium');
    expect(confidenceFor(0.5)).toBe('medium');
    expect(confidenceFor(0.499)).toBe('low');
  });
});

describe('criteriaSchema', () => {
  it('accepts the defaults', () => {
    expect(criteriaSchema.safeParse(DEFAULT_CRITERIA).success).toBe(true);
  });

  it('rejects a config with no weighted fit factor', () => {
    const result = criteriaSchema.safeParse({
      ...DEFAULT_CRITERIA,
      industry: { ...DEFAULT_CRITERIA.industry, weight: 0 },
      location: { ...DEFAULT_CRITERIA.location, weight: 0 },
      size: { ...DEFAULT_CRITERIA.size, weight: 0 },
      revenue: { ...DEFAULT_CRITERIA.revenue, weight: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects inverted ranges and unknown keys', () => {
    expect(
      criteriaSchema.safeParse({
        ...DEFAULT_CRITERIA,
        size: { ...DEFAULT_CRITERIA.size, min: 500, max: 10 },
      }).success,
    ).toBe(false);
    expect(criteriaSchema.safeParse({ ...DEFAULT_CRITERIA, extra: 1 }).success).toBe(false);
  });
});
