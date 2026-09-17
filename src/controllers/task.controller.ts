// src/controllers/task.controller.ts
import { Request, Response } from 'express';
import { TaskModel } from '../models/task.model';

export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      name,
      requiredFocusScore,
      startTime,
      endTime,
    } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: 'userId와 name은 필수입니다.',
      });
    }

    const task = await TaskModel.create({
      userId,
      name,
      requiredFocusScore: requiredFocusScore ?? 60,
      startTime,
      endTime,
      snoozeCount: 0,
      isCompleted: false,
      dependencies: [],
      isScheduled: true,
    });

    return res.status(201).json({
      success: true,
      task,
    });
  } catch (err: any) {
    console.error('Task 생성 실패:', err);
    return res.status(500).json({
      success: false,
      message: err.message || '서버 오류로 Task 생성에 실패했습니다.',
    });
  }
};
