// src/routes/publications.ts
import { Router } from 'express';
import {
  getPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  uploadMiddleware,
  analyzeVideoOnly
} from '../controllers/publicationsController';

const router = Router();

router.get('/', getPublications);
router.get('/:id', getPublicationById);
router.post('/', uploadMiddleware, createPublication);
router.put('/:id', uploadMiddleware, updatePublication);
router.delete('/:id', deletePublication);
router.post('/analyze-video', uploadMiddleware, analyzeVideoOnly);

export default router;