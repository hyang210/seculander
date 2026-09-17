import express from 'express';
import * as focusController from '../controllers/focus.controller';
import { getFocusScore } from '../controllers/focus_score';

const router = express.Router();

// GET /api/focus/score/:userId
router.get('/score/:userId', getFocusScore);

// POST /api/focus/update-model
router.post('/snooze', focusController.updateFocusScoreModel);

export default router;