// src/api/taskApi.ts
import { Platform } from 'react-native';
import { CalendarEvent } from '../types';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

const CURRENT_USER_ID = 'test-user-01'; // 나중에 실제 로그인 정보로 교체

// Priority → requiredFocusScore 매핑 (적당히)
const priorityToScore = (priority?: CalendarEvent['priority']) => {
  if (priority === 'High') return 80;
  if (priority === 'Low') return 40;
  return 60; // Medium or undefined
};

export const createTaskForEvent = async (
  e: Omit<CalendarEvent, 'id'>
): Promise<string> => {
  const body = {
    userId: CURRENT_USER_ID,
    name: e.title,
    requiredFocusScore: priorityToScore(e.priority),
    startTime: e.start,
    endTime: e.end,
  };

  const res = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || `Task 생성 실패 (status: ${res.status})`);
  }

  // MongoDB의 _id를 반환
  return data.task._id as string;
};