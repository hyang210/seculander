// src/pages/MonthlyPage.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { CalendarEvent, Category, ProjectDraft, ProjectInfo } from '../types';
import SlideMenu from '../components/SlideMenu'; // 프로젝트에 있는 슬라이드 메뉴 사용

type Props = NativeStackScreenProps<RootStackParamList, 'Monthly'> & {
  events: CalendarEvent[];
  filters: Set<Category>;
  setFilters: (s: Set<Category> | ((prev: Set<Category>) => Set<Category>)) => void;
  addEvent: (e: Omit<CalendarEvent,'id'>) => void;
  toggleComplete: (id: string) => void;
  categories: Category[];
  projects: ProjectInfo[];
  onDeleteProject: (category: Category) => void;
  onCreateProject: (draft: ProjectDraft) => void;
};

/* ---------------- helpers ---------------- */
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ellip = (s: string, n = 8) => (s?.length ?? 0) <= n ? (s ?? '') : s.slice(0, n) + '…';
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseToDate = (v: string | Date | undefined) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const isSameDay = (a: Date, b: Date) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const isSameMonth = (a: Date, b: Date) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth();
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, delta: number) => new Date(d.getFullYear(), d.getMonth()+delta, 1);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = addDays(first, -first.getDay()); // 주의 일요일부터 시작
  return Array.from({length:42}, (_,i) => addDays(gridStart, i));
}
function eventHitsDay(ev: CalendarEvent, day: Date) {
  const any = ev as any;
  const s = parseToDate(any.start ?? any.startDate ?? any.date);
  const e = parseToDate(any.end   ?? any.endDate   ?? any.start ?? any.date);
  if (!s || !e) return false;
  const ymd = toYMD(day);
  return toYMD(s) <= ymd && ymd <= toYMD(e);
}

