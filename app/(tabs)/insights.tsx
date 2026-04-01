import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { jepcoApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { AnimatedCounter } from '../../src/components/AnimatedCounter';
import { LazyCard } from '../../src/components/LazyCard';
import {
  calcTierBreakdown, calcBillBreakdown, calcSavingsOpportunity,
  calcEnvironmentalImpact, calcDailyPace, getRecommendations,
} from '../../src/utils/insightsCalc';

const { width: SW } = Dimensions.get('window');

export default function InsightsScreen() {
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;

  const [loading, setLoading] = useState(true);
  const [smartMeter, setSmartMeter] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jepcoApi.getSmartMeter();
      setSmartMeter(res.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // ─── Data ───────────────────────────────────────────────
  const sm = smartMeter || {};
  const currentKwh = parseInt(sm.currentElectricityConsumptionQuntity || '0');
  const expectedKwh = parseInt(sm.expectedElectricityConsumptionQuntity || '0');
  const daysInCycle = parseInt(sm.numberOfConsumptionDaysSinceLastRead || '1');
  const comp = sm.comparazinConsumption || {};
  const lastMonthKwh = parseInt(comp.lastMonthconsumption || '0');

  const projKwh = expectedKwh || currentKwh;
  const tiers = calcTierBreakdown(projKwh);
  const bill = calcBillBreakdown(projKwh);
  const savings = calcSavingsOpportunity(projKwh);
  const env = calcEnvironmentalImpact(projKwh, lastMonthKwh);
  const pace = calcDailyPace(currentKwh, daysInCycle);
  const tips = getRecommendations(projKwh, pace.dailyAvg).slice(0, 2);

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B4965" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ═══ HEADER — just title, no duplicate stats ═══ */}
        <LinearGradient colors={['#0F2440', '#1B4965']} style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerPad}>
            <View style={styles.topRow}>
              <View>
                <Text style={[styles.headerTitle, { fontFamily: fonts.bold, fontSize: sz(22) }]}>
                  {t('insightsTitle')}
                </Text>
                <Text style={[styles.headerSub, { fontFamily: fonts.regular, fontSize: sz(11) }]}>
                  {t('insightsSubtitle')}
                </Text>
              </View>
              <LanguageToggle variant="dark" />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>

          {/* ═══ CARD 1: UNDERSTAND YOUR TARIFF ═══ */}
          <LazyCard delay={100} style={styles.card}>
            <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: sz(14), marginBottom: 12 }]}>
              {t('understandTariff')}
            </Text>

            {/* 3 tier blocks — visual, clear */}
            {[
              { n: 1, range: '0 – 300', rate: '0.050', kwh: tiers.tier1Kwh, cost: tiers.tier1Cost, color: '#10B981', active: true },
              { n: 2, range: '301 – 600', rate: '0.100', kwh: tiers.tier2Kwh, cost: tiers.tier2Cost, color: '#F59E0B', active: tiers.currentTier >= 2 },
              { n: 3, range: '600+', rate: '0.200', kwh: tiers.tier3Kwh, cost: tiers.tier3Cost, color: '#EF4444', active: tiers.currentTier >= 3 },
            ].map((tr) => (
              <View key={tr.n} style={[styles.tierRow, { opacity: tr.active ? 1 : 0.35 }]}>
                <View style={[styles.tierDot, { backgroundColor: tr.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: sz(12), color: '#0C1E2D', fontFamily: fonts.semibold, writingDirection: 'ltr' as const, textAlign: 'left' as const }]}>
                    {tr.range} kWh
                  </Text>
                  <Text style={[{ fontSize: sz(9), color: '#94A9B8', fontFamily: fonts.regular, writingDirection: 'ltr' as const, textAlign: 'left' as const }]}>
                    {tr.rate} JD/{isAr ? 'ك.و.س' : 'kWh'}
                  </Text>
                </View>
                {tr.active && tr.kwh > 0 && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[{ fontSize: sz(13), color: '#0C1E2D', fontFamily: fonts.bold }]}>
                      {tr.kwh} kWh
                    </Text>
                    <Text style={[{ fontSize: sz(9), color: '#94A9B8', fontFamily: fonts.regular }]}>
                      {tr.cost.toFixed(2)} JD
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {/* Your tier badge */}
            <View style={[styles.tierBadge, { backgroundColor: tiers.currentTier === 1 ? '#ECFDF5' : tiers.currentTier === 2 ? '#FFFBEB' : '#FEF2F2' }]}>
              <Ionicons name="information-circle" size={14}
                color={tiers.currentTier === 1 ? '#059669' : tiers.currentTier === 2 ? '#D97706' : '#DC2626'} />
              <Text style={[{ fontSize: sz(10), fontFamily: fonts.medium, writingDirection: 'ltr' as const, textAlign: 'left' as const, flex: 1,
                color: tiers.currentTier === 1 ? '#059669' : tiers.currentTier === 2 ? '#92400E' : '#991B1B' }]}>
                {isAr
                  ? `أنت في الشريحة ${tiers.currentTier} — كل كيلوواط يكلفك ${tiers.currentTier === 1 ? '0.050' : tiers.currentTier === 2 ? '0.100' : '0.200'} دينار`
                  : `You are in Tier ${tiers.currentTier} — each kWh costs you ${tiers.currentTier === 1 ? '0.050' : tiers.currentTier === 2 ? '0.100' : '0.200'} JD`}
              </Text>
            </View>
          </LazyCard>

          {/* ═══ CARD 2: YOUR FOOTPRINT — 2x2 grid ═══ */}
          <LazyCard delay={250} style={styles.cardDark}>
            <Text style={[styles.darkTitle, { fontFamily: fonts.bold, fontSize: sz(14) }]}>
              {t('environmentalFootprint')}
            </Text>
            {/* Row 1 */}
            <View style={styles.fpRow}>
              <View style={styles.fpItem}>
                <MaterialCommunityIcons name="molecule-co2" size={20} color="#94A9B8" />
                <AnimatedCounter value={env.co2Kg} decimals={0} duration={900}
                  style={[styles.fpVal, { fontFamily: fonts.bold }]} />
                <Text style={[styles.fpUnit, { fontFamily: fonts.regular, fontSize: sz(9) }]}>kg CO₂</Text>
              </View>
              <View style={styles.fpItem}>
                <MaterialCommunityIcons name="car" size={20} color="#94A9B8" />
                <AnimatedCounter value={env.drivingKm} duration={900}
                  style={[styles.fpVal, { fontFamily: fonts.bold }]} />
                <Text style={[styles.fpUnit, { fontFamily: fonts.regular, fontSize: sz(9) }]}>{t('km')} {t('likeDriving')}</Text>
              </View>
            </View>
            {/* Row 2 */}
            <View style={[styles.fpRow, { marginTop: 16 }]}>
              <View style={styles.fpItem}>
                <Ionicons name="water-outline" size={20} color="#3B82F6" />
                <AnimatedCounter value={env.waterLiters} duration={900}
                  style={[styles.fpVal, { fontFamily: fonts.bold }]} />
                <Text style={[styles.fpUnit, { fontFamily: fonts.regular, fontSize: sz(9) }]}>{t('litersUsed')}</Text>
              </View>
              <View style={styles.fpItem}>
                <MaterialCommunityIcons name="tree" size={20} color="#10B981" />
                <AnimatedCounter value={env.treesNeeded} duration={900}
                  style={[styles.fpVal, { fontFamily: fonts.bold }]} />
                <Text style={[styles.fpUnit, { fontFamily: fonts.regular, fontSize: sz(9) }]}>{t('treesNeeded')}</Text>
              </View>
            </View>
          </LazyCard>

          {/* ═══ CARD 3: WHERE MONEY GOES ═══ */}
          <LazyCard delay={400} style={styles.card}>
            <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: sz(14), marginBottom: 8 }]}>
              {t('whereMoneyGoes')}
            </Text>

            <BillLine label={`${t('tier')} 1 · 0-300`} val={tiers.tier1Cost} color="#10B981" fonts={fonts} sz={sz} />
            {tiers.tier2Kwh > 0 && <BillLine label={`${t('tier')} 2 · 301-600`} val={tiers.tier2Cost} color="#F59E0B" fonts={fonts} sz={sz} />}
            {tiers.tier3Kwh > 0 && <BillLine label={`${t('tier')} 3 · 600+`} val={tiers.tier3Cost} color="#EF4444" fonts={fonts} sz={sz} />}
            <BillLine label={t('municipalityTax')} val={bill.municipalityTax} color="#94A9B8" fonts={fonts} sz={sz} />
            <BillLine label={`${t('tvLicense')} + ${t('meterRent')}`} val={bill.tvLicense + bill.meterRent} color="#94A9B8" fonts={fonts} sz={sz} />
            {bill.subsidy > 0 && <BillLine label={t('subsidyDeduction')} val={-bill.subsidy} color="#10B981" fonts={fonts} sz={sz} />}

            <View style={styles.billTotal}>
              <Text style={[{ fontFamily: fonts.bold, fontSize: sz(13), color: '#0C1E2D', writingDirection: 'ltr' as const, textAlign: 'left' as const }]}>
                {t('totalEstimated')}
              </Text>
              <AnimatedCounter value={bill.total} decimals={2} suffix=" JD" duration={1000}
                style={[{ fontSize: 18, color: '#0C1E2D', fontFamily: fonts.bold }]} />
            </View>
          </LazyCard>

          {/* ═══ CARD 4: DID YOU KNOW ═══ */}
          {tips.length > 0 && (
            <LazyCard delay={550} style={styles.card}>
              <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: sz(14), marginBottom: 10 }]}>
                {isAr ? 'هل تعلم؟' : 'Did you know?'}
              </Text>
              {tips.map((tip, i) => (
                <View key={i} style={[styles.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }]}>
                  <Ionicons name={tip.icon as any} size={18} color="#1B4965" />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: sz(12), color: '#0C1E2D', fontFamily: fonts.semibold, writingDirection: 'ltr' as const, textAlign: 'left' as const }]}>
                      {isAr ? tip.titleAr : tip.titleEn}
                    </Text>
                    <Text style={[{ fontSize: sz(10), color: '#94A9B8', fontFamily: fonts.regular, marginTop: 2, writingDirection: 'ltr' as const, textAlign: 'left' as const }]}>
                      {isAr ? tip.descAr : tip.descEn}
                    </Text>
                  </View>
                </View>
              ))}
            </LazyCard>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────

