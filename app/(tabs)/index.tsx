import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { useAuth } from '../../src/contexts/AuthContext';
import { jepcoApi, notificationApi } from '../../src/services/api';
import { AnimatedCounter } from '../../src/components/AnimatedCounter';

const { width: SW } = Dimensions.get('window');

const SERVICES = [
  { key: 'chat', icon: 'chat-processing' as const, catKey: 'liveChat' as const, nameKey: 'inquiriesComplaints' as const, color: '#3B82F6', badge: '24/7' },
  { key: 'outage', icon: 'flash-alert' as const, catKey: 'requests' as const, nameKey: 'reportOutage' as const, color: '#E8930C', badge: 'URGENT' },
  { key: 'report', icon: 'clipboard-text-clock' as const, catKey: 'requests' as const, nameKey: 'reportTrack' as const, color: '#6366F1', badge: null },
  { key: 'safety', icon: 'shield-account' as const, catKey: 'safety' as const, nameKey: 'energyFriend' as const, color: '#E05A3A', badge: 'NEW' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;

  const [smartMeter, setSmartMeter] = React.useState<any>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fetch real JEPCO data
    jepcoApi.getSmartMeter()
      .then((res) => {
        setSmartMeter(res.data);
        // Animate the tier bar to ACTUAL current usage position
        const actual = parseInt(res.data?.currentElectricityConsumptionQuntity || '0');
        const pct = Math.min(100, (actual / Math.max(800, actual + 50)) * 100);
        Animated.timing(barAnim, {
          toValue: pct,
          duration: 1200,
          useNativeDriver: false,
        }).start();
      })
      .catch(() => {});
    notificationApi.getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => {});
  }, []);

  // Extract values from JEPCO smart meter
  const sm = smartMeter || {};
  const currentKwh = parseInt(sm.currentElectricityConsumptionQuntity || '0');
  const expectedKwh = parseInt(sm.expectedElectricityConsumptionQuntity || '0');
  const expectedBillJd = parseFloat(sm.expectedElectricityEndofMonthBillAmount || '0');
  const daysInCycle = parseInt(sm.numberOfConsumptionDaysSinceLastRead || '0');
  const currentTier = currentKwh > 600 ? 3 : currentKwh > 300 ? 2 : 1;
  const tierLabel = currentTier === 1 ? t('stillTier1') : `Tier ${currentTier}`;
  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  // Actual cost from tier calculation
  const t1 = Math.min(currentKwh, 300);
  const t2 = currentKwh > 300 ? Math.min(currentKwh - 300, 300) : 0;
  const t3 = currentKwh > 600 ? currentKwh - 600 : 0;
  const actualCostJd = (t1 * 0.050) + (t2 * 0.100) + (t3 * 0.200);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* === DARK HEADER === */}
        <LinearGradient colors={['#0F2440', '#1B4965']} style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerPad}>
            {/* Top row */}
            <View style={styles.topRow}>
              <View>
                <Text style={[styles.greeting, { fontFamily: fonts.regular, fontSize: sz(11.5) }]}>
                  {t('welcomeBack')}
                </Text>
                <Text style={[styles.userName, { fontFamily: fonts.bold, fontSize: sz(21) }]}>
                  {user?.name || 'Guest'}
                </Text>
              </View>
              <View style={styles.topRight}>
                <TouchableOpacity style={styles.bellBtn}>
                  <Ionicons name="notifications-outline" size={18} color="#fff" />
                  {unreadCount > 0 && <View style={styles.bellDot} />}
                </TouchableOpacity>
                <LanguageToggle variant="dark" />
              </View>
            </View>

            {/* === USAGE WIDGET (JEPCO real data + animated bar) === */}
            <View style={styles.usageCard}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageTitle, { fontFamily: fonts.medium, fontSize: sz(10) }]}>
                  {t('currentUsage')}
                </Text>
                <Text style={[styles.usageDate, { fontFamily: fonts.regular }]}>
                  {sm.consumptionDate || `Mar – ${t('today')}`}
                </Text>
              </View>
              <View style={styles.usageNumRow}>
                <AnimatedCounter value={currentKwh} duration={1000} style={[styles.usageVal, { fontFamily: fonts.bold }]} />
                <Text style={[styles.usageUnit, { fontFamily: fonts.medium }]}>kWh</Text>
                <AnimatedCounter value={actualCostJd} decimals={2} prefix="~" suffix=" JD" duration={1200} style={[styles.usageBill, { fontFamily: fonts.medium, color: 'rgba(255,255,255,0.5)' }]} />
              </View>
              {/* Animated tier bar — gradient is full width, clip reveals progress */}
              <View style={styles.barWrap}>
                <View style={styles.barTrack}>
                  <Animated.View style={[styles.barFillAnimated, { width: barWidth }]}>
                    <LinearGradient
                      colors={['#10B981', '#10B981', '#FBBF24', '#DC2626']}
                      locations={[0, 0.375, 0.75, 1]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ width: 1000, height: '100%', borderRadius: 2 }}
                    />
                  </Animated.View>
                </View>
                <View style={styles.barLabels}>
                  <Text style={styles.barLabel}>0</Text>
                  <Text style={styles.barLabel}>Tier 1 · 300</Text>
                  <Text style={styles.barLabel}>Tier 2 · 600</Text>
                </View>
              </View>
              <View style={styles.tierTag}>
                <Ionicons name="checkmark" size={12} color={currentTier === 1 ? '#10B981' : '#D97706'} />
                <Text style={[styles.tierTagText, { fontFamily: fonts.semibold, fontSize: sz(9), color: currentTier === 1 ? '#10B981' : '#D97706' }]}>
                  {smartMeter ? tierLabel : 'No data yet'}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* === SERVICES === */}
        <View style={styles.servicesSection}>
          <Text style={[styles.servicesLabel, { fontFamily: fonts.semibold, fontSize: sz(11) }]}>
            {t('services')}
          </Text>

          <View style={styles.grid}>
            {SERVICES.map((svc) => (
              <TouchableOpacity key={svc.key} style={styles.serviceCard} activeOpacity={0.7}
                onPress={() => {
                  switch (svc.key) {
                    case 'chat': router.push('/chat/'); break;
                    case 'outage': router.push('/outage/'); break;
                    case 'report': router.push('/complaints/'); break;
                    case 'safety': router.push('/energy-friend/'); break;
                  }
                }}>
                {svc.badge && (
                  <View style={[styles.badge, svc.key === 'outage' && styles.badgeAmber, svc.key === 'safety' && styles.badgeNew]}>
                    <Text style={[styles.badgeText, svc.key === 'outage' && styles.badgeTextAmber, svc.key === 'safety' && styles.badgeTextNew, { fontFamily: fonts.bold }]}>
                      {svc.key === 'outage' && isAr ? 'عاجل' : svc.key === 'safety' && isAr ? 'جديد' : svc.badge}
                    </Text>
                  </View>
                )}
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={svc.icon} size={30} color={svc.color} />
                </View>
                <Text style={[styles.cardCat, { fontFamily: fonts.medium, fontSize: sz(10) }]}>
                  {t(svc.catKey)}
                </Text>
                <Text style={[styles.cardName, { fontFamily: fonts.bold, fontSize: sz(14) }]}>
                  {t(svc.nameKey)}
                </Text>
              </TouchableOpacity>
            ))}

          </View>
        </View>

        {/* === SUBSCRIBER INFO === */}
        <View style={styles.subSection}>
          <TouchableOpacity style={styles.subCard} activeOpacity={0.7}>
            <View style={styles.subIcon}>
              <Ionicons name="flash" size={16} color="#1B4965" />
            </View>
            <View style={styles.subText}>
              <Text style={[styles.subNum, { fontFamily: fonts.semibold }]}>2018080012345</Text>
              <View style={styles.subStatus}>
                <View style={styles.subDot} />
                <Text style={[styles.subStatusText, { fontFamily: fonts.regular }]}>
                  {t('connected')} · {t('updated')} 2{t('hoursAgo')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B8C5D0" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const CARD_W = (SW - 36 - 10) / 2; // 18px padding each side + 10px gap

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F5F7' },

  // Header
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerPad: { paddingHorizontal: 22, paddingBottom: 26 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  greeting: { color: 'rgba(255,255,255,0.4)', textAlign: 'left', writingDirection: 'ltr' },
  userName: { color: '#fff', marginTop: 2, letterSpacing: -0.2, textAlign: 'left', writingDirection: 'ltr' },
  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bellBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 5, right: 5, width: 6, height: 6,
    borderRadius: 3, backgroundColor: '#FBBF24',
  },

  // Usage widget
  usageCard: {
    marginTop: 18, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 16,
  },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  usageTitle: { color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.3 },
  usageDate: { fontSize: 9, color: 'rgba(255,255,255,0.25)' },
  usageNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  usageVal: { fontSize: 34, color: '#fff', letterSpacing: -1 },
  usageUnit: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  barWrap: { marginTop: 10 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  barFillAnimated: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  usageBill: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 8 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barLabel: { fontSize: 8, color: 'rgba(255,255,255,0.2)' },
  tierTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8,
  },
  tierTagText: { color: '#10B981' },

  // Services
  servicesSection: { paddingHorizontal: 18, paddingTop: 22 },
  servicesLabel: { color: '#6B8499', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, textAlign: 'left', writingDirection: 'ltr' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  serviceCard: {
    width: CARD_W, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 20, minHeight: 130,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  iconWrap: {
    marginBottom: 14,
  },
  cardCat: { color: '#6BA3BE', marginBottom: 3, textAlign: 'left', writingDirection: 'ltr' },
  cardName: { color: '#0A2744', lineHeight: 21, textAlign: 'left', writingDirection: 'ltr' },

  badge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(27,73,101,0.06)', paddingHorizontal: 7,
    paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { fontSize: 7, letterSpacing: 0.6, color: '#1B4965', textTransform: 'uppercase' },
  badgeAmber: { backgroundColor: 'rgba(232,147,12,0.08)' },
  badgeTextAmber: { color: '#B45309' },
  badgeNew: { backgroundColor: 'rgba(232,90,58,0.06)' },
  badgeTextNew: { color: '#C0392B' },

  serviceCardFull: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  fullText: { flex: 1 },
  fullDesc: { color: '#94A9B8', marginTop: 3, lineHeight: 15, textAlign: 'left', writingDirection: 'ltr' },

  // Subscriber
  subSection: { paddingHorizontal: 18, paddingTop: 16 },
  subCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 13,
    flexDirection: 'row', alignItems: 'center', gap: 11,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  subIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(27,73,101,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  subText: { flex: 1 },
  subNum: { fontSize: 11, color: '#0C1E2D', letterSpacing: 0.5 },
  subStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  subDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4ADE80' },
  subStatusText: { fontSize: 9, color: '#94A9B8' },
});
