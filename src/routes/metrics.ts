import { Router } from 'express';
import { addMetrics, getMetricsHistory } from '../controllers/metricsController';

const router = Router();

router.post('/:publicationId', addMetrics);
router.get('/:publicationId/history', getMetricsHistory);

export default router;