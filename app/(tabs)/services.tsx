import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';

const C = {
  white: '#FFFFFF',
  offWhite: '#F4F6F8',
  gray100: '#EAEDF0',
  gray200: '#D1D5DB',
  gray400: '#4A5E6D',
  gray600: '#4B5563',
  gray800: '#1F2937',
  navy: '#1B4965',
  green: '#157A3B',
};

const ITEMS = [
  { key: 'chat', icon: 'chatbubble-ellipses-outline' as const, route: '/chat/' },
  { key: 'outage', icon: 'flash-off-outline' as const, route: '/outage/' },
  { key: 'report', icon: 'document-text-outline' as const, route: '/complaints/' },
  { key: 'safety', icon: 'shield-outline' as const, route: '/energy-friend/' },
  { key: 'billing', icon: 'receipt-outline' as const, route: '/bill/' },
] as const;

export default function ServicesScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const { subscription } = useAuth();
  const isAr = language === 'ar';

  const labels: Record<string, { title: string; desc: string }> = {
    chat: { title: t('inquiriesComplaints'), desc: t('chatServiceDesc') },
    outage: { title: t('reportOutage'), desc: t('outageServiceDesc') },
    report: { title: t('reportTrack'), desc: t('reportTrackDesc') },
    safety: { title: t('energyFriend'), desc: t('safetyServiceDesc') },
    billing: { title: t('viewPayBills'), desc: t('billingServiceDesc') },
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.title, { fontFamily: fonts.bold, letterSpacing: isAr ? 0 : -0.3 }]}>{t('services')}</Text>
        </View>

        <View style={s.list}>
          {ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[s.row, i === ITEMS.length - 1 && { borderBottomWidth: 0 }]}
              activeOpacity={0.6}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon} size={20} color={C.navy} style={s.rowIcon} />
              <View style={s.rowText}>
                <Text style={[s.rowTitle, { fontFamily: fonts.medium }]}>
                  {labels[item.key].title}
                </Text>
                <Text style={[s.rowDesc, { fontFamily: fonts.regular }]}>
                  {labels[item.key].desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.gray200} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscriber */}
        {subscription && (
          <View style={s.subCard}>
            <View style={s.subDot} />
            <View style={{ flex: 1 }}>
              <Text style={[s.subNum, { fontFamily: fonts.bold }]}>{subscription.subscriberNumber}</Text>
              <Text style={[s.subLabel, { fontFamily: fonts.regular }]}>
                {subscription.distributionCompany} · {t('connected')}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.offWhite },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, color: C.gray800 },
  list: { marginHorizontal: 16, backgroundColor: C.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  rowIcon: { width: 28 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, color: C.gray800 },
  rowDesc: { fontSize: 12, color: C.gray400 },
  subCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  subDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  subNum: { fontSize: 13, color: C.gray800, letterSpacing: 0.5 },
  subLabel: { fontSize: 11, color: C.gray400, marginTop: 1 },
});
