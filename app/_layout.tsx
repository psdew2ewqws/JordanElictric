import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { LanguageProvider } from '../src/i18n/LanguageContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    'NotoSansArabic-Regular': require('../assets/fonts/NotoSansArabic-Regular.ttf'),
    'NotoSansArabic-Medium': require('../assets/fonts/NotoSansArabic-Medium.ttf'),
    'NotoSansArabic-SemiBold': require('../assets/fonts/NotoSansArabic-SemiBold.ttf'),
    'NotoSansArabic-Bold': require('../assets/fonts/NotoSansArabic-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0f1c', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#62B6CB" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0f1c' },
        }}
        initialRouteName="auth/login"
      >
        <Stack.Screen name="auth/login" />
        <Stack.Screen
          name="auth/register"
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="bill/scan"
          options={{ presentation: 'modal', headerShown: true, title: 'Scan Bill' }}
        />
        <Stack.Screen
          name="bill/manual"
          options={{ presentation: 'modal', headerShown: true, title: 'Enter Bill' }}
        />
        <Stack.Screen
          name="bill/[id]"
          options={{ headerShown: true, title: 'Bill Details' }}
        />
      </Stack>
    </LanguageProvider>
  );
}
