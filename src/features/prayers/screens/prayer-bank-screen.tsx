import { router, type Href, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Chip, IconButton } from 'react-native-paper';

import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';
import type {
  Category,
  PrayerRequest,
  PrayerRequestStatus,
} from '@/features/prayers/types/prayer';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; requests: PrayerRequest[]; categories: Category[] };

export default function PrayerBankScreen() {
  const repository = usePrayerRepository();
  const [requestStatus, setRequestStatus] = useState<PrayerRequestStatus>('active');
  const [categoryId, setCategoryId] = useState<string>();
  const [state, setState] = useState<ListState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const [requests, categories] = await Promise.all([
      repository.listRequests(requestStatus),
      repository.listCategories(),
    ]);

    if (!requests.ok) {
      setState({ status: 'error', message: requests.message });
      return;
    }
    if (!categories.ok) {
      setState({ status: 'error', message: categories.message });
      return;
    }

    setState({ status: 'ready', requests: requests.value, categories: categories.value });
  }, [repository, requestStatus]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visibleRequests = useMemo(() => {
    if (state.status !== 'ready' || !categoryId) {
      return state.status === 'ready' ? state.requests : [];
    }
    return state.requests.filter((request) => request.categoryId === categoryId);
  }, [categoryId, state]);

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
                  {state.status === 'ready'
                    ? `${visibleRequests.length} ${requestStatus} ${visibleRequests.length === 1 ? 'matter' : 'matters'}`
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
                  accessibilityLabel="Sign in to sync"
                  icon="cloud-outline"
                  mode="contained-tonal"
                  onPress={() => router.push('/sign-in')}
                />
                <IconButton
                  accessibilityLabel="Add prayer"
                  icon="plus"
                  mode="contained"
                  onPress={() => router.push('/requests/new' as Href)}
                />
              </View>
            </View>

            <View className="mb-[26px] flex-row flex-wrap gap-2">
              <Chip selected={requestStatus === 'active'} onPress={() => setRequestStatus('active')}>
                Active
              </Chip>
              <Chip
                selected={requestStatus === 'archived'}
                onPress={() => setRequestStatus('archived')}>
                Archived
              </Chip>
              {state.status === 'ready' ? (
                <>
                  <Chip selected={!categoryId} onPress={() => setCategoryId(undefined)}>
                    All
                  </Chip>
                  {state.categories.map((category) => (
                    <Chip
                      key={category.id}
                      selected={categoryId === category.id}
                      onPress={() => setCategoryId(category.id)}>
                      {category.name}
                    </Chip>
                  ))}
                </>
              ) : null}
            </View>

            <View className="flex-row items-baseline justify-between border-b border-[#ddd6c8] pb-2 dark:border-[#535548]">
              <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                {requestStatus === 'active' ? 'Recently updated' : 'Archived matters'}
              </Text>
              <Text className="text-xs text-[#747468] dark:text-[#c7c2b8]">
                Offline on this device
              </Text>
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View className="h-px bg-[#ddd6c8] dark:bg-[#535548]" />}
        ListEmptyComponent={
          state.status === 'loading' ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#6f7653" size="large" />
              <Text accessibilityLiveRegion="polite" className="mt-3 text-[#747468] dark:text-[#c7c2b8]">
                Opening your prayer bank…
              </Text>
            </View>
          ) : state.status === 'error' ? (
            <View className="items-center py-16">
              <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
                {state.message}
              </Text>
              <Button className="mt-4" mode="contained" onPress={() => void load()}>
                Try again
              </Button>
            </View>
          ) : (
            <View className="items-center px-4 py-16">
              <Text accessibilityLiveRegion="polite" className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                {requestStatus === 'active' ? 'No active matters yet' : 'No archived matters'}
              </Text>
              <Text className="mt-2 text-center text-[#747468] dark:text-[#c7c2b8]">
                {requestStatus === 'active'
                  ? 'Add what you want to remember before prayer.'
                  : 'Matters you archive will rest here.'}
              </Text>
              {requestStatus === 'active' ? (
                <Button
                  className="mt-5"
                  mode="contained"
                  onPress={() => router.push('/requests/new' as Href)}>
                  Add prayer
                </Button>
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            className="min-h-[72px] flex-row items-center gap-3 py-4 active:opacity-70"
            onPress={() => router.push(`/requests/${item.id}` as Href)}>
            <View className="h-[9px] w-[9px] rounded-full bg-[#6f7653] dark:bg-[#bbc49a]" />
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                {item.title}
              </Text>
              <Text className="mt-1 text-sm text-[#747468] dark:text-[#c7c2b8]">
                {item.categoryName}
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
