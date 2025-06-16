import { Router } from 'express';
import {
  getOverview,
  getHashtagAnalysis,
  getContentTypeAnalysis,
  getPerformanceMetrics
} from '../controllers/analyticsController';

const router = Router();

router.get('/overview', getOverview);
router.get('/hashtags', getHashtagAnalysis);
router.get('/content-types', getContentTypeAnalysis);
router.get('/performance', getPerformanceMetrics);

export default router;