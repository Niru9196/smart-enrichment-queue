import { z } from 'zod';
import { criteriaSchema } from '../domain/scoring/criteria.js';
import { PRIORITIES } from '../domain/scoring/score.js';
import { companyFiltersSchema, paginationFields } from './common.js';

export const COMPANY_SORT_KEYS = [
  'name',
  'employeeCount',
  'estimatedRevenue',
  'createdAt',
] as const;

export const companiesQuerySchema = companyFiltersSchema.extend({
  ...paginationFields,
  sort: z.enum(COMPANY_SORT_KEYS).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type CompaniesQuery = z.infer<typeof companiesQuerySchema>;

export const rankedLeadsQuerySchema = companyFiltersSchema.extend({
  ...paginationFields,
  priority: z.enum(PRIORITIES).optional(),
});
export type RankedLeadsQuery = z.infer<typeof rankedLeadsQuerySchema>;

export const leadsExportQuerySchema = rankedLeadsQuerySchema.omit({ page: true, pageSize: true });
export type LeadsExportQuery = z.infer<typeof leadsExportQuerySchema>;

export const previewRankedLeadsBodySchema = rankedLeadsQuerySchema
  .extend({ criteria: criteriaSchema })
  .strict();

export const savePreferencesBodySchema = z.object({ criteria: criteriaSchema }).strict();
