import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';

export default function ManualEntryScreen() {
  const router = useRouter();
  const [totalKwh, setTotalKwh] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [billingStart, setBillingStart] = useState('');
  const [billingEnd, setBillingEnd] = useState('');

  const isValid = totalKwh.length > 0 && totalAmount.length > 0;

  const handleSubmit = () => {
    // Will connect to backend later
    router.replace('/bill/1');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Ionicons name="create-outline" size={40} color={Colors.primary} />
            <Text style={styles.heading}>Enter Bill Details</Text>
            <Text style={styles.desc}>
              Enter the key values from your electricity bill. You can find these on the front page of your JEPCO/EDCO/IDECO bill.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Consumption (kWh) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 320"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={totalKwh}
                onChangeText={setTotalKwh}
              />
              <Text style={styles.hint}>
                Found under "الاستهلاك" or "Consumption" on your bill
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Amount (JD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45.80"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={totalAmount}
                onChangeText={setTotalAmount}
              />
              <Text style={styles.hint}>
                The total due amount "المبلغ المستحق"
              </Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Billing Start</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={Colors.textMuted}
                  value={billingStart}
                  onChangeText={setBillingStart}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Billing End</Text>
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
              <Text style={styles.optionalLabel}>Optional Details</Text>
              <Text style={styles.optionalHint}>For a more accurate breakdown</Text>
            </View>

            <View style={styles.optionalFields}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fuel Clause Amount (JD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12.80"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Previous Meter Reading</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 14520"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Meter Reading</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 14840"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid}
          >
            <Ionicons name="analytics" size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>Analyze My Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanLink}
            onPress={() => router.replace('/bill/scan')}
          >
            <Text style={styles.scanLinkText}>Or scan a photo instead</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
});
