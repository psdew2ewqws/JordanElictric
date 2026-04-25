import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, TranslationKey } from './translations';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  sz: (en: number) => number;
  isRTL: boolean;
  fonts: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
  };
}

// Inter for English, Noto Sans Arabic for Arabic (Inter has no Arabic glyphs)
// Layout stays LTR for both — only text content and font family changes
// On web, comma-separated font stacks let the browser pick Inter for Latin
// glyphs and fall back to Noto Sans Arabic for Arabic glyphs — so numbers,
// units (kWh, JD, AM/PM) stay visually identical across language toggles.
// On native RN, fontFamily takes a single name, so we map each weight to
// the matching face. The earlier visual-density 'shift up one weight' for
// Arabic was reverted on native because mixing Inter weights with shifted
// Noto Sans Arabic weights caused glyph corruption on iOS (numbers and
// shaped Arabic words rendered broken / cut off in Expo Go).
const isWeb = Platform.OS === 'web';

const fontMap = {
  en: {
    regular: isWeb ? 'Inter-Regular, NotoSansArabic-Regular' : 'Inter-Regular',
    medium: isWeb ? 'Inter-Medium, NotoSansArabic-Medium' : 'Inter-Medium',
    semibold: isWeb ? 'Inter-SemiBold, NotoSansArabic-SemiBold' : 'Inter-SemiBold',
    bold: isWeb ? 'Inter-Bold, NotoSansArabic-Bold' : 'Inter-Bold',
    extrabold: isWeb ? 'Inter-ExtraBold, NotoSansArabic-Bold' : 'Inter-ExtraBold',
  },
  ar: {
    regular: isWeb ? 'Inter-Regular, NotoSansArabic-Regular' : 'NotoSansArabic-Regular',
    medium: isWeb ? 'Inter-Medium, NotoSansArabic-Medium' : 'NotoSansArabic-Medium',
    semibold: isWeb ? 'Inter-SemiBold, NotoSansArabic-SemiBold' : 'NotoSansArabic-SemiBold',
    bold: isWeb ? 'Inter-Bold, NotoSansArabic-Bold' : 'NotoSansArabic-Bold',
    extrabold: isWeb ? 'Inter-ExtraBold, NotoSansArabic-Bold' : 'NotoSansArabic-Bold',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key) => key,
  sz: (en) => en,
  isRTL: false,
  fonts: fontMap.ar,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('ar');

  useEffect(() => {
    // Always force LTR on startup — both languages use same layout
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    AsyncStorage.getItem('diaa_lang').then((stored) => {
      if (stored === 'ar' || stored === 'en') {
        setLang(stored);
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    AsyncStorage.setItem('diaa_lang', lang);
    // Keep LTR for both languages — same layout, only text changes
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  }, [language]);

  // Arabic text needs to be ~12% larger than English for equivalent readability
  // (Apple WWDC 2022, Google Material Design, University of Jordan research)
  const sz = useCallback((en: number) => language === 'ar' ? Math.round(en * 1.12) : en, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        sz,
        isRTL: false,
        fonts: fontMap[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
