import { Router } from 'express';
import {
  getPlannedContent,
  getPlannedContentById,
  createPlannedContent,
  updatePlannedContent,
  deletePlannedContent,
  getPlannedContentByStatus
} from '../controllers/plannedContentController';

const router = Router();

router.get('/', getPlannedContent);
router.get('/status/:status', getPlannedContentByStatus);
router.get('/:id', getPlannedContentById);
router.post('/', createPlannedContent);
router.put('/:id', updatePlannedContent);
router.delete('/:id', deletePlannedContent);

export default router;