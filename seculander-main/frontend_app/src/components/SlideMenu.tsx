import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Category, ProjectDraft } from '../types'; 
import AddProjectModal from './AddProjectModal';     

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  active: Set<Category>;
  toggleCategory: (c: Category) => void;
  onGoWeekly: () => void; // 1. onHelp 제거하고 onGoWeekly 추가
  onOpenTimeline: (c: Category) => void;
  onDeleteProject: (category: Category) => void;
  onCreateProject: (draft: ProjectDraft) => void;
};

export default function SideMenu({ 
  open, onClose, categories, active, toggleCategory, 
  onGoWeekly, // 2. 여기도 변경
  onOpenTimeline, onDeleteProject, onCreateProject 
}: Props) {
  
  const W = Dimensions.get('window').width * (2/3);
  const tx = useRef(new Animated.Value(-W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  
  const [showProjectModal, setShowProjectModal] = useState(false); 

  useEffect(()=>{
    if (open) {
      Animated.parallel([
        Animated.timing(tx,   { toValue:0, duration:220, useNativeDriver:true }),
        Animated.timing(fade, { toValue:1, duration:220, useNativeDriver:true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(tx,   { toValue:-W, duration:220, useNativeDriver:true }),
        Animated.timing(fade, { toValue:0,  duration:220, useNativeDriver:true })
      ]).start();
    }
  },[open]);
  
  const handleCreateProject = (draft: ProjectDraft) => {
    if (categories.some(c => c.toLowerCase() === draft.title.toLowerCase())) {
        Alert.alert('알림', `프로젝트 '${draft.title}'는 이미 존재합니다.`);
        return;
    }
    onCreateProject(draft);
    setShowProjectModal(false);
  };

  return (
    <View pointerEvents={open?'auto':'none'} style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor:'black', opacity: fade.interpolate({ inputRange:[0,1], outputRange:[0,0.35] }) }]} />
      </Pressable>

      <Animated.View style={[styles.drawer, { width: W, transform:[{ translateX: tx }] }]}>
        <ScrollView contentContainerStyle={{paddingBottom:24}}>
          <Text style={styles.head}>메뉴</Text>

          {/* 3. 버튼 텍스트 및 onPress 변경 */}
          <TouchableOpacity onPress={onGoWeekly} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>주간 일정 (Weekly) ▸</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, {marginTop:18}]}>카테고리 필터/관리</Text>
          
          <TouchableOpacity 
            style={styles.newProjectBtn}
            onPress={() => setShowProjectModal(true)}
          >
             <Text style={styles.newProjectBtnText}>+ New Project</Text>
          </TouchableOpacity>
          
          {categories?.map(c=>(
            <View key={c} style={{ marginBottom: 10}}>
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <TouchableOpacity
                  style={[
                    styles.catBtn,
                    active.has(c) && styles.catBtnActive,
                    {flex:1, marginBottom: 0}
                  ]}
                  onPress={() => toggleCategory(c)}
                >
                  <Text style={[styles.catText, active.has(c) && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onDeleteProject(c)}
                    style={styles.deleteBtn}
                >
                    <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.timelineBtn}
                onPress={() => onOpenTimeline(c)}
              >
                <Text style={styles.timelineText}>Open {c} Timeline ▸</Text>
              </TouchableOpacity>
            </View>

          ))}
        </ScrollView>
      </Animated.View>

      <AddProjectModal 
        visible={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleCreateProject}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  drawer:{ position:'absolute', left:0, top:0, bottom:0, backgroundColor:'#fff', paddingTop:48, paddingHorizontal:16, borderRightWidth:1, borderRightColor:'#eee' },
  head:{ fontSize:20, fontWeight:'700', marginBottom:12 },
  primaryBtn:{ backgroundColor:'#2563eb', paddingVertical:12, borderRadius:12, alignItems:'center' },
  primaryBtnText:{ color:'#fff', fontWeight:'600', fontSize: 16 }, // 폰트 사이즈 살짝 키움
  sectionTitle:{ fontSize:14, color:'#666', marginBottom:8 },
  
  catBtn:{ paddingVertical:10, paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:'#e5e7eb', backgroundColor:'#fff' },
  catBtnActive:{ backgroundColor:'#e8f0ff', borderColor:'#c7dafc' },
  catText:{ fontSize:15, color:'#111' },
  catTextActive:{ color:'#1d4ed8', fontWeight:'700' },
  timelineBtn:{ paddingVertical:6, paddingHorizontal:10, alignSelf:'flex-start' },
  timelineText:{ color:'#2563eb', fontSize:12, fontWeight:'600' },

  deleteBtn:{ paddingHorizontal:10, paddingVertical:6 },
  deleteText:{ color:'red', fontWeight:'bold' },

  newProjectBtn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  newProjectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});