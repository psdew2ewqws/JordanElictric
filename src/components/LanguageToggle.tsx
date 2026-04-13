import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  variant?: 'light' | 'dark';
}

export function LanguageToggle({ variant = 'dark' }: Props) {
  const { language, setLanguage, fonts } = useLanguage();
  const isDark = variant === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <TouchableOpacity
        style={[styles.option, language === 'en' && (isDark ? styles.activeDark : styles.activeLight)]}
        onPress={() => setLanguage('en')}
      >
        <Text style={[
          styles.text,
          language === 'en' ? styles.activeText : (isDark ? styles.inactiveTextDark : styles.inactiveTextLight),
        ]}>
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, language === 'ar' && (isDark ? styles.activeDark : styles.activeLight)]}
        onPress={() => setLanguage('ar')}
      >
        <Text style={[
          styles.text,
          { fontFamily: fonts.medium, fontWeight: '600' },
          language === 'ar' ? styles.activeText : (isDark ? styles.inactiveTextDark : styles.inactiveTextLight),
        ]}>
          عر
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  containerDark: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 17,
  },
  activeDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeLight: {
    backgroundColor: '#1B4965',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeText: {
    color: '#fff',
  },
  inactiveTextDark: {
    color: 'rgba(255,255,255,0.6)',
  },
  inactiveTextLight: {
    color: '#111827',
  },
});
