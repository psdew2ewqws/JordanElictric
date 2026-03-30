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
import { useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { mockCurrentBill, mockAnalytics } from '../../src/utils/mockData';

const categoryColors: Record<string, string> = {
  energy_tier1: Colors.tierGreen,
  energy_tier2: Colors.tierYellow,
  energy_tier3: Colors.tierRed,
  fuel_clause: Colors.chart2,
  rural_fee: Colors.textMuted,
  subsidy_deduction: Colors.success,
  tax: Colors.warning,
  other: Colors.textSecondary,
};

const categoryIcons: Record<string, string> = {
  energy_tier1: '⚡',
  energy_tier2: '⚡',
  energy_tier3: '⚡',
  fuel_clause: '⛽',
  rural_fee: '🏘️',
  subsidy_deduction: '🎁',
  tax: '🏛️',
  other: '📋',
};

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams();
  const bill = mockCurrentBill;

  const energyItems = bill.lineItems.filter(i => i.category.startsWith('energy_'));
  const otherItems = bill.lineItems.filter(i => !i.category.startsWith('energy_'));
  const energyTotal = energyItems.reduce((s, i) => s + i.amount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Bill Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Total Bill</Text>
              <Text style={styles.summaryAmount}>
                {bill.totalAmount.toFixed(2)} <Text style={styles.summaryCurrency}>JD</Text>
              </Text>
            </View>
            <View style={styles.summaryBadge}>
              <Ionicons
                name={bill.source === 'scan' ? 'camera' : 'create'}
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.summaryBadgeText}>
                {bill.source === 'scan' ? 'Scanned' : 'Manual'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Period</Text>
              <Text style={styles.metaValue}>
                {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Consumption</Text>
              <Text style={styles.metaValue}>{bill.totalKwh} kWh</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Avg Cost</Text>
              <Text style={styles.metaValue}>{Math.round((bill.totalAmount / bill.totalKwh) * 1000)} fils/kWh</Text>
            </View>
          </View>
        </View>

        {/* Energy Charges */}
        <Text style={styles.sectionTitle}>Energy Charges</Text>
        <Text style={styles.sectionSubtitle}>How your {bill.totalKwh} kWh is priced across tariff tiers</Text>
        <View style={styles.card}>
          {energyItems.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.lineItem}>
                <View style={styles.lineLeft}>
                  <View style={[styles.lineDot, { backgroundColor: categoryColors[item.category] }]} />
                  <View>
                    <Text style={styles.lineLabel}>{item.label}</Text>
                    {item.kwh && (
                      <Text style={styles.lineDetail}>
                        {item.kwh} kWh × {item.ratePerKwh} fils
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.lineAmount}>{item.amount.toFixed(2)} JD</Text>
              </View>
              {idx < energyItems.length - 1 && <View style={styles.lineDivider} />}
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Energy Subtotal</Text>
            <Text style={styles.totalValue}>{energyTotal.toFixed(2)} JD</Text>
          </View>
        </View>

        {/* Tier Visualization */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tier Usage</Text>
          <View style={styles.tierBar}>
            {energyItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.tierSegment,
                  {
                    flex: item.kwh || 1,
                    backgroundColor: categoryColors[item.category],
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.tierLegend}>
            {energyItems.map((item) => (
              <View key={item.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: categoryColors[item.category] }]} />
                <Text style={styles.legendText}>
                  {item.kwh} kWh @ {item.ratePerKwh} fils
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Other Charges */}
        <Text style={styles.sectionTitle}>Other Charges & Adjustments</Text>
        <Text style={styles.sectionSubtitle}>Fees, taxes, and subsidies applied to your bill</Text>
        <View style={styles.card}>
          {otherItems.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.lineItem}>
                <View style={styles.lineLeft}>
                  <Text style={styles.lineIcon}>{categoryIcons[item.category]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineLabel}>{item.label}</Text>
                    <Text style={styles.lineExplanation}>
                      {getExplanation(item.category)}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.lineAmount,
                  item.amount < 0 && { color: Colors.success },
                ]}>
                  {item.amount < 0 ? '' : ''}{item.amount.toFixed(2)} JD
                </Text>
              </View>
              {idx < otherItems.length - 1 && <View style={styles.lineDivider} />}
            </View>
          ))}
        </View>

        {/* Grand Total */}
        <View style={styles.grandTotalCard}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={styles.grandTotalAmount}>{bill.totalAmount.toFixed(2)} JD</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="download-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getExplanation(category: string): string {
  const explanations: Record<string, string> = {
    fuel_clause: 'Monthly adjustment based on fuel cost changes for power generation',
    rural_fee: '1 fil/kWh fee supporting electricity infrastructure in rural areas',
    subsidy_deduction: 'Government subsidy for registered Jordanian households',
    tax: 'Government taxes and municipal fees',
    other: 'Additional charges',
  };
  return explanations[category] || '';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.xl },

  // Summary
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: '#93C5FD',
  },
  summaryAmount: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 2,
  },
  summaryCurrency: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  summaryBadgeText: {
    fontSize: FontSize.xs,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  summaryMeta: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    gap: Spacing.lg,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: '#93C5FD',
  },
  metaValue: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: '600',
    marginTop: 2,
  },

  // Sections
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  // Line Items
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  lineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineIcon: {
    fontSize: 18,
  },
  lineLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  lineDetail: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  lineExplanation: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
    lineHeight: 16,
  },
  lineAmount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  lineDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Tier bar
  tierBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: Radius.full,
    overflow: 'hidden',
    gap: 2,
  },
  tierSegment: {
    borderRadius: Radius.full,
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Grand Total
  grandTotalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  grandTotalLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#BFDBFE',
  },
  grandTotalAmount: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