function BillLine({ label, val, color, fonts, sz }: any) {
  const isNeg = val < 0;
  return (
    <View style={blStyles.row}>
      <View style={[blStyles.dot, { backgroundColor: color }]} />
      <Text style={[blStyles.label, { fontFamily: fonts.regular, fontSize: sz(11) }]}>{label}</Text>
      <Text style={[blStyles.val, { fontFamily: fonts.medium, fontSize: sz(11), color: isNeg ? '#10B981' : '#3D5468' }]}>
        {isNeg ? '-' : ''}{Math.abs(val).toFixed(3)} JD
      </Text>
    </View>
  );
}

const blStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { flex: 1, color: '#6B8499', writingDirection: 'ltr', textAlign: 'left' },
  val: { writingDirection: 'ltr', textAlign: 'right' },
});

// ─── STYLES ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F5F7' },

  // Header
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerPad: { paddingHorizontal: 22, paddingBottom: 22 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  headerTitle: { color: '#fff', letterSpacing: -0.3, writingDirection: 'ltr', textAlign: 'left' },
  headerSub: { color: 'rgba(255,255,255,0.4)', marginTop: 2, writingDirection: 'ltr', textAlign: 'left' },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 14 },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  cardDark: {
    backgroundColor: '#0F2440', borderRadius: 16, padding: 18, marginBottom: 10,
  },
  title: { color: '#0C1E2D', writingDirection: 'ltr', textAlign: 'left' },
  sub: { color: '#94A9B8', marginTop: 2, writingDirection: 'ltr', textAlign: 'left' },
  darkTitle: { color: '#fff', marginBottom: 14, writingDirection: 'ltr', textAlign: 'left' },

  // Tier card
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12,
  },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // Footprint — 2x2 grid
  fpRow: { flexDirection: 'row' },
  fpItem: { flex: 1, alignItems: 'center', gap: 4 },
  fpVal: { fontSize: 22, color: '#fff', letterSpacing: -0.5 },
  fpUnit: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', writingDirection: 'ltr' },

  // Bill
  billTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#E8ECF0', paddingTop: 12, marginTop: 6,
  },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
});
