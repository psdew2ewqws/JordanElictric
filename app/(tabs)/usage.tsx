import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGrad, Stop, Text as SvgText } from 'react-native-svg';
import { analyticsApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { mockAnalytics } from '../../src/utils/mockData';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 72; // padding + y-axis
const CHART_H = 140;
type Period = 'daily' | 'monthly' | 'yearly';

// Mock daily data (will come from SmartMeterDashboard API)
const MOCK_DAILY = [7,9,11,8,6,12,14,10,9,7,8,11,9,10,8,7,9,13,15,11,10,8,9,7,10,12,9,8,11,0];
const MOCK_DAILY_COST = MOCK_DAILY.map(kwh => +(kwh * 0.143).toFixed(2)); // avg 143 fils/kWh

export default function UsageScreen() {
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;
  const [period, setPeriod] = useState<Period>('daily');

  // API data states
  const [usage, setUsage] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [tierData, setTierData] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    analyticsApi.getCurrentUsage().then(setUsage).catch(() => {});
    analyticsApi.getTierBreakdown().then(setTierData).catch(() => {});
    analyticsApi.getComparison().then(setComparison).catch(() => {});
  }, []);

  useEffect(() => {
    analyticsApi.getUsageTrends(period === 'daily' ? 'monthly' : period)
      .then(setTrend).catch(() => {});
  }, [period]);

  // Use API data or fallback to mock
  const currentKwh = usage?.currentKwh ?? 267;
  const expectedBill = usage?.currentAmountJd ?? 38.5;
  const dailyAvg = +(currentKwh / 30).toFixed(1);
  const tierProgress = usage?.tierProgress ?? { tier: 1, percentage: 53, label: t('stillTier1') };

  const tiers = tierData?.tiers ?? mockAnalytics.tierBreakdown.map(t => ({
    ...t, label: `Tier ${t.tier}`, costJd: t.cost, amountFils: t.cost * 1000,
  }));

  const comp = comparison ?? {
    consumption: { current: 267, previous: 260, diff: 7, percentChange: 2.7 },
    cost: { currentJd: 38.5, previousJd: 36.2, diffJd: 2.3, percentChange: 6.3 },
  };

  // Build SVG line chart path from daily data
  const dailyData = MOCK_DAILY;
  const maxVal = Math.max(...dailyData.filter(v => v > 0));
  const avgVal = +(dailyData.filter(v => v > 0).reduce((s, v) => s + v, 0) / dailyData.filter(v => v > 0).length).toFixed(1);

  const points = dailyData.map((val, i) => {
    const x = (i / (dailyData.length - 1)) * CHART_W;
    const y = val > 0 ? CHART_H - (val / maxVal) * (CHART_H - 10) : CHART_H;
    return { x, y, val };
  });

  // Build smooth line path
  const linePath = points.filter(p => p.val > 0).map((p, i) =>
    i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
  ).join(' ');

  // Area path (fill under line)
  const lastValid = points.filter(p => p.val > 0);
  const areaPath = linePath + ` L${lastValid[lastValid.length - 1]?.x ?? 0},${CHART_H} L${lastValid[0]?.x ?? 0},${CHART_H} Z`;

  const avgY = CHART_H - (avgVal / maxVal) * (CHART_H - 10);

  // Find spikes (> avg * 1.3)
  const spikeThreshold = avgVal * 1.3;

  // Weekday/weekend cost split
  const weekdayCost = +(MOCK_DAILY_COST.filter((_, i) => i % 7 < 5).reduce((s, v) => s + v, 0) / 22).toFixed(2);
  const weekendCost = +(MOCK_DAILY_COST.filter((_, i) => i % 7 >= 5).reduce((s, v) => s + v, 0) / 8).toFixed(2);
  const cheapestDay = MOCK_DAILY_COST.filter(v => v > 0).reduce((min, v, i) => v < min.v ? { v, i } : min, { v: 999, i: 0 });
  const expensiveDay = MOCK_DAILY_COST.reduce((max, v, i) => v > max.v ? { v, i } : max, { v: 0, i: 0 });

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* === HEADER === */}
        <LinearGradient colors={['#0F2440', '#1B4965']} style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerPad}>
            <View style={styles.topRow}>
              <View>
                <Text style={[styles.hdrTitle, { fontFamily: fonts.bold, fontSize: sz(20) }]}>
                  {t('usageTitle')}
                </Text>
                <Text style={[styles.hdrSub, { fontFamily: fonts.regular, fontSize: sz(11) }]}>
                  {t('usageSubtitle')}
                </Text>
              </View>
              <LanguageToggle variant="dark" />
            </View>

            {/* Summary cards */}
            <View style={styles.sumRow}>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium }]}>{t('consumption')}</Text>
                <Text style={[styles.sumVal, { fontFamily: fonts.bold }]}>{currentKwh}</Text>
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>kWh</Text>
                <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: comp.consumption.diff > 0 ? '#FCA5A5' : '#6EE7B7' }]}>
                  {comp.consumption.diff > 0 ? '↑' : '↓'} {Math.abs(comp.consumption.percentChange)}% vs last
                </Text>
              </View>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium }]}>Expected Bill</Text>
                <Text style={[styles.sumVal, { fontFamily: fonts.bold }]}>{expectedBill}</Text>
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>JD</Text>
                <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: comp.cost.diffJd > 0 ? '#FCA5A5' : '#6EE7B7' }]}>
                  {comp.cost.diffJd > 0 ? '↑' : '↓'} {Math.abs(comp.cost.percentChange)}%
                </Text>
              </View>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium }]}>Daily Avg</Text>
                <Text style={[styles.sumVal, { fontFamily: fonts.bold }]}>{dailyAvg}</Text>
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>kWh/day</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>
          {/* Period toggle */}
          <View style={styles.periodRow}>
            {(['daily', 'monthly', 'yearly'] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, { fontFamily: fonts.semibold, fontSize: sz(11) }, period === p && styles.periodTextActive]}>
                  {p === 'daily' ? 'Daily' : p === 'monthly' ? t('monthly') : t('yearly')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* === DAILY CONSUMPTION TIMELINE === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              Daily Consumption
            </Text>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              Real-time data from your smart meter
            </Text>

            <View style={styles.chartWrap}>
              {/* Y-axis */}
              <View style={styles.yAxis}>
                {[maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map((v, i) => (
                  <Text key={i} style={[styles.yLabel, { fontFamily: fonts.regular }]}>{v}</Text>
                ))}
              </View>

              {/* SVG Chart */}
              <View style={styles.chartSvg}>
                <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                  <Defs>
                    <SvgGrad id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#1B4965" stopOpacity={0.15} />
                      <Stop offset="100%" stopColor="#1B4965" stopOpacity={0.02} />
                    </SvgGrad>
                  </Defs>

                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                    <Line key={i} x1={0} y1={CHART_H * (1 - pct)} x2={CHART_W} y2={CHART_H * (1 - pct)} stroke="#E8ECF0" strokeWidth={0.5} />
                  ))}

                  {/* Average line */}
                  <Line x1={0} y1={avgY} x2={CHART_W} y2={avgY} stroke="#94A9B8" strokeWidth={0.8} strokeDasharray="4,3" />
                  <SvgText x={CHART_W - 20} y={avgY - 4} fontSize={7} fill="#94A9B8">{avgVal} avg</SvgText>

                  {/* Area fill */}
                  <Path d={areaPath} fill="url(#areaFill)" />

                  {/* Line */}
                  <Path d={linePath} stroke="#1B4965" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Spike dots */}
                  {points.filter(p => p.val > spikeThreshold).map((p, i) => (
                    <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={p.val > maxVal * 0.85 ? '#DC2626' : '#D97706'} stroke="#fff" strokeWidth={1.5} />
                  ))}

                  {/* Today dot (last point, dashed) */}
                  <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill="none" stroke="#94A9B8" strokeWidth={1.5} strokeDasharray="2,2" />
                </Svg>
              </View>
            </View>

            {/* X-axis */}
            <View style={styles.xAxis}>
              {[1, 5, 10, 15, 20, 25, 30].map(d => (
                <Text key={d} style={[styles.xLabel, { fontFamily: fonts.regular }]}>{d}</Text>
              ))}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#1B4965' }]} /><Text style={[styles.legendText, { fontFamily: fonts.regular }]}>Normal</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#D97706' }]} /><Text style={[styles.legendText, { fontFamily: fonts.regular }]}>Above avg</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#DC2626' }]} /><Text style={[styles.legendText, { fontFamily: fonts.regular }]}>Spike</Text></View>
            </View>
          </View>

          {/* === TIER POSITION === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              {t('tierBreakdown')}
            </Text>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              {t('tierBreakdownDesc')}
            </Text>

            {/* Tier bar */}
            <View style={styles.tierTrack}>
              <View style={[styles.tierSeg, { flex: 300, backgroundColor: '#059669' }]}>
                <Text style={[styles.tierSegLabel, { fontFamily: fonts.semibold }]}>T1 · 50f</Text>
              </View>
              <View style={[styles.tierSeg, { flex: 300, backgroundColor: '#D97706' }]}>
                <Text style={[styles.tierSegLabel, { fontFamily: fonts.semibold }]}>T2 · 100f</Text>
              </View>
              <View style={[styles.tierSeg, { flex: 200, backgroundColor: '#DC2626' }]}>
                <Text style={[styles.tierSegLabel, { fontFamily: fonts.semibold }]}>T3 · 200f</Text>
              </View>
              <View style={[styles.tierNeedle, { left: `${tierProgress.percentage}%` }]} />
            </View>
            <View style={styles.tierLabels}>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>0</Text>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>300 kWh</Text>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>600 kWh</Text>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>800+</Text>
            </View>

            {/* Tier info cards */}
            <View style={styles.tierInfo}>
              {[
                { label: 'Tier 1', kwh: currentKwh > 300 ? 300 : currentKwh, cost: Math.min(currentKwh, 300) * 0.05, color: '#059669', bg: 'rgba(5,150,105,0.06)' },
                { label: 'Tier 2', kwh: currentKwh > 300 ? Math.min(currentKwh - 300, 300) : 0, cost: currentKwh > 300 ? Math.min(currentKwh - 300, 300) * 0.1 : 0, color: '#D97706', bg: 'rgba(217,119,6,0.06)' },
                { label: 'Tier 3', kwh: currentKwh > 600 ? currentKwh - 600 : 0, cost: currentKwh > 600 ? (currentKwh - 600) * 0.2 : 0, color: '#DC2626', bg: 'rgba(220,38,38,0.06)' },
              ].map(tier => (
                <View key={tier.label} style={[styles.tierInfoCard, { backgroundColor: tier.bg }]}>
                  <Text style={[styles.ticLabel, { fontFamily: fonts.medium }]}>{tier.label}</Text>
                  <Text style={[styles.ticVal, { fontFamily: fonts.bold, color: tier.color }]}>{tier.kwh}</Text>
                  <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>kWh · {tier.cost.toFixed(1)} JD</Text>
                </View>
              ))}
            </View>
          </View>

          {/* === EXPECTED BILL === */}
          <LinearGradient colors={['#1B4965', '#2A6F8E']} style={styles.billCard}>
            <Text style={[styles.billLabel, { fontFamily: fonts.medium }]}>Expected Bill This Month</Text>
            <View style={styles.billRow}>
              <Text style={[styles.billVal, { fontFamily: fonts.bold }]}>~{expectedBill} <Text style={styles.billJd}>JD</Text></Text>
              <View style={styles.billBadge}>
                <Ionicons name="bar-chart-outline" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.billBadgeText, { fontFamily: fonts.medium }]}>Based on current pace</Text>
              </View>
            </View>
            <Text style={[styles.billSub, { fontFamily: fonts.regular }]}>
              {currentKwh < 300 ? `Reduce ${300 - currentKwh > 33 ? 33 : 300 - currentKwh} kWh to stay in Tier 1 and save ~3.3 JD` : 'You\'ve crossed into Tier 2 pricing'}
            </Text>
          </LinearGradient>

          {/* === DAILY COST === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              Average Cost Per Day
            </Text>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              How much your electricity costs you daily
            </Text>

            <View style={styles.costRow}>
              <View style={styles.costBig}>
                <Text style={[styles.costVal, { fontFamily: fonts.bold }]}>{(expectedBill / 30).toFixed(2)}</Text>
                <Text style={[styles.costUnit, { fontFamily: fonts.regular }]}>JD / day</Text>
              </View>
              <View style={styles.costSep} />
              <View style={styles.costBreakdown}>
                <View style={styles.costLine}>
                  <Text style={[styles.costLineLabel, { fontFamily: fonts.regular }]}>Weekdays</Text>
                  <Text style={[styles.costLineVal, { fontFamily: fonts.bold }]}>{weekdayCost} JD</Text>
                </View>
                <View style={styles.costBar}><View style={[styles.costBarFill, { width: `${(weekdayCost / Math.max(weekdayCost, weekendCost)) * 100}%`, backgroundColor: '#1B4965' }]} /></View>
                <View style={[styles.costLine, { marginTop: 8 }]}>
                  <Text style={[styles.costLineLabel, { fontFamily: fonts.regular }]}>Weekends</Text>
                  <Text style={[styles.costLineVal, { fontFamily: fonts.bold, color: '#D97706' }]}>{weekendCost} JD</Text>
                </View>
                <View style={styles.costBar}><View style={[styles.costBarFill, { width: `${(weekendCost / Math.max(weekdayCost, weekendCost)) * 100}%`, backgroundColor: '#D97706' }]} /></View>
              </View>
            </View>

            <View style={styles.costChips}>
              <View style={[styles.costChip, { backgroundColor: 'rgba(5,150,105,0.05)' }]}>
                <Text style={[styles.chipLabel, { fontFamily: fonts.medium }]}>CHEAPEST DAY</Text>
                <Text style={[styles.chipVal, { fontFamily: fonts.bold, color: '#059669' }]}>{cheapestDay.v.toFixed(2)} JD</Text>
                <Text style={[styles.chipDate, { fontFamily: fonts.regular }]}>Day {cheapestDay.i + 1}</Text>
              </View>
              <View style={[styles.costChip, { backgroundColor: 'rgba(220,38,38,0.05)' }]}>
                <Text style={[styles.chipLabel, { fontFamily: fonts.medium }]}>MOST EXPENSIVE</Text>
                <Text style={[styles.chipVal, { fontFamily: fonts.bold, color: '#DC2626' }]}>{expensiveDay.v.toFixed(2)} JD</Text>
                <Text style={[styles.chipDate, { fontFamily: fonts.regular }]}>Day {expensiveDay.i + 1}</Text>
              </View>
            </View>
          </View>

          {/* === METER READINGS === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              Meter Readings
            </Text>
            <View style={styles.meterRow}>
              <View style={styles.meterCard}>
                <Text style={[styles.meterLabel, { fontFamily: fonts.medium }]}>Previous</Text>
                <Text style={[styles.meterVal, { fontFamily: fonts.bold }]}>286,000</Text>
                <Text style={[styles.meterDate, { fontFamily: fonts.regular }]}>1 Mar 2026</Text>
              </View>
              <View style={styles.meterCard}>
                <Text style={[styles.meterLabel, { fontFamily: fonts.medium }]}>Current</Text>
                <Text style={[styles.meterVal, { fontFamily: fonts.bold }]}>286,{currentKwh}</Text>
                <Text style={[styles.meterDate, { fontFamily: fonts.regular }]}>30 Mar 2026</Text>
              </View>
            </View>
          </View>

          {/* === MONTH COMPARISON === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              {t('thisMonthVsLast')}
            </Text>
            <View style={styles.cmpGrid}>
              <CmpItem label={t('consumption')} diff={comp.consumption.diff} pct={comp.consumption.percentChange} unit="kWh" fonts={fonts} />
              <CmpItem label={t('cost')} diff={comp.cost.diffJd} pct={comp.cost.percentChange} unit="JD" fonts={fonts} />
            </View>
          </View>

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function CmpItem({ label, diff, pct, unit, fonts }: { label: string; diff: number; pct: number; unit: string; fonts: any }) {
  const isUp = diff > 0;
  return (
    <View style={styles.cmpItem}>
      <Text style={[styles.cmpLabel, { fontFamily: fonts.medium }]}>{label}</Text>
      <Text style={[styles.cmpVal, { fontFamily: fonts.bold, color: isUp ? '#DC2626' : '#059669' }]}>
        {isUp ? '+' : ''}{typeof diff === 'number' && diff % 1 !== 0 ? diff.toFixed(1) : diff}
      </Text>
      <Text style={[styles.cmpUnit, { fontFamily: fonts.regular }]}>{unit}</Text>
      <View style={[styles.cmpBadge, { backgroundColor: isUp ? '#FEE2E2' : '#D1FAE5' }]}>
        <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={10} color={isUp ? '#DC2626' : '#059669'} />
        <Text style={[styles.cmpPct, { fontFamily: fonts.semibold, color: isUp ? '#DC2626' : '#059669' }]}>{Math.abs(pct)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F5F7' },

  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerPad: { paddingHorizontal: 20, paddingBottom: 22 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  hdrTitle: { color: '#fff', letterSpacing: -0.3, textAlign: 'left', writingDirection: 'ltr' },
  hdrSub: { color: 'rgba(255,255,255,0.4)', marginTop: 2, textAlign: 'left', writingDirection: 'ltr' },

  sumRow: { flexDirection: 'row', gap: 6, marginTop: 18 },
  sumCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, alignItems: 'center' },
  sumLabel: { fontSize: 8, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.3 },
  sumVal: { fontSize: 20, color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  sumUnit: { fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1 },
  sumChange: { fontSize: 8, marginTop: 3 },

  body: { paddingHorizontal: 16, paddingTop: 16 },
  periodRow: { flexDirection: 'row', backgroundColor: '#E4E9ED', borderRadius: 10, padding: 3, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  periodActive: { backgroundColor: '#1B4965' },
  periodText: { color: '#6B8499' },
  periodTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  cardTitle: { color: '#0C1E2D', marginBottom: 2, textAlign: 'left', writingDirection: 'ltr' },
  cardSub: { color: '#94A9B8', marginBottom: 10, textAlign: 'left', writingDirection: 'ltr' },

  // Chart
  chartWrap: { flexDirection: 'row', marginTop: 8 },
  yAxis: { width: 28, justifyContent: 'space-between', paddingRight: 4 },
  yLabel: { fontSize: 7, color: '#94A9B8', textAlign: 'right' },
  chartSvg: { flex: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 30, marginTop: 4 },
  xLabel: { fontSize: 7, color: '#94A9B8' },

  legend: { flexDirection: 'row', gap: 14, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 14, height: 2, borderRadius: 1 },
  legendText: { fontSize: 8, color: '#6B8499' },

  // Tier
  tierTrack: { height: 22, borderRadius: 11, flexDirection: 'row', overflow: 'hidden', position: 'relative', marginTop: 10 },
  tierSeg: { alignItems: 'center', justifyContent: 'center' },
  tierSegLabel: { fontSize: 7, color: '#fff' },
  tierNeedle: { position: 'absolute', top: -3, width: 2, height: 28, backgroundColor: '#0C1E2D', borderRadius: 1 },
  tierLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tierLabel: { fontSize: 7, color: '#94A9B8' },
  tierInfo: { flexDirection: 'row', gap: 6, marginTop: 10 },
  tierInfoCard: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  ticLabel: { fontSize: 7, color: '#6B8499', textTransform: 'uppercase' },
  ticVal: { fontSize: 14, marginTop: 2 },
  ticSub: { fontSize: 7, color: '#94A9B8', marginTop: 1 },

  // Bill
  billCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  billLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  billVal: { fontSize: 26, color: '#fff', letterSpacing: -0.5 },
  billJd: { fontSize: 11 },
  billBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  billBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  billSub: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 6 },

  // Cost
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 12 },
  costBig: { flex: 1, alignItems: 'center' },
  costVal: { fontSize: 30, color: '#1B4965', letterSpacing: -1 },
  costUnit: { fontSize: 9, color: '#94A9B8', marginTop: 2 },
  costSep: { width: 1, height: 40, backgroundColor: '#E8ECF0' },
  costBreakdown: { flex: 1.5 },
  costLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  costLineLabel: { fontSize: 9, color: '#6B8499' },
  costLineVal: { fontSize: 11, color: '#0C1E2D' },
  costBar: { height: 4, backgroundColor: '#F2F5F7', borderRadius: 2, overflow: 'hidden' },
  costBarFill: { height: '100%', borderRadius: 2 },
  costChips: { flexDirection: 'row', gap: 6, marginTop: 12 },
  costChip: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  chipLabel: { fontSize: 7, color: '#6B8499', textTransform: 'uppercase', letterSpacing: 0.3 },
  chipVal: { fontSize: 13, marginTop: 2 },
  chipDate: { fontSize: 7, color: '#94A9B8', marginTop: 1 },

  // Meter
  meterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  meterCard: { flex: 1, backgroundColor: '#F2F5F7', borderRadius: 10, padding: 10, alignItems: 'center' },
  meterLabel: { fontSize: 8, color: '#94A9B8', textTransform: 'uppercase' },
  meterVal: { fontSize: 15, color: '#0C1E2D', marginTop: 2, letterSpacing: 0.5 },
  meterDate: { fontSize: 7, color: '#94A9B8', marginTop: 2 },

  // Comparison
  cmpGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cmpItem: { flex: 1, alignItems: 'center' },
  cmpLabel: { fontSize: 9, color: '#94A9B8', marginBottom: 6 },
  cmpVal: { fontSize: 20, letterSpacing: -0.5 },
  cmpUnit: { fontSize: 8, color: '#94A9B8', marginTop: 1 },
  cmpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  cmpPct: { fontSize: 9 },
});
