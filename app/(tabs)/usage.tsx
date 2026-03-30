import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { BarChart } from '../../src/components/BarChart';
import { mockAnalytics } from '../../src/utils/mockData';

type Period = 'monthly' | 'quarterly' | 'yearly';

export default function UsageScreen() {
  const [period, setPeriod] = useState<Period>('monthly');
  const analytics = mockAnalytics;

  const consumptionData = analytics.monthlyTrend.map((item, idx) => ({
    label: item.month,
    value: item.kwh,
    highlight: idx === analytics.monthlyTrend.length - 1,
  }));

  const costData = analytics.monthlyTrend.map((item, idx) => ({
    label: item.month,
    value: item.cost,
    highlight: idx === analytics.monthlyTrend.length - 1,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Usage</Text>
        <Text style={styles.subtitle}>Track your electricity consumption</Text>

        {/* Period Toggle */}
        <View style={styles.periodToggle}>
          {(['monthly', 'quarterly', 'yearly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Consumption Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Consumption (kWh)</Text>
          <BarChart
            data={consumptionData}
            color={Colors.primary}
            highlightColor={Colors.warning}
          />
          <View style={styles.avgRow}>
            <View style={styles.avgDot} />
            <Text style={styles.avgText}>
              Average: {Math.round(analytics.monthlyTrend.reduce((s, d) => s + d.kwh, 0) / analytics.monthlyTrend.length)} kWh
            </Text>
          </View>
        </View>

        {/* Tier Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Tier Breakdown</Text>
          <Text style={styles.chartSubtitle}>How your {analytics.monthlyTrend[analytics.monthlyTrend.length - 1]?.kwh} kWh is distributed across tariff tiers</Text>

          {analytics.tierBreakdown.map((tier) => {
            const totalKwh = analytics.tierBreakdown.reduce((s, t) => s + t.kwh, 0);
            const percentage = (tier.kwh / totalKwh) * 100;
            return (
              <View key={tier.tier} style={styles.tierRow}>
                <View style={styles.tierInfo}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <View>
                    <Text style={styles.tierLabel}>
                      Tier {tier.tier} · {tier.ratePerKwh} fils/kWh
                    </Text>
                    <Text style={styles.tierDetail}>
                      {tier.kwh} kWh · {tier.cost.toFixed(1)} JD
                    </Text>
                  </View>
                </View>
                <View style={styles.tierBarOuter}>
                  <View
                    style={[
                      styles.tierBarFill,
                      { width: `${percentage}%`, backgroundColor: tier.color },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.tierTotalRow}>
            <Text style={styles.tierTotalLabel}>Total Energy Charge</Text>
            <Text style={styles.tierTotalValue}>
              {analytics.tierBreakdown.reduce((s, t) => s + t.cost, 0).toFixed(1)} JD
            </Text>
          </View>
        </View>

        {/* Cost Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Cost Trend (JD)</Text>
          <Text style={styles.chartSubtitle}>Your bills over the last 6 months</Text>
          <BarChart
            data={costData}
            color={Colors.accent}
            highlightColor={Colors.warning}
            showValues={true}
          />
        </View>

        {/* Month Comparison */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>This Month vs Last Month</Text>
          <View style={styles.compareRow}>
            <ComparisonItem
              label="Consumption"
              current={320}
              previous={260}
              unit="kWh"
            />
            <ComparisonItem
              label="Cost"
              current={45.8}
              previous={28}
              unit="JD"
            />
            <ComparisonItem
              label="Avg Cost"
              current={143}
              previous={108}
              unit="fils/kWh"
            />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ComparisonItem({ label, current, previous, unit }: {
  label: string;
  current: number;
  previous: number;
  unit: string;
}) {
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const isUp = diff > 0;

  return (
    <View style={styles.compareItem}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareValue, { color: isUp ? Colors.danger : Colors.success }]}>
        {isUp ? '+' : ''}{diff % 1 === 0 ? diff : diff.toFixed(1)}
      </Text>
      <Text style={styles.compareUnit}>{unit}</Text>
      <Text style={[styles.comparePct, { color: isUp ? Colors.danger : Colors.success }]}>
        {isUp ? '↑' : '↓'} {Math.abs(pct)}%
      </Text>
    </View>
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

  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodTextActive: {
    color: Colors.white,
  },

  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  chartTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  chartSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  avgDot: {
    width: 8,
    height: 2,
    backgroundColor: Colors.textMuted,
  },
  avgText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },

  // Tier breakdown
  tierRow: {
    marginTop: Spacing.lg,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  tierDetail: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  tierBarOuter: {
    height: 10,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  tierBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  tierTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tierTotalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  tierTotalValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Comparison
  compareRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  compareItem: {
    flex: 1,
    alignItems: 'center',
  },
  compareLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  compareValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  compareUnit: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
  },
  comparePct: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
});
