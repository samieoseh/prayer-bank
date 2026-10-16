import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import type { PropsWithChildren } from 'react';
import { useColorScheme, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { AppLockScreen } from '@/features/app-lock/components/app-lock-screen';
import { useAppLock } from '@/features/app-lock/hooks/use-app-lock';

export function AppLockGate({ children }: PropsWithChildren) {
  const { state } = useAppLock();
  const dark = useColorScheme() === 'dark';

  if (state.status === 'disabled' || state.status === 'enabled-unlocked') {
    return children;
  }

  if (state.status === 'initializing') {
    return (
      <View
        accessibilityLabel="Checking app lock"
        className="flex-1 items-center justify-center bg-[#f8f3e8] dark:bg-[#171812]">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-[#e4e5d5] dark:bg-[#3a3d2d]">
          <MaterialDesignIcons
            color={dark ? '#cbd3a4' : '#59603f'}
            name="shield-lock-outline"
            size={30}
          />
        </View>
        <Text className="mt-5 font-bold text-[#111827] dark:text-[#f6f0df]" variant="titleLarge">
          Securing Prayer Bank
        </Text>
        <Text className="mt-2 text-[#676b7b] dark:text-[#c9c9b8]">
          Checking app lock…
        </Text>
        <ActivityIndicator className="mt-5" color="#6f7653" size="small" />
      </View>
    );
  }

  return <AppLockScreen />;
}
