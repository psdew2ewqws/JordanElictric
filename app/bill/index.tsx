import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { billApi } from '../../src/services/api';

interface Bill {
  id: string;
  totalAmountFils: number;
  totalKwh: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  source: 'SCAN' | 'MANUAL';
  createdAt: string;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function formatBillingPeriod(dateStr: string, isAr: boolean): string {
  try {
    const d = new Date(dateStr);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const monthName = isAr ? MONTH_NAMES_AR[monthIndex] : MONTH_NAMES_EN[monthIndex];
    return `${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}

function filsToJd(fils: number): string {
  return (fils / 1000).toFixed(2);
}

export default function BillHistoryScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => (isAr ? Math.max(11, en * 0.85) : en);

  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    try {
      setError(null);
      const data = await billApi.list(20, 0);
      setBills(data.bills || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load bills';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBills();
  }, [fetchBills]);

  const renderBillCard = useCallback(
    ({ item }: { item: Bill }) => {
      const periodLabel = item.billingPeriodStart
        ? formatBillingPeriod(item.billingPeriodStart, isAr)
        : isAr
          ? 'غير محدد'
          : 'Unknown';
      const amountJd = filsToJd(item.totalAmountFils);
      const isScanned = item.source === 'SCAN';

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push(`/bill/${item.id}`)}
        >
          {/* Left: period icon */}
          <View
            style={[
              styles.cardIcon,
              {
                backgroundColor: isScanned
                  ? Colors.primary + '10'
                  : Colors.success + '10',
              },
            ]}
          >
            <Ionicons
              name={isScanned ? 'scan-outline' : 'create-outline'}
              size={20}
              color={isScanned ? Colors.primary : Colors.success}
            />
          </View>

          {/* Center: period + kwh */}
          <View style={styles.cardCenter}>
            <Text
              style={[
                styles.cardPeriod,
                { fontFamily: fonts.bold, fontSize: sz(15) },
              ]}
            >
              {periodLabel}
            </Text>
            <Text
              style={[
                styles.cardKwh,
                { fontFamily: fonts.regular, fontSize: sz(12) },
              ]}
            >
              {item.totalKwh} {t('kwhUnit')}
            </Text>
          </View>

          {/* Right: amount + source badge */}
          <View style={styles.cardRight}>
            <Text
              style={[
                styles.cardAmount,
                { fontFamily: fonts.bold, fontSize: sz(16) },
              ]}
            >
              {amountJd} {t('jdUnit')}
            </Text>
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: isScanned
                    ? Colors.primary + '10'
                    : Colors.success + '10',
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceBadgeText,
                  {
                    color: isScanned ? Colors.primary : Colors.success,
                    fontFamily: fonts.medium,
                    fontSize: sz(10),
                  },
                ]}
              >
                {isScanned ? t('scanned') : t('manual')}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      );
    },
    [fonts, sz, t, isAr, router],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/bill/scan')}
        >
          <View style={styles.actionIconWrap}>
            <Ionicons name="scan-outline" size={22} color={Colors.primary} />
          </View>
          <Text
            style={[
              styles.actionBtnText,
              { fontFamily: fonts.semibold, fontSize: sz(13) },
            ]}
          >
            {t('scanBillBtn')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/bill/manual')}
        >
          <View style={styles.actionIconWrap}>
            <Ionicons
              name="create-outline"
              size={22}
              color={Colors.success}
            />
          </View>
          <Text
            style={[
              styles.actionBtnText,
              { fontFamily: fonts.semibold, fontSize: sz(13) },
            ]}
          >
            {t('enterManuallyBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [fonts, sz, t, router],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="receipt-outline"
            size={56}
            color={Colors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.emptyTitle,
            { fontFamily: fonts.bold, fontSize: sz(18) },
          ]}
        >
          {t('noBillsYet')}
        </Text>
        <Text
          style={[
            styles.emptyDesc,
            { fontFamily: fonts.regular, fontSize: sz(14) },
          ]}
        >
          {t('noBillsDesc')}
        </Text>
      </View>
    ),
    [fonts, sz, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: fonts.bold, fontSize: sz(18) },
          ]}
        >
          {t('billHistoryTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text
            style={[
              styles.loadingText,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
          >
            {t('loadingBill')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.danger}
          />
          <Text
            style={[
              styles.errorText,
              { fontFamily: fonts.medium, fontSize: sz(14) },
            ]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchBills();
            }}
          >
            <Text
              style={[
                styles.retryBtnText,
                { fontFamily: fonts.semibold, fontSize: sz(14) },
              ]}
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(item) => item.id}
          renderItem={renderBillCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
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
  },
  headerSpacer: { width: 36 },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: Colors.text,
    flex: 1,
  },

  // Bill card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    flex: 1,
  },
  cardPeriod: {
    color: Colors.text,
    marginBottom: 2,
  },
  cardKwh: {
    color: Colors.textMuted,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    color: Colors.text,
    marginBottom: 2,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  sourceBadgeText: {},

  // States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorText: {
    color: Colors.danger,
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
  retryBtnText: {
    color: Colors.white,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
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
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
