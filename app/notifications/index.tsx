import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { notificationApi } from '../../src/services/api';
import { supabase } from '../../src/services/supabase';

interface Notification {
  id: string;
  title: string | null;
  title_ar: string | null;
  body: string | null;
  body_ar: string | null;
  is_read: boolean;
  created_at: string;
  type?: string;
}

function getNotificationIcon(type?: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'BILL':
      return 'receipt-outline';
    case 'OUTAGE':
      return 'flash-off-outline';
    case 'COMPLAINT':
      return 'chatbox-ellipses-outline';
    case 'USAGE':
      return 'bar-chart-outline';
    case 'SYSTEM':
      return 'settings-outline';
    default:
      return 'notifications-outline';
  }
}

function timeAgo(dateStr: string, isAr: boolean): string {
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);

    if (minutes < 1) return isAr ? 'الآن' : 'Just now';
    if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
    if (days < 7) return isAr ? `منذ ${days} يوم` : `${days}d ago`;
    return isAr ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const f = fonts;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await notificationApi.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.status === 401) {
        setNotifications([]);
      } else {
        setError(
          err instanceof Error ? err.message : isAr ? 'فشل تحميل الإشعارات' : 'Failed to load notifications',
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Supabase Realtime subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      try {
        await notificationApi.markRead(id);
      } catch {
        // Revert on error
        loadNotifications();
      }
    },
    [loadNotifications],
  );

  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      loadNotifications();
    }
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotification = useCallback(
    (item: Notification) => {
      const title = isAr ? (item.title_ar || item.title) : (item.title || item.title_ar);
      const body = isAr ? (item.body_ar || item.body) : (item.body || item.body_ar);
      const icon = getNotificationIcon(item.type);

      return (
        <TouchableOpacity
          key={item.id}
          style={[styles.card, !item.is_read && styles.cardUnread]}
          onPress={() => handleMarkRead(item.id)}
          activeOpacity={0.7}
        >
          {/* Unread dot */}
          {!item.is_read && <View style={styles.unreadDot} />}

          <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
            <Ionicons
              name={icon}
              size={20}
              color={!item.is_read ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <Text
                style={[
                  styles.cardTitle,
                  { fontFamily: !item.is_read ? f.bold : f.medium },
                ]}
                numberOfLines={1}
              >
                {title || (isAr ? 'إشعار' : 'Notification')}
              </Text>
              <Text style={[styles.cardTime, { fontFamily: f.regular }]}>
                {timeAgo(item.created_at, isAr)}
              </Text>
            </View>
            {body ? (
              <Text
                style={[
                  styles.cardBody,
                  { fontFamily: f.regular },
                  !item.is_read && styles.cardBodyUnread,
                ]}
                numberOfLines={2}
              >
                {body}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [isAr, f, handleMarkRead],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: f.bold }]}>
          {t('notifications')}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            hitSlop={8}
          >
            <Ionicons name="checkmark-done-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={[styles.errorText, { fontFamily: f.medium }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadNotifications}>
            <Text style={[styles.retryText, { fontFamily: f.semibold }]}>
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={56} color={Colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: f.bold }]}>
            {isAr ? 'لا توجد إشعارات بعد' : 'No notifications yet'}
          </Text>
          <Text style={[styles.emptyDesc, { fontFamily: f.regular }]}>
            {isAr
              ? 'ستظهر هنا إشعاراتك حول الفواتير والاستهلاك والتحديثات'
              : "You'll see updates about bills, usage, and more here"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Unread count banner */}
          {unreadCount > 0 && (
            <View style={styles.unreadBanner}>
              <Text style={[styles.unreadBannerText, { fontFamily: f.medium }]}>
                {isAr
                  ? `${unreadCount} إشعارات غير مقروءة`
                  : `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
              </Text>
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={[styles.markAllText, { fontFamily: f.semibold }]}>
                  {isAr ? 'قراءة الكل' : 'Mark all read'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {notifications.map(renderNotification)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text,
    fontSize: FontSize.xl,
  },
  headerSpacer: { width: 36 },
  markAllBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryText: {
    color: Colors.white,
    fontSize: FontSize.md,
  },

  // Empty state
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },

  // Unread banner
  unreadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  unreadBannerText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
  },
  markAllText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
  },

  // Notification card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: '#FAFBFF',
  },
  unreadDot: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconWrapUnread: {
    backgroundColor: Colors.primaryContainer,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    marginRight: Spacing.sm,
  },
  cardTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  cardBody: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  cardBodyUnread: {
    color: Colors.text,
  },
});
