import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { useAuth } from '../../src/contexts/AuthContext';
import { jepcoApi, notificationApi, billApi, complaintApi } from '../../src/services/api';

const { width: SW } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const { user, subscription } = useAuth();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;

  const [smartMeter, setSmartMeter] = React.useState<any>(null);
  const [billHeader, setBillHeader] = React.useState<any>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [billCount, setBillCount] = React.useState(0);
  const [ticketCount, setTicketCount] = React.useState(0);
  const [totalDue, setTotalDue] = React.useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Fetch data in parallel
    jepcoApi.getSmartMeter()
      .then((res) => setSmartMeter(res.data))
      .catch(() => {});

    jepcoApi.getBillHeader()
      .then((res) => setBillHeader(res.data))
      .catch(() => {});

    notificationApi.getUnreadCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});

    billApi.list(1, 0)
      .then((r) => setBillCount(r.total))
      .catch(() => {});

    complaintApi.list()
      .then((r) => setTicketCount(Array.isArray(r) ? r.length : 0))
      .catch(() => {});
  }, []);

  // Smart meter data
  const sm = smartMeter || {};
  const currentKwh = parseInt(sm.currentElectricityConsumptionQuntity || '0');
  const expectedBillJd = parseFloat(sm.expectedElectricityEndofMonthBillAmount || '0');
  const daysInCycle = parseInt(sm.numberOfConsumptionDaysSinceLastRead || '0');
  const lastReadDate = sm.lastElectricityReadDate || '';
  const nextReadDate = sm.nextElectricityReadDate || '';

  // Calculate actual cost from tier
  const tier1 = Math.min(currentKwh, 300);
  const tier2 = currentKwh > 300 ? Math.min(currentKwh - 300, 300) : 0;
  const tier3 = currentKwh > 600 ? currentKwh - 600 : 0;
  const actualCostJd = (tier1 * 0.050) + (tier2 * 0.100) + (tier3 * 0.200);
  const billAmount = expectedBillJd > 0 ? expectedBillJd : actualCostJd;

  // Billing cycle display
  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString(isAr ? 'ar-JO' : 'en-JO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  const subscriberNum = subscription?.subscriberNumber || '—';
  const company = subscription?.distributionCompany || 'JEPCO';

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ═══ HEADER ═══ */}
        <LinearGradient colors={['#0B1D33', '#163A5F', '#1B4965']} style={styles.header}>
          <SafeAreaView edges={['top']} style={styles.headerInner}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/chat/')}>
                <Ionicons name="headset-outline" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <View style={styles.topRight}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications' as any)}>
                  <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.7)" />
                  {unreadCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <LanguageToggle variant="dark" />
              </View>
            </View>

            {/* Welcome */}
            <View style={styles.welcomeBlock}>
              <Text style={[styles.welcomeLabel, { fontFamily: fonts.regular, fontSize: sz(13) }]}>
                {t('welcomeBack')}
              </Text>
              <Text style={[styles.welcomeName, { fontFamily: fonts.bold, fontSize: sz(26) }]}>
                {user?.name || 'Guest'}
              </Text>
            </View>

            {/* Quick stats row */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
                <Text style={[styles.statLabel, { fontFamily: fonts.medium }]}>
                  {isAr ? 'الحسابات' : 'Accounts'}
                </Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { fontFamily: fonts.bold }]}>1</Text>
                  <Ionicons name="chevron-forward" size={12} color="#8BA4B8" />
                </View>
              </TouchableOpacity>

              <View style={styles.statDivider} />

              <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/complaints/')}>
                <Text style={[styles.statLabel, { fontFamily: fonts.medium }]}>
                  {isAr ? 'التذاكر' : 'Tickets'}
                </Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { fontFamily: fonts.bold }]}>{ticketCount}</Text>
                  <Ionicons name="chevron-forward" size={12} color="#8BA4B8" />
                </View>
              </TouchableOpacity>

              <View style={styles.statDivider} />

              <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/bill/')}>
                <Text style={[styles.statLabel, { fontFamily: fonts.medium }]}>
                  {isAr ? 'المبلغ' : 'Amount'}
                </Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { fontFamily: fonts.bold }]}>
                    {billAmount > 0 ? `${billAmount.toFixed(2)} JD` : '0.00 JD'}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="#8BA4B8" />
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ═══ SUBSCRIBER CARD ═══ */}
        <Animated.View style={[styles.subscriberSection, { opacity: fadeAnim }]}>
          <View style={styles.subscriberCard}>
            {/* Subscriber number + edit */}
            <View style={styles.subHeader}>
              <View>
                <Text style={[styles.subNumber, { fontFamily: fonts.bold, fontSize: sz(22) }]}>
                  {subscriberNum}
                </Text>
                <Text style={[styles.subLabel, { fontFamily: fonts.regular, fontSize: sz(12) }]}>
                  {company} · {subscription?.householdSize || 1} {t('people')}
                </Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/(tabs)/profile')}>
                <Text style={[styles.editText, { fontFamily: fonts.medium }]}>
                  {isAr ? 'تعديل' : 'Edit'}
                </Text>
                <Ionicons name="pencil-outline" size={13} color="#1B4965" />
              </TouchableOpacity>
            </View>

            {/* Bill summary card */}
            <View style={styles.billCard}>
              <View style={styles.billTopRow}>
                <Text style={[styles.billLabel, { fontFamily: fonts.medium, fontSize: sz(12) }]}>
                  {isAr ? 'فاتورتك هذا الشهر' : 'Your bill this month'}
                </Text>
                <TouchableOpacity onPress={() => router.push('/bill/')}>
                  <Text style={[styles.viewDetails, { fontFamily: fonts.semibold, fontSize: sz(12) }]}>
                    {isAr ? 'عرض التفاصيل' : 'View details'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.billAmount, { fontFamily: fonts.bold, fontSize: sz(36) }]}>
                {billAmount > 0 ? billAmount.toFixed(2) : '0.00'}
                <Text style={[styles.billCurrency, { fontFamily: fonts.medium }]}> JD</Text>
              </Text>

              {/* Billing cycle */}
              <View style={styles.billMeta}>
                <View style={styles.billMetaItem}>
                  <Text style={[styles.billMetaLabel, { fontFamily: fonts.bold, fontSize: sz(11) }]}>
                    {isAr ? 'دورة الفوترة' : 'Billing cycle'}
                  </Text>
                  <Text style={[styles.billMetaValue, { fontFamily: fonts.regular, fontSize: sz(12) }]}>
                    {lastReadDate ? `${formatDate(lastReadDate)} - ${formatDate(nextReadDate)}` : `${daysInCycle} ${isAr ? 'يوم' : 'days'}`}
                  </Text>
                </View>

                <View style={styles.billMetaItem}>
                  <Text style={[styles.billMetaLabel, { fontFamily: fonts.bold, fontSize: sz(11) }]}>
                    {isAr ? 'الاستهلاك' : 'Consumption'}
                  </Text>
                  <Text style={[styles.billMetaValue, { fontFamily: fonts.regular, fontSize: sz(12) }]}>
                    {currentKwh} kWh
                  </Text>
                </View>
              </View>

              {/* Pay button */}
              <TouchableOpacity
                style={styles.payBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/bill/')}
              >
                <LinearGradient
                  colors={['#1B4965', '#0F2440']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.payBtnGradient}
                >
                  <Text style={[styles.payBtnText, { fontFamily: fonts.bold, fontSize: sz(14) }]}>
                    {isAr ? 'عرض الفواتير' : 'View Bills'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ═══ USAGE OVERVIEW ═══ */}
        <Animated.View style={[styles.usageSection, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.usageOverviewCard}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/usage')}
          >
            <View style={styles.usageOverviewLeft}>
              <View style={styles.usageIconCircle}>
                <Ionicons name="flash" size={20} color="#1B4965" />
              </View>
              <View>
                <Text style={[styles.usageOverviewLabel, { fontFamily: fonts.medium, fontSize: sz(11) }]}>
                  {isAr ? 'استهلاكك الحالي' : 'Current Usage'}
                </Text>
                <Text style={[styles.usageOverviewVal, { fontFamily: fonts.bold, fontSize: sz(18) }]}>
                  {currentKwh} <Text style={styles.usageOverviewUnit}>kWh</Text>
                </Text>
              </View>
            </View>
            <View style={styles.tierBadge}>
              <Text style={[styles.tierBadgeText, { fontFamily: fonts.bold }]}>
                {isAr ? `شريحة ${currentKwh > 600 ? 3 : currentKwh > 300 ? 2 : 1}` : `Tier ${currentKwh > 600 ? 3 : currentKwh > 300 ? 2 : 1}`}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick action cards */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/insights')}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.quickLabel, { fontFamily: fonts.semibold, fontSize: sz(12) }]}>
                {t('insights')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#B8C5D0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.7}
              onPress={() => router.push('/bill/scan')}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="scan" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.quickLabel, { fontFamily: fonts.semibold, fontSize: sz(12) }]}>
                {t('scanYourBill')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#B8C5D0" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F5F7' },

  // ─── Header ─────────────────────────────────────────
  header: {
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerInner: { paddingHorizontal: 22 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#EF4444', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // Welcome
  welcomeBlock: { marginTop: 28, alignItems: 'center' },
  welcomeLabel: { color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3 },
  welcomeName: { color: '#fff', marginTop: 4, letterSpacing: -0.3 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  statCard: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 14,
    alignItems: 'center',
  },
  statDivider: {
    width: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { fontSize: 14, color: '#fff' },

  // ─── Subscriber Card ────────────────────────────────
  subscriberSection: { paddingHorizontal: 18, marginTop: -6 },
  subscriberCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0B1D33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  subHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 18,
  },
  subNumber: { color: '#0A2744', letterSpacing: 1 },
  subLabel: { color: '#8BA4B8', marginTop: 3 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(27,73,101,0.06)',
  },
  editText: { fontSize: 12, color: '#1B4965' },

  // Bill card inside subscriber
  billCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  billTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: { color: '#6B8499' },
  viewDetails: { color: '#1B4965', textDecorationLine: 'underline' },
  billAmount: { color: '#0A2744', letterSpacing: -0.5, marginBottom: 16 },
  billCurrency: { fontSize: 18, color: '#6B8499' },

  billMeta: {
    flexDirection: 'row', gap: 20,
    borderTopWidth: 1, borderTopColor: '#E8ECF0',
    paddingTop: 14, marginBottom: 16,
  },
  billMetaItem: { flex: 1 },
  billMetaLabel: { color: '#0A2744', marginBottom: 3 },
  billMetaValue: { color: '#6B8499' },

  payBtn: { borderRadius: 12, overflow: 'hidden' },
  payBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  payBtnText: { color: '#fff' },

  // ─── Usage Overview ─────────────────────────────────
  usageSection: { paddingHorizontal: 18, marginTop: 16 },
  usageOverviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E8ECF0',
    marginBottom: 12,
  },
  usageOverviewLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  usageIconCircle: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(27,73,101,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  usageOverviewLabel: { color: '#8BA4B8', marginBottom: 2 },
  usageOverviewVal: { color: '#0A2744' },
  usageOverviewUnit: { fontSize: 13, color: '#8BA4B8', fontWeight: '400' },
  tierBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  tierBadgeText: { fontSize: 11, color: '#1B4965' },

  // Quick actions
  quickActions: { gap: 10 },
  quickCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  quickIcon: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { flex: 1, color: '#0A2744' },
});
