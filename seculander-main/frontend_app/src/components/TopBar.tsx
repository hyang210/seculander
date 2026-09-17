import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = { title: string; onMenu: () => void; right?: React.ReactNode; };

export default function TopBar({ title, onMenu, right }: Props) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity accessibilityLabel="Open menu" onPress={onMenu} style={styles.menuBtn}>
        <Text style={{fontSize: 22}}>≡</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ height:56, flexDirection:'row', alignItems:'center', paddingHorizontal:12, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#eee' },
  menuBtn:{ padding:8, marginRight:4 },
  title:{ fontSize:18, fontWeight:'600' },
  spacer:{ flex:1 },
});
