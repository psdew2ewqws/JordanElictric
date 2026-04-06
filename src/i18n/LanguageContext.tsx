import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';
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
const fontMap = {
  en: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    extrabold: 'Inter-ExtraBold',
  },
  ar: {
    regular: 'NotoSansArabic-Regular',
    medium: 'NotoSansArabic-Medium',
    semibold: 'NotoSansArabic-SemiBold',
    bold: 'NotoSansArabic-Bold',
    extrabold: 'NotoSansArabic-Bold',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  sz: (en) => en,
  isRTL: false,
  fonts: fontMap.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('en');

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
