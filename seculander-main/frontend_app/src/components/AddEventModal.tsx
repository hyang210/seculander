import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, ScrollView } from 'react-native';
import { Category, CalendarEvent, Priority } from '../../types';
import { parseISO, fmt } from '../utils/date';
import { Calendar } from 'react-native-calendars'; 
import { fetchFocusData } from '../api/focusApi'; 
import { findBestTimeSlot } from '../utils/scheduler';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (e: Omit<CalendarEvent, 'id'>) => void;
  defaultDate?: string; // ISO yyyy-MM-dd
  categories: Category[];
  existingEvents: CalendarEvent[];
};

// 💡 수정됨: 'Low'가 포함되도록 수정
const PRIORITY_OPTIONS: Priority[] = ['High', 'Medium', 'Low'];

export default function AddEventModal({ visible, onClose, onSubmit, defaultDate, categories, existingEvents = [] }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(categories?.[0] ?? 'Work');
  const [date, setDate] = useState(defaultDate ?? '');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [showCalendar, setShowCalendar] = useState(false); // 캘린더 표시/숨김 상태 추가
  const [focusScores, setFocusScores] = useState<number[]>([]);
  const [isLoadingFocus, setIsLoadingFocus] = useState(false);

  useEffect(() => {
    if (visible && date) {
      setIsLoadingFocus(true);
      fetchFocusData(date)
        .then(scores => {
          setFocusScores(scores);
        })
        .catch(err => console.log('Focus API Error', err))
        .finally(() => setIsLoadingFocus(false));
    }
  }, [date, visible]);

  const handleAutoAdd = () => {
    if (!date) {
      Alert.alert('알림', '먼저 날짜를 선택해주세요.');
      return;
    }
    if (isLoadingFocus) {
      Alert.alert('잠시만요', 'AI 집중도 데이터를 불러오는 중입니다.');
      return;
    }

    const [sHourStr] = start.split(':');
    const [eHourStr] = end.split(':');
    const sH = Number(sHourStr);
    const eH = Number(eHourStr); 

     // 기본 duration 계산
    let duration = (eH - sH) * 60;
    if (!Number.isFinite(duration) || duration <= 0) duration = 60;

    // 하루(07~23) 기준 최대 범위 제한 (안전 장치)
    const maxDuration = (23 - 7) * 60;
    if (duration > maxDuration) duration = maxDuration;

    // 해당 날짜의 기존 일정만 필터링
    const dailyEvents = existingEvents.filter(ev => ev.start.startsWith(date));

    // 스케줄러 실행!
    const bestSlot = findBestTimeSlot(date, duration, priority, dailyEvents, focusScores);

    if (bestSlot) {
      setStart(bestSlot.start);
      setEnd(bestSlot.end);
      Alert.alert(
        '자동 배치 완료 ✨', 
        `중요도 '${priority}'에 맞춰\n${bestSlot.start} ~ ${bestSlot.end} 로 설정되었습니다.`
      );
    } else {
      Alert.alert('실패', '해당 날짜에 적절한 빈 시간을 찾지 못했습니다.');
    }
  };

  const submit = () => {
    if (!title || !date) {
      Alert.alert('알림', '제목과 날짜를 입력해주세요.');
      return;
    }

    const startISO = `${date}T${start}:00`;
    const endISO = `${date}T${end}:00`;

    const startDate = parseISO(startISO);
    const endDate = parseISO(endISO);

    if (endDate <= startDate) {
      Alert.alert('시간 오류', '종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    // 💡 priority 필드 추가 전달 및 completed: false 설정
    onSubmit({ title, category, start: startISO, end: endISO, priority, completed: false });

    // 상태 초기화
    setTitle(''); 
    setDate(defaultDate ?? ''); 
    setStart('09:00'); 
    setEnd('10:00'); 
    setCategory(categories[0] ?? 'Work');
    setPriority('Medium'); // 💡 Priority 초기화

    onClose();
  };

  const handleDayPress = (day: { dateString: string }) => {
    setDate(day.dateString);
    setShowCalendar(false); // 날짜 선택 후 캘린더 숨김
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.title}>Add Event</Text>

            {/* Title */}
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input}/>
            
            {/* Date Picker */}
            <TouchableOpacity onPress={() => setShowCalendar(prev => !prev)} style={[styles.input, styles.dateInput]}>
              <Text style={styles.dateText}>{date ? fmt(parseISO(date), 'yyyy년 M월 d일') : "Date (날짜 선택)"}</Text>
            </TouchableOpacity>

            {/* Calendar */}
            {showCalendar && (
              <Calendar
                onDayPress={handleDayPress}
                markedDates={{ [date]: { selected: true, selectedColor: '#2563eb' } }}
                current={date || defaultDate}
                theme={{
                  todayTextColor: '#2563eb',
                  selectedDayBackgroundColor: '#2563eb',
                  selectedDayTextColor: '#ffffff',
                }}
              />
            )}

            {/* Time Pickers */}
            <View style={{flexDirection:'row', gap:8, marginTop: showCalendar ? 12 : 8 }}>
              <TextInput 
                placeholder="Start HH:mm" 
                value={start} 
                onChangeText={setStart} 
                style={[styles.input,{flex:1, marginTop: 0}]}
                keyboardType={Platform.OS === 'android' ? 'default' : 'numbers-and-punctuation'}
              />
              <TextInput 
                placeholder="End HH:mm" 
                value={end} 
                onChangeText={setEnd} 
                style={[styles.input,{flex:1, marginTop: 0}]}
                keyboardType={Platform.OS === 'android' ? 'default' : 'numbers-and-punctuation'}
              />
            </View>

            <TouchableOpacity 
              onPress={handleAutoAdd} 
              style={styles.autoAddBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.autoAddText}>✨ Auto Add (Based on {priority})</Text>
            </TouchableOpacity>

            {/* Category Selection */}
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipRow}>
              {categories.map(c=>(
                <TouchableOpacity key={c} style={[styles.chip, category===c && styles.chipOn]} onPress={()=>setCategory(c)}>
                  <Text style={[styles.chipText, category===c && styles.chipTextOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 💡 Priority Selection (중요도 선택) */}
            <Text style={styles.sectionTitle}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITY_OPTIONS.map((p)=>(
                <TouchableOpacity key={p} style={[styles.chip, priority===p && styles.chipOn, styles.priorityChip]} onPress={()=>setPriority(p)}>
                  <Text style={[styles.chipText, priority===p && styles.chipTextOn]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose}><Text style={{color:'#6b7280'}}>Cancel      </Text></TouchableOpacity>
            <TouchableOpacity onPress={submit}><Text style={{color:'#2563eb', fontWeight:'700'}}>Add</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:{flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'flex-end'},
  box:{ 
    backgroundColor:'#fff', 
    borderTopLeftRadius:16, 
    borderTopRightRadius:16, 
    paddingHorizontal:16,
    paddingTop:16,
    maxHeight: '90%'
  },
  title:{ fontSize:18, fontWeight:'700', marginBottom:12 },
  sectionTitle:{ fontSize:14, fontWeight:'600', color:'#4b5563', marginTop:16, marginBottom:8 },
  input:{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, paddingHorizontal:12, paddingVertical:10, marginTop:8 },
  dateInput:{ 
    justifyContent:'center',
    minHeight: 48,
  },
  dateText:{
    color: '#111',
  },
  
  // 💡 Chip Styles
  chipRow:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom: 8 },
  chip:{ paddingHorizontal:10, paddingVertical:6, borderRadius:999, borderWidth:1, borderColor:'#d1d5db', backgroundColor:'#f9fafb' },
  chipOn:{ backgroundColor:'#2563eb', borderColor:'#2563eb' },
  chipText:{ color:'#4b5563', fontSize:14 },
  chipTextOn:{ color:'#fff', fontWeight:'700' },

  // 💡 Priority-specific style to ensure consistent width/flex
  priorityChip: { 
    flexGrow: 1, 
    flexBasis: 0, 
    justifyContent: 'center', 
    alignItems: 'center',
  },

  buttonRow:{ // 버튼 행을 하단에 고정
    flexDirection:'row', 
    justifyContent:'flex-end', 
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    marginHorizontal: -16, 
  },

  autoAddBtn: {
    marginTop: 12,
    backgroundColor: '#7c3aed', // 보라색 (AI 느낌)
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoAddText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});