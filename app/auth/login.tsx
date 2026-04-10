import React, { useState, useRef, useCallback } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/theme';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LanguageToggle } from '../../src/components/LanguageToggle';
import { useAuth } from '../../src/contexts/AuthContext';

const { height: SCREEN_H } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_H * 0.42;

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, fonts, language, sz } = useLanguage();
  const { login } = useAuth();
  const isAr = language === 'ar';

  const passwordRef = useRef<TextInput>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [introEnded, setIntroEnded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const shakeX = useRef(new Animated.Value(0)).current;

  const handleLogin = async () => {
    if (!phone || !password || isSubmitting) return;
    // Haptics removed for Expo Go compatibility
    setIsSubmitting(true);
    setErrorMsg('');
    // Clear any stale tokens before login attempt
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } catch {}
    try {
      // Add 15s timeout to prevent infinite hang
      const loginPromise = login(phone.replace(/[^0-9]/g, '') + '@diaa.jo', password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 15000)
      );
      await Promise.race([loginPromise, timeoutPromise]);
      // Haptics success removed for Expo Go compatibility
      Keyboard.dismiss();
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Session expired') || msg.includes('expired')) {
        router.replace('/(tabs)');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setErrorMsg(msg || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formShown = useRef(false);
  const introRef = useRef<Video>(null);
  const loopRef = useRef<Video>(null);

  const showForm = useCallback(() => {
    if (formShown.current) return;
    formShown.current = true;
    Animated.timing(formOpacity, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [formOpacity]);

  // Fallback: if video doesn't load within 2 seconds, show form anyway
  React.useEffect(() => {
    const timer = setTimeout(showForm, 2000);
    return () => clearTimeout(timer);
  }, [showForm]);

  const onIntroStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.positionMillis > 1800) {
      showForm();
    }
    if (status.didJustFinish && !introEnded) {
      setIntroEnded(true);
      loopRef.current?.playAsync();
    }
  }, [introEnded, showForm]);

  return (
    <View style={styles.screen}>
      {/* === LANGUAGE TOGGLE (top right, over video) === */}
      <View style={[styles.langToggle, { top: insets.top + 12 }]}>
        <LanguageToggle variant="dark" />
      </View>

      {/* === VIDEO AREA === */}
      <View style={styles.videoArea}>
        {!introEnded && (
          <Video
            ref={introRef}
            source={require('../../assets/bulb-animation.mp4')}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted
            onPlaybackStatusUpdate={onIntroStatus}
          />
        )}
        <Video
          ref={loopRef}
          source={require('../../assets/bulb-loop.mp4')}
          style={[styles.video, { opacity: introEnded ? 1 : 0 }]}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
        />
      </View>

      {/* === CLEAN TRANSITION — no visible gradient band === */}

      {/* === FORM AREA === */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.formArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -VIDEO_HEIGHT}
      >
        <Animated.View style={[styles.formInner, { opacity: formOpacity }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
          >
          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            {/* Brand */}
            <View style={[styles.brand, isAr && { marginBottom: 16 }]}>
              <Text style={[styles.appName, { fontFamily: fonts.extrabold, fontSize: sz(26), letterSpacing: isAr ? 0 : -0.5 }]}>
                {t('appName')}
              </Text>
              <Text style={[styles.tagline, { fontFamily: fonts.medium, fontSize: 13 }]}>
                {t('appTagline')}
              </Text>
            </View>

            {/* Email */}
            <View style={[styles.inputGroup, isAr && { marginBottom: 10 }]}>
              <Text style={[styles.label, { fontFamily: fonts.semibold, fontSize: sz(12) }]}>
                {isAr ? 'رقم الهاتف' : 'Phone Number'}
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={16} color="#9CAFBE" />
                <TextInput
                  style={[styles.input, { fontFamily: fonts.regular, fontSize: sz(14.5), paddingVertical: isAr ? 11 : 14 }]}
                  placeholder="07X XXXX XXX"
                  placeholderTextColor="#B8C5D0"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoFocus={true}
                  returnKeyType="next"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Password */}
            <View style={[styles.inputGroup, isAr && { marginBottom: 10 }]}>
              <Text style={[styles.label, { fontFamily: fonts.semibold, fontSize: sz(12) }]}>
                {t('password')}
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={16} color="#9CAFBE" />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { fontFamily: fonts.regular, fontSize: sz(14.5), paddingVertical: isAr ? 11 : 14 }]}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor="#B8C5D0"
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  textContentType="password"
                  autoComplete="password"
                  onSubmitEditing={() => { if (phone && password) handleLogin(); }}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color="#9CAFBE"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.6}>
              <Text style={[styles.forgotText, { fontFamily: fonts.semibold, fontSize: sz(12) }]}>
                {t('forgotPassword')}
              </Text>
            </TouchableOpacity>

            {/* Error message */}
            {errorMsg ? (
              <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 8, fontFamily: fonts.medium }}>
                {errorMsg}
              </Text>
            ) : null}

            {/* Log In */}
            <TouchableOpacity
              style={[styles.primaryBtn, (!email || !password || isSubmitting) && styles.btnDisabled, isAr && { paddingVertical: 13 }]}
              disabled={!phone || !password || isSubmitting}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: fonts.bold, fontSize: sz(16) }]}>
                {isSubmitting ? '...' : t('logIn')}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { fontFamily: fonts.medium, fontSize: sz(12) }]}>
                {t('or')}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity style={[styles.googleBtn, isAr && { paddingVertical: 11 }]} activeOpacity={0.7}>
              <GoogleLogo />
              <Text style={[styles.googleText, { fontFamily: fonts.semibold, fontSize: sz(14.5) }]}>
                {t('continueGoogle')}
              </Text>
            </TouchableOpacity>

            {/* Register */}
            <View style={[styles.footer]}>
              <Text style={[styles.footerText, { fontFamily: fonts.regular, fontSize: sz(13.5) }]}>
                {t('noAccount')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={[styles.footerLink, { fontFamily: fonts.bold, fontSize: sz(13.5) }]}>
                  {' '}{t('createOne')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cpaText, { fontFamily: fonts.regular, fontSize: sz(10), letterSpacing: isAr ? 0 : 0.2 }]}>
              {t('cpaInitiative')}
            </Text>
          </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },

  // Language toggle
  langToggle: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },

  // Video
  videoArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: VIDEO_HEIGHT,
    zIndex: 1,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  // Form area — butts directly against video, no gradient band
  formArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: VIDEO_HEIGHT,
    backgroundColor: '#f8fafb',
    zIndex: 3,
  },
  formInner: {
    flex: 1,
  },
  formScroll: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 30,
    writingDirection: 'ltr',
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: 22,
  },
  appName: {
    fontSize: 26,
    color: Colors.primary,
  },
  tagline: {
    fontSize: 12,
    color: '#5A6F82',
    marginTop: 3,
  },

  // Inputs
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14.5,
    color: '#1E293B',
    textAlign: 'left',
    writingDirection: 'ltr',
  },

  // Forgot
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  forgotText: {
    fontSize: 12,
    color: '#4A9BB5',
    opacity: 0.8,
    writingDirection: 'ltr',
  },

  // Primary button
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1B4965',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 16,
    color: '#fff',
    writingDirection: 'ltr',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D4DAE2',
  },
  dividerText: {
    fontSize: 12,
    color: '#4A5E6D',
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  googleText: {
    fontSize: 14.5,
    color: '#1E293B',
    writingDirection: 'ltr',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13.5,
    color: '#7B8EA0',
    writingDirection: 'ltr',
  },
  footerLink: {
    fontSize: 13.5,
    color: Colors.primary,
    writingDirection: 'ltr',
  },

  cpaText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#A0ADB8',
    marginTop: 14,
    writingDirection: 'ltr',
  },
});
