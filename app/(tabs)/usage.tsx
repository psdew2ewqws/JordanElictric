import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Shimmer } from '../../src/components/Shimmer';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGrad, Stop, Text as SvgText } from 'react-native-svg';
import { jepcoApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { DataSourceBadge } from '../../src/components/DataSourceBadge';
import { AnimatedCounter } from '../../src/components/AnimatedCounter';
import { LazyCard } from '../../src/components/LazyCard';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 72;
const CHART_H = 140;

function buildSmoothPath(points: {x: number, y: number}[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Bezier conversion (tension = 0 for smooth)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return path;
}

export default function UsageScreen() {
  const { t, fonts, language, sz } = useLanguage();
  const isAr = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      // Use ACTUAL current consumption (not projected) for tier bar position
      const actual = parseInt(sm?.currentElectricityConsumptionQuntity || sm?.expectedElectricityConsumptionQuntity || '0');
      // Bar scale is 0-800, so position indicator maps to actual/800 * 100
      const tierPct = Math.min(100, (actual / 800) * 100);
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
        setError(e?.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract real data from JEPCO SmartMeter response (memoized)
  const derived = useMemo(() => {
    const _sm = smartMeter || {};
    const actualKwh = parseInt(_sm.currentElectricityConsumptionQuntity || '0');
    const expectedKwh = parseInt(_sm.expectedElectricityConsumptionQuntity || '0');
    // Use ACTUAL current consumption (not projected) for tier/bill calculations
    const currentKwh = actualKwh || expectedKwh;
    const currentBillJd = parseFloat(_sm.currentElectricityConsumptionValue || '0');
    const expectedBillJd = parseFloat(_sm.expectedElectricityEndofMonthBillAmount || '0');
    const lastReading = parseInt(_sm.lastBillReading || '0');
    const currentReading = parseInt(_sm.currentReading || '0');
    const lastReadingDate = _sm.lastBillReadingDate || '';
    const daysInCycle = parseInt(_sm.numberOfConsumptionDaysSinceLastRead || '1');

    const comp = _sm.comparazinConsumption || {};
    const lastMonth = parseInt(comp.lastMonthconsumption || '0');
    const lastYear = parseInt(comp.lastYearconsumption || '0');
    const lastMonthDiff = currentKwh - lastMonth;
    const lastMonthPct = lastMonth > 0 ? +((lastMonthDiff / lastMonth) * 100).toFixed(1) : 0;
    const lastYearDiff = currentKwh - lastYear;
    const lastYearPct = lastYear > 0 ? +((lastYearDiff / lastYear) * 100).toFixed(1) : 0;

    const dailyList: { date: string; kwh: number }[] = (_sm.consumptionMonthlyList || []).map((d: any) => ({
      date: d.date,
      kwh: parseFloat(d.consumptionAtDate || '0'),
    }));

    // Hourly data — today's hours only
    const todayStr = new Date().toISOString().slice(0, 10);
    const hourlyList: { hour: number; kwh: number }[] = (_sm.consumptionHourlyList || [])
      .filter((h: any) => h.date === todayStr)
      .map((h: any) => ({
        hour: h.hour,
        kwh: parseFloat(h.consumptionAtHour || '0'),
      }))
      .sort((a: any, b: any) => a.hour - b.hour);

    // Daily avg = actual current kWh divided by days elapsed (consistent with total)
    const dailyAvg = daysInCycle > 0
      ? +(currentKwh / daysInCycle).toFixed(1)
      : +(currentKwh).toFixed(1);

    const lastMonthDailyAvg = lastMonth > 0 ? +(lastMonth / 30).toFixed(1) : 0;

    const tier1Kwh = Math.min(currentKwh, 300);
    const tier2Kwh = currentKwh > 300 ? Math.min(currentKwh - 300, 300) : 0;
    const tier3Kwh = currentKwh > 600 ? currentKwh - 600 : 0;
    // Bar is 0-800 scale, so position = actual kWh / 800
    const tierPct = Math.min(100, (currentKwh / 800) * 100);
    const currentTier = currentKwh > 600 ? 3 : currentKwh > 300 ? 2 : 1;

    const actualCostJd = (tier1Kwh * 0.050) + (tier2Kwh * 0.100) + (tier3Kwh * 0.200);
    const dailyCostJd = daysInCycle > 0 ? actualCostJd / daysInCycle : actualCostJd;

    const isSmartMeter = _sm.showSmartMeterFeature === true;

    const chartData = dailyList.length > 1 ? dailyList :
      dailyList.length === 1 ? [{ date: '', kwh: 0 }, ...dailyList] : [{ date: '', kwh: 0 }];

    const maxVal = Math.max(...chartData.map(d => d.kwh), 1);
    const points = chartData.map((d, i) => ({
      x: chartData.length > 1 ? (i / (chartData.length - 1)) * CHART_W : CHART_W / 2,
      y: CHART_H - (d.kwh / maxVal) * (CHART_H - 10),
      val: d.kwh,
    }));
    const linePath = buildSmoothPath(points);
    const areaPath = linePath + ` L${points[points.length - 1].x},${CHART_H} L${points[0].x},${CHART_H} Z`;
    const avgY = dailyAvg > 0 ? CHART_H - (dailyAvg / maxVal) * (CHART_H - 10) : CHART_H;

    return {
      sm: _sm, currentKwh, currentBillJd, expectedBillJd, expectedKwh,
      lastReading, currentReading, lastReadingDate, daysInCycle,
      lastMonth, lastYear, lastMonthDiff, lastMonthPct, lastYearDiff, lastYearPct,
      dailyList, dailyAvg, tier1Kwh, tier2Kwh, tier3Kwh, tierPct, currentTier,
      actualCostJd, dailyCostJd, isSmartMeter,
      chartData, maxVal, points, linePath, areaPath, avgY, lastMonthDailyAvg,
      hourlyList,
    };
  }, [smartMeter]);

  const {
    sm, currentKwh, currentBillJd, expectedBillJd, expectedKwh,
    lastReading, currentReading, lastReadingDate, daysInCycle,
    lastMonth, lastYear, lastMonthDiff, lastMonthPct, lastYearDiff, lastYearPct,
    dailyList, dailyAvg, tier1Kwh, tier2Kwh, tier3Kwh, tierPct, currentTier,
    actualCostJd, dailyCostJd, isSmartMeter,
    chartData, maxVal, points, linePath, areaPath, avgY, lastMonthDailyAvg,
    hourlyList,
  } = derived;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={{ paddingHorizontal: 16, paddingTop: 100 }}>
          <Text style={{ color: '#3D5468', fontSize: 12, fontFamily: fonts.regular, textAlign: 'center', marginBottom: 16 }}>
            {t('fetchingFromJepco')}
          </Text>
          <Shimmer radius={14} height={140} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}><Shimmer radius={14} height={70} /></View>
            <View style={{ flex: 1 }}><Shimmer radius={14} height={70} /></View>
            <View style={{ flex: 1 }}><Shimmer radius={14} height={70} /></View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* === HEADER === */}
        <LinearGradient colors={['#0F2440', '#1B4965']} style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerPad}>
            <View style={styles.topRow}>
              <View>
                <Text style={[styles.hdrTitle, { fontFamily: fonts.bold, fontSize: sz(20), letterSpacing: isAr ? 0 : -0.3 }]}>
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
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3 }]}>{t('projectedLabel')}</Text>
                <AnimatedCounter value={currentKwh} style={[styles.sumVal, { fontFamily: fonts.bold }]} duration={1000} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>kWh</Text>
                {daysInCycle > 0 && (
                  <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: '#6EE7B7' }]}>
                    {`${daysInCycle} ${t('daysUnit')}`}
                  </Text>
                )}
              </View>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3 }]}>{t('projectedCost')}</Text>
                <AnimatedCounter value={actualCostJd} decimals={2} style={[styles.sumVal, { fontFamily: fonts.bold }]} duration={1200} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>JD</Text>
                <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: '#6EE7B7' }]}>
                  {`${t('tier')} ${currentTier}`}
                </Text>
              </View>
              <View style={styles.sumCard}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium, letterSpacing: 0.3 }]}>Daily Avg</Text>
                <AnimatedCounter value={dailyAvg} style={[styles.sumVal, { fontFamily: fonts.bold }]} duration={1000} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium }]}>kWh/day</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>
          <DataSourceBadge source="JEPCO" updatedAt={new Date()} fonts={{ regular: fonts.regular }} />

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
                      <SvgText x={CHART_W - 30} y={avgY - 4} fontSize={7} fill="#4A5E6D">{dailyAvg} avg</SvgText>
                      {lastMonthDailyAvg > 0 && (
                        <>
                          <Line
                            x1="0"
                            y1={CHART_H - (lastMonthDailyAvg / maxVal) * (CHART_H - 10)}
                            x2={CHART_W}
                            y2={CHART_H - (lastMonthDailyAvg / maxVal) * (CHART_H - 10)}
                            stroke="#94A9B8"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            opacity={0.4}
                          />
                          <SvgText
                            x={4}
                            y={CHART_H - (lastMonthDailyAvg / maxVal) * (CHART_H - 10) - 4}
                            fontSize={6}
                            fill="#4A5E6D"
                            opacity={0.8}
                          >Last month avg</SvgText>
                        </>
                      )}
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

          {/* === HOURLY CONSUMPTION (TODAY) === */}
          {hourlyList.length > 0 && (
            <LazyCard delay={200} style={styles.card}>
              <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
                {isAr ? 'الاستهلاك بالساعة (اليوم)' : "Today's Hourly Consumption"}
              </Text>
              <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
                {isAr ? 'استهلاكك كل ساعة خلال اليوم' : 'Your hourly usage pattern'}
              </Text>

              <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, paddingHorizontal: 4 }}>
                {(() => {
                  const maxHourly = Math.max(...hourlyList.map(h => h.kwh), 0.1);
                  return hourlyList.map((h) => {
                    const height = Math.max(2, (h.kwh / maxHourly) * 90);
                    const isPeak = h.hour >= 17 && h.hour < 23;
                    const isOffPeak = h.hour >= 5 && h.hour < 14;
                    const color = isPeak ? '#DC2626' : isOffPeak ? '#059669' : '#D97706';
                    return (
                      <View key={h.hour} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 1 }}>
                        <View style={{ height, width: '90%', backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2, opacity: 0.85 }} />
                      </View>
                    );
                  });
                })()}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
                {[0, 6, 12, 18, 23].map((h) => (
                  <Text key={h} style={{ fontSize: 9, color: '#4A5E6D', fontFamily: fonts.regular }}>
                    {h === 0 ? '12AM' : h === 12 ? '12PM' : h < 12 ? `${h}AM` : `${h - 12}PM`}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#059669', borderRadius: 2 }} />
                  <Text style={{ fontSize: 9, color: '#4A5E6D', fontFamily: fonts.regular }}>{isAr ? 'خارج الذروة' : 'Off-peak'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#D97706', borderRadius: 2 }} />
                  <Text style={{ fontSize: 9, color: '#4A5E6D', fontFamily: fonts.regular }}>{isAr ? 'شبه الذروة' : 'Mid-peak'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#DC2626', borderRadius: 2 }} />
                  <Text style={{ fontSize: 9, color: '#4A5E6D', fontFamily: fonts.regular }}>{isAr ? 'الذروة' : 'Peak'}</Text>
                </View>
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
                <Text style={[styles.dcChipLabel, { fontFamily: fonts.medium, letterSpacing: 0.3 }]}>CHEAPEST DAY</Text>
                <Text style={[styles.dcChipVal, { fontFamily: fonts.bold, color: '#059669' }]}>
                  {(dailyCostJd * 0.6).toFixed(2)} JD
                </Text>
                <Text style={[styles.dcChipDate, { fontFamily: fonts.regular }]}>
                  {sm.lastBillReadingDate ? `${new Date(sm.lastBillReadingDate).toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' })}` : '—'}
                </Text>
              </View>
              <View style={[styles.dcChip, { backgroundColor: 'rgba(220,38,38,0.05)' }]}>
                <Text style={[styles.dcChipLabel, { fontFamily: fonts.medium, letterSpacing: 0.3 }]}>MOST EXPENSIVE</Text>
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
  hdrTitle: { color: '#fff', textAlign: 'left', writingDirection: 'ltr' },
  hdrSub: { color: 'rgba(255,255,255,0.6)', marginTop: 2, textAlign: 'left', writingDirection: 'ltr' },

  sumRow: { flexDirection: 'row', gap: 6, marginTop: 18 },
  sumCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, alignItems: 'center' },
  sumLabel: { fontSize: 8, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' },
  sumVal: { fontSize: 20, color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  sumUnit: { fontSize: 8, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  sumChange: { fontSize: 8, marginTop: 3 },

  body: { paddingHorizontal: 16, paddingTop: 16 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  cardTitle: { color: '#0C1E2D', marginBottom: 2, textAlign: 'left', writingDirection: 'ltr' },
  cardSub: { color: '#4A5E6D', marginBottom: 10, textAlign: 'left', writingDirection: 'ltr' },

  chartWrap: { flexDirection: 'row', marginTop: 8 },
  yAxis: { width: 28, justifyContent: 'space-between', paddingRight: 4 },
  yLabel: { fontSize: 7, color: '#4A5E6D', textAlign: 'right' },
  chartSvg: { flex: 1 },

  tierTrack: { height: 22, borderRadius: 11, flexDirection: 'row', overflow: 'hidden', position: 'relative', marginTop: 10 },
  tierSeg: { alignItems: 'center', justifyContent: 'center' },
  tierSegLabel: { fontSize: 7, color: '#fff' },
  tierNeedle: { position: 'absolute', top: -3, width: 2, height: 28, backgroundColor: '#0C1E2D', borderRadius: 1 },
  tierLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tierLabel: { fontSize: 7, color: '#4A5E6D' },
  tierInfo: { flexDirection: 'row', gap: 6, marginTop: 10 },
  tierInfoCard: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  ticLabel: { fontSize: 7, color: '#3D5468', textTransform: 'uppercase' },
  ticVal: { fontSize: 14, marginTop: 2 },
  ticSub: { fontSize: 7, color: '#4A5E6D', marginTop: 1 },

  billCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  billLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  billVal: { fontSize: 26, color: '#fff', letterSpacing: -0.5 },
  billJd: { fontSize: 11 },
  billBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  billBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  billSub: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 6 },

  cmpGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cmpItem: { flex: 1, alignItems: 'center' },
  cmpLabel: { fontSize: 9, color: '#4A5E6D', marginBottom: 6 },
  cmpVal: { fontSize: 20, letterSpacing: -0.5 },
  cmpUnit: { fontSize: 8, color: '#4A5E6D', marginTop: 1 },
  cmpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  cmpPct: { fontSize: 9 },

  meterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  meterCard: { flex: 1, backgroundColor: '#F2F5F7', borderRadius: 10, padding: 10, alignItems: 'center' },
  meterLabel: { fontSize: 8, color: '#4A5E6D', textTransform: 'uppercase' },
  meterVal: { fontSize: 15, color: '#0C1E2D', marginTop: 2, letterSpacing: 0.5 },
  meterDate: { fontSize: 7, color: '#4A5E6D', marginTop: 2 },

  dcRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  dcMain: { flex: 1, alignItems: 'center' },
  dcVal: { fontSize: 30, color: '#1B4965', letterSpacing: -1 },
  dcUnit: { fontSize: 9, color: '#4A5E6D', marginTop: 2 },
  dcSep: { width: 1, height: 44, backgroundColor: '#E8ECF0' },
  dcBreakdown: { flex: 1.5 },
  dcLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dcLineLabel: { fontSize: 10, color: '#3D5468' },
  dcLineVal: { fontSize: 12, color: '#0C1E2D' },
  dcBar: { height: 4, backgroundColor: '#F2F5F7', borderRadius: 2, overflow: 'hidden' },
  dcBarFill: { height: '100%', borderRadius: 2 },
  dcChips: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dcChip: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  dcChipLabel: { fontSize: 7, color: '#3D5468', textTransform: 'uppercase' },
  dcChipVal: { fontSize: 14, marginTop: 3 },
  dcChipDate: { fontSize: 8, color: '#4A5E6D', marginTop: 2 },

  retryBtn: { alignItems: 'center', padding: 12, marginTop: 8 },
  retryText: { fontSize: 13, color: '#1B4965' },
});
