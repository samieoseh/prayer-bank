import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnsweredPlaceholderScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <View className="flex-1 px-[26px] pb-28 pt-[35px]">
        <Text className="mb-2 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
          A record of faithfulness
        </Text>
        <Text
          accessibilityRole="header"
          className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
          Answered
        </Text>

        <View className="mt-9 rounded-3xl bg-[#e4e5d5] p-6 dark:bg-[#3d432d]">
          <Text className="font-serif text-[38px] leading-[44px] text-[#282923] dark:text-[#f4efe4]">
            0
          </Text>
          <Text className="mt-1 text-sm text-[#59603f] dark:text-[#bbc49a]">
            answers recorded this year
          </Text>
        </View>

        <View className="mt-9 border-b border-[#ddd6c8] pb-2 dark:border-[#535548]">
          <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
            Recent answers
          </Text>
        </View>

        <View className="items-center px-4 py-16">
          <Text
            accessibilityLiveRegion="polite"
            className="text-center text-base font-bold text-[#282923] dark:text-[#f4efe4]">
            No answered prayers yet
          </Text>
          <Text className="mt-2 text-center text-[#747468] dark:text-[#c7c2b8]">
            Answered prayer stories will be gathered here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
