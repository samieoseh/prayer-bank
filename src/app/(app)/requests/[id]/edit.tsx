import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button } from 'react-native-paper';

import { PrayerRequestForm } from '@/features/prayers/components/prayer-request-form';
import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';
import type { Category, PrayerRequest } from '@/features/prayers/types/prayer';

type EditState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; request: PrayerRequest; categories: Category[] };

export default function EditPrayerRequestScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const repository = usePrayerRepository();
  const [state, setState] = useState<EditState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!requestId) {
      setState({ status: 'error', message: 'That prayer request is no longer available.' });
      return;
    }

    const [request, categories] = await Promise.all([
      repository.getRequest(requestId),
      repository.listCategories(),
    ]);

    if (!request.ok || !categories.ok) {
      setState({
        status: 'error',
        message: !request.ok ? request.message : !categories.ok ? categories.message : '',
      });
      return;
    }

    setState({ status: 'ready', request: request.value, categories: categories.value });
  }, [repository, requestId]);

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
          Edit prayer
        </Text>
        <View className="w-[78px]" />
      </View>

      {state.status === 'loading' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6f7653" size="large" />
        </View>
      ) : state.status === 'error' ? (
        <View className="flex-1 items-center justify-center px-[26px]">
          <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
            {state.message}
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
              categories={state.categories}
              initialRequest={state.request}
              submitLabel="Save changes"
              onSave={(draft) => repository.updateRequest(state.request.id, draft)}
              onSaved={() => router.back()}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
