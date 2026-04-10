import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { complaintApi } from '../../src/services/api';
import { supabase } from '../../src/services/supabase';
import { AutoLocationRow, LocationData } from '../../src/components/AutoLocationRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScreenState = 'form' | 'submitting' | 'success';
type AffectedArea = 'home' | 'street' | 'neighborhood';

const AFFECTED_AREA_OPTIONS: {
  key: AffectedArea;
  labelKey: 'myHomeOnly' | 'myStreet' | 'entireNeighborhood';
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'home', labelKey: 'myHomeOnly', icon: 'home-outline' },
  { key: 'street', labelKey: 'myStreet', icon: 'trail-sign-outline' },
  { key: 'neighborhood', labelKey: 'entireNeighborhood', icon: 'business-outline' },
];

const TIME_OPTIONS: {
  key: string;
  labelKey: 'lessThan1Hour' | 'oneToThreeHours' | 'moreThanThreeHours' | 'dontKnow';
}[] = [
  { key: 'lessThan1Hour', labelKey: 'lessThan1Hour' },
  { key: 'oneToThreeHours', labelKey: 'oneToThreeHours' },
  { key: 'moreThanThreeHours', labelKey: 'moreThanThreeHours' },
  { key: 'dontKnow', labelKey: 'dontKnow' },
];

export default function OutageScreen() {
  const router = useRouter();
  const { t, fonts, language, sz } = useLanguage();
  const isAr = language === 'ar';

  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [startTime, setStartTime] = useState('');
  const [details, setDetails] = useState('');
  const [affectedArea, setAffectedArea] = useState<AffectedArea | null>(null);
  const [refNumber, setRefNumber] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Location from AutoLocationRow
  const [locationData, setLocationData] = useState<LocationData>({
    lat: null, lng: null, address: null, locationText: '',
  });

  const canSubmit = locationData.lat !== null && locationData.lng !== null;

  const handleLocationChange = useCallback((data: LocationData) => {
    setLocationData(data);
  }, []);

  const toggleDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setScreenState('submitting');

    const areaLabel = affectedArea
      ? AFFECTED_AREA_OPTIONS.find((o) => o.key === affectedArea)?.labelKey
      : null;
    const areaText = areaLabel ? t(areaLabel) : '';

    const description = [
      `Location: ${locationData.locationText || locationData.address || ''}`,
      startTime ? `Started: ${startTime}` : '',
      areaText ? `Affected: ${areaText}` : '',
      details ? `Details: ${details}` : '',
      locationData.lat && locationData.lng
        ? `GPS: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const complaint = await complaintApi.create({
        complaintType: 'OUTAGE',
        description,
      });

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('outage_reports').insert({
            user_id: user.id,
            complaint_id: complaint?.id || null,
            description,
            location_lat: locationData.lat,
            location_lng: locationData.lng,
            address: locationData.address || locationData.locationText,
            affected_area: affectedArea,
            start_time: startTime || null,
          });
        }
      } catch {
        // outage_reports insert is best-effort
      }

      const num = Math.floor(100000 + Math.random() * 900000);
      setRefNumber(`OUT-${num}`);
      setScreenState('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit report';
      setScreenState('form');
      Alert.alert(t('error'), message);
    }
  }, [canSubmit, locationData, startTime, details, affectedArea, t]);

  if (screenState === 'success') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          <Text style={[styles.successTitle, { fontFamily: fonts.bold, fontSize: sz(24) }]}>
            {t('reportSubmitted')}
          </Text>
          <Text style={[styles.successDesc, { fontFamily: fonts.regular, fontSize: sz(14) }]}>
            {t('notifiedCompany')}
          </Text>
          <View style={styles.refBadge}>
            <Text style={[styles.refText, { fontFamily: fonts.bold, fontSize: sz(18) }]}>
              {refNumber}
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={[styles.primaryBtnText, { fontFamily: fonts.semibold, fontSize: sz(15) }]}>
              {t('backToHome')}
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: fonts.bold, fontSize: sz(18) }]}>
          {t('reportOutageTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Location */}
          <AutoLocationRow onLocationChange={handleLocationChange} />

          {/* Combined: Time + Affected Area Card */}
          <View style={styles.comboCard}>
            {/* When did it start? */}
            <View style={styles.comboSection}>
              <View style={styles.comboLabelRow}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={[styles.comboLabel, { fontFamily: fonts.semibold, fontSize: sz(13) }]}>
                  {t('whenDidStart')}
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {TIME_OPTIONS.map((option) => {
                  const selected = startTime === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setStartTime(selected ? '' : option.key)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                          { fontFamily: fonts.medium, fontSize: sz(12) },
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Affected Area */}
            <View style={styles.comboSection}>
              <View style={styles.comboLabelRow}>
                <Ionicons name="map-outline" size={16} color={Colors.textSecondary} />
                <Text style={[styles.comboLabel, { fontFamily: fonts.semibold, fontSize: sz(13) }]}>
                  {t('affectedArea')}
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {AFFECTED_AREA_OPTIONS.map((option) => {
                  const selected = affectedArea === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setAffectedArea(selected ? null : option.key)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={14}
                        color={selected ? Colors.primary : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                          { fontFamily: fonts.medium, fontSize: sz(12) },
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Add details (collapsible) */}
          <TouchableOpacity style={styles.detailsLink} onPress={toggleDetails}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={[styles.detailsLinkText, { fontFamily: fonts.medium, fontSize: sz(13) }]}>
              {t('addDetails')}
            </Text>
          </TouchableOpacity>

          {showDetails && (
            <TextInput
              style={[styles.textarea, { fontFamily: fonts.regular, fontSize: sz(14), textAlign: isAr ? 'right' : 'left' }]}
              placeholder={t('describeOutage')}
              placeholderTextColor={Colors.textMuted}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || screenState === 'submitting'}
        >
          {screenState === 'submitting' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.white} />
              <Text style={[styles.primaryBtnText, { fontFamily: fonts.semibold, fontSize: sz(15) }]}>
                {t('submitting')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.primaryBtnText, { fontFamily: fonts.semibold, fontSize: sz(15) }]}>
              {t('submitReport')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.text },
  headerSpacer: { width: 36 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },

  // Combined card
  comboCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  comboSection: {
    gap: Spacing.sm,
  },
  comboLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  comboLabel: {
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
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

  // Details link
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  detailsLinkText: {
    color: Colors.primary,
  },

  // Textarea
  textarea: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },

  // Fixed Footer
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: Spacing.md,
  },
  successTitle: {
    color: Colors.text,
    textAlign: 'center',
  },
  successDesc: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  refBadge: {
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.xxl,
  },
  refText: {
    color: Colors.primary,
    letterSpacing: 1,
  },
});
