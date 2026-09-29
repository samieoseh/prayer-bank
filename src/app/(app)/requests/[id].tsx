import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, IconButton } from 'react-native-paper';

import {
  prayerQueryKeys,
  usePrayerRequestQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';
import type { PrayerRequest } from '@/features/prayers/types/prayer';

export default function PrayerDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const repository = usePrayerRepository();
  const queryClient = useQueryClient();
  const requestQuery = usePrayerRequestQuery(requestId);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string>();

  async function changeLifecycle(request: PrayerRequest) {
    if (pending) return;
    setPending(true);
    setFeedback(undefined);
    const result = await repository.setStatus(
      request.id,
      request.status === 'active' ? 'archived' : 'active',
    );
    setPending(false);

    if (result.ok) {
      queryClient.setQueryData(prayerQueryKeys.detail(result.value.id), result.value);
      void queryClient.invalidateQueries({ queryKey: prayerQueryKeys.lists });
      router.back();
      return;
    }
    setFeedback(result.message);
  }

  if (!requestId || requestQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
        <View className="flex-1 items-center justify-center px-[26px]">
          <Text accessibilityLiveRegion="assertive" className="text-center text-[#747468] dark:text-[#c7c2b8]">
            {requestQuery.error instanceof Error
              ? requestQuery.error.message
              : 'That prayer request is no longer available.'}
          </Text>
          <Button className="mt-4" mode="contained" onPress={() => router.replace('/' as Href)}>
            Back to Prayer Bank
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (requestQuery.isPending || !requestQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6f7653" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const request = requestQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
        <ScrollView contentContainerClassName="px-[26px] pb-[35px] pt-4">
          <View className="mb-[35px] flex-row items-center justify-between">
            <IconButton accessibilityLabel="Back" icon="arrow-left" onPress={() => router.back()} />
            <Button
              mode="text"
              onPress={() =>
                router.push({ pathname: '/requests/[id]/edit', params: { id: request.id } } as unknown as Href)
              }>
              Edit
            </Button>
          </View>

          <Text className="mb-2 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
            {request.categoryName}
          </Text>
          <Text
            accessibilityRole="header"
            className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
            {request.title}
          </Text>
          {request.details ? (
            <Text className="mt-5 text-xl leading-8 text-[#282923] dark:text-[#f4efe4]">{request.details}</Text>
          ) : null}

          <View className="my-[26px] h-px bg-[#ddd6c8] dark:bg-[#535548]" />

          <View className="flex-row flex-wrap">
            <DetailItem label="Status" value={request.status === 'active' ? 'Active' : 'Archived'} />
            <DetailItem label="Added" value={formatDate(request.createdAt)} />
            <DetailItem label="Category" value={request.categoryName} />
            <DetailItem label="Updated" value={formatDate(request.updatedAt)} />
          </View>

          {feedback ? (
            <Text accessibilityLiveRegion="assertive" className="mt-6 text-[#9a594e] dark:text-[#e8a59a]">
              {feedback}
            </Text>
          ) : null}

          <View className="mt-[35px] flex-row gap-3">
            <Button
              className="flex-1"
              disabled={pending}
              loading={pending}
              mode="contained-tonal"
              onPress={() => void changeLifecycle(request)}>
              {request.status === 'active' ? 'Archive' : 'Restore'}
            </Button>
            <Button
              className="flex-1"
              mode="contained"
              onPress={() =>
                router.push({ pathname: '/requests/[id]/edit', params: { id: request.id } } as unknown as Href)
              }>
              Edit matter
            </Button>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-5 w-1/2 pr-4">
      <Text className="text-xs uppercase tracking-[1.2px] text-[#747468] dark:text-[#c7c2b8]">{label}</Text>
      <Text className="mt-1 font-bold text-[#282923] dark:text-[#f4efe4]">{value}</Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}
