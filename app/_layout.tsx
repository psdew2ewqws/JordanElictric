import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="auth/login"
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ presentation: 'fullScreenModal' }}
        />
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
    </>
  );
}
