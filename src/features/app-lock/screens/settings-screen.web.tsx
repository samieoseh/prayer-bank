import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto min-h-full w-full max-w-3xl px-[26px] pb-28 pt-[35px]">
      <Text className="text-xs font-bold uppercase tracking-[2px] text-[#59603f] dark:text-[#cbd3a4]">
        Prayer Bank
      </Text>
      <Text className="mt-2 text-[#282923] dark:text-[#f6f0df]" variant="displaySmall">
        Settings
      </Text>
      <Text className="mt-3 max-w-xl text-base leading-6 text-[#747468] dark:text-[#c9c9b8]">
        Manage your preferences and protect access to your prayer matters.
      </Text>
      <View className="mt-10">
        <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
          Security
        </Text>
        <View className="min-h-[72px] flex-row items-center gap-4 rounded-2xl border border-[#ddd6c8] bg-[#fffaf0] px-4 py-3 dark:border-[#45463a] dark:bg-[#24251d]">
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[#282923] dark:text-[#f6f0df]">
              App lock
            </Text>
            <Text className="mt-1 text-sm leading-5 text-[#747468] dark:text-[#c9c9b8]">
              Set up a four-digit PIN in the Android or iOS app.
            </Text>
          </View>
          <Text className="text-sm font-bold text-[#747468] dark:text-[#c9c9b8]">
            Mobile only
          </Text>
        </View>
      </View>

      <Text className="mt-auto pt-10 text-center text-xs leading-5 text-[#747468] dark:text-[#c9c9b8]">
        Mobile app-lock settings stay on that device and are separate from your
        Prayer Bank account password.
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
