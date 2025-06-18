import { Router } from 'express';
import {
  getAccountMetrics,
  getLatestAccountMetrics,
  createAccountMetrics,
  getAccountMetricsByPeriod
} from '../controllers/accountMetricsController';

const router = Router();

router.get('/', getAccountMetrics);
router.get('/latest', getLatestAccountMetrics);
router.get('/period', getAccountMetricsByPeriod);
router.post('/', createAccountMetrics);

export default router;