import { CalendarEvent, Category, ProjectDraft, ProjectTaskDraft } from '../types';
import { addMinutes, addDays, isAfter, set, getHours, startOfDay, isBefore } from 'date-fns';

/**
 * 업무 시간 설정 (예: 오전 9시 ~ 오후 6시)
 * 이 시간 내에만 일정을 배치하도록 설정합니다.
 */
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 22;

/**
 * 1. 위상 정렬 (Topological Sort)
 * 의존성이 있는 태스크가 먼저 오도록 순서를 정렬합니다.
 * forLongtermProject.ts의 arrange() 로직을 대체합니다.
 */
function sortTasksByDependency(tasks: ProjectTaskDraft[]): ProjectTaskDraft[] {
  const sorted: ProjectTaskDraft[] = [];
  const visited = new Set<string>();
  const tempTasks = [...tasks];

  // 의존성 그래프 구축 X -> 간단하게 의존성이 없거나, 의존성이 이미 sorted에 있는 것부터 추출
  // 순환참조가 없다고 가정하고, 간단한 반복문으로 처리
  let hasChange = true;
  while (tempTasks.length > 0 && hasChange) {
    hasChange = false;
    for (let i = 0; i < tempTasks.length; i++) {
      const task = tempTasks[i];
      // 의존성이 없거나(null), 의존성 ID가 이미 처리된 목록(sorted)에 있다면 배치 가능
      if (!task.dependencyId || visited.has(task.dependencyId)) {
        sorted.push(task);
        visited.add(task.id);
        tempTasks.splice(i, 1);
        i--;
        hasChange = true;
      }
    }
  }

  // 순환 참조 등으로 남은 것이 있다면 강제로 추가 (에러 방지)
  if (tempTasks.length > 0) {
    console.warn("순환 참조 혹은 알 수 없는 의존성 발견. 임의 순서로 배치합니다.");
    return [...sorted, ...tempTasks];
  }

  return sorted;
}

/**
 * 날짜 유효성 보정 (업무 시간 외라면 다음 날 업무 시작 시간으로 이동)
 */
function adjustToWorkHour(date: Date): Date {
  const h = getHours(date);
  if (h >= WORK_END_HOUR) {
    // 퇴근 시간 이후면 -> 다음날 출근 시간
    const nextDay = addDays(date, 1);
    return set(nextDay, { hours: WORK_START_HOUR, minutes: 0, seconds: 0 });
  }
  if (h < WORK_START_HOUR) {
    // 출근 전이면 -> 당일 출근 시간
    return set(date, { hours: WORK_START_HOUR, minutes: 0, seconds: 0 });
  }
  return date;
}

/**
 * 2. 스케줄링 시뮬레이션
 * 주어진 gap(분 단위)을 적용했을 때 마감일을 지키는지 확인하고, 이벤트를 생성합니다.
 */
function simulateSchedule(
  tasks: ProjectTaskDraft[],
  projectTitle: string,
  deadline: Date,
  gapMinutes: number
): CalendarEvent[] | null {
  
  const events: CalendarEvent[] = [];
  // 시작은 "내일 오전 9시"로 가정 (혹은 현재 시간 기반)
  let cursor = set(addDays(new Date(), 1), { hours: WORK_START_HOUR, minutes: 0, seconds: 0 });

  // 첫 번째 태스크 배치 전 시간 보정
  cursor = adjustToWorkHour(cursor);

  // 이전에 완료된 태스크의 종료 시간을 저장 (ID -> Date)
//   const endTimes = new Map<string, Date>();

  for (const task of tasks) {
    // 1) 시작 시간 결정
    let start = cursor;

    // 의존성이 있다면: 의존성 태스크 종료 시간 + gap vs 현재 커서 중 늦은 것
    // if (task.dependencyId && endTimes.has(task.dependencyId)) {
    //   const depEnd = endTimes.get(task.dependencyId)!;
    //   // Gap 적용 : Gap이 "하루(1440분)"인 경우 '다음날 아침'으로 이동
    //   let candidateStart = gapMinutes==1440 ? set(addDays(start, 1), { hours: WORK_START_HOUR, minutes: 0, seconds: 0 }) : addMinutes(depEnd, gapMinutes);
      
    //   candidateStart = adjustToWorkHour(candidateStart);

    //   if (isAfter(candidateStart, start)) {
    //     start = candidateStart;
    //   }
    // }

    // 2) 종료 시간 계산
    const durationMin = parseInt(task.duration, 10) || 60; // 기본 60분
    let end = addMinutes(start, durationMin);

    // 업무 종료 시간을 넘기면 다음 날로 통째로 이동
    if (getHours(end) > WORK_END_HOUR) {
        start = set(addDays(start, 1), { hours: WORK_START_HOUR, minutes: 0, seconds: 0 });
        end = addMinutes(start, durationMin);
    }

    // 3) 마감일 초과 체크
    if (isAfter(end, deadline)) {
      return null; // 실패: 이 Gap으로는 마감일을 맞출 수 없음
    }

    // 4) 이벤트 생성
    events.push({
      id: task.id, // 임시 ID (나중에 DB 저장 시 교체됨)
      title: task.name,
      category: projectTitle as Category,
      start: start.toISOString(),
      end: end.toISOString(),
      completed: false,
      priority: 'Medium'
    });

    // 다음 태스크를 위한 기본 커서는 현재 태스크 끝난 직후
    cursor = adjustToWorkHour(addMinutes(end, gapMinutes)); 
  }

  return events;
}

/**
 * 3. 메인 배치 함수
 * 전략: 하루 -> 3시간 -> 2시간 -> 1시간 -> 0시간 순으로 시도
 */
export function generateProjectSchedule(draft: ProjectDraft): CalendarEvent[] {
  const sortedTasks = sortTasksByDependency(draft.tasks);
  
  // 마감일 파싱 (마감일의 23:59:59까지로 설정)
  const deadlineDate = set(new Date(draft.deadline), { hours: 23, minutes: 59, seconds: 59 });

  // 시도할 간격들 (분 단위): 1일(1440분), 3시간(180분), 2시간(120분), 1시간(60분), 0분
  // *참고: 업무시간 외 시간도 포함되므로 1일 간격은 실제 캘린더상 다음날 배치를 의미하게 됨
  const gaps = [1440, 180, 120, 60, 0];

  for (const gap of gaps) {
    const result = simulateSchedule(sortedTasks, draft.title, deadlineDate, gap);
    if (result) {
        console.log(`성공: 간격 ${gap}분으로 배치 완료`);
        return result;
    }
  }

  // 모든 간격 실패 시: 가장 타이트한(0분) 일정으로 강제 반환하거나, 에러를 던질 수 있음.
  // 여기서는 경고 로그 후 0분 간격 결과 반환 (마감일 넘기더라도 생성은 함)
  console.warn("경고: 마감일 내에 모든 태스크를 배치할 수 없습니다. 최소 간격으로 배치합니다.");
  const forcedResult = simulateSchedule(sortedTasks, draft.title, addDays(deadlineDate, 365), 0); // 마감일 무한대로 두고 배치
  return forcedResult || [];
}