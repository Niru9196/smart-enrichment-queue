import type { Criteria } from './criteria.js';

export interface ScorableCompany {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  country: string | null;
  employeeCount: number | null;
  estimatedRevenue: number | null;
  linkedinUrl: string | null;
}

export const FACTOR_KEYS = ['industry', 'location', 'size', 'revenue', 'completeness'] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];
export const PRIORITIES = ['high', 'medium', 'low', 'needs_review', 'disqualified'] as const;
export type Priority = (typeof PRIORITIES)[number];
export type Confidence = 'high' | 'medium' | 'low';

export interface ScoreFactor {
  key: FactorKey;
  label: string;
  match: number;
  weight: number;
  /** Points this factor adds to the 0-100 score. */
  contribution: number;
  explanation: string;
}

export interface ScoringResult {
  score: number | null;
  priority: Priority;
  confidence: Confidence;
  /** Share of configured scoring weight backed by known data, 0-1. */
  coverage: number;
  matchedFactors: ScoreFactor[];
  missingFactors: FactorKey[];
  disqualificationReasons: string[];
  reviewReasons: string[];
}

export const PRIORITY_THRESHOLDS = { high: 75, medium: 50 } as const;
export const CONFIDENCE_THRESHOLDS = { high: 0.8, medium: 0.5 } as const;

