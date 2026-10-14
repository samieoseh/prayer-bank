import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { AppLockGate } from '@/features/app-lock/components/app-lock-gate';
import { AppLockProvider } from '@/features/app-lock/providers/app-lock-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { gcTime: Infinity, retry: false, staleTime: Infinity },
        },
      }),
  );
  const theme = colorScheme === 'dark' ? prayerBankDarkTheme : prayerBankLightTheme;

  return (
    <PaperProvider theme={theme}>
      <AppLockProvider>
        <AppLockGate>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator backgroundColor={theme.colors.background} />
            </AuthProvider>
          </QueryClientProvider>
        </AppLockGate>
      </AppLockProvider>
    </PaperProvider>
  );
}

function RootNavigator({ backgroundColor }: { backgroundColor: string }) {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor }, headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

const prayerBankLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6f7653',
    onPrimary: '#fffaf0',
    primaryContainer: '#e4e5d5',
    onPrimaryContainer: '#282923',
    background: '#f8f3e8',
    onBackground: '#282923',
    surface: '#fffaf0',
    onSurface: '#282923',
    surfaceVariant: '#f1ebde',
    onSurfaceVariant: '#747468',
    outline: '#9b9a8d',
    outlineVariant: '#ddd6c8',
    error: '#9a594e',
  },
};

const prayerBankDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bbc49a',
    onPrimary: '#202315',
    primaryContainer: '#3d432d',
    onPrimaryContainer: '#eef3d9',
    background: '#171812',
    onBackground: '#f4efe4',
    surface: '#22231c',
    onSurface: '#f4efe4',
    surfaceVariant: '#2d2f25',
    onSurfaceVariant: '#c7c2b8',
    outline: '#9a9c90',
    outlineVariant: '#535548',
    error: '#e8a59a',
  },
};
