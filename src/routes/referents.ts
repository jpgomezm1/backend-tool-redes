import { Router } from 'express';
import {
  getReferents,
  getReferentById,
  createReferent,
  updateReferent,
  deleteReferent,
  getReferentsByNiche
} from '../controllers/referentsController';

const router = Router();

router.get('/', getReferents);
router.get('/niche/:niche', getReferentsByNiche);
router.get('/:id', getReferentById);
router.post('/', createReferent);
router.put('/:id', updateReferent);
router.delete('/:id', deleteReferent);

export default router;