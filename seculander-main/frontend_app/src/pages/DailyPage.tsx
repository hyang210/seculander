// src/pages/DailyPage.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import TopBar from '../components/TopBar';
import { CalendarEvent, Category } from '../types';
import { fmt, parseISO, toISODate, minutesSinceStartOfDay, layoutOverlaps } from '../utils/date';
import FAB from '../components/FAB';
import AddEventModal from '../components/AddEventModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Daily'> & {
  events: CalendarEvent[];
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  toggleComplete: (id: string) => void;
  categories: Category[];
};

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => i + DAY_START_HOUR
);


const CONTENT_HEIGHT = 1000;


const formatHourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function DailyPage({
  route,
  navigation,
  events,
  addEvent,
  toggleComplete,
  categories,
}: Props) {
  const date = useMemo(() => parseISO(route.params.date), [route.params.date]);
  const [showAdd, setShowAdd] = useState(false);

  // 안전한 onSubmit 래퍼
  const handleAddEvent = (data: Partial<Omit<CalendarEvent, 'id'>>) => {
    const baseDateStr = toISODate(date);
    const start = (data as any).start ?? `${baseDateStr}T09:00:00`;
    const end = (data as any).end ?? `${baseDateStr}T10:00:00`;

    const item: Omit<CalendarEvent, 'id'> = {
      title: data.title ?? 'Untitled',
      start,
      end,
      category: (data.category as Category) ?? 'Personal',
      completed: typeof data.completed === 'boolean' ? data.completed : false,
      priority: (data as any).priority ?? 'Medium',
    };

    try {
      addEvent(item);
    } catch (err) {
      console.warn('addEvent 실패', err);
    } finally {
      setShowAdd(false);
    }
  };

  const dayEvents = useMemo(() => {
    const same = (d: Date) =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate();

    return events
      .filter(e => {
        const s = parseISO(e.start),
          eD = parseISO(e.end);
        return same(s) || same(eD);
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [events, date.getTime()]);

  const placed: any = useMemo(() => {
    const forLayout = dayEvents.map(e => ({
      id: e.id,
      start: parseISO(e.start),
      end: parseISO(e.end),
    }));
    return layoutOverlaps(forLayout);
  }, [dayEvents]);

  const width = Dimensions.get('window').width - 72;

  const laneCount = Math.max(
    1,
    placed?.laneCount ??
      placed?.count ??
      (() => {
        if (placed?.laneOf) {
          const vals = Object.values(placed.laneOf).map(v =>
            typeof v === 'number' ? v : 0,
          );
          return vals.length ? Math.max(...vals) + 1 : 1;
        }
        if (placed?.lanes) {
          const vals = Object.values(placed.lanes).map(v =>
            typeof v === 'number' ? v : 0,
          );
          return vals.length ? Math.max(...vals) + 1 : 1;
        }
        return 1;
      })(),
  );

  const laneW = (lane: number) => width / Math.max(1, laneCount);

  const dayStartMin = DAY_START_HOUR * 60;
  const dayEndMin = DAY_END_HOUR * 60;

  const yFromDate = (d: Date) => {
    const totalMinutes = minutesSinceStartOfDay(d);
    
    if (totalMinutes >= 24 * 60) {
    return CONTENT_HEIGHT;
  }

    const m = Math.min(
      Math.max(minutesSinceStartOfDay(d), dayStartMin),
      dayEndMin,
    );
    const ratio = (m - dayStartMin) / (dayEndMin - dayStartMin || 1);
    return ratio * CONTENT_HEIGHT;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title={fmt(date, 'EEE, MMM d')} onMenu={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ height: CONTENT_HEIGHT }}>
        {}
        {HOURS.map((h, idx) => (
          <View
            key={h}
            style={[
              styles.row,
              {
                top: idx * (CONTENT_HEIGHT / (HOURS.length - 1 || 1)),
              },
            ]}>
            <Text style={styles.hour}>{formatHourLabel(h)}</Text>
            <View style={styles.line} />
          </View>
        ))}

        {}
        {dayEvents.map(ev => {
          const s = parseISO(ev.start),
            e = parseISO(ev.end);
          const top = yFromDate(s);
          const height = Math.max(36, yFromDate(e) - yFromDate(s));

          const lane =
            (placed?.laneOf && placed.laneOf[ev.id] != null
              ? placed.laneOf[ev.id]
              : placed?.lanes && placed.lanes[ev.id] != null
              ? placed.lanes[ev.id]
              : 0) as number;

          return (
            <TouchableOpacity
              key={ev.id}
              activeOpacity={0.9}
              onLongPress={() => toggleComplete(ev.id)}
              style={[
                styles.block,
                {
                  top,
                  left: 56 + laneW(lane) * lane,
                  width: laneW(lane) - 8,
                  height,
                  backgroundColor: ev.completed
                    ? '#cbd5e1'
                    : colorByCat(ev.category),
                },
              ]}>
              <Text numberOfLines={1} style={styles.blockTitle}>
                {ev.completed ? '✓ ' : ''}
                {ev.title}
              </Text>
              <Text style={styles.blockTime}>
                {fmt(s, 'HH:mm')} — {fmt(e, 'HH:mm')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FAB onPress={() => setShowAdd(true)} />

      <AddEventModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAddEvent}
        defaultDate={toISODate(date)}
        categories={categories as any}
        existingEvents={events as any}
      />
    </View>
  );
}

const colorByCat = (c: CalendarEvent['category']) => {
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

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    alignItems: 'center',
  },
  hour: {
    position: 'absolute',
    left: 8,
    width: 40,
    color: '#64748b',
    fontSize: 10,
  },
  line: {
    position: 'absolute',
    left: 56,
    right: 12,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    top: -0.5,
  },
  block: {
    position: 'absolute',
    borderRadius: 10,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  blockTitle: { fontWeight: '700', marginBottom: 2, color: '#111' },
  blockTime: { color: '#334155', fontSize: 12 },
});
