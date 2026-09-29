import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';

export function DatabaseErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-[#f8f3e8] px-6 dark:bg-[#171812]">
      <View className="w-full max-w-xl bg-[#fffaf0] p-6 dark:bg-[#22231c]">
        <Text accessibilityRole="header" className="text-2xl font-bold text-[#282923] dark:text-[#f4efe4]">
          Prayer requests unavailable
        </Text>
        <Text accessibilityLiveRegion="assertive" className="mt-3 text-[#747468] dark:text-[#c7c2b8]">
          Local storage could not be opened. Your existing prayer requests were not changed.
        </Text>
        <Button className="mt-5" mode="contained" onPress={onRetry}>
          Try again
        </Button>
      </View>
    </View>
  );
}
