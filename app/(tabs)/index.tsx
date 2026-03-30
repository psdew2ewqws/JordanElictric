import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { mockUser, mockCurrentBill, mockAnalytics } from '../../src/utils/mockData';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const bill = mockCurrentBill;
  const user = mockUser;
  const analytics = mockAnalytics;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userName}>{user.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="globe-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscriber Card */}
        <View style={styles.subscriberCard}>
          <View style={styles.subscriberTop}>
            <View>
              <Text style={styles.subscriberLabel}>Subscriber No.</Text>
              <Text style={styles.subscriberNumber}>{user.subscriberNumber}</Text>
              <Text style={styles.subscriberCompany}>{user.distributionCompany} · Amman</Text>
            </View>
            <View style={styles.billAmountBox}>
              <Text style={styles.billLabel}>Current Bill</Text>
              <Text style={styles.billAmount}>
                {bill.totalAmount.toFixed(1)} <Text style={styles.billCurrency}>JD</Text>
              </Text>
            </View>
          </View>
          <View style={styles.subscriberDivider} />
          <View style={styles.subscriberBottom}>
            <Text style={styles.billingPeriod}>
              Billing: {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}
            </Text>
            <Text style={styles.dueDate}>Due: {formatDate(bill.dueDate)}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/bill/scan')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight + '15' }]}>
              <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Scan Bill</Text>
            <Text style={styles.actionSubtitle}>Take a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/bill/manual')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.success + '15' }]}>
              <Ionicons name="create-outline" size={24} color={Colors.success} />
            </View>
            <Text style={styles.actionTitle}>Enter Manually</Text>
            <Text style={styles.actionSubtitle}>Type your bill</Text>
          </TouchableOpacity>
        </View>

        {/* Mini KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: Colors.primary }]}>{bill.totalKwh}</Text>
            <Text style={styles.kpiLabel}>kWh used</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: Colors.warning }]}>{analytics.costPerKwh}</Text>
            <Text style={styles.kpiLabel}>fils/kWh avg</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, { color: analytics.comparisonToAverage > 0 ? Colors.danger : Colors.success }]}>
              {analytics.comparisonToAverage > 0 ? '+' : ''}{analytics.comparisonToAverage}%
            </Text>
            <Text style={styles.kpiLabel}>vs last month</Text>
          </View>
        </View>

        {/* Bill Breakdown Preview */}
        <TouchableOpacity
          style={styles.breakdownCard}
          onPress={() => router.push(`/bill/${bill.id}`)}
        >
          <View style={styles.breakdownHeader}>
            <Text style={styles.sectionTitle}>Bill Breakdown</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
          {bill.lineItems.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={[styles.breakdownAmount, item.amount < 0 && { color: Colors.success }]}>
                {item.amount < 0 ? '' : ''}{item.amount.toFixed(2)} JD
              </Text>
            </View>
          ))}
          <Text style={styles.breakdownMore}>
            +{bill.lineItems.length - 3} more items · Tap to see full breakdown
          </Text>
        </TouchableOpacity>

        {/* Environmental Impact Mini */}
        <View style={styles.envCard}>
          <Text style={styles.sectionTitle}>Your Environmental Impact</Text>
          <View style={styles.envRow}>
            <View style={styles.envItem}>
              <Text style={styles.envIcon}>☁️</Text>
              <Text style={styles.envValue}>{analytics.environmentalImpact.co2Kg}</Text>
              <Text style={styles.envUnit}>kg CO₂</Text>
            </View>
            <View style={styles.envItem}>
              <Text style={styles.envIcon}>🌳</Text>
              <Text style={styles.envValue}>{analytics.environmentalImpact.treesNeeded}</Text>
              <Text style={styles.envUnit}>trees to offset</Text>
            </View>
            <View style={styles.envItem}>
              <Text style={styles.envIcon}>💧</Text>
              <Text style={styles.envValue}>{analytics.environmentalImpact.waterLiters}</Text>
              <Text style={styles.envUnit}>L water</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  userName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },

  // Subscriber Card
  subscriberCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  subscriberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subscriberLabel: {
    fontSize: FontSize.xs,
    color: '#93C5FD',
    fontWeight: '500',
  },
  subscriberNumber: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
    marginTop: 2,
  },
  subscriberCompany: {
    fontSize: FontSize.xs,
    color: '#93C5FD',
    marginTop: 2,
  },
  billAmountBox: {
    alignItems: 'flex-end',
  },
  billLabel: {
    fontSize: FontSize.xs,
    color: '#93C5FD',
    fontWeight: '500',
  },
  billAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 2,
  },
  billCurrency: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  subscriberDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: Spacing.md,
  },
  subscriberBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billingPeriod: {
    fontSize: FontSize.xs,
    color: '#BFDBFE',
  },
  dueDate: {
    fontSize: FontSize.xs,
    color: '#FBBF24',
    fontWeight: '600',
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Mini KPIs
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  breakdownLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  breakdownAmount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  breakdownMore: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    marginTop: Spacing.md,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Environmental
  envCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  envRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  envItem: {
    flex: 1,
    alignItems: 'center',
  },
  envIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  envValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  envUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
