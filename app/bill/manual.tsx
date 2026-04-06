import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { billApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n/LanguageContext';

export default function ManualEntryScreen() {
  const { t, fonts, language } = useLanguage();
  const isAr = language === 'ar';
  const sz = (en: number) => isAr ? Math.max(11, en * 0.85) : en;
  const router = useRouter();
  const [totalKwh, setTotalKwh] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [billingStart, setBillingStart] = useState('');
  const [billingEnd, setBillingEnd] = useState('');
  const [fuelClause, setFuelClause] = useState('');
  const [previousReading, setPreviousReading] = useState('');
  const [currentReading, setCurrentReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = totalKwh.length > 0 && totalAmount.length > 0 && !loading;

  const parseDateToISO = (input: string): string | undefined => {
    if (!input.trim()) return undefined;
    const parts = input.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return undefined;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const amountJd = parseFloat(totalAmount);
      const totalAmountFils = Math.round(amountJd * 1000);

      const payload: Parameters<typeof billApi.createManual>[0] = {
        totalKwh: parseFloat(totalKwh),
        totalAmountFils,
      };

      const startISO = parseDateToISO(billingStart);
      if (startISO) payload.billingPeriodStart = startISO;

      const endISO = parseDateToISO(billingEnd);
      if (endISO) payload.billingPeriodEnd = endISO;

      if (fuelClause.trim()) {
        payload.fuelClauseFils = Math.round(parseFloat(fuelClause) * 1000);
      }
      if (previousReading.trim()) {
        payload.previousReading = parseInt(previousReading, 10);
      }
      if (currentReading.trim()) {
        payload.currentReading = parseInt(currentReading, 10);
      }

      const result = await billApi.createManual(payload) as { id?: string };
      const billId = result?.id;
      if (billId) {
        router.replace(`/bill/${billId}`);
      } else {
        throw new Error('No bill ID returned');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create bill. Please try again.';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Ionicons name="create-outline" size={40} color={Colors.primary} />
            <Text style={styles.heading}>{t('enterBillDetails')}</Text>
            <Text style={styles.desc}>
              {t('manualDesc')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('totalConsumption')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 320"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={totalKwh}
                onChangeText={setTotalKwh}
              />
              <Text style={styles.hint}>
                {t('consumptionHint')}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('totalAmount')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45.80"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={totalAmount}
                onChangeText={setTotalAmount}
              />
              <Text style={styles.hint}>
                {t('amountHint')}
              </Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('billingStart')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={Colors.textMuted}
                  value={billingStart}
                  onChangeText={setBillingStart}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('billingEnd')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={Colors.textMuted}
                  value={billingEnd}
                  onChangeText={setBillingEnd}
                />
              </View>
            </View>

            {/* Optional fields */}
            <View style={styles.optionalHeader}>
              <Text style={styles.optionalLabel}>{t('optionalDetails')}</Text>
              <Text style={styles.optionalHint}>{t('forMoreAccurate')}</Text>
            </View>

            <View style={styles.optionalFields}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('fuelClauseAmount')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12.80"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={fuelClause}
                  onChangeText={setFuelClause}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('previousMeterReading')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 14520"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={previousReading}
                  onChangeText={setPreviousReading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('currentMeterReading')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 14840"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={currentReading}
                  onChangeText={setCurrentReading}
                />
              </View>
            </View>
          </View>

          {/* Error message */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="analytics" size={20} color={Colors.white} />
            )}
            <Text style={styles.submitBtnText}>
              {loading ? t('analyzing') : t('analyzeMyBill')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanLink}
            onPress={() => router.replace('/bill/scan')}
          >
            <Text style={styles.scanLinkText}>{t('orScanInstead')}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.xl },

  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  desc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },

  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  optionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  optionalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionalHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  optionalFields: {
    gap: Spacing.lg,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xxl,
    ...Shadows.md,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  scanLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  scanLinkText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
