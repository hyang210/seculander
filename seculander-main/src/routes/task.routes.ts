// src/routes/task.routes.ts
import express from 'express';
import { createTask } from '../controllers/task.controller';

const router = express.Router();

// POST /api/tasks
router.post('/', createTask);

export default router;
