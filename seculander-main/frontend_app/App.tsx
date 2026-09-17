import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MonthlyPage from './src/pages/MonthlyPage';
import DailyPage from './src/pages/DailyPage';
import CategoryTimelinePage from './src/pages/CategoryTimelinePage';
import WeeklyPage from './src/pages/WeeklyPage'; // 1. import 추가

import { CalendarEvent, Category, ProjectDraft, ProjectInfo } from './src/types';
import { suggestNewCategories } from './src/utils/categoryHelper';
import { createTaskForEvent } from './src/api/taskApi';

import { generateProjectSchedule } from './src/utils/projectScheduler';

// 네비게이션 스택 타입 정의
export type RootStackParamList = {
  Monthly: undefined;
  Weekly: undefined; // 2. Weekly 경로 추가
  Daily: { date: string };
  CategoryTimeline: { category: Category; estimatedCompletionDate?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFilters] = useState<Set<Category>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  const projectCategories = projects.map(p => p.title);

  const addEvent = (e: Omit<CalendarEvent,'id'>) => {
  // 1) 먼저 백엔드에 Task 생성 요청
  createTaskForEvent(e)
    .then(taskId => {
      // 2) 성공하면 MongoDB _id를 Event.id로 사용
      setEvents(prev => [...prev, { ...e, id: taskId }]);
    })
    .catch(err => {
      console.error('Task 생성 실패, 로컬 ID로 대체:', err);
      // 3) 실패해도 앱이 안 죽게 로컬 ID로라도 추가
      setEvents(prev => [...prev, { ...e, id: String(Date.now()) }]);
    });
};

  const toggleComplete = (id: string) =>
    setEvents(prev => prev.map(ev => ev.id===id ? { ...ev, completed: !ev.completed } : ev));

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(ev => ev.id !== id));
  };
  
  const addCategory = (cat: string) => {
    setCategories(prev => {
      if (prev.includes(cat as Category)) return prev;
      return [...prev, cat as Category];
    });
  };

  const updateEventTime = (id: string, newStart: string, newEnd: string) => {
    setEvents(prev =>
      prev.map(ev =>
        ev.id === id
          ? { ...ev, start: newStart, end: newEnd }
          : ev
      )
    );
  };

  const handleCreateProject = (draft: ProjectDraft) => {
    const newProject: ProjectInfo = { title: draft.title, deadline: draft.deadline };
    setProjects(prev => [...prev, newProject]);

    try {
        // 2. [변경] 자동 스케줄링 로직 호출
        const newEvents = generateProjectSchedule(draft);

        // 3. ID 유니크하게 변환 (scheduler는 draft의 id를 쓰므로 충돌 방지 위해 timestamp 결합)
        const finalEvents = newEvents.map((ev, idx) => ({
            ...ev,
            id: String(Date.now() + idx + idx + idx + idx) // 혹은 DB ID 사용
        }));

        // 4. 상태 업데이트
        setEvents(prev => [...prev, ...finalEvents]);
        
        Alert.alert(
            '프로젝트 생성 완료', 
            `'${draft.title}' 프로젝트가 생성되었습니다.\n(총 ${finalEvents.length}개 태스크 배치됨)`
        );
    } catch (e) {
        console.error(e);
        Alert.alert('오류', '프로젝트 생성 중 문제가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (events.length === 0) return;
    const suggestions = suggestNewCategories(events, categories, 3);
    if (suggestions.length > 0) {
      const newKeyword = suggestions[0];
      Alert.alert(
        '새 카테고리 발견 💡',
        `'${newKeyword}' 키워드가 포함된 일정이 많습니다.\n새 카테고리로 추가할까요?`,
        [
          { text: '아니요', style: 'cancel' },
          { text: '추가', onPress: () => addCategory(newKeyword) }
        ]
      );
    }
  }, [events, categories]);

  const removeCategory = (cat: Category) => {
    setCategories(prev => prev.filter(c => c !== cat));
  };

  const handleDeleteProject = (catToDelete: Category) => {
    Alert.alert(
      '프로젝트 삭제 확인',
      `정말로 프로젝트 '${catToDelete}'와 모든 테스크를 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            // 1. 해당 카테고리를 categories 상태에서 제거
            setCategories(prev => prev.filter(c => c !== catToDelete));
            
            // 2. 프로젝트 정보 (마감일 포함)를 projects 상태에서 제거
            setProjects(prev => prev.filter(p => p.title !== catToDelete));

            // 3. 해당 카테고리를 가진 모든 이벤트를 events 상태에서 제거
            setEvents(prev => prev.filter(e => e.category !== catToDelete));
            
            // 4. 필터에서도 제거 (선택 사항)
            setFilters(prev => {
              const newFilters = new Set(prev);
              newFilters.delete(catToDelete);
              return newFilters;
            });

            Alert.alert('삭제 완료', `'${catToDelete}' 프로젝트가 삭제되었습니다.`);
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        
        <Stack.Screen name="Monthly">
          {props => (
            <MonthlyPage
              {...props}
              events={events}
              filters={filters}
              setFilters={setFilters}
              addEvent={addEvent}
              toggleComplete={toggleComplete}
              categories={projectCategories}
              projects={projects}
              onDeleteProject={handleDeleteProject}
              onCreateProject={handleCreateProject}
            />
          )}
        </Stack.Screen>

        {/* 3. Weekly 스크린 추가 */}
        <Stack.Screen name="Weekly">
          {props => <WeeklyPage {...props} events={events} onDeleteEvent={handleDeleteEvent} onUpdateEvent={updateEventTime} />}
        </Stack.Screen>

        <Stack.Screen name="Daily">
          {props => (
            <DailyPage
              {...props}
              events={events}
              addEvent={addEvent}
              toggleComplete={toggleComplete}
              categories={categories}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="CategoryTimeline">
          {props => (
            <CategoryTimelinePage 
            {...props}
            events={events} 
            onToggleComplete={toggleComplete}
            onDeleteProject={handleDeleteProject}
            />
          )}
        </Stack.Screen>

      </Stack.Navigator>
    </NavigationContainer>
  );
}