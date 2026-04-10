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
  Image,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { Colors, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { complaintApi } from '../../src/services/api';
import { supabase } from '../../src/services/supabase';
import { PressableScale } from '../../src/components/PressableScale';
import { AutoLocationRow, LocationData } from '../../src/components/AutoLocationRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScreenState = 'form' | 'submitting' | 'success';

const HAZARD_TYPES: {
  key: string;
  labelKey: 'downedWire' | 'exposedWiring' | 'damagedPole' | 'sparking' | 'otherHazard';
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'DOWNED_WIRE', labelKey: 'downedWire', icon: 'git-commit-outline' },
  { key: 'EXPOSED_WIRING', labelKey: 'exposedWiring', icon: 'warning-outline' },
  { key: 'DAMAGED_POLE', labelKey: 'damagedPole', icon: 'construct-outline' },
  { key: 'SPARKING', labelKey: 'sparking', icon: 'flash-outline' },
  { key: 'OTHER', labelKey: 'otherHazard', icon: 'ellipsis-horizontal' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = Spacing.xl * 2;
const GRID_GAP = Spacing.sm;
const TILE_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GRID_GAP * 2) / 3;

export default function EnergyFriendScreen() {
  const router = useRouter();
  const { t, fonts, language, sz } = useLanguage();
  const isAr = language === 'ar';

  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [selectedHazard, setSelectedHazard] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [detailsText, setDetailsText] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Location from AutoLocationRow
  const [locationData, setLocationData] = useState<LocationData>({
    lat: null, lng: null, address: null, locationText: '',
  });

  const canSubmit =
    selectedHazard !== null &&
    locationData.lat !== null &&
    locationData.lng !== null;

  const handleLocationChange = useCallback((data: LocationData) => {
    setLocationData(data);
  }, []);

  const toggleDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails((prev) => !prev);
  }, []);

  const handlePhotoPress = useCallback(() => {
    Alert.alert(
      t('addPhoto'),
      '',
      [
        {
          text: t('camera'),
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert(t('cameraPermission'), t('allowCameraAccess'));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
            if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
          },
        },
        {
          text: t('gallery'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
          },
        },
        { text: t('cancel'), style: 'cancel' },
      ],
    );
  }, [t]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setScreenState('submitting');

    const hazardLabel = HAZARD_TYPES.find((h) => h.key === selectedHazard)?.labelKey;
    const hazardName = hazardLabel ? t(hazardLabel) : selectedHazard;

    const description = [
      `HAZARD: ${hazardName}`,
      `Location: ${locationData.locationText || locationData.address || ''}`,
      detailsText ? `Details: ${detailsText}` : '',
      locationData.lat && locationData.lng
        ? `GPS: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`
        : '',
    ]
      .filter(Boolean)
      .join(' - ');

    try {
      const complaint = await complaintApi.create({
        complaintType: 'OTHER',
        description,
      });

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('energy_reports').insert({
            user_id: user.id,
            complaint_id: complaint?.id || null,
            hazard_type: selectedHazard,
            description,
            location_lat: locationData.lat,
            location_lng: locationData.lng,
            address: locationData.address || locationData.locationText,
            photo_url: photoUri || null,
          });
        }
      } catch {
        // energy_reports insert is best-effort
      }

      setScreenState('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit report';
      setScreenState('form');
      Alert.alert(t('error'), message);
    }
  }, [canSubmit, selectedHazard, detailsText, locationData, t, photoUri]);

  if (screenState === 'success') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <Ionicons name="shield-checkmark" size={72} color={Colors.success} />
          <Text style={[styles.successTitle, { fontFamily: fonts.bold, fontSize: sz(24) }]}>
            {t('thankYouSafety')}
          </Text>
          <Text style={[styles.successDesc, { fontFamily: fonts.regular, fontSize: sz(14) }]}>
            {t('hazardSubmitted')}
          </Text>
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
          {t('reportHazard')}
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
          {/* Hazard Type Grid */}
          <Text style={[styles.label, { fontFamily: fonts.semibold, fontSize: sz(14), marginTop: 0 }]}>
            {t('hazardType')}
          </Text>
          <View style={styles.grid}>
            {HAZARD_TYPES.map((hazard) => {
              const selected = selectedHazard === hazard.key;
              return (
                <PressableScale
                  key={hazard.key}
                  style={[styles.tile, selected && styles.tileSelected]}
                  onPress={() => setSelectedHazard(selected ? null : hazard.key)}
                >
                  <Ionicons
                    name={hazard.icon}
                    size={26}
                    color={selected ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tileLabel,
                      selected && styles.tileLabelSelected,
                      { fontFamily: fonts.medium, fontSize: sz(11) },
                    ]}
                    numberOfLines={1}
                  >
                    {t(hazard.labelKey)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Location */}
          <AutoLocationRow onLocationChange={handleLocationChange} />

          {/* Optional: Photo + Details links */}
          <View style={styles.optionalRow}>
            <TouchableOpacity style={styles.optionalLink} onPress={handlePhotoPress}>
              <Ionicons
                name={photoUri ? 'image' : 'camera-outline'}
                size={18}
                color={photoUri ? Colors.success : Colors.primary}
              />
              <Text style={[styles.optionalText, { fontFamily: fonts.medium, fontSize: sz(13) }]}>
                {t('addPhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionalLink} onPress={toggleDetails}>
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
              <Text style={[styles.optionalText, { fontFamily: fonts.medium, fontSize: sz(13) }]}>
                {t('addDetails')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo preview (if taken) */}
          {photoUri && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
              <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setPhotoUri(null)}>
                <Ionicons name="close-circle" size={28} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Details textarea (collapsible) */}
          {showDetails && (
            <TextInput
              style={[styles.textarea, { fontFamily: fonts.regular, fontSize: sz(14), textAlign: isAr ? 'right' : 'left' }]}
              placeholder={t('hazardDetailsPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={detailsText}
              onChangeText={setDetailsText}
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
              {t('submitHazard')}
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

  // Label
  label: {
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },

  // Hazard Grid (3 columns)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: Spacing.lg,
  },
  tile: {
    width: TILE_WIDTH,
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  tileSelected: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary,
  },
  tileLabel: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: Colors.primary,
  },

  // Optional row
  optionalRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  optionalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  optionalText: {
    color: Colors.primary,
  },

  // Photo
  photoPreview: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    height: 160,
    marginTop: Spacing.sm,
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

  // Details textarea
  textarea: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    marginTop: Spacing.sm,
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
    marginBottom: Spacing.xxl,
  },
});
