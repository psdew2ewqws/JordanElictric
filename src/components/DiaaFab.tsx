import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../i18n/LanguageContext';

const NAVY = '#0C1F2E';
const NAVY_MID = '#14354D';
const NAVY_LIGHT = '#1B4965';

// ─── Scroll-aware context ────────────────────────────────────
// Any scrollable inside (tabs) calls `onScroll` from useFabScroll()
// while the user drags. The FAB drops to 0.35 opacity while scrolling,
// then fades back in 350 ms after scrolling stops.

interface FabScrollContextValue {
  onScroll: () => void;
  isScrolling: boolean;
}

const FabScrollContext = createContext<FabScrollContextValue>({
  onScroll: () => {},
  isScrolling: false,
});

export function useFabScroll() {
  return useContext(FabScrollContext);
}

export function FabScrollProvider({ children }: { children: React.ReactNode }) {
  const [isScrolling, setScrolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = useCallback(() => {
    setScrolling((prev) => (prev ? prev : true));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setScrolling(false), 350);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <FabScrollContext.Provider value={{ onScroll, isScrolling }}>
      {children}
    </FabScrollContext.Provider>
  );
}

/**
 * Floating "Ask Diaa" chat entry point. Rendered by the tabs layout so it
 * appears on every tabbed screen. Hides itself on /chat. Fades to 35%
 * opacity while the user is scrolling a tab's ScrollView, then fades back.
 */
export function DiaaFab() {
  const router = useRouter();
  const { fonts, language } = useLanguage();
  const pathname = usePathname();
  const isAr = language === 'ar';
  const { isScrolling } = useFabScroll();
  const insets = useSafeAreaInsets();
  // Tab bar height (matches app/(tabs)/_layout.tsx) + a 14px margin so the
  // FAB sits cleanly above the tab labels with a breath of space.
  const TAB_BAR_HEIGHT = 56;
  const tabBarBottomPad = Platform.OS === 'ios' ? insets.bottom : 8;
  const fabBottom = TAB_BAR_HEIGHT + tabBarBottomPad + 14;

  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isScrolling ? 0.35 : 1,
      duration: isScrolling ? 120 : 250,
      useNativeDriver: true,
    }).start();
  }, [isScrolling, opacity]);

  // Don't render on the chat screen itself
  if (pathname?.startsWith('/chat')) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, bottom: fabBottom }]} pointerEvents="box-none">
      <TouchableOpacity onPress={() => router.push('/chat/')} activeOpacity={0.88}>
        <LinearGradient
          colors={[NAVY_MID, NAVY_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pill, { flexDirection: isAr ? 'row-reverse' : 'row' }]}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={NAVY} />
          </View>
          <View style={{ alignItems: isAr ? 'flex-end' : 'flex-start' }}>
            <Text style={{ color: '#fff', fontSize: 11, lineHeight: 13, opacity: 0.75, fontFamily: fonts.medium }}>
              {isAr ? 'ضياء' : 'Diaa'}
            </Text>
            <Text style={{ color: '#fff', fontSize: 13, lineHeight: 16, fontFamily: fonts.bold }}>
              {isAr ? 'عندك سؤال؟' : 'Have a question?'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    borderRadius: 28,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 50,
  },
  pill: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 28,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
