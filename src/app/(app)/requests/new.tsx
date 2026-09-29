import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button } from 'react-native-paper';

import { PrayerRequestForm } from '@/features/prayers/components/prayer-request-form';
import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';
import type { Category } from '@/features/prayers/types/prayer';

type CategoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; categories: Category[] };

export default function NewPrayerRequestScreen() {
  const repository = usePrayerRepository();
  const [state, setState] = useState<CategoryState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await repository.listCategories();
    setState(
      result.ok
        ? { status: 'ready', categories: result.value }
        : { status: 'error', message: result.message },
    );
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

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

      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6f7653" size="large" />
        </View>
      ) : state.status === 'error' ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
            {state.message}
          </Text>
          <Button className="mt-4" mode="contained" onPress={() => void load()}>
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
                categories={state.categories}
                submitLabel="Save prayer request"
                onSave={repository.createRequest}
                onSaved={() => router.back()}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
