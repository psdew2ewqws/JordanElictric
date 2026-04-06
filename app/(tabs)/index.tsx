import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Shimmer } from '../../src/components/Shimmer';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { DataSourceBadge } from '../../src/components/DataSourceBadge';
import { useAuth } from '../../src/contexts/AuthContext';
import { jepcoApi, notificationApi, billApi, complaintApi } from '../../src/services/api';

const C = {
  navy: '#0C1F2E', navyMid: '#14354D', navyLight: '#1B4965',
  white: '#FFFFFF', offWhite: '#F4F6F8',
  gray100: '#EAEDF0', gray200: '#D1D5DB', gray400: '#9CA3AF', gray600: '#4B5563', gray800: '#1F2937',
  green: '#157A3B', amber: '#92680A', red: '#A82020',
};

export default function HomeScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const { user, subscription } = useAuth();
  const isAr = language === 'ar';
  const f = fonts; // shorthand

  const [smartMeter, setSmartMeter] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [bills, setBills] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    setError(false);
    try {
      const results = await Promise.allSettled([
        jepcoApi.getSmartMeter().then((r) => setSmartMeter(r.data)),
        notificationApi.getUnreadCount().then((r) => setUnread(r.count)),
        billApi.list(1, 0).then((r) => setBills(r.total)),
        complaintApi.list().then((r) => setTickets(Array.isArray(r) ? r.length : 0)),
      ]);
      const allFailed = results.every((r) => r.status === 'rejected');
      if (allFailed) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const rawSm = smartMeter || {};
  const sm = rawSm.body || rawSm;
  const kwh = parseInt(sm.expectedElectricityConsumptionQuntity || '0');
  const expectedJd = parseFloat(sm.expectedElectricityEndofMonthBillAmount || '0');
  const costJd = expectedJd > 0 ? expectedJd : (Math.min(kwh, 300) * 0.050) + (kwh > 300 ? Math.min(kwh - 300, 300) * 0.100 : 0) + (kwh > 600 ? (kwh - 600) * 0.200 : 0);
  const tier = kwh > 600 ? 3 : kwh > 300 ? 2 : 1;
  const subNum = subscription?.subscriberNumber || '';
  const co = subscription?.distributionCompany || 'JEPCO';

  if (loading) {
    return (
      <View style={s.screen}>
        <View style={{ paddingHorizontal: 16, paddingTop: 120 }}>
          <Text style={{ color: C.gray400, fontSize: 12, fontFamily: f.regular, textAlign: 'center', marginBottom: 16 }}>
            {isAr ? 'جاري جلب بياناتك من جيبكو...' : 'Fetching your data from JEPCO...'}
          </Text>
          <Shimmer radius={14} height={120} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}><Shimmer radius={14} height={50} /></View>
            <View style={{ flex: 1 }}><Shimmer radius={14} height={50} /></View>
            <View style={{ flex: 1 }}><Shimmer radius={14} height={50} /></View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* ═══ HEADER ═══ */}
        <LinearGradient colors={[C.navy, C.navyMid, C.navyLight]} style={s.header}>
          <SafeAreaView edges={['top']} style={s.headerInner}>
            <View style={s.navRow}>
              <TouchableOpacity onPress={() => router.push('/chat/')} hitSlop={12}>
                <Ionicons name="chatbubble-ellipses-outline" size={21} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              <View style={s.navRight}>
                <TouchableOpacity hitSlop={12} onPress={() => router.push('/notifications/')}>
                  <Ionicons name="notifications-outline" size={21} color="rgba(255,255,255,0.6)" />
                  {unread > 0 && <View style={s.badge} />}
                </TouchableOpacity>
                <LanguageToggle variant="dark" />
              </View>
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18, marginTop: 24, fontFamily: f.regular }}>
              {t('welcomeBack')}
            </Text>
            <Text style={{ color: C.white, fontSize: 24, lineHeight: 32, letterSpacing: -0.3, marginTop: 4, fontFamily: f.bold }}>
              {user?.name || 'Guest'}
            </Text>

            {subNum ? (
              <View style={s.subStrip}>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: C.white, fontSize: 14, lineHeight: 20, letterSpacing: 1, fontFamily: f.bold }}>{subNum}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 16, fontFamily: f.regular }}>{co}</Text>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => router.push('/(tabs)/profile')}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 16, fontFamily: f.medium }}>
                    {isAr ? 'تعديل' : 'Edit'}
                  </Text>
                  <Ionicons name="pencil" size={11} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            ) : null}
          </SafeAreaView>
        </LinearGradient>

        {/* ═══ ERROR BANNER ═══ */}
        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={C.red} />
            <Text style={{ fontSize: 12, color: C.gray600, fontFamily: f.medium, flex: 1 }}>
              {isAr ? 'تعذر تحميل البيانات. اسحب للتحديث.' : "Couldn't load data. Pull to refresh."}
            </Text>
          </View>
        )}

        {/* ═══ BILL CARD ═══ */}
        <View style={s.billWrap}>
          <View style={s.billCard}>
            <Text style={{ fontSize: 13, color: C.gray400, fontFamily: f.medium }}>
              {isAr ? 'فاتورتك الحالية' : 'Your bill this month'}
            </Text>
            <View style={s.billAmountRow}>
              <Text style={{ fontSize: 38, color: C.gray800, letterSpacing: -1.5, fontFamily: f.bold }}>
                {costJd.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 16, color: C.gray400, fontFamily: f.regular }}> JD</Text>
            </View>

            <View style={s.billTable}>
              <View style={s.billTableRow}>
                <Text style={{ fontSize: 13, color: C.gray400, fontFamily: f.regular }}>
                  {isAr ? 'الاستهلاك' : 'Consumption'}
                </Text>
                <Text style={{ fontSize: 13, color: C.gray800, fontFamily: f.bold }}>
                  {kwh} kWh
                </Text>
              </View>
              <View style={s.billTableRow}>
                <Text style={{ fontSize: 13, color: C.gray400, fontFamily: f.regular }}>
                  {isAr ? 'الشريحة' : 'Tariff tier'}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: f.bold, color: tier === 1 ? C.green : tier === 2 ? C.amber : C.red }}>
                  {isAr ? `الشريحة ${tier}` : `Tier ${tier}`}
                </Text>
              </View>
              <View style={s.billTableRow}>
                <Text style={{ fontSize: 13, color: C.gray400, fontFamily: f.regular }}>
                  {isAr ? 'دورة الفوترة' : 'Billing cycle'}
                </Text>
                <Text style={{ fontSize: 13, color: C.gray800, fontFamily: f.regular }}>
                  {sm.lastElectricityReadDate
                    ? `${new Date(sm.lastElectricityReadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — ${new Date(sm.nextElectricityReadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                    : '—'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={s.viewBillsBtn} onPress={() => router.push('/bill/')} activeOpacity={0.8}>
              <Text style={{ color: C.white, fontSize: 14, fontFamily: f.bold }}>
                {isAr ? 'عرض الفواتير' : 'View Bills'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={C.white} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 4, marginTop: 6 }}>
            <DataSourceBadge source={co} updatedAt={new Date()} fonts={{ regular: f.regular }} />
          </View>
        </View>

        {/* ═══ SUMMARY ═══ */}
        <View style={s.summaryRow}>
          <TouchableOpacity style={s.summaryItem} onPress={() => router.push('/bill/')}>
            <Text style={{ fontSize: 18, color: C.gray800, fontFamily: f.bold }}>{bills}</Text>
            <Text style={{ fontSize: 11, color: C.gray400, fontFamily: f.regular }}>{isAr ? 'فواتير' : 'Bills'}</Text>
          </TouchableOpacity>
          <View style={s.summaryDiv} />
          <TouchableOpacity style={s.summaryItem} onPress={() => router.push('/complaints/')}>
            <Text style={{ fontSize: 18, color: C.gray800, fontFamily: f.bold }}>{tickets}</Text>
            <Text style={{ fontSize: 11, color: C.gray400, fontFamily: f.regular }}>{isAr ? 'تذاكر' : 'Tickets'}</Text>
          </TouchableOpacity>
          <View style={s.summaryDiv} />
          <TouchableOpacity style={s.summaryItem} onPress={() => router.push('/(tabs)/usage')}>
            <Text style={{ fontSize: 18, fontFamily: f.bold, color: tier === 1 ? C.green : tier === 2 ? C.amber : C.red }}>{tier}/3</Text>
            <Text style={{ fontSize: 11, color: C.gray400, fontFamily: f.regular }}>{isAr ? 'الشريحة' : 'Tier'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.offWhite },
  header: { paddingBottom: 60 },
  headerInner: { paddingHorizontal: 20 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { position: 'absolute', top: -2, right: -4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  subStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  billWrap: { marginTop: -44, paddingHorizontal: 16 },
  billCard: { backgroundColor: C.white, borderRadius: 14, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  billAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, gap: 5 },
  billTable: { marginTop: 18 },
  billTableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  viewBillsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.navyLight, borderRadius: 10, paddingVertical: 13, marginTop: 18, gap: 8 },
  summaryRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, backgroundColor: C.white, borderRadius: 12, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDiv: { width: 1, backgroundColor: C.gray100, marginVertical: 4 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: -36, marginBottom: 4, backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
});
