import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button } from 'react-native-paper';

import {
  prayerQueryKeys,
  usePrayerRequestsQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import {
  formatPrayerAge,
  getLongStandingRequests,
} from '@/features/prayers/utils/prayer-age';
import { formatPrayerSchedule } from '@/features/prayers/utils/prayer-schedule';

export default function LongStandingReviewScreen() {
  const queryClient = useQueryClient();
  const requestsQuery = usePrayerRequestsQuery('active');
  const now = new Date();
  const requests = getLongStandingRequests(requestsQuery.data ?? [], now);
  const refreshing = !requestsQuery.isPending && requestsQuery.isFetching;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <FlatList
        className="flex-1"
        contentContainerClassName="px-[26px] pb-12 pt-[35px]"
        data={requests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View className="mb-7">
              <View className="min-w-0">
                <Text className="mb-2 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
                  Oldest active matters
                </Text>
                <Text
                  accessibilityRole="header"
                  className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
                  Review
                </Text>
              </View>
            </View>

            <Text className="mb-9 text-base leading-6 text-[#747468] dark:text-[#c7c2b8]">
              Return to long-standing burdens, update what has changed, and keep only what
              still needs prayer.
            </Text>

            <View className="flex-row items-baseline justify-between border-b border-[#ddd6c8] pb-2 dark:border-[#535548]">
              <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                Over three months
              </Text>
              <View className="flex-row items-center gap-2">
                {refreshing ? <ActivityIndicator size={12} /> : null}
                <Text className="text-xs text-[#747468] dark:text-[#c7c2b8]">
                  {refreshing
                    ? 'Refreshing'
                    : `${requests.length} ${requests.length === 1 ? 'matter' : 'matters'}`}
                </Text>
              </View>
            </View>
          </>
        }
        ItemSeparatorComponent={() => (
          <View className="h-px bg-[#ddd6c8] dark:bg-[#535548]" />
        )}
        ListEmptyComponent={
          requestsQuery.isPending ? (
            <ReviewListSkeleton />
          ) : requestsQuery.error ? (
            <View className="items-center px-4 py-16">
              <Text
                accessibilityLiveRegion="assertive"
                className="text-center text-[#9a594e] dark:text-[#e8a59a]">
                {requestsQuery.error instanceof Error
                  ? requestsQuery.error.message
                  : 'Long-standing prayer matters could not be loaded.'}
              </Text>
              <Button
                className="mt-4"
                mode="contained"
                onPress={() => void requestsQuery.refetch()}>
                Try again
              </Button>
            </View>
          ) : (
            <View className="items-center px-4 py-16">
              <Text
                accessibilityLiveRegion="polite"
                className="text-center text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                No long-standing matters
              </Text>
              <Text className="mt-2 text-center text-[#747468] dark:text-[#c7c2b8]">
                No active prayer matters have been open for over three months.
              </Text>
            </View>
          )
        }
        onRefresh={() => void requestsQuery.refetch()}
        refreshing={refreshing}
        renderItem={({ item }) => {
          const age = formatPrayerAge(item.createdAt, now);
          const schedule = formatPrayerSchedule(item, true);

          return (
            <Pressable
              accessibilityLabel={`${item.title}, ${item.categoryName}, ${schedule}, ${age}`}
              accessibilityRole="button"
              className="min-h-[72px] flex-row items-center gap-3 py-4 active:opacity-70"
              onPress={() => {
                queryClient.setQueryData(prayerQueryKeys.detail(item.id), item);
                router.push(`/requests/${item.id}` as Href);
              }}>
              <View className="h-[9px] w-[9px] rounded-full bg-[#6f7653] dark:bg-[#bbc49a]" />
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                  {item.title}
                </Text>
                <Text className="mt-1 text-sm text-[#747468] dark:text-[#c7c2b8]">
                  {item.categoryName} · {schedule}
                </Text>
              </View>
              <Text className="text-xs text-[#747468] dark:text-[#c7c2b8]">{age}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function ReviewListSkeleton() {
  return (
    <View accessibilityLabel="Loading long-standing prayer matters" className="py-1">
      {[0, 1, 2].map((item) => (
        <View
          className="min-h-[72px] flex-row items-center gap-3 border-b border-[#ddd6c8] py-4 dark:border-[#535548]"
          key={item}>
          <View className="h-[9px] w-[9px] rounded-full bg-[#ddd6c8] dark:bg-[#535548]" />
          <View className="flex-1 gap-2">
            <View className="h-4 w-2/3 rounded-full bg-[#e8e1d4] dark:bg-[#34362c]" />
            <View className="h-3 w-1/3 rounded-full bg-[#eee7da] dark:bg-[#2d2f25]" />
          </View>
        </View>
      ))}
    </View>
  );
}
