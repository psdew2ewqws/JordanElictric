import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen modal that explains Jordan's 3-tier electricity tariff
 * system in plain language. Reused from the Usage tab Tier Breakdown
 * card and from the Home tab bill card.
 */
export function TierExplainerModal({ visible, onClose }: Props) {
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        {/* Tap-out-to-close: a transparent layer behind the card */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[s.title, { fontFamily: fonts.bold, textAlign: isAr ? 'right' : 'left', flex: 1 }]}>
              {t('tiersExplainTitle')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Text style={[s.intro, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
              {t('tiersExplainIntro')}
            </Text>

            {/* Tier 1 */}
            <View style={[s.tierRow, { backgroundColor: 'rgba(5,150,105,0.08)', borderLeftColor: '#059669', flexDirection: isAr ? 'row-reverse' : 'row' }]}>
              <View style={[s.dot, { backgroundColor: '#059669' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.tierTitle, { fontFamily: fonts.bold, color: '#059669', textAlign: isAr ? 'right' : 'left' }]}>
                  {t('tiersExplainT1Title')}
                </Text>
                <Text style={[s.tierDesc, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                  {t('tiersExplainT1Desc')}
                </Text>
              </View>
            </View>

            {/* Tier 2 */}
            <View style={[s.tierRow, { backgroundColor: 'rgba(217,119,6,0.08)', borderLeftColor: '#D97706', flexDirection: isAr ? 'row-reverse' : 'row' }]}>
              <View style={[s.dot, { backgroundColor: '#D97706' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.tierTitle, { fontFamily: fonts.bold, color: '#D97706', textAlign: isAr ? 'right' : 'left' }]}>
                  {t('tiersExplainT2Title')}
                </Text>
                <Text style={[s.tierDesc, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                  {t('tiersExplainT2Desc')}
                </Text>
              </View>
            </View>

            {/* Tier 3 */}
            <View style={[s.tierRow, { backgroundColor: 'rgba(220,38,38,0.08)', borderLeftColor: '#DC2626', flexDirection: isAr ? 'row-reverse' : 'row' }]}>
              <View style={[s.dot, { backgroundColor: '#DC2626' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.tierTitle, { fontFamily: fonts.bold, color: '#DC2626', textAlign: isAr ? 'right' : 'left' }]}>
                  {t('tiersExplainT3Title')}
                </Text>
                <Text style={[s.tierDesc, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                  {t('tiersExplainT3Desc')}
                </Text>
              </View>
            </View>

            {/* Example */}
            <View style={s.example}>
              <Text style={[s.exampleTitle, { fontFamily: fonts.bold, textAlign: isAr ? 'right' : 'left' }]}>
                {t('tiersExplainExampleTitle')}
              </Text>
              <Text style={[s.exampleBody, { fontFamily: fonts.regular, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                {t('tiersExplainExampleBody')}
              </Text>
            </View>

            {/* Tip */}
            <View style={[s.tip, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
              <Ionicons name="bulb-outline" size={16} color="#1B4965" />
              <Text style={[s.tipText, { fontFamily: fonts.medium, textAlign: isAr ? 'right' : 'left', writingDirection: isAr ? 'rtl' : 'ltr' }]}>
                {t('tiersExplainTip')}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={s.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={[s.btnText, { fontFamily: fonts.bold }]}>{t('gotIt')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,30,45,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  title: { fontSize: 17, color: '#000' },
  intro: { fontSize: 13, color: '#000', lineHeight: 20, marginBottom: 14 },
  tierRow: { alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  tierTitle: { fontSize: 14, marginBottom: 3 },
  tierDesc: { fontSize: 12, color: '#000', lineHeight: 18 },
  example: { backgroundColor: '#F2F5F7', borderRadius: 10, padding: 12, marginTop: 8 },
  exampleTitle: { fontSize: 13, color: '#000', marginBottom: 4 },
  exampleBody: { fontSize: 12, color: '#000', lineHeight: 18 },
  tip: { alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(27,73,101,0.08)', borderRadius: 10, padding: 12, marginTop: 10 },
  tipText: { flex: 1, fontSize: 12, color: '#000', lineHeight: 18 },
  btn: { backgroundColor: '#1B4965', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  btnText: { color: '#fff', fontSize: 14 },
});
