import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { AppLockScreen } from '@/features/app-lock/components/app-lock-screen';
import { useAppLock } from '@/features/app-lock/hooks/use-app-lock';

export function AppLockGate({ children }: PropsWithChildren) {
  const { state } = useAppLock();

  if (state.status === 'disabled' || state.status === 'enabled-unlocked') {
    return children;
  }

  if (state.status === 'initializing') {
    return (
      <View
        accessibilityLabel="Checking app lock"
        className="flex-1 items-center justify-center bg-[#f8f3e8] dark:bg-[#171812]">
        <ActivityIndicator color="#6f7653" size="small" />
      </View>
    );
  }

  return <AppLockScreen />;
}
