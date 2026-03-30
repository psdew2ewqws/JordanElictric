import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../constants/theme';

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  subtitle?: string;
  valueColor?: string;
  subtitleColor?: string;
}

export function KpiCard({ label, value, unit, subtitle, valueColor = Colors.primary, subtitleColor = Colors.textMuted }: KpiCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: valueColor }]}>{unit}</Text>}
      </View>
      {subtitle && <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  unit: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
