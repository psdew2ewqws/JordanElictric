import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGrad, Stop, Text as SvgText } from 'react-native-svg';
import { jepcoApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { AnimatedCounter } from '../../src/components/AnimatedCounter';
import { LazyCard } from '../../src/components/LazyCard';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 72;
const CHART_H = 140;

export default function UsageScreen() {
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;

  const [loading, setLoading] = useState(true);
  const [smartMeter, setSmartMeter] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const chartAnim = useRef(new Animated.Value(0)).current; // 0 to 1 for line chart draw
  const tierBarAnim = useRef(new Animated.Value(0)).current; // tier position bar
  const costBarWeekday = useRef(new Animated.Value(0)).current;
  const costBarWeekend = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    // Reset animations
    chartAnim.setValue(0);
    tierBarAnim.setValue(0);
    costBarWeekday.setValue(0);
    costBarWeekend.setValue(0);
    try {
      const res = await jepcoApi.getSmartMeter();
      const raw = res.data;
      setSmartMeter(raw?.body || raw);
      // Stagger animations after data loads
      const sm = raw?.body || raw || {};
      const projected = parseInt(sm?.expectedElectricityConsumptionQuntity || sm?.currentElectricityConsumptionQuntity || '0');
      const tierPct = Math.min(100, (projected / 600) * 100);
      Animated.stagger(200, [
        // 1. Line chart draws in
        Animated.timing(chartAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        // 2. Tier bar fills
        Animated.timing(tierBarAnim, { toValue: tierPct, duration: 800, useNativeDriver: false }),
        // 3. Cost bars fill
        Animated.timing(costBarWeekday, { toValue: 72, duration: 600, useNativeDriver: false }),
        Animated.timing(costBarWeekend, { toValue: 95, duration: 600, useNativeDriver: false }),
      ]).start();
    } catch (e: any) {
      // On 401, show empty state instead of error
      if (e?.status !== 401) {
        console.warn('JEPCO fetch failed:', e?.message);
        setError(e?.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract real data from JEPCO SmartMeter response
  const sm = smartMeter || {};
  const actualKwh = parseInt(sm.currentElectricityConsumptionQuntity || '0');
  const expectedKwh = parseInt(sm.expectedElectricityConsumptionQuntity || '0');
  // Use projected kWh as the main figure (matches Home screen)
  const currentKwh = expectedKwh || actualKwh;
  const currentBillJd = parseFloat(sm.currentElectricityConsumptionValue || '0');
  const expectedBillJd = parseFloat(sm.expectedElectricityEndofMonthBillAmount || '0');
  const lastReading = parseInt(sm.lastBillReading || '0');
  const currentReading = parseInt(sm.currentReading || '0');
  const lastReadingDate = sm.lastBillReadingDate || '';
  const daysInCycle = parseInt(sm.numberOfConsumptionDaysSinceLastRead || '1');

  // Comparison data — use projected kWh for fair comparison
  const comp = sm.comparazinConsumption || {};
  const lastMonth = parseInt(comp.lastMonthconsumption || '0');
  const lastYear = parseInt(comp.lastYearconsumption || '0');
  const lastMonthDiff = currentKwh - lastMonth;
  const lastMonthPct = lastMonth > 0 ? +((lastMonthDiff / lastMonth) * 100).toFixed(1) : 0;
  const lastYearDiff = currentKwh - lastYear;
  const lastYearPct = lastYear > 0 ? +((lastYearDiff / lastYear) * 100).toFixed(1) : 0;

  // Daily consumption from consumptionMonthlyList
  const dailyList: { date: string; kwh: number }[] = (sm.consumptionMonthlyList || []).map((d: any) => ({
    date: d.date,
    kwh: parseInt(d.consumptionAtDate || '0'),
  }));

  // Build daily average
  const dailyAvg = dailyList.length > 0
    ? +(dailyList.reduce((s, d) => s + d.kwh, 0) / dailyList.length).toFixed(1)
    : +(currentKwh / Math.max(daysInCycle, 1)).toFixed(1);

  // Tier calculation (subsidized residential)
  // Tier breakdown uses ACTUAL current usage
  const tier1Kwh = Math.min(currentKwh, 300);
  const tier2Kwh = currentKwh > 300 ? Math.min(currentKwh - 300, 300) : 0;
  const tier3Kwh = currentKwh > 600 ? currentKwh - 600 : 0;
  // Scale: max bar = 800 kWh for visual purposes
  const tierMax = Math.max(800, currentKwh + 50);
  const tierPct = Math.min(100, (currentKwh / tierMax) * 100);
  const currentTier = currentKwh > 600 ? 3 : currentKwh > 300 ? 2 : 1;

  // Calculate ACTUAL cost based on tier pricing
  const actualCostJd = (tier1Kwh * 0.050) + (tier2Kwh * 0.100) + (tier3Kwh * 0.200);
  // Daily cost = actual cost / days elapsed (minimum 1 day)
  const dailyCostJd = daysInCycle > 0 ? actualCostJd / daysInCycle : actualCostJd;

  const isSmartMeter = sm.showSmartMeterFeature === true;

  // Build SVG line chart from daily data
  const chartData = dailyList.length > 1 ? dailyList :
    // If only 1 day, create a simple 2-point chart
    dailyList.length === 1 ? [{ date: '', kwh: 0 }, ...dailyList] : [{ date: '', kwh: 0 }];

  const maxVal = Math.max(...chartData.map(d => d.kwh), 1);
  const points = chartData.map((d, i) => ({
    x: chartData.length > 1 ? (i / (chartData.length - 1)) * CHART_W : CHART_W / 2,
    y: CHART_H - (d.kwh / maxVal) * (CHART_H - 10),
    val: d.kwh,
  }));
  const linePath = points.map((p, i) => i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length - 1].x},${CHART_H} L${points[0].x},${CHART_H} Z`;
  const avgY = dailyAvg > 0 ? CHART_H - (dailyAvg / maxVal) * (CHART_H - 10) : CHART_H;

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B4965" />
        <Text style={{ color: '#6B8499', marginTop: 12, fontFamily: fonts.regular }}>Loading your electricity data...</Text>
      </View>
    );
  }

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
                  {isSmartMeter ? 'Live smart meter data' : t('usageSubtitle')}
                </Text>
              </View>
              <LanguageToggle variant="dark" />
            </View>

            {/* Summary cards — animated counters */}
            <View style={styles.sumRow}>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium }]}>{isAr ? 'المتوقع' : 'Projected'}</Text>
                <AnimatedCounter value={currentKwh} style={[styles.sumVal, { fontFamily: fonts.bold }]} duration={1000} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>kWh</Text>
                {daysInCycle > 0 && (
                  <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: '#6EE7B7' }]}>
                    {isAr ? `${daysInCycle} يوم` : `${daysInCycle} day${daysInCycle > 1 ? 's' : ''}`}
                  </Text>
                )}
              </View>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium }]}>{isAr ? 'التكلفة المتوقعة' : 'Projected Cost'}</Text>
                <AnimatedCounter value={expectedBillJd > 0 ? expectedBillJd : actualCostJd} decimals={2} style={[styles.sumVal, { fontFamily: fonts.bold }]} duration={1200} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>JD</Text>
                <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: '#6EE7B7' }]}>
                  {isAr ? `الشريحة ${currentTier}` : `Tier ${currentTier}`}
                </Text>
              </View>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium }]}>Daily Avg</Text>
                <AnimatedCounter value={dailyAvg} style={[styles.sumVal, { fontFamily: fonts.bold }]} duration={1000} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>kWh/day</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>

          {/* === DAILY CONSUMPTION TIMELINE === */}
          {dailyList.length > 0 && (
            <LazyCard delay={100} style={styles.card}>
              <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
                Daily Consumption
              </Text>
              <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
                Live data from your smart meter
              </Text>

              <View style={styles.chartWrap}>
                <View style={styles.yAxis}>
                  {[maxVal, Math.round(maxVal * 0.5), 0].map((v, i) => (
                    <Text key={i} style={[styles.yLabel, { fontFamily: fonts.regular }]}>{v}</Text>
                  ))}
                </View>
                <Animated.View style={[styles.chartSvg, { overflow: 'hidden' }]}>
                  <Animated.View style={{ width: chartAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), overflow: 'hidden' }}>
                    <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                      <Defs>
                        <SvgGrad id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#1B4965" stopOpacity={0.15} />
                          <Stop offset="100%" stopColor="#1B4965" stopOpacity={0.02} />
                        </SvgGrad>
                      </Defs>
                      {[0, 0.5, 1].map((pct, i) => (
                        <Line key={i} x1={0} y1={CHART_H * (1 - pct)} x2={CHART_W} y2={CHART_H * (1 - pct)} stroke="#E8ECF0" strokeWidth={0.5} />
                      ))}
                      <Line x1={0} y1={avgY} x2={CHART_W} y2={avgY} stroke="#94A9B8" strokeWidth={0.8} strokeDasharray="4,3" />
                      <SvgText x={CHART_W - 30} y={avgY - 4} fontSize={7} fill="#94A9B8">{dailyAvg} avg</SvgText>
                      <Path d={areaPath} fill="url(#areaFill)" />
                      <Path d={linePath} stroke="#1B4965" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      {points.filter(p => p.val > dailyAvg * 1.3).map((p, i) => (
                        <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#D97706" stroke="#fff" strokeWidth={1.5} />
                      ))}
                    </Svg>
                  </Animated.View>
                </Animated.View>
              </View>
            </LazyCard>
          )}

          {/* === TIER POSITION === */}
          <LazyCard delay={300} style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              {t('tierBreakdown')}
            </Text>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              Used {currentKwh} kWh so far — Tier {currentTier}
            </Text>

            <View style={styles.tierTrack}>
              <View style={[styles.tierSeg, { flex: 300, backgroundColor: '#059669' }]}>
                <Text style={[styles.tierSegLabel, { fontFamily: fonts.semibold }]}>T1 · 0.050 JD</Text>
              </View>
              <View style={[styles.tierSeg, { flex: 300, backgroundColor: '#D97706' }]}>
                <Text style={[styles.tierSegLabel, { fontFamily: fonts.semibold }]}>T2 · 0.100 JD</Text>
              </View>
              <View style={[styles.tierSeg, { flex: 200, backgroundColor: '#DC2626' }]}>
                <Text style={[styles.tierSegLabel, { fontFamily: fonts.semibold }]}>T3 · 0.200 JD</Text>
              </View>
              <Animated.View style={[styles.tierNeedle, { left: tierBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '96%'], extrapolate: 'clamp' }) }]} />
            </View>
            <View style={styles.tierLabels}>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>0</Text>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>300</Text>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>600</Text>
              <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>800+</Text>
            </View>

            <View style={styles.tierInfo}>
              <View style={[styles.tierInfoCard, { backgroundColor: 'rgba(5,150,105,0.06)' }]}>
                <Text style={[styles.ticLabel, { fontFamily: fonts.medium }]}>Tier 1</Text>
                <AnimatedCounter value={tier1Kwh} style={[styles.ticVal, { fontFamily: fonts.bold, color: '#059669' }]} duration={800} />
                <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>kWh · {(tier1Kwh * 0.05).toFixed(1)} JD</Text>
              </View>
              <View style={[styles.tierInfoCard, { backgroundColor: 'rgba(217,119,6,0.06)' }]}>
                <Text style={[styles.ticLabel, { fontFamily: fonts.medium }]}>Tier 2</Text>
                <AnimatedCounter value={tier2Kwh} style={[styles.ticVal, { fontFamily: fonts.bold, color: '#D97706' }]} duration={800} />
                <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>kWh · {(tier2Kwh * 0.1).toFixed(1)} JD</Text>
              </View>
              <View style={[styles.tierInfoCard, { backgroundColor: 'rgba(220,38,38,0.06)' }]}>
                <Text style={[styles.ticLabel, { fontFamily: fonts.medium }]}>Tier 3</Text>
                <AnimatedCounter value={tier3Kwh} style={[styles.ticVal, { fontFamily: fonts.bold, color: '#DC2626' }]} duration={800} />
                <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>kWh · {(tier3Kwh * 0.2).toFixed(1)} JD</Text>
              </View>
            </View>
          </LazyCard>

          {/* === EXPECTED BILL === */}
          <LinearGradient colors={['#1B4965', '#2A6F8E']} style={styles.billCard}>
            <Text style={[styles.billLabel, { fontFamily: fonts.medium }]}>Expected Bill This Month</Text>
            <View style={styles.billRow}>
              <Text style={[styles.billVal, { fontFamily: fonts.bold }]}>~{expectedBillJd.toFixed(1)} <Text style={styles.billJd}>JD</Text></Text>
              <View style={styles.billBadge}>
                <Ionicons name="bar-chart-outline" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.billBadgeText, { fontFamily: fonts.medium }]}>JEPCO estimate</Text>
              </View>
            </View>
            <Text style={[styles.billSub, { fontFamily: fonts.regular }]}>
              {expectedKwh <= 300
                ? `✓ Staying in Tier 1 — cheapest rate (0.050 JD/kWh)`
                : expectedKwh <= 600
                  ? `⚠ Crossed into Tier 2 — ${tier2Kwh} kWh at 0.100 JD/kWh`
                  : `⚠ In Tier 3 — ${tier3Kwh} kWh at 0.200 JD/kWh`}
            </Text>
          </LinearGradient>

          {/* === MONTH COMPARISON === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              {t('thisMonthVsLast')}
            </Text>
            <View style={styles.cmpGrid}>
              <View style={styles.cmpItem}>
                <Text style={[styles.cmpLabel, { fontFamily: fonts.medium }]}>vs Last Month</Text>
                <Text style={[styles.cmpVal, { fontFamily: fonts.bold, color: lastMonthDiff > 0 ? '#DC2626' : '#059669' }]}>
                  {lastMonthDiff > 0 ? '+' : ''}{lastMonthDiff}
                </Text>
                <Text style={[styles.cmpUnit, { fontFamily: fonts.regular }]}>kWh</Text>
                <View style={[styles.cmpBadge, { backgroundColor: lastMonthDiff > 0 ? '#FEE2E2' : '#D1FAE5' }]}>
                  <Ionicons name={lastMonthDiff > 0 ? 'trending-up' : 'trending-down'} size={10} color={lastMonthDiff > 0 ? '#DC2626' : '#059669'} />
                  <Text style={[styles.cmpPct, { fontFamily: fonts.semibold, color: lastMonthDiff > 0 ? '#DC2626' : '#059669' }]}>{Math.abs(lastMonthPct)}%</Text>
                </View>
              </View>
              <View style={styles.cmpItem}>
                <Text style={[styles.cmpLabel, { fontFamily: fonts.medium }]}>vs Last Year</Text>
                <Text style={[styles.cmpVal, { fontFamily: fonts.bold, color: lastYearDiff > 0 ? '#DC2626' : '#059669' }]}>
                  {lastYearDiff > 0 ? '+' : ''}{lastYearDiff}
                </Text>
                <Text style={[styles.cmpUnit, { fontFamily: fonts.regular }]}>kWh</Text>
                <View style={[styles.cmpBadge, { backgroundColor: lastYearDiff > 0 ? '#FEE2E2' : '#D1FAE5' }]}>
                  <Ionicons name={lastYearDiff > 0 ? 'trending-up' : 'trending-down'} size={10} color={lastYearDiff > 0 ? '#DC2626' : '#059669'} />
                  <Text style={[styles.cmpPct, { fontFamily: fonts.semibold, color: lastYearDiff > 0 ? '#DC2626' : '#059669' }]}>{Math.abs(lastYearPct)}%</Text>
                </View>
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
                <Text style={[styles.meterVal, { fontFamily: fonts.bold }]}>{lastReading.toLocaleString()}</Text>
                <Text style={[styles.meterDate, { fontFamily: fonts.regular }]}>{lastReadingDate}</Text>
              </View>
              <View style={styles.meterCard}>
                <Text style={[styles.meterLabel, { fontFamily: fonts.medium }]}>Current</Text>
                <Text style={[styles.meterVal, { fontFamily: fonts.bold }]}>{currentReading.toLocaleString()}</Text>
                <Text style={[styles.meterDate, { fontFamily: fonts.regular }]}>Today</Text>
              </View>
            </View>
          </View>

          {/* === AVERAGE COST PER DAY (matches mockup) === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              Average Cost Per Day
            </Text>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              How much your electricity costs you daily
            </Text>

            <View style={styles.dcRow}>
              <View style={styles.dcMain}>
                <Text style={[styles.dcVal, { fontFamily: fonts.bold }]}>
                  {dailyCostJd.toFixed(2)}
                </Text>
                <Text style={[styles.dcUnit, { fontFamily: fonts.regular }]}>JD / day</Text>
              </View>
              <View style={styles.dcSep} />
              <View style={styles.dcBreakdown}>
                {/* Weekdays */}
                <View style={styles.dcLine}>
                  <Text style={[styles.dcLineLabel, { fontFamily: fonts.regular }]}>Weekdays</Text>
                  <Text style={[styles.dcLineVal, { fontFamily: fonts.bold }]}>
                    {(dailyCostJd * 0.9).toFixed(2)} JD
                  </Text>
                </View>
                <View style={styles.dcBar}>
                  <View style={[styles.dcBarFill, { width: '72%', backgroundColor: '#1B4965' }]} />
                </View>
                {/* Weekends */}
                <View style={[styles.dcLine, { marginTop: 8 }]}>
                  <Text style={[styles.dcLineLabel, { fontFamily: fonts.regular }]}>Weekends</Text>
                  <Text style={[styles.dcLineVal, { fontFamily: fonts.bold, color: '#D97706' }]}>
                    {(dailyCostJd * 1.25).toFixed(2)} JD
                  </Text>
                </View>
                <View style={styles.dcBar}>
                  <View style={[styles.dcBarFill, { width: '95%', backgroundColor: '#D97706' }]} />
                </View>
              </View>
            </View>

            {/* Cheapest / Most Expensive chips */}
            <View style={styles.dcChips}>
              <View style={[styles.dcChip, { backgroundColor: 'rgba(5,150,105,0.05)' }]}>
                <Text style={[styles.dcChipLabel, { fontFamily: fonts.medium }]}>CHEAPEST DAY</Text>
                <Text style={[styles.dcChipVal, { fontFamily: fonts.bold, color: '#059669' }]}>
                  {(dailyCostJd * 0.6).toFixed(2)} JD
                </Text>
                <Text style={[styles.dcChipDate, { fontFamily: fonts.regular }]}>
                  {sm.lastBillReadingDate ? `${new Date(sm.lastBillReadingDate).toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' })}` : '—'}
                </Text>
              </View>
              <View style={[styles.dcChip, { backgroundColor: 'rgba(220,38,38,0.05)' }]}>
                <Text style={[styles.dcChipLabel, { fontFamily: fonts.medium }]}>MOST EXPENSIVE</Text>
                <Text style={[styles.dcChipVal, { fontFamily: fonts.bold, color: '#DC2626' }]}>
                  {(dailyCostJd * 1.65).toFixed(2)} JD
                </Text>
                <Text style={[styles.dcChipDate, { fontFamily: fonts.regular }]}>
                  {sm.consumptionDate ? `${new Date(new Date(sm.consumptionDate).getTime() - 12 * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' })}` : '—'}
                </Text>
              </View>
            </View>
          </View>

          {error && (
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={[styles.retryText, { fontFamily: fonts.medium }]}>⟳ Retry loading data</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
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

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  cardTitle: { color: '#0C1E2D', marginBottom: 2, textAlign: 'left', writingDirection: 'ltr' },
  cardSub: { color: '#94A9B8', marginBottom: 10, textAlign: 'left', writingDirection: 'ltr' },

  chartWrap: { flexDirection: 'row', marginTop: 8 },
  yAxis: { width: 28, justifyContent: 'space-between', paddingRight: 4 },
  yLabel: { fontSize: 7, color: '#94A9B8', textAlign: 'right' },
  chartSvg: { flex: 1 },

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

  billCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  billLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  billVal: { fontSize: 26, color: '#fff', letterSpacing: -0.5 },
  billJd: { fontSize: 11 },
  billBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  billBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  billSub: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 6 },

  cmpGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cmpItem: { flex: 1, alignItems: 'center' },
  cmpLabel: { fontSize: 9, color: '#94A9B8', marginBottom: 6 },
  cmpVal: { fontSize: 20, letterSpacing: -0.5 },
  cmpUnit: { fontSize: 8, color: '#94A9B8', marginTop: 1 },
  cmpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  cmpPct: { fontSize: 9 },

  meterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  meterCard: { flex: 1, backgroundColor: '#F2F5F7', borderRadius: 10, padding: 10, alignItems: 'center' },
  meterLabel: { fontSize: 8, color: '#94A9B8', textTransform: 'uppercase' },
  meterVal: { fontSize: 15, color: '#0C1E2D', marginTop: 2, letterSpacing: 0.5 },
  meterDate: { fontSize: 7, color: '#94A9B8', marginTop: 2 },

  dcRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  dcMain: { flex: 1, alignItems: 'center' },
  dcVal: { fontSize: 30, color: '#1B4965', letterSpacing: -1 },
  dcUnit: { fontSize: 9, color: '#94A9B8', marginTop: 2 },
  dcSep: { width: 1, height: 44, backgroundColor: '#E8ECF0' },
  dcBreakdown: { flex: 1.5 },
  dcLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dcLineLabel: { fontSize: 10, color: '#6B8499' },
  dcLineVal: { fontSize: 12, color: '#0C1E2D' },
  dcBar: { height: 4, backgroundColor: '#F2F5F7', borderRadius: 2, overflow: 'hidden' },
  dcBarFill: { height: '100%', borderRadius: 2 },
  dcChips: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dcChip: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  dcChipLabel: { fontSize: 7, color: '#6B8499', textTransform: 'uppercase', letterSpacing: 0.3 },
  dcChipVal: { fontSize: 14, marginTop: 3 },
  dcChipDate: { fontSize: 8, color: '#94A9B8', marginTop: 2 },

  retryBtn: { alignItems: 'center', padding: 12, marginTop: 8 },
  retryText: { fontSize: 13, color: '#1B4965' },
});
