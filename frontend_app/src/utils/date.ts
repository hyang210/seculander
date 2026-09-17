import {
  startOfMonth as fnsStartOfMonth,
  endOfMonth as fnsEndOfMonth,
  startOfWeek,
  endOfWeek,
  addDays as fnsAddDays,
  isSameMonth,
  isSameDay,
  format,
  parseISO as fnsParseISO,
  isBefore,
  isAfter,
} from 'date-fns';

/** ---------- 기본 포맷 도우미 ---------- */
export const fmt = (d: Date, f: string) => format(d, f);

/** ---------- date-fns 래핑: 외부에서 쓰도록 export ---------- */
export const startOfMonth = (d: Date) => fnsStartOfMonth(d);
export const endOfMonth   = (d: Date) => fnsEndOfMonth(d);
export const addDays      = (d: Date, n: number) => fnsAddDays(d, n);
export const parseISO     = (iso: string) => fnsParseISO(iso);

/** ---------- 달력 그리드(6x7) ---------- */
export const getMonthGrid = (current: Date) => {
  const mStart = startOfMonth(current);
  const mEnd   = endOfMonth(current);
  const gStart = startOfWeek(mStart, { weekStartsOn: 0 }); // 일요일 시작
  const gEnd   = endOfWeek(mEnd,   { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = gStart;
  while (day <= gEnd) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
};

/** ---------- 비교/표시 유틸 ---------- */
export const sameMonth = (a: Date, b: Date) => isSameMonth(a, b);
export const sameDay   = (a: Date, b: Date) => isSameDay(a, b);
export const toISODate   = (d: Date) => format(d, 'yyyy-MM-dd');
export const toDisplayHM = (d: Date) => format(d, 'h:mm a');

/** 주어진 날짜가 [start, end] 구간(하루 단위)에 포함되는지 */
export const dateInEventSpan = (date: Date, start: Date, end: Date) => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const dayEnd   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return !(isAfter(dayStart, end) || isBefore(dayEnd, start));
};

/** ---------- Day 뷰용 위치 계산 ---------- */
export const minutesSinceStartOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** 이벤트 겹침 레이아웃(간단 그리디: 레인 할당) */
export const layoutOverlaps = (events: { start: Date; end: Date; id: string }[]) => {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const lanes: { end: number }[] = [];
  const placed: Record<string, number> = {};

  sorted.forEach(ev => {
    let laneIndex = lanes.findIndex(l => l.end <= ev.start.getTime());
    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({ end: ev.end.getTime() });
    } else {
      lanes[laneIndex].end = ev.end.getTime();
    }
    placed[ev.id] = laneIndex;
  });

  return { laneOf: placed, laneCount: lanes.length };
};

/** ---------- 간트(카테고리 타임라인)용 헬퍼 ---------- */
export const daysBetweenInclusive = (a: Date, b: Date) =>
  Math.floor(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  ) + 1;

/** [s,e] 구간을 [min,max] 범위로 잘라서 반환 */
export const clampToRange = (s: Date, e: Date, min: Date, max: Date): [Date, Date] => {
  const left  = s < min ? min : s;
  const right = e > max ? max : e;
  return [left, right];
};
