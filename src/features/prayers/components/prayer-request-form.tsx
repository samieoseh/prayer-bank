import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, HelperText, TextInput, useTheme } from 'react-native-paper';

import type {
  Category,
  PrayerFieldErrors,
  PrayerRequest,
  PrayerRequestDraft,
  PrayerScheduleType,
  RepositoryResult,
  WeekdayCode,
} from '@/features/prayers/types/prayer';
import {
  validatePrayerSchedule,
  WEEKDAYS,
} from '@/features/prayers/utils/prayer-schedule';

type PrayerRequestFormProps = {
  categories: Category[];
  initialRequest?: PrayerRequest;
  submitLabel: string;
  onSave: (draft: PrayerRequestDraft) => Promise<RepositoryResult<PrayerRequest>>;
  onSaved: (request: PrayerRequest) => void;
};

export function PrayerRequestForm({
  categories,
  initialRequest,
  submitLabel,
  onSave,
  onSaved,
}: PrayerRequestFormProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(initialRequest?.title ?? '');
  const [details, setDetails] = useState(initialRequest?.details ?? '');
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>(
    initialRequest || categories.length > 0 ? 'existing' : 'new',
  );
  const [categoryId, setCategoryId] = useState(
    initialRequest?.categoryId ?? categories[0]?.id ?? '',
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [scheduleType, setScheduleType] = useState<PrayerScheduleType | null>(
    initialRequest?.scheduleType ?? null,
  );
  const [scheduledDays, setScheduledDays] = useState<WeekdayCode[]>(
    initialRequest?.scheduledDays ?? [],
  );
  const [fieldErrors, setFieldErrors] = useState<PrayerFieldErrors>({});
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);

  function clearFieldError(field: keyof PrayerFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback(undefined);
  }

  async function submit() {
    if (pending) return;

    const localErrors: PrayerFieldErrors = {};
    if (!title.trim()) localErrors.title = 'Enter a prayer request title.';
    if (categoryMode === 'existing' && !categoryId) {
      localErrors.category = 'Choose a category.';
    }
    if (categoryMode === 'new' && !newCategoryName.trim()) {
      localErrors.category = 'Enter a category name.';
    }
    const schedule = validatePrayerSchedule(scheduleType, scheduledDays);
    if (!schedule.ok) localErrors.schedule = schedule.message;

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setFeedback('Check the highlighted fields.');
      return;
    }

    setPending(true);
    setFeedback(undefined);
    const result = await onSave({
      title,
      details,
      category:
        categoryMode === 'existing'
          ? { kind: 'existing', categoryId }
          : { kind: 'new', name: newCategoryName },
      scheduleType,
      scheduledDays,
    });
    setPending(false);

    if (result.ok) {
      onSaved(result.value);
      return;
    }

    setFieldErrors(result.fieldErrors ?? {});
    setFeedback(result.message);
  }

  return (
    <View>
      <View className="mb-5">
        <Text className="mb-2 font-bold text-[#282923] dark:text-[#f4efe4]">Prayer matter</Text>
        <TextInput
          activeOutlineColor={theme.colors.primary}
          autoCapitalize="sentences"
          editable={!pending}
          error={Boolean(fieldErrors.title)}
          mode="outlined"
          onChangeText={(value) => {
            setTitle(value);
            clearFieldError('title');
          }}
          outlineColor={theme.colors.outlineVariant}
          placeholder="What needs prayer?"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          returnKeyType="next"
          style={{ backgroundColor: theme.colors.surface }}
          textColor={theme.colors.onSurface}
          value={title}
        />
        <HelperText type="error" visible={Boolean(fieldErrors.title)}>
          {fieldErrors.title}
        </HelperText>
      </View>

      <View className="mb-5">
        <Text className="mb-2 font-bold text-[#282923] dark:text-[#f4efe4]">Details</Text>
        <TextInput
          activeOutlineColor={theme.colors.primary}
          editable={!pending}
          mode="outlined"
          multiline
          numberOfLines={5}
          onChangeText={(value) => {
            setDetails(value);
            setFeedback(undefined);
          }}
          outlineColor={theme.colors.outlineVariant}
          placeholder="Add context you want to remember"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={{ backgroundColor: theme.colors.surface }}
          textColor={theme.colors.onSurface}
          value={details}
        />
      </View>

      <View className="mb-5">
        <Text className="mb-2 font-bold text-[#282923] dark:text-[#f4efe4]">
          Category
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((category) => (
            <Chip
              disabled={pending}
              key={category.id}
              selected={categoryMode === 'existing' && categoryId === category.id}
              onPress={() => {
                setCategoryMode('existing');
                setCategoryId(category.id);
                clearFieldError('category');
              }}>
              {category.name}
            </Chip>
          ))}
          <Chip
            disabled={pending}
            icon="plus"
            selected={categoryMode === 'new'}
            onPress={() => {
              setCategoryMode('new');
              clearFieldError('category');
            }}>
            New category
          </Chip>
        </View>

        {categoryMode === 'new' ? (
          <View className="mt-3">
            <TextInput
              activeOutlineColor={theme.colors.primary}
              editable={!pending}
              error={Boolean(fieldErrors.category)}
              label="New category name"
              mode="outlined"
              onChangeText={(value) => {
                setNewCategoryName(value);
                clearFieldError('category');
              }}
              outlineColor={theme.colors.outlineVariant}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={{ backgroundColor: theme.colors.surface }}
              textColor={theme.colors.onSurface}
              value={newCategoryName}
            />
          </View>
        ) : null}

        <HelperText type="error" visible={Boolean(fieldErrors.category)}>
          {fieldErrors.category}
        </HelperText>
      </View>

      <View className="mb-5">
        <Text className="mb-2 font-bold text-[#282923] dark:text-[#f4efe4]">Schedule</Text>
        <View className="flex-row flex-wrap gap-2">
          {([
            ['daily', 'Daily'],
            ['weekly', 'Weekly'],
            ['selectedDays', 'Selected days'],
          ] as const).map(([value, label]) => (
            <Chip
              disabled={pending}
              key={value}
              selected={scheduleType === value}
              onPress={() => {
                setScheduleType(value);
                setScheduledDays([]);
                clearFieldError('schedule');
              }}>
              {label}
            </Chip>
          ))}
        </View>

        {scheduleType === 'weekly' || scheduleType === 'selectedDays' ? (
          <View className="mt-4">
            <Text className="mb-2 font-bold text-[#282923] dark:text-[#f4efe4]">
              {scheduleType === 'weekly' ? 'Day' : 'Days'}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Chip
                  disabled={pending}
                  key={day.code}
                  selected={scheduledDays.includes(day.code)}
                  onPress={() => {
                    setScheduledDays((current) =>
                      scheduleType === 'weekly'
                        ? [day.code]
                        : current.includes(day.code)
                          ? current.filter((code) => code !== day.code)
                          : [...current, day.code],
                    );
                    clearFieldError('schedule');
                  }}>
                  {day.short}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        <HelperText type="error" visible={Boolean(fieldErrors.schedule)}>
          {fieldErrors.schedule}
        </HelperText>
      </View>

      {feedback ? (
        <HelperText accessibilityLiveRegion="assertive" type="error" visible>
          {feedback}
        </HelperText>
      ) : null}

      <Button
        className="mt-2"
        contentStyle={{ minHeight: 50 }}
        loading={pending}
        mode="contained"
        disabled={pending}
        onPress={() => void submit()}>
        {submitLabel}
      </Button>
    </View>
  );
}
