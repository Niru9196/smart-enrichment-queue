import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller.js';
import { queueController } from '../controllers/queue.controller.js';
import { systemController } from '../controllers/system.controller.js';
import { attachDemoUser } from '../middleware/demo-user.js';
import { exportRateLimit } from '../middleware/rate-limit.js';

export const router = Router();

router.get('/health', systemController.getLiveness);
router.get('/health/ready', systemController.getReadiness);

router.use(attachDemoUser);

router.get('/meta', systemController.getLeadMetadata);

router.get('/companies', leadsController.listCompanies);
router.get('/companies/:id', leadsController.getCompany);

router.get('/preferences', leadsController.getPreferences);
router.put('/preferences', leadsController.savePreferences);

router.post('/scoring/preview', leadsController.previewRankedLeads);
router.get('/leads/ranked', leadsController.listRankedLeads);
router.get('/leads/export', exportRateLimit, leadsController.exportRankedLeads);

router.get('/queue', queueController.listQueue);
router.post('/queue/items', queueController.addQueueItems);
router.patch('/queue/items/:id', queueController.updateQueueItem);
router.delete('/queue/items/:id', queueController.removeQueueItem);
router.post('/queue/enrich', queueController.enrichQueue);
router.get('/queue/export', exportRateLimit, queueController.exportQueue);
