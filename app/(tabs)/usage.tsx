import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, RefreshControl, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Shimmer } from '../../src/components/Shimmer';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGrad, Stop, Text as SvgText } from 'react-native-svg';
import { jepcoApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { AnimatedCounter } from '../../src/components/AnimatedCounter';
import { LazyCard } from '../../src/components/LazyCard';
import { useFabScroll } from '../../src/components/DiaaFab';

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
  const { onScroll: onFabScroll } = useFabScroll();
  const isAr = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [smartMeter, setSmartMeter] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tiersModalOpen, setTiersModalOpen] = useState(false);

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

    const dailyList: { date: string; kwh: number }[] = (_sm.consumptionMonthlyList || [])
      .map((d: any) => ({
        date: d.date,
        kwh: parseFloat(d.consumptionAtDate || '0'),
      }))
      // Oldest on the left, newest on the right
      .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));

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
      date: d.date,
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
    };
  }, [smartMeter]);

  const {
    sm, currentKwh, currentBillJd, expectedBillJd, expectedKwh,
    lastReading, currentReading, lastReadingDate, daysInCycle,
    lastMonth, lastYear, lastMonthDiff, lastMonthPct, lastYearDiff, lastYearPct,
    dailyList, dailyAvg, tier1Kwh, tier2Kwh, tier3Kwh, tierPct, currentTier,
    actualCostJd, dailyCostJd, isSmartMeter,
    chartData, maxVal, points, linePath, areaPath, avgY, lastMonthDailyAvg,
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
          <Text style={{ color: '#111827', fontSize: 12, fontFamily: fonts.regular, textAlign: 'center', marginBottom: 16 }}>
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
      <ScrollView showsVerticalScrollIndicator={false} onScroll={onFabScroll} scrollEventThrottle={32} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* === HEADER === */}
        <LinearGradient colors={['#0F2440', '#1B4965']} style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerPad}>
            <View style={styles.topRow}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={[styles.hdrTitle, { fontFamily: fonts.bold, fontSize: sz(20), lineHeight: isAr ? 24 : undefined, letterSpacing: isAr ? 0 : -0.3, textAlign: 'left', writingDirection: 'ltr' }]}>
                  {t('usageTitle')}
                </Text>
                <Text style={[styles.hdrSub, { fontFamily: fonts.regular, fontSize: sz(11), lineHeight: isAr ? 14 : undefined, marginTop: isAr ? 0 : 2, textAlign: 'left', writingDirection: 'ltr' }]}>
                  {isSmartMeter ? (isAr ? 'بيانات العداد الذكي المباشرة' : 'Live smart meter data') : t('usageSubtitle')}
                </Text>
              </View>
              <LanguageToggle variant="dark" />
            </View>

            {/* Summary cards — animated counters */}
            <View style={[styles.sumRow, { marginTop: isAr ? 10 : 18 }]}>
              <View style={[styles.sumCard, { padding: isAr ? 8 : 10 }]}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3, textTransform: isAr ? 'none' : 'uppercase', lineHeight: isAr ? 12 : undefined }]}>{t('projectedLabel')}</Text>
                <AnimatedCounter value={currentKwh} style={[styles.sumVal, { fontFamily: fonts.bold, marginTop: isAr ? 0 : 2, lineHeight: isAr ? 24 : undefined }]} duration={1000} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium, lineHeight: isAr ? 12 : undefined }]}>{isAr ? 'كيلوواط بالساعة' : 'kWh'}</Text>
                {daysInCycle > 0 && (
                  <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: '#6EE7B7', marginTop: isAr ? 2 : 3, lineHeight: isAr ? 12 : undefined }]}>
                    {`${daysInCycle} ${t('daysUnit')}`}
                  </Text>
                )}
              </View>
              <View style={[styles.sumCard, { padding: isAr ? 8 : 10 }]}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3, textTransform: isAr ? 'none' : 'uppercase', lineHeight: isAr ? 12 : undefined }]}>{t('projectedCost')}</Text>
                <AnimatedCounter value={actualCostJd} decimals={2} style={[styles.sumVal, { fontFamily: fonts.bold, marginTop: isAr ? 0 : 2, lineHeight: isAr ? 24 : undefined }]} duration={1200} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium, lineHeight: isAr ? 12 : undefined }]}>JD</Text>
                <Text style={[styles.sumChange, { fontFamily: fonts.semibold, color: '#6EE7B7', marginTop: isAr ? 2 : 3, lineHeight: isAr ? 12 : undefined }]}>
                  {`${t('tier')} ${currentTier}`}
                </Text>
              </View>
              <View style={[styles.sumCard, { padding: isAr ? 8 : 10 }]}>
                <Text style={[styles.sumLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3, textTransform: isAr ? 'none' : 'uppercase', lineHeight: isAr ? 12 : undefined }]}>{t('dailyAvgLabel')}</Text>
                <AnimatedCounter value={dailyAvg} style={[styles.sumVal, { fontFamily: fonts.bold, marginTop: isAr ? 0 : 2, lineHeight: isAr ? 24 : undefined }]} duration={1000} />
                <Text style={[styles.sumUnit, { fontFamily: fonts.medium, lineHeight: isAr ? 12 : undefined }]}>{isAr ? 'كيلوواط/يوم' : 'kWh/day'}</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>

          {/* === DAILY CONSUMPTION TIMELINE === */}
          {dailyList.length > 0 && (() => {
            // Pick the month shown on the chart from the first valid data point
            const firstDate = dailyList.find(d => d.date)?.date;
            const lastDate = [...dailyList].reverse().find(d => d.date)?.date;
            const monthName = firstDate
              ? new Date(firstDate).toLocaleDateString(isAr ? 'ar-EG' : 'en', { month: 'long', year: 'numeric' })
              : '';
            // Pick ~5 evenly-spaced ticks across the series
            const tickCount = Math.min(5, points.length);
            const tickIndices = Array.from({ length: tickCount }, (_, i) =>
              Math.round((i / Math.max(tickCount - 1, 1)) * (points.length - 1))
            );
            return (
            <LazyCard delay={200} style={styles.card}>
              <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
                {isAr ? 'الاستهلاك اليومي' : 'Daily Consumption'}
              </Text>
              <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
                {monthName || (isAr ? 'بيانات مباشرة من عدادك الذكي' : 'Live data from your smart meter')}
              </Text>

              {/* Y-axis caption — anchored to the left side (same side as the Y-axis values) */}
              <Text
                style={{
                  fontSize: 9,
                  color: '#111827',
                  marginTop: 12,
                  marginBottom: 2,
                  fontFamily: fonts.semibold,
                  alignSelf: 'flex-start',
                }}
              >
                {isAr ? 'كيلوواط بالساعة' : 'kWh'}
              </Text>
              <View style={styles.chartWrap}>
                <View style={styles.yAxis}>
                  {[maxVal, Math.round(maxVal * 0.5), 0].map((v, i, arr) => (
                    <Text
                      key={i}
                      style={[
                        styles.yLabel,
                        { fontFamily: fonts.regular },
                        // Shift first label up and last down by half its line-height so the
                        // text CENTERS (not edges) align with the chart gridlines.
                        i === 0 ? { marginTop: -7 } : null,
                        i === arr.length - 1 ? { marginBottom: -7 } : null,
                      ]}
                    >
                      {v}
                    </Text>
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
                      <SvgText x={isAr ? 4 : CHART_W - 30} y={avgY - 4} fontSize={7} fill="#111827">{isAr ? `متوسط ${dailyAvg}` : `${dailyAvg} avg`}</SvgText>
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
                            x={isAr ? CHART_W - 60 : 4}
                            y={CHART_H - (lastMonthDailyAvg / maxVal) * (CHART_H - 10) - 4}
                            fontSize={6}
                            fill="#111827"
                            opacity={0.8}
                          >{isAr ? 'متوسط الشهر الماضي' : 'Last month avg'}</SvgText>
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
              {/* X-axis: day ticks — force LTR flow so ticks align with the SVG chart, which is always LTR. */}
              <View style={{ flexDirection: 'row', marginLeft: 34, marginTop: 4, paddingRight: 4, direction: 'ltr' as any }}>
                {tickIndices.map((idx, i) => {
                  const p = points[idx];
                  if (!p?.date) return <View key={i} style={{ flex: 1 }} />;
                  const d = new Date(p.date);
                  const align: 'flex-start' | 'center' | 'flex-end' =
                    i === 0 ? 'flex-start' : i === tickIndices.length - 1 ? 'flex-end' : 'center';
                  return (
                    <View key={i} style={{ flex: 1, alignItems: align }}>
                      <Text style={{ fontSize: 11, lineHeight: 14, color: '#000', fontFamily: fonts.medium }}>
                        {d.toLocaleDateString(isAr ? 'ar-EG' : 'en', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* X-axis caption */}
              <Text style={{ fontSize: 9, color: '#111827', marginTop: 4, textAlign: 'center', fontFamily: fonts.semibold }}>
                {isAr ? 'التاريخ' : 'Date'}
              </Text>
            </LazyCard>
            );
          })()}

          {/* === TIER POSITION === */}
          <LazyCard delay={300} style={styles.card}>
            <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13), flex: 1 }]}>
                {t('tierBreakdown')}
              </Text>
              <TouchableOpacity
                onPress={() => setTiersModalOpen(true)}
                hitSlop={10}
                activeOpacity={0.85}
                style={styles.tierInfoBtnWrap}
              >
                <LinearGradient
                  colors={['#1B4965', '#2A6F8E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.tierInfoBtn, { flexDirection: isAr ? 'row-reverse' : 'row' }]}
                >
                  <Ionicons name="help-circle" size={16} color="#fff" />
                  <Text style={[styles.tierInfoBtnText, { fontFamily: fonts.bold }]}>
                    {t('whatAreTiers')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              {isAr
                ? `استهلكت ${currentKwh} ك.و.س حتى الآن — الشريحة ${currentTier}`
                : `Used ${currentKwh} kWh so far — Tier ${currentTier}`}
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
            {/*
              Tier boundary labels. Each container's flex weight matches
              its corresponding track segment so its right edge sits at
              the T1/T2, T2/T3, and end boundaries. Inside each container
              the label hugs the right edge, then translateX shifts it
              right by half its text width so its visual CENTER lands on
              the boundary line. "0" sits at the left edge of T1.
            */}
            <View style={[styles.tierLabels, { direction: 'ltr' as any }]}>
              <View style={{ flex: 300, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>0</Text>
                <Text style={[styles.tierLabel, { fontFamily: fonts.regular, transform: [{ translateX: 10 }] }]}>300</Text>
              </View>
              <View style={{ flex: 300, flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text style={[styles.tierLabel, { fontFamily: fonts.regular, transform: [{ translateX: 10 }] }]}>600</Text>
              </View>
              <View style={{ flex: 200, flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text style={[styles.tierLabel, { fontFamily: fonts.regular }]}>800+</Text>
              </View>
            </View>

            <View style={styles.tierInfo}>
              <View style={[styles.tierInfoCard, { backgroundColor: 'rgba(5,150,105,0.06)' }]}>
                <Text style={[styles.ticLabel, { fontFamily: fonts.medium, textTransform: isAr ? 'none' : 'uppercase' }]}>{isAr ? 'الشريحة 1' : 'Tier 1'}</Text>
                <AnimatedCounter value={tier1Kwh} style={[styles.ticVal, { fontFamily: fonts.bold, color: '#059669' }]} duration={800} />
                <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>{isAr ? 'كيلوواط بالساعة' : 'kWh'} · {(tier1Kwh * 0.05).toFixed(1)} JD</Text>
              </View>
              <View style={[styles.tierInfoCard, { backgroundColor: 'rgba(217,119,6,0.06)' }]}>
                <Text style={[styles.ticLabel, { fontFamily: fonts.medium, textTransform: isAr ? 'none' : 'uppercase' }]}>{isAr ? 'الشريحة 2' : 'Tier 2'}</Text>
                <AnimatedCounter value={tier2Kwh} style={[styles.ticVal, { fontFamily: fonts.bold, color: '#D97706' }]} duration={800} />
                <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>{isAr ? 'كيلوواط بالساعة' : 'kWh'} · {(tier2Kwh * 0.1).toFixed(1)} JD</Text>
              </View>
              <View style={[styles.tierInfoCard, { backgroundColor: 'rgba(220,38,38,0.06)' }]}>
                <Text style={[styles.ticLabel, { fontFamily: fonts.medium, textTransform: isAr ? 'none' : 'uppercase' }]}>{isAr ? 'الشريحة 3' : 'Tier 3'}</Text>
                <AnimatedCounter value={tier3Kwh} style={[styles.ticVal, { fontFamily: fonts.bold, color: '#DC2626' }]} duration={800} />
                <Text style={[styles.ticSub, { fontFamily: fonts.regular }]}>{isAr ? 'كيلوواط بالساعة' : 'kWh'} · {(tier3Kwh * 0.2).toFixed(1)} JD</Text>
              </View>
            </View>
          </LazyCard>

          {/* === EXPECTED BILL === */}
          <LinearGradient colors={['#1B4965', '#2A6F8E']} style={styles.billCard}>
            <Text style={[styles.billLabel, { fontFamily: fonts.medium }]}>{isAr ? 'الفاتورة المتوقعة لهذا الشهر' : 'Expected Bill This Month'}</Text>
            <View style={styles.billRow}>
              <Text style={[styles.billVal, { fontFamily: fonts.bold }]}>~{expectedBillJd.toFixed(1)} <Text style={styles.billJd}>JD</Text></Text>
              <View style={styles.billBadge}>
                <Ionicons name="bar-chart-outline" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={[styles.billBadgeText, { fontFamily: fonts.medium }]}>{isAr ? 'تقدير JEPCO' : 'JEPCO estimate'}</Text>
              </View>
            </View>
            <Text style={[styles.billSub, { fontFamily: fonts.regular }]}>
              {expectedKwh <= 300
                ? (isAr ? `✓ ضمن الشريحة 1 — أرخص سعر (0.050 د/ك.و.س)` : `✓ Staying in Tier 1 — cheapest rate (0.050 JD/kWh)`)
                : expectedKwh <= 600
                  ? (isAr ? `⚠ تجاوزت إلى الشريحة 2 — ${tier2Kwh} ك.و.س بسعر 0.100 د/ك.و.س` : `⚠ Crossed into Tier 2 — ${tier2Kwh} kWh at 0.100 JD/kWh`)
                  : (isAr ? `⚠ في الشريحة 3 — ${tier3Kwh} ك.و.س بسعر 0.200 د/ك.و.س` : `⚠ In Tier 3 — ${tier3Kwh} kWh at 0.200 JD/kWh`)}
            </Text>
          </LinearGradient>

          {/* === MONTH COMPARISON === */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fonts.bold, fontSize: sz(13) }]}>
              {t('thisMonthVsLast')}
            </Text>
            <View style={styles.cmpGrid}>
              <View style={styles.cmpItem}>
                <Text style={[styles.cmpLabel, { fontFamily: fonts.medium }]}>{isAr ? 'مقارنة بالشهر الماضي' : 'vs Last Month'}</Text>
                <Text style={[styles.cmpVal, { fontFamily: fonts.bold, color: lastMonthDiff > 0 ? '#DC2626' : '#059669' }]}>
                  {lastMonthDiff > 0 ? '+' : ''}{lastMonthDiff}
                </Text>
                <Text style={[styles.cmpUnit, { fontFamily: fonts.regular }]}>{isAr ? 'كيلوواط بالساعة' : 'kWh'}</Text>
                <View style={[styles.cmpBadge, { backgroundColor: lastMonthDiff > 0 ? '#FEE2E2' : '#D1FAE5' }]}>
                  <Ionicons name={lastMonthDiff > 0 ? 'trending-up' : 'trending-down'} size={10} color={lastMonthDiff > 0 ? '#DC2626' : '#059669'} />
                  <Text style={[styles.cmpPct, { fontFamily: fonts.semibold, color: lastMonthDiff > 0 ? '#DC2626' : '#059669' }]}>{Math.abs(lastMonthPct)}%</Text>
                </View>
              </View>
              <View style={styles.cmpItem}>
                <Text style={[styles.cmpLabel, { fontFamily: fonts.medium }]}>{isAr ? 'مقارنة بالسنة الماضية' : 'vs Last Year'}</Text>
                <Text style={[styles.cmpVal, { fontFamily: fonts.bold, color: lastYearDiff > 0 ? '#DC2626' : '#059669' }]}>
                  {lastYearDiff > 0 ? '+' : ''}{lastYearDiff}
                </Text>
                <Text style={[styles.cmpUnit, { fontFamily: fonts.regular }]}>{isAr ? 'كيلوواط بالساعة' : 'kWh'}</Text>
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
              {isAr ? 'متوسط التكلفة اليومية' : 'Average Cost Per Day'}
            </Text>
            <Text style={[styles.cardSub, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              {isAr ? 'كم تكلفك الكهرباء يومياً' : 'How much your electricity costs you daily'}
            </Text>

            <View style={styles.dcRow}>
              <View style={styles.dcMain}>
                <Text style={[styles.dcVal, { fontFamily: fonts.bold }]}>
                  {dailyCostJd.toFixed(2)}
                </Text>
                <Text style={[styles.dcUnit, { fontFamily: fonts.regular }]}>{isAr ? 'د/يوم' : 'JD / day'}</Text>
              </View>
              <View style={styles.dcSep} />
              <View style={styles.dcBreakdown}>
                {/* Weekdays */}
                <View style={styles.dcLine}>
                  <Text style={[styles.dcLineLabel, { fontFamily: fonts.regular }]}>{isAr ? 'أيام الأسبوع' : 'Weekdays'}</Text>
                  <Text style={[styles.dcLineVal, { fontFamily: fonts.bold }]}>
                    {(dailyCostJd * 0.9).toFixed(2)} JD
                  </Text>
                </View>
                <View style={styles.dcBar}>
                  <View style={[styles.dcBarFill, { width: '72%', backgroundColor: '#1B4965' }]} />
                </View>
                {/* Weekends */}
                <View style={[styles.dcLine, { marginTop: 8 }]}>
                  <Text style={[styles.dcLineLabel, { fontFamily: fonts.regular }]}>{isAr ? 'عطلة نهاية الأسبوع' : 'Weekends'}</Text>
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
                <Text style={[styles.dcChipLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3, textTransform: isAr ? 'none' : 'uppercase' }]}>{isAr ? 'أرخص يوم' : 'Cheapest day'}</Text>
                <Text style={[styles.dcChipVal, { fontFamily: fonts.bold, color: '#059669' }]}>
                  {(dailyCostJd * 0.6).toFixed(2)} JD
                </Text>
                <Text style={[styles.dcChipDate, { fontFamily: fonts.regular }]}>
                  {sm.lastBillReadingDate ? `${new Date(sm.lastBillReadingDate).toLocaleDateString(isAr ? 'ar-EG' : 'en', { month: 'short', day: 'numeric', weekday: 'short' })}` : '—'}
                </Text>
              </View>
              <View style={[styles.dcChip, { backgroundColor: 'rgba(220,38,38,0.05)' }]}>
                <Text style={[styles.dcChipLabel, { fontFamily: fonts.medium, letterSpacing: isAr ? 0 : 0.3, textTransform: isAr ? 'none' : 'uppercase' }]}>{isAr ? 'الأغلى' : 'Most expensive'}</Text>
                <Text style={[styles.dcChipVal, { fontFamily: fonts.bold, color: '#DC2626' }]}>
                  {(dailyCostJd * 1.65).toFixed(2)} JD
                </Text>
                <Text style={[styles.dcChipDate, { fontFamily: fonts.regular }]}>
                  {sm.consumptionDate ? `${new Date(new Date(sm.consumptionDate).getTime() - 12 * 86400000).toLocaleDateString(isAr ? 'ar-EG' : 'en', { month: 'short', day: 'numeric', weekday: 'short' })}` : '—'}
                </Text>
              </View>
            </View>
          </View>

          {error && (
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={[styles.retryText, { fontFamily: fonts.medium }]}>{isAr ? '⟳ أعد تحميل البيانات' : '⟳ Retry loading data'}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* ═══ TIER EXPLAINER MODAL ═══ */}
      <Modal
        visible={tiersModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTiersModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTiersModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { fontFamily: fonts.bold, textAlign: isAr ? 'right' : 'left', flex: 1 }]}>
                {t('tiersExplainTitle')}
              </Text>
              <TouchableOpacity onPress={() => setTiersModalOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={[styles.modalIntro, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                {t('tiersExplainIntro')}
              </Text>

              {/* Tier 1 */}
              <View style={[styles.modalTierRow, { backgroundColor: 'rgba(5,150,105,0.08)', borderLeftColor: '#059669', flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                <View style={[styles.modalTierDot, { backgroundColor: '#059669' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTierTitle, { fontFamily: fonts.bold, color: '#059669', textAlign: isAr ? 'right' : 'left' }]}>
                    {t('tiersExplainT1Title')}
                  </Text>
                  <Text style={[styles.modalTierDesc, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                    {t('tiersExplainT1Desc')}
                  </Text>
                </View>
              </View>

              {/* Tier 2 */}
              <View style={[styles.modalTierRow, { backgroundColor: 'rgba(217,119,6,0.08)', borderLeftColor: '#D97706', flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                <View style={[styles.modalTierDot, { backgroundColor: '#D97706' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTierTitle, { fontFamily: fonts.bold, color: '#D97706', textAlign: isAr ? 'right' : 'left' }]}>
                    {t('tiersExplainT2Title')}
                  </Text>
                  <Text style={[styles.modalTierDesc, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                    {t('tiersExplainT2Desc')}
                  </Text>
                </View>
              </View>

              {/* Tier 3 */}
              <View style={[styles.modalTierRow, { backgroundColor: 'rgba(220,38,38,0.08)', borderLeftColor: '#DC2626', flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                <View style={[styles.modalTierDot, { backgroundColor: '#DC2626' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTierTitle, { fontFamily: fonts.bold, color: '#DC2626', textAlign: isAr ? 'right' : 'left' }]}>
                    {t('tiersExplainT3Title')}
                  </Text>
                  <Text style={[styles.modalTierDesc, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                    {t('tiersExplainT3Desc')}
                  </Text>
                </View>
              </View>

              {/* Example */}
              <View style={styles.modalExample}>
                <Text style={[styles.modalExampleTitle, { fontFamily: fonts.bold, textAlign: isAr ? 'right' : 'left' }]}>
                  {t('tiersExplainExampleTitle')}
                </Text>
                <Text style={[styles.modalExampleBody, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                  {t('tiersExplainExampleBody')}
                </Text>
              </View>

              {/* Tip */}
              <View style={[styles.modalTip, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                <Ionicons name="bulb-outline" size={16} color="#1B4965" />
                <Text style={[styles.modalTipText, { fontFamily: fonts.medium, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                  {t('tiersExplainTip')}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalBtn} onPress={() => setTiersModalOpen(false)} activeOpacity={0.85}>
              <Text style={[styles.modalBtnText, { fontFamily: fonts.bold }]}>{t('gotIt')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F5F7' },
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerPad: { paddingHorizontal: 20, paddingBottom: 22 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 28 },
  hdrTitle: { color: '#fff' },
  hdrSub: { color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  sumRow: { flexDirection: 'row', gap: 6, marginTop: 18 },
  sumCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, alignItems: 'center' },
  sumLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', textAlign: 'center' },
  sumVal: { fontSize: 20, color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  sumUnit: { fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  sumChange: { fontSize: 9, marginTop: 3 },

  body: { paddingHorizontal: 16, paddingTop: 16 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  // Explicit lineHeight locks the title→subtitle gap so Arabic and English
  // feel the same. Noto Sans Arabic reports a much taller default line-height,
  // which otherwise inflates the space below the title in Arabic.
  cardTitle: { color: '#0C1E2D', marginBottom: 2, lineHeight: 17 },
  cardSub: { color: '#111827', marginBottom: 10, lineHeight: 14 },

  chartWrap: { flexDirection: 'row', marginTop: 8 },
  yAxis: { width: 34, justifyContent: 'space-between', paddingRight: 4 },
  yLabel: { fontSize: 11, lineHeight: 13, color: '#000', textAlign: 'right', fontWeight: '600' as any },
  chartSvg: { flex: 1 },

  tierTrack: { height: 28, borderRadius: 14, flexDirection: 'row', overflow: 'hidden', position: 'relative', marginTop: 10 },
  tierSeg: { alignItems: 'center', justifyContent: 'center' },
  tierSegLabel: { fontSize: 10, lineHeight: 12, color: '#fff' },
  tierNeedle: { position: 'absolute', top: -3, width: 2, height: 34, backgroundColor: '#0C1E2D', borderRadius: 1 },
  tierLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tierLabel: { fontSize: 10, lineHeight: 12, color: '#111827' },
  tierInfo: { flexDirection: 'row', gap: 6, marginTop: 10 },
  tierInfoCard: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  tierInfoBtnWrap: { borderRadius: 18, shadowColor: '#1B4965', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 4 },
  tierInfoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18 },
  tierInfoBtnText: { fontSize: 11, color: '#fff', letterSpacing: 0.2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(12,30,45,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 17, color: '#000' },
  modalIntro: { fontSize: 13, color: '#000', lineHeight: 20, marginBottom: 14 },
  modalTierRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3 },
  modalTierDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  modalTierTitle: { fontSize: 14, marginBottom: 3 },
  modalTierDesc: { fontSize: 12, color: '#000', lineHeight: 18 },
  modalExample: { backgroundColor: '#F2F5F7', borderRadius: 10, padding: 12, marginTop: 8 },
  modalExampleTitle: { fontSize: 13, color: '#000', marginBottom: 4 },
  modalExampleBody: { fontSize: 12, color: '#000', lineHeight: 18 },
  modalTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(27,73,101,0.08)', borderRadius: 10, padding: 12, marginTop: 10 },
  modalTipText: { flex: 1, fontSize: 12, color: '#000', lineHeight: 18 },
  modalBtn: { backgroundColor: '#1B4965', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  modalBtnText: { color: '#fff', fontSize: 14 },
  ticLabel: { fontSize: 11, lineHeight: 14, color: '#111827', textTransform: 'uppercase' },
  ticVal: { fontSize: 20, lineHeight: 24, marginTop: 4 },
  ticSub: { fontSize: 10, lineHeight: 13, color: '#111827', marginTop: 2 },

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
  cmpLabel: { fontSize: 9, color: '#111827', marginBottom: 6 },
  cmpVal: { fontSize: 20, letterSpacing: -0.5 },
  cmpUnit: { fontSize: 8, color: '#111827', marginTop: 1 },
  cmpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  cmpPct: { fontSize: 9 },

  meterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  meterCard: { flex: 1, backgroundColor: '#F2F5F7', borderRadius: 10, padding: 10, alignItems: 'center' },
  meterLabel: { fontSize: 8, color: '#111827', textTransform: 'uppercase' },
  meterVal: { fontSize: 15, color: '#0C1E2D', marginTop: 2, letterSpacing: 0.5 },
  meterDate: { fontSize: 7, color: '#111827', marginTop: 2 },

  dcRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  dcMain: { flex: 1, alignItems: 'center' },
  dcVal: { fontSize: 30, color: '#1B4965', letterSpacing: -1 },
  dcUnit: { fontSize: 9, color: '#111827', marginTop: 2 },
  dcSep: { width: 1, height: 44, backgroundColor: '#E8ECF0' },
  dcBreakdown: { flex: 1.5 },
  dcLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dcLineLabel: { fontSize: 10, color: '#111827' },
  dcLineVal: { fontSize: 12, color: '#0C1E2D' },
  dcBar: { height: 4, backgroundColor: '#F2F5F7', borderRadius: 2, overflow: 'hidden' },
  dcBarFill: { height: '100%', borderRadius: 2 },
  dcChips: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dcChip: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  dcChipLabel: { fontSize: 7, color: '#111827', textTransform: 'uppercase' },
  dcChipVal: { fontSize: 14, marginTop: 3 },
  dcChipDate: { fontSize: 8, color: '#111827', marginTop: 2 },

  retryBtn: { alignItems: 'center', padding: 12, marginTop: 8 },
  retryText: { fontSize: 13, color: '#1B4965' },
});
