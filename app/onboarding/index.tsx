import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  KeyboardAvoidingView, Keyboard, Platform, ScrollView, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';

const { width: SW } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, fonts, language, sz } = useLanguage();
  const isAr = language === 'ar';

  const [subscriber, setSubscriber] = useState('');
  const [phone, setPhone] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const isValid = subscriber.replace(/\D/g, '').length >= 13 && phone.length >= 10;

  return (
    <View style={styles.screen}>
      {/* Header gradient */}
      <LinearGradient
        colors={['#0F2440', '#1B4965']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.headerInner}>
          <View style={styles.headerRow}>
            <View />
            <LanguageToggle variant="dark" />
          </View>
          <View style={styles.logoArea}>
            <Text style={[styles.logoAr, { fontFamily: fonts.bold }]}>
              {t('appNameAr')}
            </Text>
            <Text style={[styles.logoEn, { fontFamily: fonts.medium }]}>
              {t('appName')}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.formWrap}
        behavior="padding"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.welcomeText, { fontFamily: fonts.bold, fontSize: sz(22), letterSpacing: isAr ? 0 : -0.3 }]}>
            {t('welcome')}, Ahmad 👋
          </Text>
          <Text style={[styles.setupText, { fontFamily: fonts.regular, fontSize: sz(13) }]}>
            {t('letsSetup')}
          </Text>

          {/* Subscriber Number */}
          <Text style={[styles.fieldLabel, { fontFamily: fonts.semibold, fontSize: sz(13) }]}>
            {t('enterSubscriber')}
          </Text>
          <Text style={[styles.fieldHint, { fontFamily: fonts.regular, fontSize: sz(11.5) }]}>
            {t('subscriberHint')}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex, { fontFamily: fonts.semibold }]}
              placeholder={t('subscriberPlaceholder')}
              placeholderTextColor="#B8C5D0"
              keyboardType="numeric"
              maxLength={13}
              value={subscriber}
              onChangeText={setSubscriber}
              autoFocus={true}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => setShowHelp(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.helpBtnText}>!</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.arabicHint, { fontFamily: fonts.regular }]}>
            {t('subscriberHintAr')}
          </Text>

          {/* Phone Number */}
          <Text style={[styles.fieldLabel, { fontFamily: fonts.semibold, fontSize: sz(13), marginTop: 20 }]}>
            {t('phoneNumber')}
          </Text>
          <TextInput
            ref={phoneRef}
            style={[styles.input, { fontFamily: fonts.regular }]}
            placeholder={t('phonePlaceholder')}
            placeholderTextColor="#B8C5D0"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            returnKeyType="go"
            onSubmitEditing={() => { if (isValid) router.replace('/(tabs)'); }}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !isValid && styles.submitDisabled]}
            disabled={!isValid}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={[styles.submitText, { fontFamily: fonts.bold, fontSize: sz(15) }]}>
              {t('unlockData')}
            </Text>
          </TouchableOpacity>

          {/* CPA Badge */}
          <View style={styles.cpaBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#111827" />
            <Text style={[styles.cpaText, { fontFamily: fonts.regular, fontSize: sz(10) }]}>
              {t('cpaInitiative')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Help Modal */}
      <Modal visible={showHelp} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            {/* Bill illustration area */}
            <View style={styles.modalIllustration}>
              <View style={styles.fakeBill}>
                <Text style={styles.fakeBillHeader}>هيئة تنظيم قطاع الطاقة والمعادن</Text>
                <View style={styles.fakeBillRow}>
                  <Text style={styles.fakeBillLabel}>رقم الفاتورة</Text>
                  <View style={styles.fakeBillHighlight}>
                    <Text style={styles.fakeBillNum}>20180800XXXXX</Text>
                  </View>
                </View>
                <View style={styles.fakeBillArrow}>
                  <Ionicons name="arrow-up" size={16} color="#DC2626" />
                  <Text style={styles.fakeBillArrowText}>← هذا الرقم! 13 رقم</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalTitle, { fontFamily: fonts.bold }]}>
                {t('helpTitle')}
              </Text>
              <Text style={[styles.modalDesc, { fontFamily: fonts.regular }]}>
                {t('helpDesc')}
              </Text>
              <View style={styles.modalTip}>
                <Ionicons name="clipboard-outline" size={16} color="#1B4965" />
                <Text style={[styles.modalTipText, { fontFamily: fonts.medium }]}>
                  {t('helpTip')}
                </Text>
              </View>
              <Text style={[styles.modalContact, { fontFamily: fonts.regular }]}>
                {t('helpContact')}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowHelp(false)}
              >
                <Text style={[styles.modalCloseText, { fontFamily: fonts.semibold }]}>
                  {t('gotIt')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F5F7' },

  // Header
  header: { paddingBottom: 28, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: 22 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  logoArea: { alignItems: 'center', marginTop: 16 },
  logoAr: { fontSize: 30, color: '#fff' },
  logoEn: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Form
  formWrap: { flex: 1 },
  formContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  welcomeText: { color: '#0C1E2D' },
  setupText: { color: '#111827', marginTop: 4, marginBottom: 28 },

  fieldLabel: { color: '#1B4965', marginBottom: 6 },
  fieldHint: { color: '#111827', marginBottom: 12, lineHeight: 18 },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputFlex: { flex: 1 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDE3EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0C1E2D', letterSpacing: 1.5,
  },
  helpBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1B4965', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1B4965', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  helpBtnText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  arabicHint: { fontSize: 10, color: '#111827', marginTop: 6, writingDirection: 'ltr' },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1B4965', borderRadius: 12, paddingVertical: 16, marginTop: 28,
    shadowColor: '#1B4965', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff' },

  // CPA
  cpaBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 32 },
  cpaText: { color: '#111827' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modal: {
    width: '100%', maxWidth: 340, backgroundColor: '#fff',
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25, shadowRadius: 40, elevation: 20,
  },
  modalIllustration: {
    backgroundColor: '#F0F4F7', padding: 20, alignItems: 'center',
  },
  fakeBill: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, width: '100%',
    borderWidth: 1, borderColor: '#E4EBF0',
  },
  fakeBillHeader: { fontSize: 9, color: '#111827', textAlign: 'center', marginBottom: 10 },
  fakeBillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fakeBillLabel: { fontSize: 10, color: '#111827' },
  fakeBillHighlight: {
    backgroundColor: '#DBEAFE', borderWidth: 1.5, borderColor: '#3B82F6',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  fakeBillNum: { fontSize: 12, fontWeight: '700', color: '#1B4965', letterSpacing: 0.5 },
  fakeBillArrow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  fakeBillArrowText: { fontSize: 10, color: '#DC2626', fontWeight: '600' },

  modalBody: { padding: 20 },
  modalTitle: { fontSize: 17, color: '#0C1E2D', marginBottom: 8 },
  modalDesc: { fontSize: 13, color: '#111827', lineHeight: 19, marginBottom: 12 },
  modalTip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(27,73,101,0.06)', borderRadius: 8,
    padding: 10, marginBottom: 10,
  },
  modalTipText: { fontSize: 12, color: '#1B4965', flex: 1 },
  modalContact: { fontSize: 11, color: '#111827', marginBottom: 14 },
  modalClose: {
    backgroundColor: '#1B4965', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, color: '#fff' },
});
