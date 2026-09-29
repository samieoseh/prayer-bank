import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/features/auth/providers/auth-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PaperProvider theme={colorScheme === 'dark' ? prayerBankDarkTheme : prayerBankLightTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/callback" />
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
