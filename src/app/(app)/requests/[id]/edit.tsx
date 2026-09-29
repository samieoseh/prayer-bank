import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button } from 'react-native-paper';

import { PrayerRequestForm } from '@/features/prayers/components/prayer-request-form';
import {
  prayerQueryKeys,
  usePrayerCategoriesQuery,
  usePrayerRequestQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';

export default function EditPrayerRequestScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const repository = usePrayerRepository();
  const queryClient = useQueryClient();
  const requestQuery = usePrayerRequestQuery(requestId);
  const categoriesQuery = usePrayerCategoriesQuery();
  const request = requestQuery.data;
  const isPending = requestQuery.isPending || categoriesQuery.isPending;
  const errorMessage = !requestId
    ? 'That prayer request is no longer available.'
    : requestQuery.error instanceof Error
      ? requestQuery.error.message
      : categoriesQuery.error instanceof Error
        ? categoriesQuery.error.message
        : undefined;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <View className="flex-row items-center justify-between px-[18px] py-3">
        <Button mode="text" onPress={() => router.back()}>
          Cancel
        </Button>
        <Text accessibilityRole="header" className="text-xl font-bold text-[#282923] dark:text-[#f4efe4]">
          Edit prayer
        </Text>
        <View className="w-[78px]" />
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6f7653" size="large" />
        </View>
      ) : errorMessage || !request ? (
        <View className="flex-1 items-center justify-center px-[26px]">
          <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
            {errorMessage ?? 'That prayer request is no longer available.'}
          </Text>
          <Button className="mt-4" mode="contained" onPress={() => router.replace('/' as Href)}>
            Back to Prayer Bank
          </Button>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerClassName="px-[26px] pb-[35px] pt-5"
            keyboardShouldPersistTaps="handled">
            <PrayerRequestForm
              categories={categoriesQuery.data ?? []}
              initialRequest={request}
              submitLabel="Save changes"
              onSave={(draft) => repository.updateRequest(request.id, draft)}
              onSaved={(updatedRequest) => {
                queryClient.setQueryData(
                  prayerQueryKeys.detail(updatedRequest.id),
                  updatedRequest,
                );
                void queryClient.invalidateQueries({ queryKey: prayerQueryKeys.lists });
                void queryClient.invalidateQueries({ queryKey: prayerQueryKeys.categories });
                router.back();
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
