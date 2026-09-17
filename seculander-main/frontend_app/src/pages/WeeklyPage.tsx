import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { CalendarEvent, Category } from '../types';
import { fetchFocusData } from '../api/focusApi';
import { requestSnooze } from '../api/snoozeApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Weekly'> & {
  events: CalendarEvent[];
  onDeleteEvent?: (id: string) => void;
  onUpdateEvent?: (id: string, start: string, end: string) => void;
};

/* ---------------- helpers ---------------- */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const START_HOUR = 0;  // 00시
const END_HOUR = 23;   // 23시
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
const HOUR_HEIGHT = 60;
const TIME_COL_WIDTH = 50;

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const getWeekDays = (baseDate: Date) => {
  const startOfWeek = new Date(baseDate);
  const day = baseDate.getDay(); // 0(일)~6(토)
  startOfWeek.setDate(baseDate.getDate() - day); // 이번 주 일요일
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
};

const colorByCat = (c: Category) => {
  switch (c) {
    case 'Work':
      return '#fde68a';
    case 'Personal':
      return '#bfdbfe';
    case 'Family':
      return '#bbf7d0';
    case 'Study':
      return '#ddd6fe';
    default:
      return '#e5e7eb';
  }
};

const colorByFocus = (score: number) => {
  const t = Math.max(0, Math.min(100, score)) / 100;
  if (t > 0.8) return '#f472b6';
  if (t > 0.6) return '#f9a8d4';
  if (t > 0.4) return '#fbcfe8';
  if (t > 0.2) return '#fce7f3';
  return '#fdf2f8';
};

// 이벤트 원래 duration 유지용
const calcDurationMinutes = (startISO: string, endISO: string): number => {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const diff = (e.getTime() - s.getTime()) / 60000;
  if (!Number.isFinite(diff) || diff <= 0) return 60;
  return Math.max(30, diff);
};

