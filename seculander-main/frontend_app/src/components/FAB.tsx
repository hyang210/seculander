
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

type Props = { onPress: () => void; style?: ViewStyle; label?: string };

export default function FAB({ onPress, style, label = 'Add Event' }: Props) {
  return (
    <TouchableOpacity style={[styles.fab, style]} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.plus}>＋</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 16, bottom: 24,
    backgroundColor: '#3b82f6', borderRadius: 28,
    paddingHorizontal: 16, height: 56,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  plus: { fontSize: 28, color: '#fff', marginRight: 6, marginTop: -2 },
  label: { color: '#fff', fontWeight: '700' },
});