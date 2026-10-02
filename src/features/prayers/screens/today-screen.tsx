import { useQueryClient } from '@tanstack/react-query';
import { router, type Href, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Chip } from 'react-native-paper';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { ProfileAvatar } from '@/features/prayers/components/profile-avatar';
import {
  prayerQueryKeys,
  usePrayerCategoriesQuery,
  usePrayerRequestsQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import {
  formatPrayerSchedule,
  isPrayerDueOn,
} from '@/features/prayers/utils/prayer-schedule';

export default function TodayScreen() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<string>();
  const currentDate = useCurrentLocalDate();
  const requestsQuery = usePrayerRequestsQuery('active');
  const categoriesQuery = usePrayerCategoriesQuery();
  const requests = requestsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const isPending = requestsQuery.isPending || categoriesQuery.isPending;
  const error = requestsQuery.error ?? categoriesQuery.error;
  const refreshing = !isPending && (requestsQuery.isFetching || categoriesQuery.isFetching);

  const dueRequests = useMemo(
    () => requests.filter((request) => isPrayerDueOn(request, currentDate)),
    [currentDate, requests],
  );
  const visibleRequests = useMemo(
    () =>
      categoryId
        ? dueRequests.filter((request) => request.categoryId === categoryId)
        : dueRequests,
    [categoryId, dueRequests],
  );

  function reload() {
    return Promise.all([requestsQuery.refetch(), categoriesQuery.refetch()]);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <FlatList
        className="flex-1"
        contentContainerClassName="px-[26px] pb-28 pt-[35px]"
        data={visibleRequests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View className="mb-[26px] flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="mb-2 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
                  {formatTodayDate(currentDate)}
                </Text>
                <Text
                  accessibilityRole="header"
                  className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
                  Today
                </Text>
              </View>
              {auth.status === 'authenticated' ? (
                <ProfileAvatar session={auth.session} />
              ) : null}
            </View>

            <View className="mb-[26px] rounded-[24px] bg-[#e4e5d5] p-5 dark:bg-[#34362c]">
              <Text className="font-serif text-[38px] leading-[40px] text-[#282923] dark:text-[#f4efe4]">
                {visibleRequests.length}
              </Text>
              <Text className="mt-1 text-sm text-[#59603f] dark:text-[#bbc49a]">
                {visibleRequests.length === 1
                  ? 'matter to remember before prayer'
                  : 'matters to remember before prayer'}
              </Text>
            </View>

            {categories.length > 0 ? (
              <ScrollView
                className="mb-[26px]"
                horizontal
                contentContainerClassName="gap-2 pr-[26px]"
                showsHorizontalScrollIndicator={false}>
                <Chip compact selected={!categoryId} onPress={() => setCategoryId(undefined)}>
                  All
                </Chip>
                {categories.map((category) => (
                  <Chip
                    compact
                    key={category.id}
                    selected={categoryId === category.id}
                    onPress={() => setCategoryId(category.id)}>
                    {category.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : null}

            <View className="flex-row items-center justify-between border-b border-[#ddd6c8] pb-2 dark:border-[#535548]">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                  For today
                </Text>
                {refreshing ? <ActivityIndicator size={12} /> : null}
              </View>
              <Button compact mode="text" onPress={() => router.push('/requests' as Href)}>
                Prayer Bank
              </Button>
            </View>
          </>
        }
        ItemSeparatorComponent={() => (
          <View className="h-px bg-[#ddd6c8] dark:bg-[#535548]" />
        )}
        ListEmptyComponent={
          isPending ? (
            <TodayListSkeleton />
          ) : error ? (
            <View className="items-center py-16">
              <Text
                accessibilityLiveRegion="assertive"
                className="text-center text-[#9a594e] dark:text-[#e8a59a]">
                {error instanceof Error ? error.message : 'Today’s prayers could not be loaded.'}
              </Text>
              <Button className="mt-4" mode="contained" onPress={() => void reload()}>
                Try again
              </Button>
            </View>
          ) : (
            <View className="items-center px-4 py-16">
              <Text
                accessibilityLiveRegion="polite"
                className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                {requests.length === 0 ? 'No active matters yet' : 'Nothing scheduled for today'}
              </Text>
              <Text className="mt-2 text-center text-[#747468] dark:text-[#c7c2b8]">
                {requests.length === 0
                  ? 'Add what you want to remember before prayer.'
                  : 'Open Prayer Bank to review or change schedules.'}
              </Text>
              <Button
                className="mt-5"
                mode="contained"
                onPress={() =>
                  router.push((requests.length === 0 ? '/requests/new' : '/requests') as Href)
                }>
                {requests.length === 0 ? 'Add prayer' : 'Open Prayer Bank'}
              </Button>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
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
                {item.categoryName} · {formatPrayerSchedule(item, true)}
              </Text>
            </View>
            <Text className="text-xs text-[#9b9a8d] dark:text-[#c7c2b8]">
              {formatAge(item.createdAt, currentDate)}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function useCurrentLocalDate() {
  const [date, setDate] = useState(() => new Date());
  const dayKey = date.toDateString();

  useFocusEffect(
    useCallback(() => {
      setDate(new Date());
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDate(new Date());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const nextDay = new Date(date);
    nextDay.setHours(24, 0, 0, 50);
    const timeout = setTimeout(() => setDate(new Date()), nextDay.getTime() - Date.now());
    return () => clearTimeout(timeout);
  }, [date, dayKey]);

  return date;
}

function TodayListSkeleton() {
  return (
    <View accessibilityLabel="Loading today’s prayer matters" className="py-1">
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

function formatTodayDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
}

function formatAge(value: string, today: Date) {
  const date = new Date(value);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
      dayMs,
  );
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}