/* ---------------- component ---------------- */
export default function WeeklyPage({
  navigation,
  events,
  onDeleteEvent,
  onUpdateEvent,
}: Props) {
  const [baseDate, setBaseDate] = useState(new Date());
  const [focusScores, setFocusScores] = useState<number[]>(new Array(24).fill(50));

  // 실제 서비스에서는 auth context 등에서 가져오면 됨
  const CURRENT_USER_ID = 'test-user-01';

  // 1. 이번 주 7일
  const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate]);

  // 2. 이번 주에 걸쳐 있는 이벤트만
  const weekEvents = useMemo(() => {
    const startOfWeek = weekDays[0];
    const endOfWeek = new Date(weekDays[6]);
    endOfWeek.setHours(23, 59, 59, 999);

    return events.filter(e => {
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end);
      return eStart < endOfWeek && eEnd > startOfWeek;
    });
  }, [events, weekDays]);

  // 집중도 로딩
  const loadFocus = async () => {
    try {
      const dateStr = toYMD(baseDate);
      const scores = await fetchFocusData(dateStr);
      setFocusScores(scores);
      return scores;
    } catch (e) {
      console.log('focus api error:', e);
      setFocusScores(new Array(24).fill(50));
      throw e;
    }
  };

  // 스누즈 핸들러
  const handleSnooze = async (
    taskId: string,
    durationMinutes: number = 30,
    calendarEventId?: string
  ) => {
    try {
      // 1) 백엔드 요청
      const result = await requestSnooze(CURRENT_USER_ID, taskId, durationMinutes);

      console.log(
        'SNOOZE RESULT IN WeeklyPage >>>',
        JSON.stringify(result, null, 2)
      );

      Alert.alert('재배치 성공', result.message);

      // 2) 백엔드 응답의 새 시간으로 프론트 이벤트 업데이트
      if (onUpdateEvent && calendarEventId && result.rescheduledTask) {
        const r: any = result.rescheduledTask;

        // 백엔드 구조에 따라 여러 키를 시도
        const newStart: string =
          r.newStartTime || r.start || r.startTime || r.newStart;
        const newEnd: string =
          r.newEndTime || r.end || r.endTime || r.newEnd;

        if (newStart && newEnd) {
          onUpdateEvent(calendarEventId, newStart, newEnd);
        } else {
          console.warn(
            'rescheduledTask 안에 새 시간 필드를 찾지 못했습니다.',
            r
          );
        }
      }

      // 3) 포커스 히트맵 갱신용 (주간 기준 날짜 유지)
      setBaseDate(new Date(baseDate));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      Alert.alert('재배치 실패', message);
    }
  };

  useEffect(() => {
    loadFocus();
  }, [baseDate]);

  // 주 이동
  const moveWeek = (delta: number) => {
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + delta * 7);
    setBaseDate(next);
  };

  const goDaily = (date: Date) => {
    navigation.navigate('Daily', { date: toYMD(date) });
  };

  const headerTitle = baseDate.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const screenWidth = Dimensions.get('window').width;
  const dayColWidth = (screenWidth - TIME_COL_WIDTH) / 7;

  return (
    <View style={s.screen}>
      {/* Top Bar */}
      <View style={s.topbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.iconBtn}
        >
          <Text style={s.iconTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Weekly Schedule</Text>
        <View style={s.iconBtn} />
      </View>

      {/* Week Nav */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => moveWeek(-1)} style={s.navBtn}>
          <Text style={s.navTxt}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.weekTitle}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => moveWeek(1)} style={s.navBtn}>
          <Text style={s.navTxt}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={s.headerRow}>
        <View style={{ width: TIME_COL_WIDTH }} />
        {weekDays.map((date, i) => {
          const isToday = toYMD(date) === toYMD(new Date());
          return (
            <TouchableOpacity
              key={i}
              style={[s.headerCell, { width: dayColWidth }]}
              onPress={() => goDaily(date)}
            >
              <Text style={s.dayLabel}>{WEEKDAYS[date.getDay()]}</Text>
              <View style={[s.dateBadge, isToday && s.todayBadge]}>
                <Text style={[s.dateLabel, isToday && s.todayText]}>
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 메인 스크롤 */}
      <ScrollView
        contentContainerStyle={{ height: HOURS.length * HOUR_HEIGHT + 40 }}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* 시간축 */}
          <View style={{ width: TIME_COL_WIDTH }}>
            {HOURS.map((h, i) => (
              <View
                key={h}
                style={[s.timeCell, { top: i * HOUR_HEIGHT }]}
              >
                <Text style={s.timeText}>{h}:00</Text>
              </View>
            ))}
          </View>

          {/* 그리드 & 이벤트 영역 */}
          <View style={{ flex: 1, position: 'relative' }}>
            {/* 집중도 배경 */}
            {HOURS.map((h, rowIdx) => {
              const score = focusScores[h] ?? 50;
              const bgColor = colorByFocus(score);
              return weekDays.map((_, colIdx) => (
                <View
                  key={`focus-${h}-${colIdx}`}
                  style={{
                    position: 'absolute',
                    top: rowIdx * HOUR_HEIGHT,
                    left: colIdx * dayColWidth,
                    width: dayColWidth,
                    height: HOUR_HEIGHT,
                    backgroundColor: bgColor,
                  }}
                />
              ));
            })}

            {/* 가로선 */}
            {HOURS.map((h, i) => (
              <View
                key={`line-${h}`}
                style={[s.gridLine, { top: i * HOUR_HEIGHT }]}
              />
            ))}

            {/* 세로선 */}
            {weekDays.map((_, i) => (
              <View
                key={`vline-${i}`}
                style={[s.vLine, { left: i * dayColWidth }]}
              />
            ))}

            {/* 이벤트 */}
            {weekEvents.map(ev => {
              const start = new Date(ev.start);
              const end = new Date(ev.end);

              const dayIndex = start.getDay(); // 0~6

              const startMin = start.getHours() * 60 + start.getMinutes();
              const endMin = end.getHours() * 60 + end.getMinutes();
              const dayStartMin = START_HOUR * 60;

              const top =
                ((startMin - dayStartMin) / 60) * HOUR_HEIGHT;
              const height =
                ((endMin - startMin) / 60) * HOUR_HEIGHT;

              if (
                start.getHours() < START_HOUR ||
                start.getHours() > END_HOUR
              )
                return null;

              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    s.eventBlock,
                    {
                      top,
                      height: Math.max(height, 24),
                      left: dayIndex * dayColWidth + 1,
                      width: dayColWidth - 2,
                      backgroundColor: ev.completed
                        ? '#cbd5e1'
                        : colorByCat(ev.category),
                    },
                  ]}
                  onPress={() => {
                    const taskIdToSend = ev.id;

                    // MongoDB ObjectId 보호 로직 (24자리 아니면 미루기 불가)
                    if (!taskIdToSend || taskIdToSend.length !== 24) {
                      Alert.alert(
                        'Snooze Denied',
                        '해당 테스크는 미루기 동작이 불가능합니다.'
                      );
                      return;
                    }

                    const duration = calcDurationMinutes(
                      ev.start,
                      ev.end
                    );

                    Alert.alert(ev.title, '원하는 작업을 선택하세요.', [
                      { text: '취소', style: 'cancel' },
                      { text: '일간 보기', onPress: () => goDaily(start) },
                      {
                        text: '미루기',
                        onPress: () =>
                          handleSnooze(taskIdToSend, duration, ev.id),
                      },
                    ]);
                  }}
                  onLongPress={() => {
                    Alert.alert(
                      '일정 삭제',
                      `'${ev.title}' 일정을 삭제하시겠습니까?`,
                      [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
                          style: 'destructive',
                          onPress: () => {
                            if (typeof onDeleteEvent === 'function') {
                              onDeleteEvent(ev.id);
                            } else {
                              console.warn(
                                'onDeleteEvent 콜백이 설정되어 있지 않습니다.'
                              );
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text numberOfLines={1} style={s.eventTitle}>
                    {ev.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- styles ---------------- */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  topbar: {
    height: 52,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  topTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTxt: { fontSize: 18, color: '#333' },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  weekTitle: { fontSize: 16, fontWeight: '600', marginHorizontal: 20 },
  navBtn: { padding: 10 },
  navTxt: { fontSize: 18, color: '#333' },

  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 8,
  },
  headerCell: { alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  dateBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: { backgroundColor: '#2563eb' },
  dateLabel: { fontSize: 14, fontWeight: '600', color: '#111' },
  todayText: { color: '#fff' },

  timeCell: {
    position: 'absolute',
    height: HOUR_HEIGHT,
    width: '100%',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: -6,
    backgroundColor: '#fff',
    paddingHorizontal: 2,
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#f3f4f6',
  },

  eventBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 3,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  eventTitle: { fontSize: 10, fontWeight: '600', color: '#1f2937' },
});
