import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLanguage } from '../i18n/LanguageContext';
import { Colors, Radius, Spacing } from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type GpsState = 'idle' | 'detecting' | 'done' | 'denied' | 'error';

export interface LocationData {
  lat: number | null;
  lng: number | null;
  address: string | null;
  locationText: string;
}

interface Props {
  onLocationChange: (data: LocationData) => void;
}

export function AutoLocationRow({ onLocationChange }: Props) {
  const { t, fonts, language, sz } = useLanguage();
  const isAr = language === 'ar';

  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const detectLocation = useCallback(async () => {
    setGpsState('detecting');
    setAddress(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setGpsState('denied');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      setLat(newLat);
      setLng(newLng);

      // Reverse geocode with 5s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&accept-language=ar`,
          { headers: { 'User-Agent': 'Diaa-App/1.0' }, signal: controller.signal },
        );
        clearTimeout(timeout);
        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
          setManualText(data.display_name);
          onLocationChange({ lat: newLat, lng: newLng, address: data.display_name, locationText: data.display_name });
          setGpsState('done');
          return;
        }
      } catch {
        clearTimeout(timeout);
      }

      // Coords only (geocode failed or no display_name)
      const coordsText = `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`;
      setManualText(coordsText);
      onLocationChange({ lat: newLat, lng: newLng, address: null, locationText: coordsText });
      setGpsState('done');
    } catch {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setGpsState('error');
    }
  }, [onLocationChange]);

  useEffect(() => {
    detectLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualChange = useCallback(
    (text: string) => {
      setManualText(text);
      onLocationChange({ lat, lng, address, locationText: text });
    },
    [lat, lng, address, onLocationChange],
  );

  const toggleEdit = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing((prev) => !prev);
  }, []);

  // --- Detecting ---
  if (gpsState === 'detecting') {
    return (
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="location" size={18} color={Colors.primary} />
        </View>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={[styles.statusText, { fontFamily: fonts.medium, fontSize: sz(13) }]}>
          {t('detectingLocation')}
        </Text>
      </View>
    );
  }

  // --- Denied / Error — manual input ---
  if (gpsState === 'denied' || gpsState === 'error') {
    return (
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: Colors.danger + '12' }]}>
          <Ionicons name="location" size={18} color={Colors.danger} />
        </View>
        <TextInput
          style={[styles.input, { fontFamily: fonts.regular, fontSize: sz(13), textAlign: isAr ? 'right' : 'left' }]}
          placeholder={t('enterLocationManually')}
          placeholderTextColor={Colors.textMuted}
          value={manualText}
          onChangeText={handleManualChange}
        />
      </View>
    );
  }

  // --- Done — show address (edit or display) ---
  if (gpsState === 'done') {
    if (isEditing) {
      return (
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.success + '12' }]}>
            <Ionicons name="location" size={18} color={Colors.success} />
          </View>
          <TextInput
            style={[styles.input, { fontFamily: fonts.regular, fontSize: sz(13), textAlign: isAr ? 'right' : 'left' }]}
            value={manualText}
            onChangeText={handleManualChange}
            autoFocus
          />
          <TouchableOpacity onPress={toggleEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="checkmark" size={20} color={Colors.success} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: Colors.success + '12' }]}>
          <Ionicons name="location" size={18} color={Colors.success} />
        </View>
        <Text style={[styles.addressText, { fontFamily: fonts.medium, fontSize: sz(13) }]} numberOfLines={2}>
          {address || manualText || `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
        </Text>
        <TouchableOpacity onPress={toggleEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="create-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={detectLocation}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: Spacing.sm }}
        >
          <Ionicons name="refresh" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  // --- Idle (fallback) ---
  return (
    <TouchableOpacity style={styles.row} onPress={detectLocation}>
      <View style={styles.iconWrap}>
        <Ionicons name="location-outline" size={18} color={Colors.primary} />
      </View>
      <Text style={[styles.statusText, { fontFamily: fonts.medium, fontSize: sz(13) }]}>
        {t('detectingLocation')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    color: Colors.textSecondary,
  },
  addressText: {
    flex: 1,
    color: Colors.text,
    lineHeight: 20,
  },
  input: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 0,
    minHeight: 24,
  },
});
