import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/demo-user.js';
import { idParamSchema } from '../schemas/common.js';
import {
  companiesQuerySchema,
  leadsExportQuerySchema,
  previewRankedLeadsBodySchema,
  rankedLeadsQuerySchema,
  savePreferencesBodySchema,
} from '../schemas/leads.js';
import { companyService } from '../services/companies.js';
import { preferenceService } from '../services/preferences.js';
import { rankingService } from '../services/ranking.js';
import { sendCsvAttachment } from '../views/csv.js';
import { renderRankedLeadsCsv } from '../views/csv-exports.js';

async function listCompanies(req: Request, res: Response): Promise<void> {
  const query = companiesQuerySchema.parse(req.query);
  res.json(await companyService.listPage(query));
}

async function getCompany(req: Request, res: Response): Promise<void> {
  const { id: companyId } = idParamSchema.parse(req.params);
  const userId = currentUserId(res);
  const scoringCriteria = await preferenceService.loadActiveScoringCriteria(userId);
  res.json(await companyService.loadDetail(userId, companyId, scoringCriteria));
}

async function getPreferences(_req: Request, res: Response): Promise<void> {
  res.json(await preferenceService.load(currentUserId(res)));
}

async function savePreferences(req: Request, res: Response): Promise<void> {
  const { criteria } = savePreferencesBodySchema.parse(req.body);
  res.json(await preferenceService.save(currentUserId(res), criteria));
}

/** Ranks with unsaved criteria from the body; nothing is persisted. */
async function previewRankedLeads(req: Request, res: Response): Promise<void> {
  const { criteria: draftCriteria, ...query } = previewRankedLeadsBodySchema.parse(req.body);
  res.json(await rankingService.loadPage(currentUserId(res), draftCriteria, query));
}

async function listRankedLeads(req: Request, res: Response): Promise<void> {
  const query = rankedLeadsQuerySchema.parse(req.query);
  const userId = currentUserId(res);
  const scoringCriteria = await preferenceService.loadActiveScoringCriteria(userId);
  res.json(await rankingService.loadPage(userId, scoringCriteria, query));
}

async function exportRankedLeads(req: Request, res: Response): Promise<void> {
  const query = leadsExportQuerySchema.parse(req.query);
  const scoringCriteria = await preferenceService.loadActiveScoringCriteria(currentUserId(res));
  const rankedLeads = await rankingService.listForExport(scoringCriteria, query);
  sendCsvAttachment(res, 'ranked-leads', renderRankedLeadsCsv(rankedLeads));
}

/** Thin HTTP adapter: validate input, call a service, write the response. */
export const leadsController = {
  listCompanies,
  getCompany,
  getPreferences,
  savePreferences,
  previewRankedLeads,
  listRankedLeads,
  exportRankedLeads,
};
