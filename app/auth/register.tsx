import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';

type Step = 'account' | 'subscriber';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, createSubscription } = useAuth();
  const [step, setStep] = useState<Step>('account');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [subscriberNumber, setSubscriberNumber] = useState('');
  const [company, setCompany] = useState<string | null>(null);
  const [householdSize, setHouseholdSize] = useState('');

  const handleAccountStep = async () => {
    if (!name || !email || !password || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await register(name, email, password);
      setStep('subscriber');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscriberStep = async () => {
    if (!subscriberNumber || !company || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await createSubscription({
        subscriberNumber,
        distributionCompany: company as 'JEPCO' | 'IDECO' | 'EDCO',
        householdSize: parseInt(householdSize, 10) || 1,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const companies = [
    { id: 'JEPCO', label: 'JEPCO', region: 'Central (Amman)' },
    { id: 'IDECO', label: 'IDECO', region: 'North (Irbid)' },
    { id: 'EDCO', label: 'EDCO', region: 'South (Aqaba)' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => step === 'subscriber' ? setStep('account') : router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepLine, step === 'subscriber' && styles.stepLineActive]} />
              <View style={[styles.stepDot, step === 'subscriber' && styles.stepDotActive]} />
            </View>
            <View style={{ width: 24 }} />
          </View>

          {step === 'account' && (
            <>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join thousands of Jordanians understanding their electricity</Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ahmad Hassan"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 8 characters"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                {errorMsg && step === 'account' ? (
                  <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>{errorMsg}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!name || !email || !password || isSubmitting) && styles.btnDisabled]}
                  disabled={!name || !email || !password || isSubmitting}
                  onPress={handleAccountStep}
                >
                  <Text style={styles.primaryBtnText}>{isSubmitting ? '...' : 'Continue'}</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'subscriber' && (
            <>
              <Text style={styles.title}>Your Electricity Account</Text>
              <Text style={styles.subtitle}>Link your electricity subscriber number to get personalized insights</Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Subscriber Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Found on your electricity bill"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={subscriberNumber}
                    onChangeText={setSubscriberNumber}
                  />
                  <Text style={styles.hint}>رقم الاشتراك الموجود على فاتورة الكهرباء</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Distribution Company</Text>
                  <View style={styles.companyGrid}>
                    {companies.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.companyCard,
                          company === c.id && styles.companyCardActive,
                        ]}
                        onPress={() => setCompany(c.id)}
                      >
                        <Text style={[styles.companyName, company === c.id && styles.companyNameActive]}>
                          {c.label}
                        </Text>
                        <Text style={[styles.companyRegion, company === c.id && styles.companyRegionActive]}>
                          {c.region}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Household Size</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Number of people in your home"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={householdSize}
                    onChangeText={setHouseholdSize}
                  />
                </View>

                {errorMsg && step === 'subscriber' ? (
                  <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>{errorMsg}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!subscriberNumber || !company || isSubmitting) && styles.btnDisabled]}
                  disabled={!subscriberNumber || !company || isSubmitting}
                  onPress={handleSubscriberStep}
                >
                  <Text style={styles.primaryBtnText}>{isSubmitting ? '...' : 'Get Started'}</Text>
                  <Ionicons name="flash" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}> Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },

  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
    lineHeight: 20,
  },

  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
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

  companyGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  companyCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  companyCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  companyName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  companyNameActive: {
    color: Colors.primary,
  },
  companyRegion: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  companyRegionActive: {
    color: Colors.primaryLight,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxxl,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});
