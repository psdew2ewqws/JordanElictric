import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, Radius, Shadows } from '../../src/constants/theme';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 36 - 10) / 2;

const SERVICES = [
  { key: 'chat', icon: 'chat-processing' as const, catKey: 'liveChat' as const, nameKey: 'inquiriesComplaints' as const, descKey: 'chatWelcome' as const, color: '#3B82F6', badge: '24/7' },
  { key: 'outage', icon: 'flash-alert' as const, catKey: 'requests' as const, nameKey: 'reportOutage' as const, descKey: 'reportOutageDesc' as const, color: '#E8930C', badge: 'URGENT' },
  { key: 'report', icon: 'clipboard-text-clock' as const, catKey: 'requests' as const, nameKey: 'reportTrack' as const, descKey: 'noReportsDesc' as const, color: '#6366F1', badge: null },
  { key: 'safety', icon: 'shield-account' as const, catKey: 'safety' as const, nameKey: 'energyFriend' as const, descKey: 'energyFriendDesc' as const, color: '#E05A3A', badge: 'NEW' },
  { key: 'billing', icon: 'receipt' as const, catKey: 'billing' as const, nameKey: 'viewPayBills' as const, descKey: 'noBillsDesc' as const, color: '#10B981', badge: null },
] as const;

export default function ServicesScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const { subscription } = useAuth();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;

  const handlePress = (key: string) => {
    switch (key) {
      case 'chat': router.push('/chat/'); break;
      case 'outage': router.push('/outage/'); break;
      case 'report': router.push('/complaints/'); break;
      case 'safety': router.push('/energy-friend/'); break;
      case 'billing': router.push('/bill/'); break;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: fonts.bold, fontSize: sz(24) }]}>
            {t('services')}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fonts.regular, fontSize: sz(13) }]}>
            {isAr ? 'جميع الخدمات في مكان واحد' : 'All services in one place'}
          </Text>
        </View>

        {/* Service Cards Grid */}
        <View style={styles.grid}>
          {SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.key}
              style={styles.serviceCard}
              activeOpacity={0.7}
              onPress={() => handlePress(svc.key)}
            >
              {svc.badge && (
                <View style={[
                  styles.badge,
                  svc.key === 'outage' && styles.badgeAmber,
                  svc.key === 'safety' && styles.badgeNew,
                ]}>
                  <Text style={[
                    styles.badgeText,
                    svc.key === 'outage' && styles.badgeTextAmber,
                    svc.key === 'safety' && styles.badgeTextNew,
                    { fontFamily: fonts.bold },
                  ]}>
                    {svc.key === 'outage' && isAr ? 'عاجل' : svc.key === 'safety' && isAr ? 'جديد' : svc.badge}
                  </Text>
                </View>
              )}
              <View style={[styles.iconCircle, { backgroundColor: svc.color + '12' }]}>
                <MaterialCommunityIcons name={svc.icon} size={28} color={svc.color} />
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

        {/* Subscriber Info Card */}
        {subscription && (
          <View style={styles.subSection}>
            <TouchableOpacity style={styles.subCard} activeOpacity={0.7}>
              <View style={styles.subIcon}>
                <Ionicons name="flash" size={16} color="#1B4965" />
              </View>
              <View style={styles.subText}>
                <Text style={[styles.subNum, { fontFamily: fonts.semibold }]}>
                  {subscription.subscriberNumber}
                </Text>
                <View style={styles.subStatus}>
                  <View style={styles.subDot} />
                  <Text style={[styles.subStatusText, { fontFamily: fonts.regular }]}>
                    {subscription.distributionCompany} · {t('connected')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B8C5D0" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F5F7' },
  container: { flex: 1 },

  header: {
    paddingHorizontal: 22,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.textMuted,
    marginTop: 4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: Spacing.md,
  },

  serviceCard: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardCat: {
    color: '#6BA3BE',
    marginBottom: 3,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  cardName: {
    color: '#0A2744',
    lineHeight: 21,
    textAlign: 'left',
    writingDirection: 'ltr',
  },

  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(27,73,101,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 7,
    letterSpacing: 0.6,
    color: '#1B4965',
    textTransform: 'uppercase',
  },
  badgeAmber: { backgroundColor: 'rgba(232,147,12,0.08)' },
  badgeTextAmber: { color: '#B45309' },
  badgeNew: { backgroundColor: 'rgba(232,90,58,0.06)' },
  badgeTextNew: { color: '#C0392B' },

  subSection: { paddingHorizontal: 18, paddingTop: 20 },
  subCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  subIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(27,73,101,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subText: { flex: 1 },
  subNum: { fontSize: 11, color: '#0C1E2D', letterSpacing: 0.5 },
  subStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  subDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4ADE80' },
  subStatusText: { fontSize: 9, color: '#94A9B8' },
});
