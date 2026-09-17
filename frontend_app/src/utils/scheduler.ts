import { CalendarEvent, Priority } from '../types'; // types 경로 확인 필요
import { parseISO, isBefore, isAfter, addMinutes, set, format } from 'date-fns';

interface TimeSlot {
  start: Date;
  end: Date;
  averageScore: number;
}

/**
 * 주어진 시간 구간(start~end)의 평균 집중도 점수를 계산
 */
const calculateScore = (start: Date, end: Date, hourlyScores: number[]): number => {
  let total = 0;
  let count = 0;
  let current = start;

  while (isBefore(current, end)) {
    const hour = current.getHours();
    // hourlyScores[hour]가 없으면 기본값 50
    total += hourlyScores[hour] ?? 50;
    count++;
    current = addMinutes(current, 60); // 1시간 단위로 계산
  }
  
  return count === 0 ? 0 : total / count;
};

/**
 * 메인 함수: 최적의 시간 찾기
 */
export const findBestTimeSlot = (
  targetDateStr: string,      // '2025-11-20'
  durationMinutes: number,    // 예: 60분
  priority: Priority,         // 'High' | 'Medium' | 'Low'
  dailyEvents: CalendarEvent[], // 그 날짜의 기존 일정들
  focusScores: number[]       // 0~23시 집중도 점수 배열
): { start: string, end: string } | null => {

  // 1. 탐색 범위 설정 (예: 오전 9시 ~ 밤 10시)
  const baseDate = parseISO(targetDateStr);
  const dayStart = set(baseDate, { hours: 9, minutes: 0, seconds: 0 });
  const dayEnd = set(baseDate, { hours: 22, minutes: 0, seconds: 0 });

  const candidates: TimeSlot[] = [];
  let cursor = dayStart;

  // 2. 30분 단위로 슬롯 탐색
  while (true) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    if (isAfter(slotEnd, dayEnd)) break;

    // 기존 일정과 겹치는지 확인
    const isOverlapping = dailyEvents.some(ev => {
      const evStart = parseISO(ev.start);
      const evEnd = parseISO(ev.end);
      // (일정 시작 < 기존 끝) AND (일정 끝 > 기존 시작) = 겹침
      return isBefore(cursor, evEnd) && isAfter(slotEnd, evStart);
    });

    // 겹치지 않으면 후보에 등록
    if (!isOverlapping) {
      const score = calculateScore(cursor, slotEnd, focusScores);
      candidates.push({ start: cursor, end: slotEnd, averageScore: score });
    }

    cursor = addMinutes(cursor, 30); // 30분씩 이동하며 탐색
  }

  if (candidates.length === 0) return null;

  // 3. 점수 높은 순으로 정렬
  candidates.sort((a, b) => b.averageScore - a.averageScore);

  // 4. 중요도(Priority)에 따른 선택 전략
  let selected: TimeSlot;

  switch (priority) {
    case 'High':
      // 상위 1등 (가장 집중 잘 되는 시간)
      selected = candidates[0];
      break;
    case 'Medium':
      // 상위 30% ~ 50% 정도의 적당한 시간 (너무 좋은 시간은 아껴둠)
      const midIdx = Math.floor(candidates.length * 0.4); 
      selected = candidates[Math.min(midIdx, candidates.length - 1)];
      break;
    case 'Low':
      // 하위권 (집중도 낮은 시간, 뒤쪽에서 선택)
      selected = candidates[Math.max(0, candidates.length - 2)];
      break;
    default:
      selected = candidates[0];
  }

  return {
    start: format(selected.start, 'HH:mm'),
    end: format(selected.end, 'HH:mm'),
  };
};