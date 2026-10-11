import { z } from 'zod';

export const MAX_PAGE_SIZE = 100;
export const MAX_BULK_IDS = 100;

export const idParamSchema = z.object({ id: z.uuid() });

export const paginationFields = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
};

const optionalText = z.string().trim().max(100).optional();

export const companyFiltersSchema = z.object({
  q: optionalText,
  industry: optionalText,
  country: optionalText,
});
export type CompanyFilters = z.infer<typeof companyFiltersSchema>;
