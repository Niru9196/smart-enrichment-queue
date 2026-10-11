import { describe, expect, it } from 'vitest';
import {
  statusesThatCanMoveTo,
  canTransition,
  QUEUE_STATUSES,
  simulateEnrichment,
} from './transitions.js';

describe('queue transitions', () => {
  it('lets users skip, re-queue skipped or failed items, and nothing else', () => {
    const allowed = QUEUE_STATUSES.flatMap((from) =>
      QUEUE_STATUSES.filter((to) => canTransition(from, to, 'user')).map((to) => `${from}->${to}`),
    );
    expect(allowed.sort()).toEqual(['failed->queued', 'queued->skipped', 'skipped->queued']);
  });

  it('only lets enrichment move queued items to enriched or failed', () => {
    expect(statusesThatCanMoveTo('enriched', 'enrichment')).toEqual(['queued']);
    expect(statusesThatCanMoveTo('failed', 'enrichment')).toEqual(['queued']);
    expect(canTransition('skipped', 'enriched', 'enrichment')).toBe(false);
  });

  it('never lets a user mark an item enriched or leave the enriched state', () => {
    for (const from of QUEUE_STATUSES) {
      expect(canTransition(from, 'enriched', 'user')).toBe(false);
      expect(canTransition('enriched', from, 'user')).toBe(false);
    }
  });
});

describe('simulateEnrichment', () => {
  it('fails leads without a domain and enriches the rest, labelled as simulated', () => {
    expect(simulateEnrichment({ domain: null }).status).toBe('failed');
    const ok = simulateEnrichment({ domain: 'acme.example.com' });
    expect(ok.status).toBe('enriched');
    expect(ok.reason).toMatch(/simulated/i);
  });
});
