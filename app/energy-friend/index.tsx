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
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { complaintApi } from '../../src/services/api';
import { supabase } from '../../src/services/supabase';

type ScreenState = 'form' | 'submitting' | 'success';

const HAZARD_TYPES: {
  key: string;
  labelKey: 'downedWire' | 'exposedWiring' | 'damagedPole' | 'sparking' | 'otherHazard';
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'downed_wire', labelKey: 'downedWire', icon: 'git-commit-outline' },
  { key: 'exposed_wiring', labelKey: 'exposedWiring', icon: 'warning-outline' },
  { key: 'damaged_pole', labelKey: 'damagedPole', icon: 'construct-outline' },
  { key: 'sparking', labelKey: 'sparking', icon: 'flash-outline' },
  { key: 'other', labelKey: 'otherHazard', icon: 'ellipsis-horizontal' },
];

type GpsState = 'idle' | 'detecting' | 'done' | 'denied' | 'error';

export default function EnergyFriendScreen() {
  const router = useRouter();
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => (isAr ? Math.max(11, en * 0.85) : en);

  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [selectedHazard, setSelectedHazard] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('');
  const [detailsText, setDetailsText] = useState('');

  // GPS location state
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);

  const canSubmit =
    selectedHazard !== null && locationText.trim().length > 0;

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
          if (!locationText.trim()) {
            setLocationText(data.display_name);
          }
        }
      } catch {
        // Reverse geocode failed, but we still have coordinates
      }

      setGpsState('done');
    } catch {
      setGpsState('error');
    }
  }, [locationText]);

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        isAr ? 'تحتاج إذن الكاميرا' : 'Camera Permission Needed',
        isAr
          ? 'يرجى السماح بالوصول للكاميرا من الإعدادات'
          : 'Please allow camera access in settings',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, [isAr]);

  const handlePhotoPress = useCallback(() => {
    Alert.alert(
      t('addPhoto'),
      '',
      [
        {
          text: isAr ? 'الكاميرا' : 'Camera',
          onPress: takePhoto,
        },
        {
          text: isAr ? 'المعرض' : 'Gallery',
          onPress: pickPhoto,
        },
        {
          text: isAr ? 'إلغاء' : 'Cancel',
          style: 'cancel',
        },
      ],
    );
  }, [t, isAr, takePhoto, pickPhoto]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setScreenState('submitting');

    const hazardLabel =
      HAZARD_TYPES.find((h) => h.key === selectedHazard)?.labelKey;
    const hazardName = hazardLabel ? t(hazardLabel) : selectedHazard;

    const description = [
      `HAZARD: ${hazardName}`,
      `Location: ${locationText}`,
      detailsText ? `Details: ${detailsText}` : 'No additional details',
      locationLat && locationLng ? `GPS: ${locationLat.toFixed(6)}, ${locationLng.toFixed(6)}` : '',
    ]
      .filter(Boolean)
      .join(' - ');

    try {
      // Create the complaint
      const complaint = await complaintApi.create({
        complaintType: 'OTHER',
        description,
      });

      // Also insert into energy_reports table with location data
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('energy_reports').insert({
            user_id: user.id,
            complaint_id: complaint?.id || null,
            hazard_type: selectedHazard,
            location_text: locationText,
            location_lat: locationLat,
            location_lng: locationLng,
            address: gpsAddress || locationText,
            photo_url: photoUri || null,
            details: detailsText || null,
          });
        }
      } catch {
        // energy_reports insert is best-effort; don't block the submission
      }

      setScreenState('success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit report';
      setScreenState('form');
      Alert.alert(isAr ? 'خطأ' : 'Error', message);
    }
  }, [canSubmit, selectedHazard, detailsText, locationText, t, isAr, locationLat, locationLng, gpsAddress, photoUri]);

  if (screenState === 'success') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Ionicons name="shield-checkmark" size={72} color={Colors.success} />
          </View>
          <Text
            style={[
              styles.successTitle,
              { fontFamily: fonts.bold, fontSize: sz(24) },
            ]}
          >
            {t('thankYouSafety')}
          </Text>
          <Text
            style={[
              styles.successDesc,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
          >
            {t('hazardSubmitted')}
          </Text>
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
          {t('energyFriendTitle')}
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
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-half-outline" size={32} color="#E05A3A" />
          </View>
          <Text
            style={[
              styles.heroTitle,
              { fontFamily: fonts.bold, fontSize: sz(18) },
            ]}
          >
            {t('reportHazard')}
          </Text>
          <Text
            style={[
              styles.heroDesc,
              { fontFamily: fonts.regular, fontSize: sz(14) },
            ]}
          >
            {t('hazardDesc')}
          </Text>
        </View>

        {/* Hazard Type */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {isAr ? 'نوع الخطر' : 'Hazard Type'}
        </Text>
        <View style={styles.hazardChipsRow}>
          {HAZARD_TYPES.map((hazard) => {
            const selected = selectedHazard === hazard.key;
            return (
              <TouchableOpacity
                key={hazard.key}
                style={[
                  styles.hazardChip,
                  selected && styles.hazardChipSelected,
                ]}
                onPress={() =>
                  setSelectedHazard(selected ? null : hazard.key)
                }
              >
                <Ionicons
                  name={hazard.icon}
                  size={18}
                  color={selected ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.hazardChipText,
                    selected && styles.hazardChipTextSelected,
                    { fontFamily: fonts.medium, fontSize: sz(12) },
                  ]}
                >
                  {t(hazard.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photo */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {t('addPhoto')}
        </Text>
        {photoUri ? (
          <View style={styles.photoPreview}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.photoRemoveBtn}
              onPress={() => setPhotoUri(null)}
            >
              <Ionicons name="close-circle" size={28} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={handlePhotoPress}
          >
            <Ionicons name="camera-outline" size={28} color={Colors.primary} />
            <Text
              style={[
                styles.photoBtnText,
                { fontFamily: fonts.medium, fontSize: sz(13) },
              ]}
            >
              {t('addPhoto')}
            </Text>
          </TouchableOpacity>
        )}

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
          {t('locationDescription')}
        </Text>
        <TextInput
          style={[
            styles.input,
            { fontFamily: fonts.regular, fontSize: sz(14) },
          ]}
          placeholder={t('locationPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={locationText}
          onChangeText={setLocationText}
          textAlign={isAr ? 'right' : 'left'}
        />

        {/* Details */}
        <Text
          style={[
            styles.label,
            { fontFamily: fonts.semibold, fontSize: sz(14) },
          ]}
        >
          {t('hazardDetails')}
        </Text>
        <TextInput
          style={[
            styles.textarea,
            { fontFamily: fonts.regular, fontSize: sz(14) },
          ]}
          placeholder={t('hazardDetailsPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={detailsText}
          onChangeText={setDetailsText}
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
                {isAr ? 'جاري الإرسال...' : 'Submitting...'}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.primaryBtnText,
                { fontFamily: fonts.semibold, fontSize: sz(15) },
              ]}
            >
              {t('submitHazard')}
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E05A3A' + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroDesc: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form
  label: {
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },

  // Hazard chips
  hazardChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  hazardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hazardChipSelected: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary,
  },
  hazardChipText: {
    color: Colors.textSecondary,
  },
  hazardChipTextSelected: {
    color: Colors.primary,
  },

  // Photo
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoBtnText: {
    color: Colors.primary,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    height: 180,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
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

  // Input
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
  successIconWrap: {
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
    marginBottom: Spacing.xxxl,
  },
});
