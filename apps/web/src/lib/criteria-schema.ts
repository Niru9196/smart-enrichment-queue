import { z } from 'zod';

// Client-side copy of apps/api/src/domain/scoring/criteria.ts for instant form feedback.
// The API remains the source of truth and re-validates every request.
const weight = z.number().int().min(0).max(10);
const bound = z.number().int().min(0).nullable();

const listCriterion = z.object({
  weight,
  strict: z.boolean(),
  values: z.array(z.string()).max(50),
});
const rangeCriterion = z.object({ weight, strict: z.boolean(), min: bound, max: bound });

/** Shape only; used to validate API responses. */
export const criteriaShape = z.object({
  industry: listCriterion,
  location: listCriterion,
  size: rangeCriterion,
  revenue: rangeCriterion,
  completeness: z.object({ weight }),
});
export type Criteria = z.infer<typeof criteriaShape>;

const minNotAboveMax = (c: { min: number | null; max: number | null }) =>
  c.min === null || c.max === null || c.min <= c.max;
const RANGE_MESSAGE = 'Min must be less than or equal to max';

/** Shape plus the cross-field rules the API enforces; used by the ICP form. */
export const criteriaSchema = criteriaShape
  .extend({
    size: rangeCriterion.refine(minNotAboveMax, { message: RANGE_MESSAGE, path: ['max'] }),
    revenue: rangeCriterion.refine(minNotAboveMax, { message: RANGE_MESSAGE, path: ['max'] }),
  })
  .refine(
    (c) =>
      [c.industry, c.location].some((f) => f.weight > 0 && f.values.length > 0) ||
      [c.size, c.revenue].some((f) => f.weight > 0 && (f.min !== null || f.max !== null)),
    { message: 'Give at least one fit factor a weight and a target', path: ['root'] },
  );
