import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { KpiCard } from '../../src/components/KpiCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { mockAnalytics, mockCurrentBill } from '../../src/utils/mockData';

export default function InsightsScreen() {
  const analytics = mockAnalytics;
  const bill = mockCurrentBill;
  const env = analytics.environmentalImpact;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>Understand your electricity like never before</Text>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Cost per kWh"
            value={String(analytics.costPerKwh)}
            unit="fils"
            subtitle="National avg: 120 fils"
            valueColor={Colors.primary}
          />
          <KpiCard
            label="Projected Next Bill"
            value={`~${analytics.projectedNextBill}`}
            unit="JD"
            subtitle="↑ 13% from current"
            valueColor={Colors.warning}
            subtitleColor={Colors.danger}
          />
          <KpiCard
            label="vs Similar Homes"
            value={`+${analytics.comparisonToAverage}%`}
            subtitle="Above average"
            valueColor={Colors.danger}
            subtitleColor={Colors.danger}
          />
          <KpiCard
            label="Peak / Off-Peak"
            value={`${analytics.peakOffPeakSplit.peak}/${analytics.peakOffPeakSplit.offPeak}`}
            subtitle="% peak / % off-peak"
            valueColor={Colors.accent}
          />
        </View>

        {/* Appliance Estimates */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Estimated Appliance Usage</Text>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
          </View>
          <Text style={styles.cardSubtitle}>
            Based on your {bill.totalKwh} kWh and typical Jordanian household patterns
          </Text>

          <View style={styles.applianceList}>
            {analytics.applianceEstimates.map((appliance) => (
              <View key={appliance.name} style={styles.applianceRow}>
                <View style={styles.applianceInfo}>
                  <Text style={styles.applianceIcon}>{appliance.icon}</Text>
                  <View>
                    <Text style={styles.applianceName}>{appliance.name}</Text>
                    <Text style={styles.applianceKwh}>~{appliance.kwhEstimate} kWh</Text>
                  </View>
                </View>
                <Text style={[styles.appliancePct, { color: appliance.color }]}>
                  {appliance.percentage}%
                </Text>
              </View>
            ))}
          </View>

          {/* Visual bar */}
          <View style={styles.applianceBar}>
            {analytics.applianceEstimates.map((a) => (
              <View
                key={a.name}
                style={[
                  styles.applianceBarSegment,
                  { flex: a.percentage, backgroundColor: a.color },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Environmental Impact */}
        <View style={styles.envCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: Colors.white }]}>
              🌍  Your Environmental Impact
            </Text>
          </View>
          <Text style={styles.envSubtitle}>
            Based on your electricity consumption this month
          </Text>

          <View style={styles.envGrid}>
            <View style={styles.envItem}>
              <View style={styles.envIconBg}>
                <Text style={{ fontSize: 20 }}>☁️</Text>
              </View>
              <Text style={styles.envValue}>{env.co2Kg}</Text>
              <Text style={styles.envUnit}>kg CO₂</Text>
              <Text style={styles.envDesc}>emitted</Text>
            </View>
            <View style={styles.envItem}>
              <View style={styles.envIconBg}>
                <Text style={{ fontSize: 20 }}>🌳</Text>
              </View>
              <Text style={styles.envValue}>{env.treesNeeded}</Text>
              <Text style={styles.envUnit}>trees</Text>
              <Text style={styles.envDesc}>to offset</Text>
            </View>
            <View style={styles.envItem}>
              <View style={styles.envIconBg}>
                <Text style={{ fontSize: 20 }}>💧</Text>
              </View>
              <Text style={styles.envValue}>{env.waterLiters}</Text>
              <Text style={styles.envUnit}>liters</Text>
              <Text style={styles.envDesc}>water used</Text>
            </View>
          </View>

          {/* Comparison */}
          <View style={styles.envCompare}>
            <View style={styles.envCompareItem}>
              <Text style={styles.envCompareLabel}>vs Last Month</Text>
              <Text style={[styles.envCompareValue, { color: '#FCA5A5' }]}>
                +{env.co2ChangeFromLastMonth} kg CO₂ ↑
              </Text>
            </View>
            <View style={styles.envCompareDivider} />
            <View style={styles.envCompareItem}>
              <Text style={styles.envCompareLabel}>If you save 60 kWh</Text>
              <Text style={[styles.envCompareValue, { color: '#6EE7B7' }]}>
                −36 kg CO₂ ↓
              </Text>
            </View>
          </View>
        </View>

        {/* Savings Card */}
        <View style={styles.savingsCard}>
          <Ionicons name="trending-down" size={24} color={Colors.success} />
          <View style={styles.savingsContent}>
            <Text style={styles.savingsTitle}>Savings Potential</Text>
            <Text style={styles.savingsAmount}>
              Save ~{analytics.savingsPotential.reduce((s, t) => s + t.potentialSavingsJd, 0).toFixed(1)} JD/month
            </Text>
            <Text style={styles.savingsDesc}>
              + {Math.round(analytics.savingsPotential.reduce((s, t) => s + t.potentialSavingsKwh, 0) * 0.6)} kg less CO₂
            </Text>
          </View>
          <TouchableOpacity style={styles.savingsBtn}>
            <Text style={styles.savingsBtnText}>View Tips</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Tips Preview */}
        {analytics.savingsPotential.map((tip) => (
          <View key={tip.id} style={styles.tipCard}>
            <View style={styles.tipBadge}>
              <Text style={styles.tipBadgeText}>
                Save {tip.potentialSavingsJd} JD
              </Text>
            </View>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDesc}>{tip.description}</Text>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.xl },

  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    paddingTop: Spacing.xl,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    marginTop: 2,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },

  // Appliance
  applianceList: {
    gap: Spacing.md,
  },
  applianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applianceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  applianceIcon: {
    fontSize: 22,
  },
  applianceName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  applianceKwh: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  appliancePct: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  applianceBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    gap: 2,
  },
  applianceBarSegment: {
    borderRadius: Radius.full,
  },

  // Environmental
  envCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  envSubtitle: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  envGrid: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  envItem: {
    flex: 1,
    alignItems: 'center',
  },
  envIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  envValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  envUnit: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 1,
  },
  envDesc: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  envCompare: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  envCompareItem: {
    flex: 1,
  },
  envCompareDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: Spacing.md,
  },
  envCompareLabel: {
    fontSize: FontSize.xs,
    color: '#64748B',
    marginBottom: 4,
  },
  envCompareValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  // Savings
  savingsCard: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  savingsContent: {
    flex: 1,
  },
  savingsTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.success,
  },
  savingsAmount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  savingsDesc: {
    fontSize: FontSize.xs,
    color: Colors.success,
    marginTop: 1,
  },
  savingsBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  savingsBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.white,
  },

  // Tips
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  tipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tipBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.success,
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tipDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
