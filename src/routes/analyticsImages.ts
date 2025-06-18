import { Router } from 'express';
import {
  analyzeProfileImages,
  analyzeViewerImages,
  analyzeFollowerImages,
  uploadImagesMiddleware
} from '../controllers/analyticsImageController';

const router = Router();

router.post('/profile', uploadImagesMiddleware, analyzeProfileImages);
router.post('/viewers', uploadImagesMiddleware, analyzeViewerImages);
router.post('/followers', uploadImagesMiddleware, analyzeFollowerImages);

export default router;