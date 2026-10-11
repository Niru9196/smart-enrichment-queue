import type { Request, Response } from 'express';
import { companyService } from '../services/companies.js';
import { healthService } from '../services/health.js';

/** Liveness: the process is up. Does not touch the database. */
function getLiveness(_req: Request, res: Response): void {
  res.json({ status: 'ok' });
}

/** Readiness: the database answers, so the instance can take traffic. */
async function getReadiness(_req: Request, res: Response): Promise<void> {
  await healthService.assertDatabaseReachable();
  res.json({ status: 'ready' });
}

async function getLeadMetadata(_req: Request, res: Response): Promise<void> {
  res.json(await companyService.loadCatalogMetadata());
}

export const systemController = {
  getLiveness,
  getReadiness,
  getLeadMetadata,
};
