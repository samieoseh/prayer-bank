import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, HelperText, TextInput, useTheme } from 'react-native-paper';

import { AnswerDatePicker } from '@/features/prayers/components/answer-date-picker';
import {
  prayerQueryKeys,
  usePrayerRequestQuery,
} from '@/features/prayers/hooks/use-prayer-queries';
import { usePrayerRepository } from '@/features/prayers/hooks/use-prayer-repository';
import type { AnswerFieldErrors } from '@/features/prayers/types/prayer';
import { formatLocalDateInput } from '@/features/prayers/utils/prayer-answer';

export function RecordAnswerScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const repository = usePrayerRepository();
  const queryClient = useQueryClient();
  const requestQuery = usePrayerRequestQuery(requestId);
  const theme = useTheme();
  const [answeredOn, setAnsweredOn] = useState(() => formatLocalDateInput());
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AnswerFieldErrors>({});
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);

  function clearFieldError(field: keyof AnswerFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback(undefined);
  }

  async function submit() {
    if (!requestId || pending) return;

    setPending(true);
    setFeedback(undefined);
    const result = await repository.recordAnswer(requestId, { answeredOn, description });
    setPending(false);

    if (result.ok) {
      queryClient.setQueryData(prayerQueryKeys.detail(result.value.id), result.value);
      await queryClient.invalidateQueries({ queryKey: prayerQueryKeys.root });
      router.replace({ pathname: '/requests/[id]', params: { id: result.value.id } } as unknown as Href);
      return;
    }

    setFieldErrors(result.fieldErrors ?? {});
    setFeedback(result.message);
  }

  const errorMessage = !requestId
    ? 'That prayer request is no longer available.'
    : requestQuery.error instanceof Error
      ? requestQuery.error.message
      : undefined;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <View className="flex-row items-center justify-between px-[18px] py-3">
        <Button disabled={pending} mode="text" onPress={() => router.back()}>
          Cancel
        </Button>
        <Text accessibilityRole="header" className="text-xl font-bold text-[#282923] dark:text-[#f4efe4]">
          Record answer
        </Text>
        <View className="w-[78px]" />
      </View>

      {requestQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6f7653" size="large" />
        </View>
      ) : errorMessage || !requestQuery.data ? (
        <View className="flex-1 items-center justify-center px-[26px]">
          <Text accessibilityLiveRegion="assertive" className="text-center text-[#9a594e] dark:text-[#e8a59a]">
            {errorMessage ?? 'That prayer request is no longer available.'}
          </Text>
          <Button className="mt-4" mode="contained" onPress={() => router.replace('/' as Href)}>
            Back to Prayer Bank
          </Button>
        </View>
      ) : requestQuery.data.status === 'answered' ? (
        <View className="flex-1 items-center justify-center px-[26px]">
          <Text accessibilityLiveRegion="polite" className="text-center text-[#747468] dark:text-[#c7c2b8]">
            This prayer already has an answer recorded.
          </Text>
          <Button className="mt-4" mode="contained" onPress={() => router.back()}>
            Back to prayer
          </Button>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerClassName="px-[26px] pb-[35px] pt-5"
            keyboardShouldPersistTaps="handled">
            <Text className="mb-2 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
              {requestQuery.data.categoryName}
            </Text>
            <Text className="mb-8 font-serif text-[30px] font-medium leading-9 text-[#282923] dark:text-[#f4efe4]">
              {requestQuery.data.title}
            </Text>

            <Text className="mb-2 font-bold text-[#282923] dark:text-[#f4efe4]">Answered on</Text>
            <AnswerDatePicker
              disabled={pending}
              error={Boolean(fieldErrors.answeredOn)}
              onChange={(value) => {
                setAnsweredOn(value);
                clearFieldError('answeredOn');
              }}
              value={answeredOn}
            />
            <HelperText accessibilityLiveRegion="assertive" type="error" visible={Boolean(fieldErrors.answeredOn)}>
              {fieldErrors.answeredOn}
            </HelperText>

            <View className="mt-6">
              <Text className="mb-3 font-bold text-[#282923] dark:text-[#f4efe4]">
                How was this prayer answered?
              </Text>
              <TextInput
                activeOutlineColor={theme.colors.primary}
                contentStyle={{ minHeight: 132, paddingBottom: 14, paddingTop: 14, textAlignVertical: 'top' }}
                editable={!pending}
                error={Boolean(fieldErrors.description)}
                mode="outlined"
                multiline
                numberOfLines={6}
                onChangeText={(value) => {
                  setDescription(value);
                  clearFieldError('description');
                }}
                outlineColor={theme.colors.outlineVariant}
                placeholder="Describe what happened"
                style={{ backgroundColor: theme.colors.surface }}
                textColor={theme.colors.onSurface}
                value={description}
              />
              <HelperText accessibilityLiveRegion="assertive" type="error" visible={Boolean(fieldErrors.description)}>
                {fieldErrors.description}
              </HelperText>
            </View>

            {feedback ? (
              <HelperText accessibilityLiveRegion="assertive" type="error" visible>
                {feedback}
              </HelperText>
            ) : null}

            <Button
              className="mt-3"
              contentStyle={{ minHeight: 50 }}
              disabled={pending}
              loading={pending}
              mode="contained"
              onPress={() => void submit()}>
              Record answer
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
