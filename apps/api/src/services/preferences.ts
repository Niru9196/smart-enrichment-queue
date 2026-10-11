import { criteriaSchema, DEFAULT_CRITERIA, type Criteria } from '../domain/scoring/criteria.js';
import { log } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

export interface PreferencesDto {
  criteria: Criteria;
  isDefault: boolean;
  updatedAt: string | null;
}

export async function loadPreferences(userId: string): Promise<PreferencesDto> {
  const storedPreferences = await prisma.userPreference.findUnique({
    where: { userId },
    select: { criteria: true, updatedAt: true },
  });
  if (!storedPreferences) return { criteria: DEFAULT_CRITERIA, isDefault: true, updatedAt: null };

  const parsedCriteria = criteriaSchema.safeParse(storedPreferences.criteria);
  if (!parsedCriteria.success) {
    // A schema change could invalidate stored JSON. Fall back visibly (isDefault + warning log)
    // rather than failing every ranking request.
    log('warn', 'invalid_stored_preferences', { userId });
    return { criteria: DEFAULT_CRITERIA, isDefault: true, updatedAt: null };
  }
  return {
    criteria: parsedCriteria.data,
    isDefault: false,
    updatedAt: storedPreferences.updatedAt.toISOString(),
  };
}

export async function loadActiveScoringCriteria(userId: string): Promise<Criteria> {
  return (await loadPreferences(userId)).criteria;
}

export async function savePreferences(userId: string, criteria: Criteria): Promise<PreferencesDto> {
  const saved = await prisma.userPreference.upsert({
    where: { userId },
    update: { criteria },
    create: { userId, criteria },
    select: { updatedAt: true },
  });
  return { criteria, isDefault: false, updatedAt: saved.updatedAt.toISOString() };
}

/** Model surface for the saved ICP scoring profile. */
export const preferenceService = {
  load: loadPreferences,
  loadActiveScoringCriteria,
  save: savePreferences,
};
