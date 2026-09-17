// CategoryTimelinePage.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { CalendarEvent, Category } from '../types';
import TopBar from '../components/TopBar';
import { addDays, fmt, parseISO, clampToRange, daysBetweenInclusive, sameDay } from '../utils/date';
import { isAfter } from 'date-fns';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryTimeline'> & {
  events: CalendarEvent[];
  onToggleComplete: (id: string) => void;
  onDeleteProject: (category: Category) => void;
};

const DAY_W = 60; // 일(Day) 셀 너비 확장

// 7일 단위의 주간 타임라인 계산 헬퍼
const getWeekGrid = (currentDate: Date) => {
    const days: Date[] = [];
    let day = currentDate;
    for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
    }
    return days;
};

// 💡 타입 정의 추가: rows의 항목 타입
type RowItem = { e: CalendarEvent, offset: number, span: number };

const getDuration = (startIso: string, endIso: string) => {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  return Math.max(0, e - s);
};

export default function CategoryTimelinePage({ route, navigation, events, onToggleComplete, onDeleteProject }: Props) {
  const { category: cat, estimatedCompletionDate } = route.params; 
  const today = new Date();
  
  const [weekStart, setWeekStart] = React.useState(today);

  const daysHeader = useMemo(() => getWeekGrid(weekStart), [weekStart.getTime()]);
  const daysInView = daysHeader.length;
  const viewWidth = daysInView * DAY_W;

  const list = useMemo(()=> events.filter(e=> e.category===cat), [events, cat]);



  const { totalDuration, doneDuration, actualCompletionDate } = useMemo(() => {
    let t = 0;
    let d = 0;
    let latestEnd: Date | null = null;
    
    list.forEach(e => {
      const duration = getDuration(e.start, e.end);
      t += duration;
      if (e.completed) {
        d += duration;
      }

      const currentEnd = parseISO(e.end);
      if (!latestEnd || isAfter(currentEnd, latestEnd)) {
        latestEnd = currentEnd;
      }
    });

    return { totalDuration: t, doneDuration: d, actualCompletionDate: latestEnd };
  }, [list]);

  const pct = totalDuration === 0 ? 0 : Math.round((doneDuration / totalDuration) * 100);

  // 💡 rows 계산 로직 수정: 타입 단언 추가
  const rows = useMemo(() => {
    const minDate = daysHeader[0];
    const maxDate = addDays(daysHeader[daysInView - 1], 1); 

    const mappedRows = list.map(e => {
      const s = parseISO(e.start), eD = parseISO(e.end);
      const [left, right] = clampToRange(s, eD, minDate, maxDate);

      if (right <= minDate || left >= maxDate) return null; 

      const offsetDays = daysBetweenInclusive(minDate, left) - 1; 
      const spanDays = daysBetweenInclusive(left, right);

      const offset = Math.max(0, offsetDays);
      const span = spanDays;

      const actualSpan = Math.min(span, daysInView - offset);

      return { e, offset, span: actualSpan };
    });
    
    // null 제거 후, 최종적으로 RowItem[] 타입임을 단언합니다.
    return mappedRows.filter(row => row !== null && row.span > 0) as RowItem[]; 
  }, [list, weekStart.getTime()]);


  const estDate = estimatedCompletionDate ? parseISO(estimatedCompletionDate) : null;
  const isPastEst = estDate && isAfter(today, estDate);

  const handleDeletion = () => {
    onDeleteProject(cat);
    navigation.goBack(); 
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title={`${cat} Timeline`} onMenu={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{paddingBottom: 20}}>
        {/* 1. 예상 완료일 */}
        <View style={styles.estDateWrap}>
            <Text style={styles.estDateTitle}>Estimated Completion Date</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={[styles.estDateText, isPastEst && {color: '#ef4444'}]}>
                    {estDate ? fmt(estDate, 'yyyy년 M월 d일 (EEE)') : '데이터 없음'}
                </Text>
                {/* {isPastEst && <Text style={styles.warningText}>⚠️ 지연됨</Text>} */}
            </View>
        </View>

        <View style={styles.estDateWrap}>
                <Text style={styles.dateTitle}>Actual Completion</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={[styles.dateText, isPastEst && {color: '#ef4444'}]}>
                        {actualCompletionDate ? fmt(actualCompletionDate, 'yyyy년 M월 d일 (EEE)') : '테스크 없음'}
                    </Text>
                </View>
            </View>

        {/* 2. 진행도 바 (완료율) */}
        <View style={styles.progressWrap}>
          <Text style={styles.progressTitle}>Progress (Based on Duration)</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{pct}% Completed</Text>
        </View>

        {/* 3. 주간 타임라인 */}
        <View style={styles.timelineSection}>
            {/* Week Navigator */}
            <View style={styles.weekNav}>
                <Text style={styles.weekNavTitle}>Week: {fmt(daysHeader[0], 'M/d')} - {fmt(daysHeader[daysInView-1], 'M/d')}</Text>
                <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.navBtn}><Text style={styles.navText}>◀</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setWeekStart(today)} style={styles.navBtn}><Text style={styles.navText}>◎</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.navBtn}><Text style={styles.navText}>▶</Text></TouchableOpacity>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    {/* 헤더 (날짜) */}
                    <View style={styles.daysHeaderRow}>
                        {daysHeader.map((d, i) => (
                          <View key={i} style={[styles.dayHead, { width: DAY_W }, sameDay(d, today) && styles.dayHeadToday]}>
                            <Text style={styles.dayHeadText}>{fmt(d, 'E')}</Text>
                            <Text style={styles.dayHeadText}>{fmt(d, 'd')}</Text>
                          </View>
                        ))}
                    </View>

                    {/* 이벤트 바 */}
                    <View style={{width: viewWidth}}>
                      {rows.map(({ e, offset, span }) => (
                        <View key={e.id} style={styles.row}>
                            <TouchableOpacity 
                              style={styles.checkboxContainer}
                              onPress={() => onToggleComplete(e.id)}
                              activeOpacity={0.7}
                            >
                                <Text style={[styles.checkboxIcon, e.completed && styles.checkboxCompleted]}>
                                    {e.completed ? '✓' : '▢'}
                                </Text>
                                <Text style={[styles.rowTitle, e.completed && { textDecorationLine: 'line-through', color: '#9ca3af' }]} numberOfLines={1}>
                                    {e.title}
                                </Text>
                            </TouchableOpacity>
                            <View style={{flexDirection: 'row', paddingTop: 4}}>
                                <View style={{ width: offset * DAY_W }} />
                                <View style={[
                                    styles.bar,
                                    { width: span * DAY_W, backgroundColor: e.completed ? '#6b7280' : colorByCat(e.category) }
                                ]}/>
                            </View>
                        </View>
                      ))}
                      {rows.length === 0 && <Text style={{ color: '#777', padding: 16 }}>No events in this week</Text>}
                    </View>
                </View>
            </ScrollView>
        </View>
        <View style={styles.deleteButtonContainer}>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDeletion}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>프로젝트 삭제</Text>
              </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const colorByCat = (c: Category) => {
  switch (c) {
    case 'Work': return '#fde68a';
    case 'Personal': return '#bfdbfe';
    case 'Family': return '#bbf7d0';
    case 'Study': return '#ddd6fe';
    default: return '#e5e7eb';
  }
};

