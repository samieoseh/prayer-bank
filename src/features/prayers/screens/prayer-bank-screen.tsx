import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Chip, IconButton } from 'react-native-paper';

import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  prayerQueryKeys,
  usePrayerCategoriesQuery,
  usePrayerRequestsQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import { usePrayerSync } from '@/features/prayers/hooks/use-prayer-sync';
import type { PrayerSyncStatus } from '@/features/prayers/prayer-sync-context';
import { formatPrayerSchedule } from '@/features/prayers/utils/prayer-schedule';

export default function PrayerBankScreen() {
  const auth = useAuth();
  const sync = usePrayerSync();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<string>();
  const requestsQuery = usePrayerRequestsQuery('active');
  const categoriesQuery = usePrayerCategoriesQuery();
  const requests = requestsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const isPending = requestsQuery.isPending || categoriesQuery.isPending;
  const error = requestsQuery.error ?? categoriesQuery.error;
  const refreshing =
    !isPending && (requestsQuery.isFetching || categoriesQuery.isFetching);
  const isSyncing = sync.status === 'syncing';

  const visibleRequests = useMemo(() => {
    if (!categoryId) return requests;
    return requests.filter((request) => request.categoryId === categoryId);
  }, [categoryId, requests]);

  function reload() {
    return Promise.all([requestsQuery.refetch(), categoriesQuery.refetch()]);
  }

  function handleCloudPress() {
    if (auth.status !== 'authenticated') {
      router.push('/sign-in');
      return;
    }
    sync.retry();
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
                  {!isPending
                    ? `${visibleRequests.length} active ${visibleRequests.length === 1 ? 'matter' : 'matters'}`
                    : 'Your private prayer space'}
                </Text>
                <Text
                  accessibilityRole="header"
                  className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
                  Prayer Bank
                </Text>
              </View>
              <View className="flex-row gap-1">
                <IconButton
                  accessibilityLabel={getCloudActionLabel(sync.status)}
                  disabled={isSyncing}
                  icon={getCloudIcon(sync.status)}
                  mode="contained-tonal"
                  onPress={handleCloudPress}
                />
                <IconButton
                  accessibilityLabel="Add prayer"
                  icon="plus"
                  mode="contained"
                  onPress={() => router.push('/requests/new' as Href)}
                />
              </View>
            </View>

            <View className="mb-[26px]">
              {categories.length > 0 ? (
                <ScrollView
                  horizontal
                  contentContainerClassName="gap-2 pr-[26px]"
                  showsHorizontalScrollIndicator={false}>
                  <Chip compact selected={!categoryId} onPress={() => setCategoryId(undefined)}>
                    All categories
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
            </View>

            <View className="flex-row items-baseline justify-between border-b border-[#ddd6c8] pb-2 dark:border-[#535548]">
              <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                Recently updated
              </Text>
              <Pressable
                accessibilityLabel={
                  auth.status === 'authenticated'
                    ? `${getSyncStatusLabel(sync.status)}. Tap to retry synchronization.`
                    : getSyncStatusLabel(sync.status)
                }
                accessibilityRole={auth.status === 'authenticated' ? 'button' : undefined}
                className="min-h-11 flex-row items-center gap-2 px-1"
                disabled={auth.status !== 'authenticated' || isSyncing}
                onPress={sync.retry}>
                {refreshing || isSyncing ? <ActivityIndicator size={12} /> : null}
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-xs text-[#747468] dark:text-[#c7c2b8]">
                  {refreshing ? 'Refreshing' : getSyncStatusLabel(sync.status)}
                </Text>
              </Pressable>
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View className="h-px bg-[#ddd6c8] dark:bg-[#535548]" />}
        ListEmptyComponent={
          isPending ? (
            <PrayerListSkeleton />
          ) : error ? (
            <View className="items-center py-16">
              <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
                {error instanceof Error ? error.message : 'Prayer matters could not be loaded.'}
              </Text>
              <Button className="mt-4" mode="contained" onPress={() => void reload()}>
                Try again
              </Button>
            </View>
          ) : (
            <View className="items-center px-4 py-16">
              <Text accessibilityLiveRegion="polite" className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                No active matters yet
              </Text>
              <Text className="mt-2 text-center text-[#747468] dark:text-[#c7c2b8]">
                Add what you want to remember before prayer.
              </Text>
              <Button
                className="mt-5"
                mode="contained"
                onPress={() => router.push('/requests/new' as Href)}>
                Add prayer
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
            <Text className="text-xs text-[#747468] dark:text-[#c7c2b8]">
              {formatUpdatedAt(item.updatedAt)}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function getSyncStatusLabel(status: PrayerSyncStatus) {
  if (status === 'syncing') return 'Syncing';
  if (status === 'synced') return 'Synced';
  if (status === 'failed') return 'Sync failed';
  if (status === 'pending') return 'Changes saved on this device';
  return 'Offline on this device';
}

function getCloudActionLabel(status: PrayerSyncStatus) {
  if (status === 'signed-out') return 'Sign in to sync';
  if (status === 'failed' || status === 'pending') return 'Retry prayer synchronization';
  if (status === 'syncing') return 'Prayer synchronization in progress';
  return 'Sync prayer bank';
}

function getCloudIcon(status: PrayerSyncStatus) {
  if (status === 'syncing') return 'cloud-sync';
  if (status === 'synced') return 'cloud-check';
  if (status === 'failed') return 'cloud-alert';
  if (status === 'pending') return 'cloud-upload-outline';
  return 'cloud-outline';
}

function PrayerListSkeleton() {
  return (
    <View accessibilityLabel="Loading prayer matters" className="py-1">
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

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
      dayMs,
  );

  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
