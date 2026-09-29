import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button } from 'react-native-paper';

import { PrayerRequestForm } from '@/features/prayers/components/prayer-request-form';
import {
  prayerQueryKeys,
  usePrayerCategoriesQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';

export default function NewPrayerRequestScreen() {
  const repository = usePrayerRepository();
  const queryClient = useQueryClient();
  const categoriesQuery = usePrayerCategoriesQuery();

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <View className="flex-row items-center justify-between px-[18px] py-3">
        <Button mode="text" onPress={() => router.back()}>
          Cancel
        </Button>
        <Text accessibilityRole="header" className="text-xl font-bold text-[#282923] dark:text-[#f4efe4]">
          Add prayer
        </Text>
        <View className="w-[78px]" />
      </View>

      {categoriesQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6f7653" size="large" />
        </View>
      ) : categoriesQuery.error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
            {categoriesQuery.error instanceof Error
              ? categoriesQuery.error.message
              : 'Categories could not be loaded.'}
          </Text>
          <Button className="mt-4" mode="contained" onPress={() => void categoriesQuery.refetch()}>
            Try again
          </Button>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerClassName="px-[26px] pb-[35px] pt-5"
            keyboardShouldPersistTaps="handled">
            <View>
              <PrayerRequestForm
                categories={categoriesQuery.data ?? []}
                submitLabel="Save prayer request"
                onSave={repository.createRequest}
                onSaved={(request) => {
                  queryClient.setQueryData(prayerQueryKeys.detail(request.id), request);
                  void queryClient.invalidateQueries({ queryKey: prayerQueryKeys.lists });
                  void queryClient.invalidateQueries({ queryKey: prayerQueryKeys.categories });
                  router.back();
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
