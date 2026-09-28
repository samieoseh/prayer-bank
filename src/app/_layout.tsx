import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

import { AuthLoadingScreen } from '@/features/auth/components/auth-loading-screen';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AuthProvider } from '@/features/auth/providers/auth-provider';

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}

function RootNavigator() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={auth.status === 'authenticated'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={auth.status === 'unauthenticated'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
