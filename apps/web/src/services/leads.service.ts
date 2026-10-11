import {
  metaSchema,
  preferencesSchema,
  rankedResponseSchema,
  type Criteria,
  type LeadFilters,
} from '@/lib/api-schemas';
import { downloadCsv, json, request, toSearch } from './http';

function withoutEmpty(filters: LeadFilters): LeadFilters {
  const result: LeadFilters = {};
  if (filters.q) result.q = filters.q;
  if (filters.industry) result.industry = filters.industry;
  if (filters.country) result.country = filters.country;
  if (filters.priority) result.priority = filters.priority;
  return result;
}

/** Lead catalogue, the saved ICP profile, and ranking. */
export const leadsService = {
  meta: (signal?: AbortSignal) => request('/meta', metaSchema, { signal }),

  preferences: (signal?: AbortSignal) => request('/preferences', preferencesSchema, { signal }),

  savePreferences: (criteria: Criteria) =>
    request('/preferences', preferencesSchema, json('PUT', { criteria })),

  ranked: (filters: LeadFilters, page: number, pageSize: number, signal?: AbortSignal) =>
    request(`/leads/ranked${toSearch({ ...filters, page, pageSize })}`, rankedResponseSchema, {
      signal,
    }),

  /** Ranks with unsaved criteria; nothing is persisted. */
  preview: (
    criteria: Criteria,
    filters: LeadFilters,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ) =>
    request(
      '/scoring/preview',
      rankedResponseSchema,
      json('POST', { criteria, ...withoutEmpty(filters), page, pageSize }, signal),
    ),

  exportCsv: (filters: LeadFilters) =>
    downloadCsv(`/leads/export${toSearch({ ...filters })}`, 'ranked-leads.csv'),
};
