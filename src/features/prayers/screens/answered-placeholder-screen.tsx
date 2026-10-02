import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button } from 'react-native-paper';

import {
  prayerQueryKeys,
  useAnsweredPrayersQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import { formatAnsweredOnShort } from '@/features/prayers/utils/prayer-answer';

export default function AnsweredPlaceholderScreen() {
  const queryClient = useQueryClient();
  const answersQuery = useAnsweredPrayersQuery();
  const answers = answersQuery.data ?? [];
  const currentYear = new Date().getFullYear();
  const currentYearCount = answers.filter(
    (request) => Number(request.answer.answeredOn.slice(0, 4)) === currentYear,
  ).length;
  const refreshing = !answersQuery.isPending && answersQuery.isFetching;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <FlatList
        className="flex-1"
        contentContainerClassName="px-[26px] pb-28 pt-[35px]"
        data={answers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View className="mb-[26px]">
              <Text className="mb-2 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
                A record of faithfulness
              </Text>
              <Text
                accessibilityRole="header"
                className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
                Answered
              </Text>
            </View>

            <View className="mb-9 rounded-3xl bg-[#e4e5d5] p-6 dark:bg-[#3d432d]">
              <Text className="font-serif text-[38px] leading-[44px] text-[#282923] dark:text-[#f4efe4]">
                {answersQuery.isPending ? '—' : currentYearCount}
              </Text>
              <Text className="mt-1 text-sm text-[#59603f] dark:text-[#bbc49a]">
                answers recorded this year
              </Text>
            </View>

            <View className="flex-row items-baseline justify-between border-b border-[#ddd6c8] pb-2 dark:border-[#535548]">
              <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                Recent answers
              </Text>
              <View className="flex-row items-center gap-2">
                {refreshing ? <ActivityIndicator size={12} /> : null}
                <Text className="text-xs text-[#747468] dark:text-[#c7c2b8]">
                  {refreshing ? 'Refreshing' : currentYear}
                </Text>
              </View>
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View className="h-px bg-[#ddd6c8] dark:bg-[#535548]" />}
        ListEmptyComponent={
          answersQuery.isPending ? (
            <AnsweredListSkeleton />
          ) : answersQuery.error ? (
            <View className="items-center px-4 py-16">
              <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
                {answersQuery.error instanceof Error
                  ? answersQuery.error.message
                  : 'Answered prayers could not be loaded.'}
              </Text>
              <Button className="mt-4" mode="contained" onPress={() => void answersQuery.refetch()}>
                Try again
              </Button>
            </View>
          ) : (
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
          )
        }
        onRefresh={() => void answersQuery.refetch()}
        refreshing={refreshing}
        renderItem={({ item }) => {
          const answeredOn = formatAnsweredOnShort(item.answer.answeredOn);

          return (
            <Pressable
              accessibilityLabel={`${item.title}, ${item.answer.description}, answered ${answeredOn}`}
              accessibilityRole="button"
              className="min-h-[72px] flex-row items-center gap-3 py-4 active:opacity-70"
              onPress={() => {
                queryClient.setQueryData(prayerQueryKeys.detail(item.id), item);
                router.push(`/requests/${item.id}` as Href);
              }}>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                  {item.title}
                </Text>
                <Text
                  className="mt-1 text-sm text-[#747468] dark:text-[#c7c2b8]"
                  numberOfLines={2}>
                  {item.answer.description}
                </Text>
              </View>
              <Text className="text-xs text-[#9b9a8d] dark:text-[#aaa99d]">{answeredOn}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function AnsweredListSkeleton() {
  return (
    <View accessibilityLabel="Loading answered prayers" className="py-1">
      {[0, 1, 2].map((item) => (
        <View
          className="min-h-[72px] flex-row items-center gap-3 border-b border-[#ddd6c8] py-4 dark:border-[#535548]"
          key={item}>
          <View className="flex-1 gap-2">
            <View className="h-4 w-2/3 rounded-full bg-[#e8e1d4] dark:bg-[#34362c]" />
            <View className="h-3 w-4/5 rounded-full bg-[#eee7da] dark:bg-[#2d2f25]" />
          </View>
          <View className="h-3 w-12 rounded-full bg-[#eee7da] dark:bg-[#2d2f25]" />
        </View>
      ))}
    </View>
  );
}
