import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { complaintApi } from '../../src/services/api';
import { supabase } from '../../src/services/supabase';

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

type GpsState = 'idle' | 'detecting' | 'done' | 'denied' | 'error';

export default function OutageScreen() {
  const router = useRouter();
  const { t, fonts, language, sz } = useLanguage();
  const isAr = language === 'ar';

  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [details, setDetails] = useState('');
  const [affectedArea, setAffectedArea] = useState<AffectedArea | null>(null);
  const [refNumber, setRefNumber] = useState('');

  // GPS location state
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);

  const canSubmit = location.trim().length > 0;

  const detectLocation = useCallback(async () => {
    setGpsState('detecting');
    setGpsAddress(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsState('denied');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocationLat(lat);
      setLocationLng(lng);

      // Reverse geocode via OpenStreetMap Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
          { headers: { 'User-Agent': 'Diaa-App/1.0' } }
        );
        const data = await res.json();
        if (data.display_name) {
          setGpsAddress(data.display_name);
          // Auto-fill the location text field if it's empty
          if (!location.trim()) {
            setLocation(data.display_name);
          }
        }
      } catch {
        // Reverse geocode failed, but we still have coordinates
      }

      setGpsState('done');
    } catch {
      setGpsState('error');
    }
  }, [location]);

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      locationLat && locationLng ? `GPS: ${locationLat.toFixed(6)}, ${locationLng.toFixed(6)}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      // Create the complaint
      const complaint = await complaintApi.create({
        complaintType: 'OUTAGE',
        description: combinedDescription,
      });

      // Also insert into outage_reports table with location data
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('outage_reports').insert({
            user_id: user.id,
            complaint_id: complaint?.id || null,
            location_text: location,
            location_lat: locationLat,
            location_lng: locationLng,
            address: gpsAddress || location,
            affected_area: affectedArea,
            start_time: startTime || null,
            details: details || null,
          });
        }
      } catch {
        // outage_reports insert is best-effort; don't block the submission
      }

      const ref = generateRefNumber();
      setRefNumber(ref);
      setScreenState('success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit report';
      setScreenState('form');
      Alert.alert(t('error'), message);
    }
  }, [canSubmit, location, startTime, details, affectedArea, t, isAr, locationLat, locationLng, gpsAddress]);

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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

        {/* GPS Location Detection */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {isAr ? 'موقعك الحالي' : 'Your Current Location'}
        </Text>
        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <View style={styles.gpsIconWrap}>
              <Ionicons
                name="location"
                size={20}
                color={
                  gpsState === 'done'
                    ? Colors.success
                    : gpsState === 'denied' || gpsState === 'error'
                    ? Colors.danger
                    : Colors.primary
                }
              />
            </View>
            <View style={styles.gpsTextWrap}>
              {gpsState === 'detecting' && (
                <View style={styles.gpsDetectingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text
                    style={[
                      styles.gpsDetectingText,
                      { fontFamily: fonts.medium, fontSize: sz(13) },
                    ]}
                  >
                    {isAr ? 'جاري تحديد الموقع...' : 'Detecting location...'}
                  </Text>
                </View>
              )}
              {gpsState === 'denied' && (
                <Text
                  style={[
                    styles.gpsDeniedText,
                    { fontFamily: fonts.medium, fontSize: sz(13) },
                  ]}
                >
                  {isAr
                    ? 'تم رفض إذن الموقع. يمكنك إدخال الموقع يدوياً أدناه.'
                    : 'Location permission denied. You can enter location manually below.'}
                </Text>
              )}
              {gpsState === 'error' && (
                <Text
                  style={[
                    styles.gpsDeniedText,
                    { fontFamily: fonts.medium, fontSize: sz(13) },
                  ]}
                >
                  {isAr
                    ? 'تعذر تحديد الموقع. يمكنك إدخال الموقع يدوياً أدناه.'
                    : 'Could not detect location. You can enter location manually below.'}
                </Text>
              )}
              {gpsState === 'done' && (
                <>
                  {gpsAddress && (
                    <Text
                      style={[
                        styles.gpsAddressText,
                        { fontFamily: fonts.medium, fontSize: sz(13) },
                      ]}
                      numberOfLines={2}
                    >
                      {gpsAddress}
                    </Text>
                  )}
                  {locationLat !== null && locationLng !== null && (
                    <Text
                      style={[
                        styles.gpsCoordsText,
                        { fontFamily: fonts.regular, fontSize: sz(11) },
                      ]}
                    >
                      {locationLat.toFixed(6)}, {locationLng.toFixed(6)}
                    </Text>
                  )}
                </>
              )}
              {gpsState === 'idle' && (
                <Text
                  style={[
                    styles.gpsDetectingText,
                    { fontFamily: fonts.medium, fontSize: sz(13) },
                  ]}
                >
                  {isAr ? 'اضغط لتحديد الموقع' : 'Tap to detect location'}
                </Text>
              )}
            </View>
          </View>
          {gpsState !== 'detecting' && (
            <TouchableOpacity
              style={styles.gpsRefreshBtn}
              onPress={detectLocation}
            >
              <Ionicons name="refresh" size={16} color={Colors.primary} />
              <Text
                style={[
                  styles.gpsRefreshText,
                  { fontFamily: fonts.medium, fontSize: sz(12) },
                ]}
              >
                {isAr ? 'تحديث الموقع' : 'Refresh Location'}
              </Text>
            </TouchableOpacity>
          )}
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
        <View style={styles.chipsRow}>
          {[
            { key: '< 1 hour', labelAr: 'أقل من ساعة' },
            { key: '1-3 hours', labelAr: '١-٣ ساعات' },
            { key: '3+ hours', labelAr: 'أكثر من ٣ ساعات' },
            { key: "Don't know", labelAr: 'لا أعلم' },
          ].map((option) => {
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
                    { fontFamily: fonts.medium, fontSize: sz(13) },
                  ]}
                >
                  {isAr ? option.labelAr : option.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
      </TouchableWithoutFeedback>
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

  // GPS Location Card
  gpsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  gpsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTextWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  gpsDetectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gpsDetectingText: {
    color: Colors.textSecondary,
  },
  gpsDeniedText: {
    color: Colors.danger,
    lineHeight: 20,
  },
  gpsAddressText: {
    color: Colors.text,
    lineHeight: 20,
  },
  gpsCoordsText: {
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  gpsRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '10',
  },
  gpsRefreshText: {
    color: Colors.primary,
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
