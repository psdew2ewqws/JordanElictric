import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  rightLabel?: string;
}

export function ProgressBar({ label, value, maxValue, color, rightLabel }: ProgressBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {rightLabel && <Text style={[styles.rightLabel, { color }]}>{rightLabel}</Text>}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  rightLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  track: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