/* ---------------- component ---------------- */
export default function MonthlyPage({
  route, navigation,
  events, filters, setFilters, toggleComplete,
  categories, projects, onDeleteProject, onCreateProject,
}: Props) {
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const weeks = useMemo(() => {
    const out: Date[][] = []; for (let i=0;i<42;i+=7) out.push(days.slice(i,i+7)); return out;
  }, [days]);

  const visibleEvents = useMemo(() => {
    if (!filters || filters.size===0) return events;
    return events.filter(e => filters.has((e as any).category as Category));
  }, [events, filters]);

  const selectedEvents = useMemo(
    () => visibleEvents.filter(ev => eventHitsDay(ev, selected)),
    [visibleEvents, selected]
  );

  const goPrev = () => setCursor(addMonths(cursor, -1));
  const goNext = () => setCursor(addMonths(cursor, +1));

  // 컴포넌트 내부( return 위 )
  const handleToggleCategory = (c: Category) => {
    setFilters((prev: Set<Category>) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  // 필요 시 원하는 동작으로 교체(지금은 no-op)
  const handleOpenTimeline = (c: Category) => {
    // 1. projects 목록에서 해당 카테고리(title)의 프로젝트를 찾음
    const project = projects.find(p => p.title === c);
    // 2. 마감일 정보를 추출 (없으면 undefined)
    const estimatedCompletionDate = project ? project.deadline : undefined;
    navigation.navigate('CategoryTimeline', {
      category: c,
      estimatedCompletionDate: estimatedCompletionDate
    });
  };
  const handleHelp = () => {};


  return (
    <View style={s.screen}>
      {/* ── Top Bar (메뉴 버튼 포함) ───────────────────────────────── */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.iconBtn}>
          <Text style={s.iconTxt}>☰</Text>
        </TouchableOpacity>
        <View style={s.iconBtn} />
      </View>

      {/* ── 한 개의 ScrollView로 "전체 스크롤" 구현 ──────────────── */}
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 월 네비 */}
        <View style={s.monthHeader}>
          <TouchableOpacity onPress={goPrev} style={s.navBtn}><Text style={s.navTxt}>{'<'}</Text></TouchableOpacity>
          <Text style={s.monthTitle}>
            {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={goNext} style={s.navBtn}><Text style={s.navTxt}>{'>'}</Text></TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={s.weekHeader}>
          {WEEKDAYS.map(w => <Text key={w} style={s.weekHeaderTxt}>{w}</Text>)}
        </View>

        {/* 달력 그리드 (가변 높이 셀) */}
        <View style={s.grid}>
          {weeks.map((row, rIdx) => (
            <View key={`row-${rIdx}`} style={s.row}>
              {row.map((cell, cIdx) => {
                const isCur = isSameMonth(cell, cursor);
                const isSel = isSameDay(cell, selected);

                const dayEvents = visibleEvents.filter(ev => eventHitsDay(ev, cell));
                // 모두 표시 (제한 없음)
                const items = dayEvents;

                return (
                  <TouchableOpacity
                    key={`cell-${cell.getTime()}-${cIdx}`}
                    style={[s.cell, !isCur && s.dimCell, isSel && s.selectedCell]}
                    onPress={() => setSelected(cell)}
                    onLongPress={()=>{
                      navigation.navigate('Daily',{date: toYMD(cell) });
                    }
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dayNum, !isCur && s.dimText]}>{cell.getDate()}</Text>

                    <View style={s.badges}>
                      {items.map((ev, i) => (
                        <View key={`ev-${String(ev.id)}-${cell.getTime()}-${i}`} style={s.badge}>
                          <Text style={s.badgeTxt} numberOfLines={1}>{ellip((ev as any).title ?? '', 10)}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* 선택일 이벤트 목록 (스크롤은 상위 ScrollView가 담당) */}
        <View style={s.selectedList}>
          <Text style={s.selectedTitle}>
            Selected Day Events ({selected.toLocaleDateString(undefined,{month:'2-digit',day:'2-digit'})})
          </Text>

          {selectedEvents.length===0 ? (
            <Text style={s.emptyTxt}>이 날의 일정이 없습니다.</Text>
          ) : (
            <FlatList
              data={selectedEvents}
              scrollEnabled={false}                 // 👈 외부 ScrollView만 스크롤
              keyExtractor={(it, idx) => `${String((it as any).id)}-${idx}-${toYMD(selected)}`}
              renderItem={({ item }) => (
                <View style={s.eventItem}>
                  <View style={s.eventBullet}/>
                  <View style={{flex:1}}>
                    <Text style={s.eventTitle}>{(item as any).title ?? 'Untitled'}</Text>
                    <Text style={s.eventMeta}>
                      {(item as any).start ?? (item as any).startDate ?? (item as any).date}
                      {((item as any).end ?? (item as any).endDate) ? ` ~ ${(item as any).end ?? (item as any).endDate}` : ''}
                      {(item as any).category ? ` · ${(item as any).category}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleComplete(String((item as any).id))}>
                    <Text style={[(item as any).completed && s.checked]}>
                      {(item as any).completed ? '✅' : '□'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Slide Menu */}
      <SlideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
        active={filters}                            // 선택된 카테고리 Set
        toggleCategory={handleToggleCategory}
        onGoWeekly={() => {
          setMenuOpen(false);
          navigation.navigate('Weekly');
        }}
        onOpenTimeline={handleOpenTimeline}
        onDeleteProject={onDeleteProject}
        onCreateProject={onCreateProject}
      />

    </View>
  );
}

/* ---------------- styles ---------------- */
const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#fff' },

  // Top bar
  topbar:{
    height: 52, paddingHorizontal: 8,
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor:'#e5e7eb',
    backgroundColor:'#fff',
  },
  topTitle:{ fontSize:16, fontWeight:'700' },
  iconBtn:{ width:44, height:44, alignItems:'center', justifyContent:'center' },
  iconTxt:{ fontSize:18 },

  // Scroll 전체 컨테이너
  scrollContent:{ paddingBottom: 24 },

  monthHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:10, paddingBottom:8 },
  monthTitle:{ fontSize:18, fontWeight:'600' },
  navBtn:{ padding:12 }, navTxt:{ fontSize:18 },

  weekHeader:{ flexDirection:'row', paddingHorizontal:8, paddingVertical:4 },
  weekHeaderTxt:{ flex:1, textAlign:'center', fontSize:12, color:'#6b7280' },

  grid:{ paddingHorizontal:8, paddingBottom:6 },
  row:{ flexDirection:'row', alignItems:'stretch' },   // 👈 같은 주는 같은 높이로
  cell:{
    flex:1,
    // aspectRatio: 1,          // ❌ 제거: 가변 높이
    minHeight: 72,              // 기본 높이
    borderWidth: StyleSheet.hairlineWidth, borderColor:'#e5e7eb',
    padding: 6,
  },
  dimCell:{ backgroundColor:'#fafafa' },
  selectedCell:{ borderColor:'#2563eb', borderWidth:2, backgroundColor:'#e8f0fe' },
  dayNum:{ fontSize:14, fontWeight:'500' },
  dimText:{ color:'#9ca3af' },

  badges:{ marginTop:4, gap:4 },
  badge:{ alignSelf:'flex-start', paddingHorizontal:6, paddingVertical:2, borderRadius:8, backgroundColor:'#fde68a', borderWidth:StyleSheet.hairlineWidth, borderColor:'#f59e0b', maxWidth:'100%' },
  badgeTxt:{ fontSize:10, fontWeight:'600', color:'#111827' },

  selectedList:{ paddingHorizontal:16, paddingTop:8 },
  selectedTitle:{ fontSize:14, fontWeight:'600', marginBottom:6 },
  emptyTxt:{ color:'#6b7280' },

  eventItem:{ flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#e5e7eb', gap:10 },
  eventBullet:{ width:8, height:8, borderRadius:4, backgroundColor:'#111827' },
  eventTitle:{ fontSize:15, fontWeight:'500' },
  eventMeta:{ fontSize:12, color:'#6b7280', marginTop:2 },
  
  checkBtn: {
    width:30, height:30,
    alignItems: 'center', justifyContent: 'center',
    fontSize:20, color:'#94a3b8'
  },
  checked: {
    fontWeight:'bold',
  }
});
