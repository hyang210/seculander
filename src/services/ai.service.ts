// src/services/ai.service.ts
import { ITask, TaskModel } from '../models/task.model';
import mongoose from 'mongoose';
import redisClient from '../config/redis';

// MongoDB ObjectId를 사용하기 위해 정의
const ObjectId = mongoose.Types.ObjectId; 

// 기능 2 학습 루프: 지연 지수 피드백 및 모델 업데이트 (Redis 카운팅 적용)
export const updateModelBySnooze = async (userId: string, taskId: string, snoozeCount: number = 1) => {
    const redisSnoozeKey = `snooze_count:${taskId}`;
    const incrementBy = snoozeCount || 1;

    // Redis에 카운트 쌓아두고 주기적으로 DB에 동기화하기 위해 MongoDB 직접 업데이트는 주석 처리하거나 제거
    await TaskModel.findByIdAndUpdate(new ObjectId(taskId), { $inc: { snoozeCount: snoozeCount } }); 

    // Redis HASH (snooze_count:taskId)의 'count' 필드를 증가
    // newCount는 Redis에 저장된 총 스누즈 횟수
    const newCount = await redisClient.hincrby(redisSnoozeKey, 'count', incrementBy);
    
    // Redis 데이터 만료 시간 설정 (예: 7일 후 DB 동기화)
    // await redisClient.expire(redisSnoozeKey, 604800); // 7일 (초 단위)

    // Redis 총 횟수(newCount)를 사용하여 Penalty Weight 계산
    let penaltyWeight = 0;
    if (newCount >= 3) {
        penaltyWeight = 0.2; 
    } else if (newCount >= 1) {
        penaltyWeight = 0.05; 
    }

    console.log(`[AI SERVICE] Task: ${taskId}, Redis 지연 지수: ${newCount}, 적용 페널티: ${penaltyWeight}`);
    
    return true;
};


