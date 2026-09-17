// src/controllers/focus.controller.ts
import { Request, Response } from 'express';
import { TaskModel } from '../models/task.model';
import { updateModelBySnooze, autoRescheduleTask } from '../services/ai.service'; 

// func2. 미루기 요청 처리, 모델 학습 및 자동 재배치 실행
export const updateFocusScoreModel = async (req: Request, res: Response) => {
    // 클라이언트로부터 데이터 수신 (durationMinutes는 재배치 로직에 필수)
    //snoozeCount는 서버가 관리하므로 클라이언트 입력에서 제거
    const { userId, taskId, durationMinutes } = req.body; 

    // 유효성 검사 
    if (!userId || !taskId || !durationMinutes) { //snoozecount에 대한 유효성 검사 제거
        return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다. (userId, taskId, durationMinutes)' });
    }

    try {
         // 1) Task 존재 여부만 확인
        const task = await TaskModel.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: '태스크를 찾을 수 없거나 업데이트에 실패했습니다.',
        });
    }

    // 2) 지연 지수 + Redis 학습 로직 (Mongo snoozeCount 증가는 ai.service에서 처리)
    await updateModelBySnooze(userId, taskId, 1);
    console.log(`[Controller] AI 모델 학습 완료 (Task: ${taskId})`);

    // 3) 자동 재배치 로직 실행
    const rescheduledTask = await autoRescheduleTask(taskId, durationMinutes);

    return res.status(200).json({
      success: true,
      message: '업무가 미뤄지고 새로운 시간으로 자동 재배치되었습니다.',
      rescheduledTask,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('Snooze/Reschedule 실패:', errorMessage);

    const statusCode = errorMessage.includes(
      '최적의 시간 블록을 찾지 못했습니다.',
    )
      ? 409
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: `자동 재배치 실패: ${errorMessage}`,
    });
  }
};
