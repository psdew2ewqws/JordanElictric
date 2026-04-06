import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DataSourceBadgeProps {
  source?: string;
  updatedAt?: Date | string | null;
  fonts?: { regular?: string };
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Yesterday';
}

function getDotColor(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return '#10B981';   // green
  if (hours < 24) return '#F59E0B';  // yellow
  return '#9CA3AF';                   // gray
}

export function DataSourceBadge({ source = 'JEPCO', updatedAt, fonts }: DataSourceBadgeProps) {
  const parsed = updatedAt
    ? (updatedAt instanceof Date ? updatedAt : new Date(updatedAt))
    : null;

  const isValidDate = parsed && !isNaN(parsed.getTime());
  const dotColor = isValidDate ? getDotColor(parsed) : '#9CA3AF';
  const timeText = isValidDate ? ` | Updated ${getRelativeTime(parsed)}` : '';
  const fontFamily = fonts?.regular || undefined;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, fontFamily ? { fontFamily } : undefined]}>
        Source: {source}{timeText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    color: '#9CA3AF',
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
