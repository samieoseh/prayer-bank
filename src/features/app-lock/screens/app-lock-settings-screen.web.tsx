import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppLockSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <View className="flex-row items-center justify-between px-[18px] py-3">
        <Button mode="text" onPress={() => router.back()}>
          Back
        </Button>
        <Text
          accessibilityRole="header"
          className="text-xl font-bold text-[#282923] dark:text-[#f4efe4]">
          App lock
        </Text>
        <View className="w-[68px]" />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto min-h-full w-full max-w-2xl px-[26px] pb-[35px] pt-5">
        <View className="rounded-2xl border border-[#ddd6c8] bg-[#fffaf0] p-5 dark:border-[#45463a] dark:bg-[#24251d]">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
            Security
          </Text>
          <Text className="mt-2 text-[#282923] dark:text-[#f6f0df]" variant="titleLarge">
            App lock is available on mobile
          </Text>
          <Text className="mt-3 text-base leading-6 text-[#747468] dark:text-[#c9c9b8]">
            Use the Android or iOS app to set a four-digit PIN and optional
            biometric unlock with PIN fallback.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
