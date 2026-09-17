import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { ProjectDraft, ProjectTaskDraft } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (project: ProjectDraft) => void;
};

export default function AddProjectModal({ visible, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tasks, setTasks] = useState<ProjectTaskDraft[]>([
    { id: '1', name: '', duration: '', dependencyId: null }
  ]);

  // Dropdown 상태 관리
  const [selectingDependencyFor, setSelectingDependencyFor] = useState<string | null>(null);

  const addTask = () => {
    const newId = String(Date.now());
    setTasks([...tasks, { id: newId, name: '', duration: '', dependencyId: null }]);
  };

  const updateTask = (id: string, field: keyof ProjectTaskDraft, value: string | null) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTask = (id: string) => {
    if (tasks.length === 1) return; // 최소 1개 유지
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('알림', '프로젝트 이름을 입력해주세요.');
      return;
    }
    // 간단한 유효성 검사 후 데이터 전달
    onSubmit({ title, deadline, tasks });
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDeadline('');
    setTasks([{ id: '1', name: '', duration: '', dependencyId: null }]);
    onClose();
  };

  // 의존성 선택 처리
  const handleSelectDependency = (targetTaskId: string, depId: string) => {
    updateTask(targetTaskId, 'dependencyId', depId);
    setSelectingDependencyFor(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.headerTitle}>Create Project</Text>
          
          <ScrollView style={{maxHeight: '80%'}} contentContainerStyle={{paddingBottom: 20}}>
            {/* 1. 프로젝트 정보 */}
            <View style={styles.section}>
              <Text style={styles.label}>이름 (Project Name)</Text>
              <TextInput 
                style={styles.input} 
                value={title} 
                onChangeText={setTitle} 
                placeholder="ex. Marketing Launch"
              />
              
              <Text style={styles.label}>마감일 (Deadline)</Text>
              <TextInput 
                style={styles.input} 
                value={deadline} 
                onChangeText={setDeadline} 
                placeholder="ex. 2025-12-31" 
              />
            </View>

            <View style={styles.divider} />

            {/* 2. Task 목록 */}
            <Text style={[styles.headerTitle, {fontSize: 16, marginBottom: 10}]}>Tasks</Text>
            
            {tasks.map((task, index) => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.row}>
                  <View style={{flex: 2, marginRight: 8}}>
                    <Text style={styles.subLabel}>Name</Text>
                    <TextInput 
                      style={styles.smallInput} 
                      value={task.name}
                      onChangeText={(txt) => updateTask(task.id, 'name', txt)}
                      placeholder="Task Name"
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.subLabel}>Time Need</Text>
                    <TextInput 
                      style={styles.smallInput} 
                      value={task.duration}
                      onChangeText={(txt) => updateTask(task.id, 'duration', txt)}
                      placeholder="Min"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Dropdown Trigger */}
                <Text style={styles.subLabel}>Dependency (Prior Task)</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => setSelectingDependencyFor(task.id)}
                >
                  <Text style={styles.dropdownText}>
                     {task.dependencyId 
                       ? tasks.find(t => t.id === task.dependencyId)?.name || 'Unknown' 
                       : 'None (선택)'} 
                     {'  ▼'}
                  </Text>
                </TouchableOpacity>

                {/* 삭제 버튼 (우측 상단 X) */}
                {tasks.length > 1 && (
                  <TouchableOpacity onPress={() => removeTask(task.id)} style={styles.deleteTaskBtn}>
                    <Text style={{color:'#ef4444'}}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* + 버튼 */}
            <TouchableOpacity onPress={addTask} style={styles.addTaskBtn}>
              <Text style={styles.addTaskTxt}>+</Text>
            </TouchableOpacity>

          </ScrollView>

          {/* 하단 버튼 */}
          <View style={styles.footerBtnRow}>
            <TouchableOpacity onPress={resetForm} style={styles.cancelBtn}>
              <Text style={styles.cancelTxt}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={styles.createBtn}>
              <Text style={styles.createTxt}>생성</Text>
            </TouchableOpacity>
          </View>

          {/* 💡 커스텀 Dropdown Overlay (의존성 선택 시 뜸) */}
          {selectingDependencyFor && (
            <View style={styles.dropdownOverlay}>
              <View style={styles.dropdownBox}>
                <Text style={styles.dropdownTitle}>Select Dependency</Text>
                <ScrollView>
                  <TouchableOpacity 
                    style={styles.dropdownItem} 
                    onPress={() => handleSelectDependency(selectingDependencyFor, null as any)}
                  >
                    <Text style={{color: '#666'}}>None (없음)</Text>
                  </TouchableOpacity>
                  
                  {tasks
                    .filter(t => t.id !== selectingDependencyFor) // 자기 자신 제외
                    .map(t => (
                      <TouchableOpacity 
                        key={t.id} 
                        style={styles.dropdownItem}
                        onPress={() => handleSelectDependency(selectingDependencyFor, t.id)}
                      >
                        <Text style={styles.dropdownItemText}>{t.name || '(No Name)'}</Text>
                      </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setSelectingDependencyFor(null)} style={{padding:10, alignItems:'center'}}>
                  <Text style={{color:'red'}}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '90%', elevation: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111' },
  section: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },

  // Task Card Style (스케치의 박스 형태)
  taskCard: { 
    borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 10, 
    position: 'relative', backgroundColor: '#fff' 
  },
  row: { flexDirection: 'row', marginBottom: 8 },
  subLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  smallInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, height: 36 },
  
  // Dropdown Style
  dropdownBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, flexDirection: 'row', justifyContent: 'space-between' },
  dropdownText: { fontSize: 14, color: '#333' },
  
  // + Button
  addTaskBtn: { alignSelf: 'flex-end', backgroundColor: '#fff', padding: 5 },
  addTaskTxt: { fontSize: 24, fontWeight: 'bold', color: '#333' },

  // Footer Buttons
  footerBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#eee' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  cancelTxt: { fontWeight: '600', color: '#333' },
  createBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#333' },
  createTxt: { fontWeight: '600', color: '#fff' },

  deleteTaskBtn: { position: 'absolute', top: 6, right: 8, padding: 4 },

  // Dropdown Overlay
  dropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  dropdownBox: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 16, maxHeight: 200, elevation: 10, borderWidth: 1, borderColor: '#ddd' },
  dropdownTitle: { fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  dropdownItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  dropdownItemText: { fontSize: 16 }
});