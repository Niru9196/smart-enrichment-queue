import { z } from 'zod';

const weight = z.number().int().min(0).max(10);
const nonNegativeInt = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const labelList = z.array(z.string().trim().min(1).max(100)).max(50);

const rangeCriterion = z
  .object({
    weight,
    strict: z.boolean(),
    min: nonNegativeInt.nullable(),
    max: nonNegativeInt.nullable(),
  })
  .strict()
  .refine((range) => range.min === null || range.max === null || range.min <= range.max, {
    message: 'min must be less than or equal to max',
    path: ['min'],
  });

const listCriterion = z.object({ weight, strict: z.boolean(), values: labelList }).strict();

export const criteriaSchema = z
  .object({
    industry: listCriterion,
    location: listCriterion,
    size: rangeCriterion,
    revenue: rangeCriterion,
    completeness: z.object({ weight }).strict(),
  })
  .strict()
  .refine(
    (criteria) =>
      [criteria.industry, criteria.location].some(
        (listFactor) => listFactor.weight > 0 && listFactor.values.length > 0,
      ) ||
      [criteria.size, criteria.revenue].some(
        (rangeFactor) =>
          rangeFactor.weight > 0 && (rangeFactor.min !== null || rangeFactor.max !== null),
      ),
    {
      message:
        'Configure at least one weighted fit factor (industry, location, size, or revenue) with a target',
    },
  );

export type Criteria = z.infer<typeof criteriaSchema>;

export const DEFAULT_CRITERIA: Criteria = {
  industry: {
    weight: 8,
    strict: false,
    values: ['Software', 'IT Services', 'Healthcare Services', 'Manufacturing'],
  },
  location: { weight: 5, strict: true, values: ['United States', 'Canada'] },
  size: { weight: 6, strict: false, min: 10, max: 250 },
  revenue: { weight: 7, strict: false, min: 2_000_000, max: 50_000_000 },
  completeness: { weight: 3 },
};
