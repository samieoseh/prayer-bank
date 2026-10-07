import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppLock } from '@/features/app-lock/hooks/use-app-lock';

export default function SettingsScreen() {
  const { state } = useAppLock();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const lockEnabled = state.status === 'enabled-unlocked';

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto min-h-full w-full max-w-2xl px-[26px] pb-28 pt-[35px]">
        <Text className="text-xs font-bold uppercase tracking-[2px] text-[#59603f] dark:text-[#cbd3a4]">
          Prayer Bank
        </Text>
        <Text className="mt-2 text-[#282923] dark:text-[#f6f0df]" variant="displaySmall">
          Settings
        </Text>
        <Text className="mt-3 text-base leading-6 text-[#747468] dark:text-[#c9c9b8]">
          Manage your preferences and protect access to your prayer matters.
        </Text>

        <Text className="mb-2 mt-10 px-1 text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
          Security
        </Text>
        <View className="overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#fffaf0] dark:border-[#45463a] dark:bg-[#24251d]">
          <Pressable
            accessibilityHint="Opens app lock settings"
            accessibilityRole="button"
            className="min-h-[76px] flex-row items-center gap-4 px-4 py-3 active:bg-[#f1ebde] dark:active:bg-[#303226]"
            onPress={() => router.push('/app-lock' as Href)}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#e4e5d5] dark:bg-[#3a3d2d]">
              <MaterialDesignIcons
                color={dark ? '#cbd3a4' : '#59603f'}
                name="shield-lock-outline"
                size={22}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[#282923] dark:text-[#f6f0df]">
                App lock
              </Text>
              <Text className="mt-1 text-sm text-[#747468] dark:text-[#c9c9b8]">
                {lockEnabled
                  ? 'PIN, biometrics, and security options'
                  : 'Protect access with a four-digit PIN'}
              </Text>
            </View>
            <Text className="text-sm font-bold text-[#59603f] dark:text-[#cbd3a4]">
              {lockEnabled ? 'On' : 'Off'}
            </Text>
            <Text className="text-2xl text-[#9b9a8d] dark:text-[#8f907f]">›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