// 기능 2 로직: 미뤄진 업무를 자동 재배치 (Auto-Reschedule)
export const autoRescheduleTask = async (taskId: string, durationMinutes: number) => {
    // 1) Task 정보를 먼저 DB에서 읽어온다.
    const task = await TaskModel.findById(new ObjectId(taskId));

    if (!task) {
        throw new Error('해당 Task를 찾을 수 없습니다.');
    }

    // 2) 이 태스크에 필요한 최소 집중도 (필드가 없으면 70 사용)
    const requiredScore =
        (task as any).requiredFocusScore !== undefined
            ? (task as any).requiredFocusScore
            : 70;

    // 3) "원래 시작 시간"을 기준으로 잡기
    //    - 스키마에 어떤 필드를 쓰는지에 따라 우선순위로 사용
    let originalStart: Date;

    if ((task as any).start) {
        // 만약 Task에 start 필드를 쓰고 있다면 우선 사용
        originalStart = new Date((task as any).start);
    } else if ((task as any).startTime) {
        // 아니면 startTime 필드를 사용
        originalStart = new Date((task as any).startTime);
    } else {
        // 둘 다 없으면 일단 현재 시각으로 방어
        originalStart = new Date();
    }

    // 4) "미루기" 기준:
    //    ➜ 기존 시작 시간 + durationMinutes 이후부터만 재배치 후보로 본다.
    const startSearchTime = new Date(
        originalStart.getTime() + durationMinutes * 60000
    );

    console.log('[AI SERVICE] 기존 시작 시간:', originalStart.toISOString());
    console.log(
        '[AI SERVICE] 탐색 시작 시점(미루기 기준):',
        startSearchTime.toISOString()
    );

    // 캘린더 빈 시간 블록 및 Focus Score 예측 데이터 준비
    const mockFreeSlots = [
        { startTime: new Date('2025-11-27T20:30:00Z'), endTime: new Date('2025-11-27T23:00:00Z'), focusScore: 85 }, 
        { startTime: new Date('2025-11-28T09:00:00Z'), endTime: new Date('2025-11-28T11:00:00Z'), focusScore: 90 }, 
        { startTime: new Date('2025-11-28T14:00:00Z'), endTime: new Date('2025-11-28T16:00:00Z'), focusScore: 60 },
        { startTime: new Date('2025-12-05T09:30:00Z'), endTime: new Date('2025-12-05T12:00:00Z'), focusScore: 88 },
        { startTime: new Date('2025-12-11T14:00:00Z'), endTime: new Date('2025-12-11T16:30:00Z'), focusScore: 52 },
        { startTime: new Date('2025-12-01T10:00:00Z'), endTime: new Date('2025-12-01T13:00:00Z'), focusScore: 95 },
        { startTime: new Date('2025-12-18T16:30:00Z'), endTime: new Date('2025-12-18T18:00:00Z'), focusScore: 71 },
        { startTime: new Date('2025-12-24T08:00:00Z'), endTime: new Date('2025-12-24T09:30:00Z'), focusScore: 63 },
        { startTime: new Date('2025-12-03T11:00:00Z'), endTime: new Date('2025-12-03T14:00:00Z'), focusScore: 82 },
        { startTime: new Date('2025-12-15T13:30:00Z'), endTime: new Date('2025-12-15T15:30:00Z'), focusScore: 49 },
        { startTime: new Date('2025-12-29T17:00:00Z'), endTime: new Date('2025-12-29T19:00:00Z'), focusScore: 77 },
        { startTime: new Date('2025-12-08T09:00:00Z'), endTime: new Date('2025-12-08T11:30:00Z'), focusScore: 91 },
        { startTime: new Date('2025-12-22T14:30:00Z'), endTime: new Date('2025-12-22T17:00:00Z'), focusScore: 58 },
        { startTime: new Date('2025-12-07T10:30:00Z'), endTime: new Date('2025-12-07T12:30:00Z'), focusScore: 85 },
        { startTime: new Date('2025-12-14T15:00:00Z'), endTime: new Date('2025-12-14T17:30:00Z'), focusScore: 69 },
        { startTime: new Date('2025-12-25T11:00:00Z'), endTime: new Date('2025-12-25T13:00:00Z'), focusScore: 74 },
        { startTime: new Date('2025-12-02T13:00:00Z'), endTime: new Date('2025-12-02T15:00:00Z'), focusScore: 61 },
        { startTime: new Date('2025-12-19T08:30:00Z'), endTime: new Date('2025-12-19T10:30:00Z'), focusScore: 93 },
        { startTime: new Date('2025-12-31T16:00:00Z'), endTime: new Date('2025-12-31T18:00:00Z'), focusScore: 55 },
        { startTime: new Date('2025-12-06T14:00:00Z'), endTime: new Date('2025-12-06T16:00:00Z'), focusScore: 79 },
        { startTime: new Date('2025-12-12T09:00:00Z'), endTime: new Date('2025-12-12T11:00:00Z'), focusScore: 87 },
        { startTime: new Date('2025-12-20T11:30:00Z'), endTime: new Date('2025-12-20T13:30:00Z'), focusScore: 66 },
        { startTime: new Date('2025-12-28T15:30:00Z'), endTime: new Date('2025-12-28T17:30:00Z'), focusScore: 51 },
        { startTime: new Date('2025-12-04T10:00:00Z'), endTime: new Date('2025-12-04T12:30:00Z'), focusScore: 73 },
        { startTime: new Date('2025-12-10T15:30:00Z'), endTime: new Date('2025-12-10T17:30:00Z'), focusScore: 59 },
        { startTime: new Date('2025-12-01T14:00:00Z'), endTime: new Date('2025-12-01T16:00:00Z'), focusScore: 81 },
        { startTime: new Date('2025-12-18T09:00:00Z'), endTime: new Date('2025-12-18T11:00:00Z'), focusScore: 92 },
        { startTime: new Date('2025-12-23T11:00:00Z'), endTime: new Date('2025-12-23T13:00:00Z'), focusScore: 68 },
        { startTime: new Date('2025-12-03T16:30:00Z'), endTime: new Date('2025-12-03T18:00:00Z'), focusScore: 54 },
        { startTime: new Date('2025-12-16T10:30:00Z'), endTime: new Date('2025-12-16T12:30:00Z'), focusScore: 89 },
        { startTime: new Date('2025-12-30T13:00:00Z'), endTime: new Date('2025-12-30T15:00:00Z'), focusScore: 47 },
        { startTime: new Date('2025-12-09T08:00:00Z'), endTime: new Date('2025-12-09T10:30:00Z'), focusScore: 94 },
        { startTime: new Date('2025-12-21T14:30:00Z'), endTime: new Date('2025-12-21T16:30:00Z'), focusScore: 57 },
        { startTime: new Date('2025-12-07T13:00:00Z'), endTime: new Date('2025-12-07T15:30:00Z'), focusScore: 80 },
        { startTime: new Date('2025-12-14T10:00:00Z'), endTime: new Date('2025-12-14T12:00:00Z'), focusScore: 70 },
        { startTime: new Date('2025-12-26T15:00:00Z'), endTime: new Date('2025-12-26T17:00:00Z'), focusScore: 65 },
        { startTime: new Date('2025-12-02T09:30:00Z'), endTime: new Date('2025-12-02T11:30:00Z'), focusScore: 62 },
        { startTime: new Date('2025-12-19T14:00:00Z'), endTime: new Date('2025-12-19T16:00:00Z'), focusScore: 86 },
        { startTime: new Date('2025-12-31T09:00:00Z'), endTime: new Date('2025-12-31T11:00:00Z'), focusScore: 53 },
        { startTime: new Date('2025-12-06T10:30:00Z'), endTime: new Date('2025-12-06T12:30:00Z'), focusScore: 76 },
        { startTime: new Date('2025-12-12T15:00:00Z'), endTime: new Date('2025-12-12T17:00:00Z'), focusScore: 83 },
        { startTime: new Date('2025-12-20T17:00:00Z'), endTime: new Date('2025-12-20T19:00:00Z'), focusScore: 45 },
        { startTime: new Date('2025-12-28T08:30:00Z'), endTime: new Date('2025-12-28T10:30:00Z'), focusScore: 78 },
        { startTime: new Date('2025-12-05T14:00:00Z'), endTime: new Date('2025-12-05T16:00:00Z'), focusScore: 64 },
        { startTime: new Date('2025-12-11T09:00:00Z'), endTime: new Date('2025-12-11T11:00:00Z'), focusScore: 90 },
        { startTime: new Date('2025-12-01T17:00:00Z'), endTime: new Date('2025-12-01T19:00:00Z'), focusScore: 56 },
        { startTime: new Date('2025-12-17T11:30:00Z'), endTime: new Date('2025-12-17T13:30:00Z'), focusScore: 75 },
        { startTime: new Date('2025-12-24T14:00:00Z'), endTime: new Date('2025-12-24T16:00:00Z'), focusScore: 67 },
        { startTime: new Date('2025-12-04T08:30:00Z'), endTime: new Date('2025-12-04T10:00:00Z'), focusScore: 96 },
        { startTime: new Date('2025-12-15T16:00:00Z'), endTime: new Date('2025-12-15T18:00:00Z'), focusScore: 48 },
        { startTime: new Date('2025-12-29T10:00:00Z'), endTime: new Date('2025-12-29T12:00:00Z'), focusScore: 84 },
        { startTime: new Date('2025-12-08T15:00:00Z'), endTime: new Date('2025-12-08T17:00:00Z'), focusScore: 72 },
        { startTime: new Date('2025-12-22T09:30:00Z'), endTime: new Date('2025-12-22T11:30:00Z'), focusScore: 98 },
        { startTime: new Date('2025-12-07T16:00:00Z'), endTime: new Date('2025-12-07T18:00:00Z'), focusScore: 50 },
        { startTime: new Date('2025-12-13T10:00:00Z'), endTime: new Date('2025-12-13T12:00:00Z'), focusScore: 87 },
        { startTime: new Date('2025-12-25T14:30:00Z'), endTime: new Date('2025-12-25T16:30:00Z'), focusScore: 60 },
        { startTime: new Date('2025-12-03T10:00:00Z'), endTime: new Date('2025-12-03T12:00:00Z'), focusScore: 88 },
        { startTime: new Date('2025-12-20T08:00:00Z'), endTime: new Date('2025-12-20T10:00:00Z'), focusScore: 91 },
        { startTime: new Date('2025-12-30T17:00:00Z'), endTime: new Date('2025-12-30T19:00:00Z'), focusScore: 46 },
        { startTime: new Date('2025-12-06T15:30:00Z'), endTime: new Date('2025-12-06T17:30:00Z'), focusScore: 79 },
        { startTime: new Date('2025-12-17T09:00:00Z'), endTime: new Date('2025-12-17T11:00:00Z'), focusScore: 85 },
        { startTime: new Date('2025-12-27T11:00:00Z'), endTime: new Date('2025-12-27T13:00:00Z'), focusScore: 63 },
        { startTime: new Date('2025-12-16T14:00:00Z'), endTime: new Date('2025-12-16T16:00:00Z'), focusScore: 55 },
        { startTime: new Date('2025-12-01T08:00:00Z'), endTime: new Date('2025-12-01T09:30:00Z'), focusScore: 97 },
        { startTime: new Date('2025-12-02T14:30:00Z'), endTime: new Date('2025-12-02T16:30:00Z'), focusScore: 52 },
        { startTime: new Date('2025-12-03T13:00:00Z'), endTime: new Date('2025-12-03T15:00:00Z'), focusScore: 78 },
        { startTime: new Date('2025-12-04T16:00:00Z'), endTime: new Date('2025-12-04T18:00:00Z'), focusScore: 45 },
        { startTime: new Date('2025-12-05T11:00:00Z'), endTime: new Date('2025-12-05T13:30:00Z'), focusScore: 89 },
        { startTime: new Date('2025-12-06T09:30:00Z'), endTime: new Date('2025-12-06T11:30:00Z'), focusScore: 68 },
        { startTime: new Date('2025-12-07T14:00:00Z'), endTime: new Date('2025-12-07T16:00:00Z'), focusScore: 55 },
        { startTime: new Date('2025-12-08T10:30:00Z'), endTime: new Date('2025-12-08T12:30:00Z'), focusScore: 90 },
        { startTime: new Date('2025-12-09T15:00:00Z'), endTime: new Date('2025-12-09T17:00:00Z'), focusScore: 61 },
        { startTime: new Date('2025-12-10T11:30:00Z'), endTime: new Date('2025-12-10T13:30:00Z'), focusScore: 82 },
        { startTime: new Date('2025-12-11T16:00:00Z'), endTime: new Date('2025-12-11T18:00:00Z'), focusScore: 49 },
        { startTime: new Date('2025-12-12T08:30:00Z'), endTime: new Date('2025-12-12T10:30:00Z'), focusScore: 93 },
        { startTime: new Date('2025-12-13T13:00:00Z'), endTime: new Date('2025-12-13T15:00:00Z'), focusScore: 75 },
        { startTime: new Date('2025-12-14T17:00:00Z'), endTime: new Date('2025-12-14T19:00:00Z'), focusScore: 40 },
        { startTime: new Date('2025-12-15T10:00:00Z'), endTime: new Date('2025-12-15T12:00:00Z'), focusScore: 87 },
        { startTime: new Date('2025-12-16T14:30:00Z'), endTime: new Date('2025-12-16T16:30:00Z'), focusScore: 66 },
        { startTime: new Date('2025-12-17T11:00:00Z'), endTime: new Date('2025-12-17T13:00:00Z'), focusScore: 80 },
        { startTime: new Date('2025-12-18T15:30:00Z'), endTime: new Date('2025-12-18T17:30:00Z'), focusScore: 58 },
        { startTime: new Date('2025-12-19T09:00:00Z'), endTime: new Date('2025-12-19T11:30:00Z'), focusScore: 94 },
        { startTime: new Date('2025-12-20T12:00:00Z'), endTime: new Date('2025-12-20T14:00:00Z'), focusScore: 70 },
        { startTime: new Date('2025-12-21T16:30:00Z'), endTime: new Date('2025-12-21T18:30:00Z'), focusScore: 43 },
        { startTime: new Date('2025-12-22T10:00:00Z'), endTime: new Date('2025-12-22T12:00:00Z'), focusScore: 95 },
        { startTime: new Date('2025-12-23T14:00:00Z'), endTime: new Date('2025-12-23T16:00:00Z'), focusScore: 65 },
        { startTime: new Date('2025-12-24T11:30:00Z'), endTime: new Date('2025-12-24T13:30:00Z'), focusScore: 83 },
        { startTime: new Date('2025-12-25T15:00:00Z'), endTime: new Date('2025-12-25T17:00:00Z'), focusScore: 50 },
        { startTime: new Date('2025-12-26T08:00:00Z'), endTime: new Date('2025-12-26T10:30:00Z'), focusScore: 98 },
        { startTime: new Date('2025-12-27T13:30:00Z'), endTime: new Date('2025-12-27T15:30:00Z'), focusScore: 72 },
        { startTime: new Date('2025-12-28T16:00:00Z'), endTime: new Date('2025-12-28T18:00:00Z'), focusScore: 41 },
        { startTime: new Date('2025-12-29T10:30:00Z'), endTime: new Date('2025-12-29T12:30:00Z'), focusScore: 88 },
        { startTime: new Date('2025-12-30T14:00:00Z'), endTime: new Date('2025-12-30T16:00:00Z'), focusScore: 64 },
        { startTime: new Date('2025-12-31T11:00:00Z'), endTime: new Date('2025-12-31T13:00:00Z'), focusScore: 81 },
        { startTime: new Date('2025-12-01T15:00:00Z'), endTime: new Date('2025-12-01T17:00:00Z'), focusScore: 56 },
        { startTime: new Date('2025-12-02T09:00:00Z'), endTime: new Date('2025-12-02T11:00:00Z'), focusScore: 92 },
        { startTime: new Date('2025-12-03T17:30:00Z'), endTime: new Date('2025-12-03T19:30:00Z'), focusScore: 47 },
        { startTime: new Date('2025-12-04T12:00:00Z'), endTime: new Date('2025-12-04T14:00:00Z'), focusScore: 79 },
        { startTime: new Date('2025-12-05T15:30:00Z'), endTime: new Date('2025-12-05T17:30:00Z'), focusScore: 60 },
        { startTime: new Date('2025-12-06T11:00:00Z'), endTime: new Date('2025-12-06T13:00:00Z'), focusScore: 86 },
        { startTime: new Date('2025-12-07T08:30:00Z'), endTime: new Date('2025-12-07T10:30:00Z'), focusScore: 91 },
        { startTime: new Date('2025-12-08T14:00:00Z'), endTime: new Date('2025-12-08T16:00:00Z'), focusScore: 53 },
        { startTime: new Date('2025-12-09T11:30:00Z'), endTime: new Date('2025-12-09T13:30:00Z'), focusScore: 76 },
        { startTime: new Date('2025-12-10T16:30:00Z'), endTime: new Date('2025-12-10T18:30:00Z'), focusScore: 44 },
        { startTime: new Date('2025-12-11T09:00:00Z'), endTime: new Date('2025-12-11T11:00:00Z'), focusScore: 96 },
        { startTime: new Date('2025-12-12T14:00:00Z'), endTime: new Date('2025-12-12T16:00:00Z'), focusScore: 69 },
        { startTime: new Date('2025-12-13T10:30:00Z'), endTime: new Date('2025-12-13T12:30:00Z'), focusScore: 84 },
        { startTime: new Date('2025-12-14T15:00:00Z'), endTime: new Date('2025-12-14T17:00:00Z'), focusScore: 51 },
        { startTime: new Date('2025-12-15T08:00:00Z'), endTime: new Date('2025-12-15T10:00:00Z'), focusScore: 99 },
        { startTime: new Date('2025-12-16T12:00:00Z'), endTime: new Date('2025-12-16T14:00:00Z'), focusScore: 71 },
        { startTime: new Date('2025-12-17T15:30:00Z'), endTime: new Date('2025-12-17T17:30:00Z'), focusScore: 59 },
        { startTime: new Date('2025-12-18T10:00:00Z'), endTime: new Date('2025-12-18T12:00:00Z'), focusScore: 85 },
        { startTime: new Date('2025-12-19T14:30:00Z'), endTime: new Date('2025-12-19T16:30:00Z'), focusScore: 62 },
        { startTime: new Date('2025-12-20T16:00:00Z'), endTime: new Date('2025-12-20T18:00:00Z'), focusScore: 42 },
        { startTime: new Date('2025-12-21T11:00:00Z'), endTime: new Date('2025-12-21T13:00:00Z'), focusScore: 90 },
        { startTime: new Date('2025-12-22T15:30:00Z'), endTime: new Date('2025-12-22T17:30:00Z'), focusScore: 67 },
        { startTime: new Date('2025-12-23T09:00:00Z'), endTime: new Date('2025-12-23T11:00:00Z'), focusScore: 83 },
        { startTime: new Date('2025-12-24T12:30:00Z'), endTime: new Date('2025-12-24T14:30:00Z'), focusScore: 57 },
        { startTime: new Date('2025-12-25T10:00:00Z'), endTime: new Date('2025-12-25T12:00:00Z'), focusScore: 93 },
        { startTime: new Date('2025-12-26T14:00:00Z'), endTime: new Date('2025-12-26T16:00:00Z'), focusScore: 60 },
        { startTime: new Date('2025-12-27T17:00:00Z'), endTime: new Date('2025-12-27T19:00:00Z'), focusScore: 48 },
        { startTime: new Date('2025-12-28T11:30:00Z'), endTime: new Date('2025-12-28T13:30:00Z'), focusScore: 73 },
        { startTime: new Date('2025-12-29T16:00:00Z'), endTime: new Date('2025-12-29T18:00:00Z'), focusScore: 54 },
        { startTime: new Date('2025-12-30T09:30:00Z'), endTime: new Date('2025-12-30T11:30:00Z'), focusScore: 86 },
        { startTime: new Date('2025-12-31T15:00:00Z'), endTime: new Date('2025-12-31T17:00:00Z'), focusScore: 64 }
    ];
    
    // 최적의 시간 블록 선택 알고리즘 (가장 빠르고 + 집중도 충족)
    let bestSlot: {
        startTime: Date;
        endTime: Date;
        focusScore: number;
    } | null = null;
    
    // 시간순 정렬 (가장 빠른 슬롯부터 확인)
    mockFreeSlots.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

   for (const slot of mockFreeSlots) {
        console.log(
            '[AI SERVICE] 후보 슬롯:',
            slot.startTime.toISOString(),
            '~',
            slot.endTime.toISOString(),
            'focus =',
            slot.focusScore
        );

        // ① 탐색 시작 시점(= 기존 시작시간 + duration)보다 빠른 슬롯은 제외
        if (slot.startTime.getTime() < startSearchTime.getTime()) {
            console.log('  -> 기존 시작시간 이후가 아니라서 스킵');
            continue;
        }

        const slotDurationMs =
            slot.endTime.getTime() - slot.startTime.getTime();
        const slotDurationMins = slotDurationMs / (1000 * 60);

        // ② 슬롯 길이가 우리가 필요한 durationMinutes보다 짧으면 패스
        if (slotDurationMins < durationMinutes) {
            console.log('  -> 슬롯 길이가 부족해서 스킵');
            continue;
        }

        // ③ 집중도 조건을 만족하지 못하면 패스
        if (slot.focusScore < requiredScore) {
            console.log(
                '  -> 집중도 부족으로 스킵 (필요:',
                requiredScore,
                ')'
            );
            continue;
        }

        // ④ 여기까지 통과하면 이 슬롯을 선택하고 반복 종료
        bestSlot = slot;
        console.log('  -> 이 슬롯을 선택!');
        break;
    }

    if (!bestSlot) {
        // "기존 시작 시간 이후"에, duration & 집중도 조건을 만족하는 슬롯이 없을 때
        throw new Error(
            '재배치할 수 있는 최적의 시간 블록을 찾지 못했습니다. (집중도 또는 시간 부족)'
        );
    }

    // 7) 선택된 슬롯의 시작시간을 기준으로 durationMinutes 만큼만 사용
    const newEndTime = new Date(
        bestSlot.startTime.getTime() + durationMinutes * 60000
    );

    // 8) MongoDB에 새 시간으로 업데이트
    //    - 여기서는 Task 문서에 start/end 필드를 쓴다고 가정 (네 기존 코드 유지)
    await TaskModel.findByIdAndUpdate(
        new ObjectId(taskId),
        {
            start: bestSlot.startTime,
            end: newEndTime,
            isScheduled: true,
            isSnoozed: false,
        },
        { new: true }
    );

    console.log(
        '[AI SERVICE] 재배치 완료:',
        bestSlot.startTime.toISOString(),
        '~',
        newEndTime.toISOString()
    );

    // 9) 프론트에 돌려줄 데이터
    return {
        taskId,
        start: bestSlot.startTime.toISOString(),
        end: newEndTime.toISOString(),
        assignedFocusScore: bestSlot.focusScore,
    };
};