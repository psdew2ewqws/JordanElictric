import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

interface BarChartProps {
  data: { label: string; value: number; highlight?: boolean }[];
  maxValue?: number;
  height?: number;
  color?: string;
  highlightColor?: string;
  showValues?: boolean;
  unit?: string;
}

export function BarChart({
  data,
  maxValue,
  height = 120,
  color = Colors.primary,
  highlightColor = Colors.warning,
  showValues = true,
  unit = '',
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value));
  const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        {/* Average line */}
        <View
          style={[
            styles.avgLine,
            { bottom: (avg / max) * height },
          ]}
        >
          <Text style={styles.avgLabel}>avg</Text>
        </View>
        {/* Bars */}
        <View style={styles.barsRow}>
          {data.map((item, idx) => {
            const barHeight = (item.value / max) * height;
            const isHighlight = item.highlight;
            return (
              <View key={idx} style={styles.barCol}>
                {showValues && (
                  <Text style={[styles.barValue, isHighlight && { color: highlightColor, fontWeight: '700' }]}>
                    {item.value}{unit}
                  </Text>
                )}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isHighlight ? highlightColor : color,
                        opacity: isHighlight ? 1 : 0.7,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isHighlight && styles.barLabelHighlight]}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
  },
  chartArea: {
    position: 'relative',
  },
  avgLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.textMuted,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  avgLabel: {
    position: 'absolute',
    right: 0,
    top: -14,
    fontSize: 9,
    color: Colors.textMuted,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    gap: 6,
    paddingHorizontal: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  barLabelHighlight: {
    color: Colors.text,
    fontWeight: '600',
  },
});
