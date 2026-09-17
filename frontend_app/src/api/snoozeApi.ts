// src/api/snoozeApi.ts

import { Platform } from 'react-native';

// 백엔드 주소 설정 (focusApi.ts와 동일하게 설정)
const BASE_URL = Platform.select({
    android: 'http://10.0.2.2:3000',
    ios: 'http://localhost:3000',
    default: 'http://localhost:3000',
});

// 백엔드로부터 응답받을 재배치된 태스크의 타입 (간단하게 정의)
export interface RescheduledTask {
    _id: string; // taskId와 동일
    title: string;
    start: string; // ISO Date String
    end: string;   // ISO Date String
    snoozeCount: number;
    // 기타 필요한 필드...
}

// 스누즈 요청의 결과 타입
export interface SnoozeResponse {
    success: boolean;
    message: string;
    rescheduledTask: RescheduledTask;
}

/**
 * 미루기(Snooze) 요청을 처리하고, AI 모델 학습 및 자동 재배치를 실행합니다.
 * * @param userId - 현재 로그인된 사용자 ID
 * @param taskId - 미루고자 하는 태스크의 ID
 * @param durationMinutes - 미루는 시간 (분 단위), 재배치 로직에 사용됨
 * @returns SnoozeResponse (재배치된 태스크 정보 포함)
 */
export const requestSnooze = async (userId: string, taskId: string, durationMinutes: number): Promise<SnoozeResponse> => {
    
    const payload = {
        userId,
        taskId, 
        durationMinutes,
    };
    
    try {
        const response = await fetch(`${BASE_URL}/api/focus/snooze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            // 서버에서 보낸 에러 메시지(400, 404, 409, 500)를 포함하여 예외 발생
            const errorMessage = data.message || `HTTP 오류: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return data as SnoozeResponse;

    } catch (error) {
        // 개발 중 로그만 조용히 찍고, RN의 빨간 화면은 안 뜨게 하기 위해 console.log 사용
        console.log('Snooze Request Error:', error);
        // WeeklyPage의 try/catch에서 처리할 수 있도록 에러는 그대로 던진다
        throw error; 
    }
};