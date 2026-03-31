import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { billApi } from '../../src/services/api';

type ScanState = 'idle' | 'preview' | 'processing' | 'done' | 'error';

export default function ScanBillScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setState('preview');
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setState('preview');
    }
  };

  const processImage = async () => {
    if (!imageUri) return;
    setState('processing');
    setErrorMessage(null);
    try {
      const result = await billApi.scanBill(imageUri);
      setState('done');
      const billId = result.bill?.id;
      if (billId) {
        setTimeout(() => router.replace(`/bill/${billId}`), 800);
      } else {
        throw new Error('No bill ID returned from scan');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to scan bill. Please try again.';
      setState('error');
      setErrorMessage(message);
      Alert.alert('Scan Failed', message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        {state === 'idle' && (
          <View style={styles.idleContainer}>
            <View style={styles.illustration}>
              <Ionicons name="scan-outline" size={64} color={Colors.primary} />
            </View>
            <Text style={styles.heading}>Scan Your Bill</Text>
            <Text style={styles.desc}>
              Take a photo of your electricity bill or choose from your gallery. We'll extract all the details automatically.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={22} color={Colors.white} />
              <Text style={styles.primaryBtnText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
              <Ionicons name="images-outline" size={22} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.replace('/bill/manual')}
            >
              <Text style={styles.linkBtnText}>Or enter manually instead</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'preview' && imageUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => { setState('idle'); setImageUri(null); }}
              >
                <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={processImage}>
                <Ionicons name="sparkles" size={20} color={Colors.white} />
                <Text style={styles.primaryBtnText}>Analyze Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {state === 'processing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingTitle}>Analyzing your bill...</Text>
            <Text style={styles.processingDesc}>
              Our AI is reading and extracting every detail from your bill
            </Text>
            <View style={styles.processingSteps}>
              <StepIndicator label="Reading bill image" done />
              <StepIndicator label="Extracting fields" active />
              <StepIndicator label="Calculating breakdown" />
            </View>
          </View>
        )}

        {state === 'done' && (
          <View style={styles.processingContainer}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            <Text style={styles.processingTitle}>Bill Analyzed!</Text>
            <Text style={styles.processingDesc}>Redirecting to your bill breakdown...</Text>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.processingContainer}>
            <Ionicons name="alert-circle" size={64} color={Colors.danger} />
            <Text style={styles.processingTitle}>Scan Failed</Text>
            <Text style={styles.processingDesc}>
              {errorMessage || 'Something went wrong. Please try again.'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: Spacing.xxl }]}
              onPress={() => { setState('preview'); setErrorMessage(null); }}
            >
              <Ionicons name="refresh-outline" size={20} color={Colors.white} />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function StepIndicator({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.dot, done && stepStyles.dotDone, active && stepStyles.dotActive]}>
        {done && <Ionicons name="checkmark" size={12} color={Colors.white} />}
      </View>
      <Text style={[stepStyles.label, (done || active) && stepStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dotActive: { borderColor: Colors.primary },
  label: { fontSize: FontSize.sm, color: Colors.textMuted },
  labelActive: { color: Colors.text, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.xl },

  // Idle
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    width: '100%',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    width: '100%',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  linkBtn: {
    marginTop: Spacing.md,
  },
  linkBtnText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },

  // Preview
  previewContainer: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  previewImage: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },

  // Processing
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  processingTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xl,
  },
  processingDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  processingSteps: {
    marginTop: Spacing.xxxl,
    alignSelf: 'flex-start',
    paddingLeft: 60,
  },
});