const styles = StyleSheet.create({
  deleteButtonContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    borderBottomWidth: 1, 
    borderColor: '#eee',
    alignItems: 'flex-end', // 오른쪽 정렬
  },
  deleteButton: {
    backgroundColor: '#fecaca', // 빨간색 계열 배경
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#dc2626', // 빨간색 텍스트
    fontWeight: '600',
    fontSize: 14,
  },

  // 예상 완료일 섹션
  estDateWrap: { padding: 16, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderColor: '#eee' },
  estDateTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4, fontWeight: '500' },
  estDateText: { fontSize: 18, fontWeight: '700', color: '#10b981' },
  warningText: { color: '#ef4444', fontWeight: '700' },

  dateTitle: { 
    fontSize: 14, 
    color: '#6b7280', 
  },
  dateText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1f2937', 
  },

  // 진행도 섹션
  progressWrap:{ padding:16, borderBottomWidth: 1, borderColor: '#eee' },
  progressTitle:{ fontWeight:'700', marginBottom:8 },
  progressBar:{ height:12, backgroundColor:'#e5e7eb', borderRadius:999, overflow:'hidden' },
  progressFill:{ height:12, backgroundColor:'#3b82f6' },
  progressText:{ marginTop:8, color:'#334155' },

  // 타임라인 섹션
  timelineSection: { paddingVertical: 10 },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  weekNavTitle: { fontWeight: '600', color: '#374151' },
  navBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  navText: { fontSize: 16, color: '#2563eb' },
  
  daysHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  dayHead: { paddingVertical: 8, borderRightWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  dayHeadToday: { backgroundColor: '#eef4ff' },
  dayHeadText: { fontSize: 12, color: '#6b7280' },
  row: { paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  rowTitle: { fontWeight: '600', fontSize: 13, maxWidth: '100%' },
  bar: { height: 10, borderRadius: 5, marginTop: 4, marginRight: 4, opacity: 0.8 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  checkboxIcon: { fontSize: 16, marginRight: 6, fontWeight: 'bold', color: '#374151' },
  checkboxCompleted: { color: '#10b981' },
});