/** Priority for a qualified lead with a score; thresholds are inclusive lower bounds. */
export function fitPriorityFor(score: number): Extract<Priority, 'high' | 'medium' | 'low'> {
  if (score >= PRIORITY_THRESHOLDS.high) return 'high';
  if (score >= PRIORITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/** Confidence from evidence coverage (0-1); thresholds are inclusive lower bounds. */
export function confidenceFor(coverage: number): Confidence {
  if (coverage >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (coverage >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  industry: 'Industry fit',
  location: 'Location',
  size: 'Company size',
  revenue: 'Revenue',
  completeness: 'Data completeness',
};

const COMPLETENESS_FIELDS = [
  'domain',
  'industry',
  'country',
  'employeeCount',
  'estimatedRevenue',
  'linkedinUrl',
] as const satisfies readonly (keyof ScorableCompany)[];

type FactorEvaluation =
  | { status: 'not_configured' }
  | { status: 'unknown' }
  | { status: 'known'; match: number; violatesStrict: boolean; explanation: string };

const roundTo = (value: number, digits = 1): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value);
const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

function evaluateListCriterion(
  value: string | null,
  criterion: Criteria['industry'],
  noun: string,
): FactorEvaluation {
  if (criterion.values.length === 0) return { status: 'not_configured' };
  if (value === null) return { status: 'unknown' };

  const matches = criterion.values.some(
    (allowedValue) => allowedValue.toLowerCase() === value.toLowerCase(),
  );
  return {
    status: 'known',
    match: matches ? 1 : 0,
    violatesStrict: criterion.strict && !matches,
    explanation: matches ? `${value} is a target ${noun}` : `${value} is not a target ${noun}`,
  };
}

/** Full credit inside [min, max]; partial credit decays proportionally outside it. */
function evaluateRangeCriterion(
  value: number | null,
  criterion: Criteria['size'],
  format: (value: number) => string,
  noun: string,
): FactorEvaluation {
  const { min, max } = criterion;
  if (min === null && max === null) return { status: 'not_configured' };
  if (value === null) return { status: 'unknown' };

  const target =
    min !== null && max !== null
      ? `${format(min)}-${format(max)}`
      : min !== null
        ? `at least ${format(min)}`
        : `at most ${format(max ?? 0)}`;

  if (min !== null && value < min) {
    return {
      status: 'known',
      match: min === 0 ? 0 : Math.max(0, value / min),
      violatesStrict: criterion.strict,
      explanation: `${format(value)} ${noun} is below the target (${target})`,
    };
  }

  if (max !== null && value > max) {
    return {
      status: 'known',
      match: value === 0 ? 0 : max / value,
      violatesStrict: criterion.strict,
      explanation: `${format(value)} ${noun} is above the target (${target})`,
    };
  }

  return {
    status: 'known',
    match: 1,
    violatesStrict: false,
    explanation: `${format(value)} ${noun} is within the target (${target})`,
  };
}

function evaluateCompleteness(company: ScorableCompany): FactorEvaluation {
  const presentFields = COMPLETENESS_FIELDS.filter(
    (fieldName) => company[fieldName] !== null && company[fieldName] !== '',
  );
  return {
    status: 'known',
    match: presentFields.length / COMPLETENESS_FIELDS.length,
    violatesStrict: false,
    explanation: `${presentFields.length} of ${COMPLETENESS_FIELDS.length} key fields are available`,
  };
}

export function scoreCompany(company: ScorableCompany, criteria: Criteria): ScoringResult {
  const evaluations: Record<FactorKey, FactorEvaluation> = {
    industry: evaluateListCriterion(company.industry, criteria.industry, 'industry'),
    location: evaluateListCriterion(company.country, criteria.location, 'country'),
    size: evaluateRangeCriterion(company.employeeCount, criteria.size, formatNumber, 'employees'),
    revenue: evaluateRangeCriterion(
      company.estimatedRevenue,
      criteria.revenue,
      formatUsd,
      'revenue',
    ),
    completeness: evaluateCompleteness(company),
  };

  const strictFactorKeys = new Set<FactorKey>(
    (['industry', 'location', 'size', 'revenue'] as const).filter(
      (factorKey) => criteria[factorKey].strict,
    ),
  );

  let totalWeight = 0;
  let knownWeight = 0;
  let knownFitWeight = 0;
  let weightedMatch = 0;
  const knownFactors: { key: FactorKey; weight: number; match: number; explanation: string }[] = [];
  const missingFactors: FactorKey[] = [];
  const disqualificationReasons: string[] = [];
  const reviewReasons: string[] = [];

  for (const factorKey of FACTOR_KEYS) {
    const evaluation = evaluations[factorKey];
    const weight = criteria[factorKey].weight;

    if (evaluation.status === 'not_configured') continue;

    if (evaluation.status === 'unknown') {
      if (weight > 0) {
        totalWeight += weight;
        missingFactors.push(factorKey);
      }
      if (strictFactorKeys.has(factorKey)) {
        reviewReasons.push(
          `${FACTOR_LABELS[factorKey]} is a strict requirement but the value is unknown`,
        );
      }
      continue;
    }

    if (evaluation.violatesStrict) {
      disqualificationReasons.push(`Strict rule: ${evaluation.explanation}`);
    }

    if (weight === 0) continue;

    totalWeight += weight;
    knownWeight += weight;
    if (factorKey !== 'completeness') knownFitWeight += weight;
    weightedMatch += weight * evaluation.match;
    knownFactors.push({
      key: factorKey,
      weight,
      match: evaluation.match,
      explanation: evaluation.explanation,
    });
  }

  // Completeness alone says nothing about fit, so it cannot produce a score on its own.
  const score = knownFitWeight > 0 ? roundTo((100 * weightedMatch) / knownWeight) : null;
  if (score === null) reviewReasons.push('No fit factor has known data');

  const coverage = totalWeight > 0 ? roundTo(knownWeight / totalWeight, 3) : 0;
  const confidence = confidenceFor(coverage);

  const matchedFactors: ScoreFactor[] = knownFactors.map((factor) => ({
    key: factor.key,
    label: FACTOR_LABELS[factor.key],
    match: roundTo(factor.match, 3),
    weight: factor.weight,
    contribution: roundTo((100 * factor.weight * factor.match) / knownWeight),
    explanation: factor.explanation,
  }));

  let priority: Priority;
  if (disqualificationReasons.length > 0) priority = 'disqualified';
  else if (score === null || reviewReasons.length > 0) priority = 'needs_review';
  else priority = fitPriorityFor(score);

  return {
    score,
    priority,
    confidence,
    coverage,
    matchedFactors,
    missingFactors,
    disqualificationReasons,
    reviewReasons,
  };
}

const PRIORITY_GROUP_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 0,
  low: 0,
  needs_review: 1,
  disqualified: 2,
};
const CONFIDENCE_ORDER: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

/**
 * Stable ranking: qualified leads, then needs-review, then disqualified; within a group by
 * score (unknown last), confidence, name, and id so pagination never reshuffles ties.
 */
export function compareScoredCompanies(
  a: { company: Pick<ScorableCompany, 'id' | 'name'>; scoring: ScoringResult },
  b: { company: Pick<ScorableCompany, 'id' | 'name'>; scoring: ScoringResult },
): number {
  return (
    PRIORITY_GROUP_ORDER[a.scoring.priority] - PRIORITY_GROUP_ORDER[b.scoring.priority] ||
    (b.scoring.score ?? -1) - (a.scoring.score ?? -1) ||
    CONFIDENCE_ORDER[a.scoring.confidence] - CONFIDENCE_ORDER[b.scoring.confidence] ||
    a.company.name.localeCompare(b.company.name, 'en') ||
    (a.company.id < b.company.id ? -1 : a.company.id > b.company.id ? 1 : 0)
  );
}

export function rankCompanies<T extends ScorableCompany>(
  companies: T[],
  criteria: Criteria,
): { company: T; scoring: ScoringResult }[] {
  return companies
    .map((company) => ({ company, scoring: scoreCompany(company, criteria) }))
    .sort(compareScoredCompanies);
}
