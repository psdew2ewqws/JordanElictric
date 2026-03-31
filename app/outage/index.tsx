import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { complaintApi } from '../../src/services/api';

type ScreenState = 'form' | 'submitting' | 'success';
type AffectedArea = 'home' | 'street' | 'neighborhood';

const AFFECTED_AREA_OPTIONS: { key: AffectedArea; labelKey: 'myHomeOnly' | 'myStreet' | 'entireNeighborhood' }[] = [
  { key: 'home', labelKey: 'myHomeOnly' },
  { key: 'street', labelKey: 'myStreet' },
  { key: 'neighborhood', labelKey: 'entireNeighborhood' },
];

function generateRefNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `OUT-${num}`;
}

export default function OutageScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => (isAr ? Math.max(11, en * 0.85) : en);

  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [details, setDetails] = useState('');
  const [affectedArea, setAffectedArea] = useState<AffectedArea | null>(null);
  const [refNumber, setRefNumber] = useState('');

  const canSubmit = location.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setScreenState('submitting');

    const areaLabel = affectedArea
      ? AFFECTED_AREA_OPTIONS.find((o) => o.key === affectedArea)?.labelKey
      : null;
    const areaText = areaLabel ? t(areaLabel) : '';

    const combinedDescription = [
      `Location: ${location}`,
      startTime ? `Started: ${startTime}` : '',
      areaText ? `Affected: ${areaText}` : '',
      details ? `Details: ${details}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      await complaintApi.create({
        complaintType: 'OUTAGE',
        description: combinedDescription,
      });
      const ref = generateRefNumber();
      setRefNumber(ref);
      setScreenState('success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit report';
      setScreenState('form');
      Alert.alert(isAr ? 'خطأ' : 'Error', message);
    }
  }, [canSubmit, location, startTime, details, affectedArea, t, isAr]);

  if (screenState === 'success') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          </View>
          <Text
            style={[
              styles.successTitle,
              { fontFamily: fonts.bold, fontSize: sz(24) },
            ]}
          >
            {t('reportSubmitted')}
          </Text>
          <Text
            style={[
              styles.successDesc,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
          >
            {t('notifiedCompany')}
          </Text>
          <View style={styles.refBadge}>
            <Text
              style={[
                styles.refText,
                { fontFamily: fonts.bold, fontSize: sz(18) },
              ]}
            >
              {refNumber}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
          >
            <Text
              style={[
                styles.primaryBtnText,
                { fontFamily: fonts.semibold, fontSize: sz(15) },
              ]}
            >
              {isAr ? 'العودة للرئيسية' : 'Back to Home'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: fonts.bold, fontSize: sz(18) },
          ]}
        >
          {t('reportOutageTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Description */}
        <View style={styles.heroCard}>
          <Ionicons name="flash-off" size={28} color="#E8930C" />
          <Text
            style={[
              styles.heroText,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
          >
            {t('reportOutageDesc')}
          </Text>
        </View>

        {/* Location */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {t('whereIsOutage')}
        </Text>
        <TextInput
          style={[
            styles.input,
            { fontFamily: fonts.regular, fontSize: sz(14) },
          ]}
          placeholder={t('outageLocation')}
          placeholderTextColor={Colors.textMuted}
          value={location}
          onChangeText={setLocation}
          textAlign={isAr ? 'right' : 'left'}
        />

        {/* When did it start */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {t('whenDidStart')}
        </Text>
        <TextInput
          style={[
            styles.input,
            { fontFamily: fonts.regular, fontSize: sz(14) },
          ]}
          placeholder={isAr ? 'مثال: منذ ساعة' : 'e.g. 1 hour ago'}
          placeholderTextColor={Colors.textMuted}
          value={startTime}
          onChangeText={setStartTime}
          textAlign={isAr ? 'right' : 'left'}
        />

        {/* Affected Area */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {isAr ? 'المنطقة المتأثرة' : 'Affected Area'}
        </Text>
        <View style={styles.chipsRow}>
          {AFFECTED_AREA_OPTIONS.map((option) => {
            const selected = affectedArea === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() =>
                  setAffectedArea(selected ? null : option.key)
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                    { fontFamily: fonts.medium, fontSize: sz(13) },
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Additional details */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {t('additionalDetails')}
        </Text>
        <TextInput
          style={[
            styles.textarea,
            { fontFamily: fonts.regular, fontSize: sz(14) },
          ]}
          placeholder={t('describeOutage')}
          placeholderTextColor={Colors.textMuted}
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          textAlign={isAr ? 'right' : 'left'}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || screenState === 'submitting'}
        >
          {screenState === 'submitting' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.white} />
              <Text
                style={[
                  styles.primaryBtnText,
                  { fontFamily: fonts.semibold, fontSize: sz(15) },
                ]}
              >
                {t('submitting')}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.primaryBtnText,
                { fontFamily: fonts.semibold, fontSize: sz(15) },
              ]}
            >
              {t('submitReport')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text,
  },
  headerSpacer: { width: 36 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  // Hero
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#FEF3C7',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.xxl,
  },
  heroText: {
    flex: 1,
    color: Colors.text,
    lineHeight: 20,
  },

  // Form
  label: {
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
  },
  textarea: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
  },

  // Submit
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    ...Shadows.md,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  primaryBtnText: {
    color: Colors.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successDesc: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  refBadge: {
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.xxxl,
  },
  refText: {
    color: Colors.primary,
    letterSpacing: 1,
  },
});
