import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
// react-native-reanimated and expo-haptics removed for Expo Go compatibility
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Radius, Spacing, Shadows } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/i18n/LanguageContext';

type Step = 'account' | 'subscriber';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, createSubscription } = useAuth();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [step, setStep] = useState<Step>('account');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const subscriberRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [subscriberNumber, setSubscriberNumber] = useState('');
  const [company, setCompany] = useState<string | null>(null);
  const [householdSize, setHouseholdSize] = useState('');

  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerShakeAndError = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleAccountStep = async () => {
    if (!name || !email || !password || isSubmitting) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await register(name, email, password);
      
      setStep('subscriber');
    } catch (err: any) {
      triggerShakeAndError();
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscriberStep = async () => {
    if (!subscriberNumber || !company || isSubmitting) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await createSubscription({
        subscriberNumber,
        distributionCompany: company as 'JEPCO' | 'IDECO' | 'EDCO',
        householdSize: parseInt(householdSize, 10) || 1,
      });
      
      setSuccessMsg(isAr ? 'تم العثور على حسابك!' : 'Account found!');
      setTimeout(() => router.replace('/(tabs)'), 1200);
    } catch (err: any) {
      triggerShakeAndError();
      setErrorMsg(err.message || 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const companies = [
    { id: 'JEPCO', label: 'JEPCO', region: t('centralAmman') },
    { id: 'IDECO', label: 'IDECO', region: t('northIrbid') },
    { id: 'EDCO', label: 'EDCO', region: t('southAqaba') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
              <Text style={styles.title}>{t('createAccount')}</Text>
              <Text style={styles.subtitle}>{t('joinThousands')}</Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('fullName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ahmad Hassan"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoFocus={true}
                    returnKeyType="next"
                    textContentType="name"
                    autoComplete="name"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('email')}</Text>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    returnKeyType="next"
                    textContentType="emailAddress"
                    autoComplete="email"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('password')}</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      ref={passwordRef}
                      style={styles.passwordInput}
                      placeholder={t('minChars')}
                      placeholderTextColor={Colors.textMuted}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="go"
                      textContentType="newPassword"
                      autoComplete="password-new"
                      onSubmitEditing={() => handleAccountStep()}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {errorMsg && step === 'account' ? (
                  <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>{errorMsg}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!name || !email || !password || isSubmitting) && styles.btnDisabled]}
                  disabled={!name || !email || !password || isSubmitting}
                  onPress={handleAccountStep}
                >
                  <Text style={styles.primaryBtnText}>{isSubmitting ? '...' : t('continueBtn')}</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {step === 'subscriber' && (
            <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
              <Text style={styles.title}>{t('yourElecAccount')}</Text>
              <Text style={styles.subtitle}>{t('linkSubscriber')}</Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('subscriberNumber')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('foundOnBill')}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    value={subscriberNumber}
                    onChangeText={setSubscriberNumber}
                    autoFocus={true}
                    returnKeyType="next"
                  />
                  <Text style={styles.hint}>{t('subscriberHintAr')}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('distributionCompany')}</Text>
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
                  <Text style={styles.label}>{t('householdSize')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('numberOfPeople')}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    value={householdSize}
                    onChangeText={setHouseholdSize}
                    returnKeyType="go"
                  />
                </View>

                {successMsg ? (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={styles.successText}>{successMsg}</Text>
                  </View>
                ) : null}
                {errorMsg && step === 'subscriber' ? (
                  <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>{errorMsg}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!subscriberNumber || !company || isSubmitting || !!successMsg) && styles.btnDisabled]}
                  disabled={!subscriberNumber || !company || isSubmitting || !!successMsg}
                  onPress={handleSubscriberStep}
                >
                  <Text style={styles.primaryBtnText}>{isSubmitting ? '...' : t('getStarted')}</Text>
                  <Ionicons name="flash" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('alreadyHaveAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}> {t('logInLink')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  passwordInput: {
    flex: 1,
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

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  successText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#059669',
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
