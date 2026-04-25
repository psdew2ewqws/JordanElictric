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

// On web: comma-separated font stack lets the browser pick Inter for Latin
// glyphs and fall back to Noto Sans Arabic for Arabic ones, so numbers /
// units stay visually identical across the language toggle.
// On native: we point ALL weights at the Inter face (which has no Arabic
// glyphs). iOS / Android then auto-substitutes the system Arabic font for
// Arabic codepoints — system Arabic shapes correctly on iOS, where the
// bundled Noto Sans Arabic .ttf files render broken / cut-off in Expo Go.
// Inter still drives the digits, JD, kWh and other Latin parts so they
// match the English layout.
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
    regular: isWeb ? 'Inter-Regular, NotoSansArabic-Regular' : 'Inter-Regular',
    medium: isWeb ? 'Inter-Medium, NotoSansArabic-Medium' : 'Inter-Medium',
    semibold: isWeb ? 'Inter-SemiBold, NotoSansArabic-SemiBold' : 'Inter-SemiBold',
    bold: isWeb ? 'Inter-Bold, NotoSansArabic-Bold' : 'Inter-Bold',
    extrabold: isWeb ? 'Inter-ExtraBold, NotoSansArabic-Bold' : 'Inter-ExtraBold',
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
