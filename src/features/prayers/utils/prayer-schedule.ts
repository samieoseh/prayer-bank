import type {
  PrayerScheduleType,
  WeekdayCode,
} from '@/features/prayers/types/prayer';

export const WEEKDAYS: ReadonlyArray<{ code: WeekdayCode; short: string; long: string }> = [
  { code: 'sun', short: 'Sun', long: 'Sunday' },
  { code: 'mon', short: 'Mon', long: 'Monday' },
  { code: 'tue', short: 'Tue', long: 'Tuesday' },
  { code: 'wed', short: 'Wed', long: 'Wednesday' },
  { code: 'thu', short: 'Thu', long: 'Thursday' },
  { code: 'fri', short: 'Fri', long: 'Friday' },
  { code: 'sat', short: 'Sat', long: 'Saturday' },
];

type StoredSchedule = {
  scheduleType: PrayerScheduleType | null;
  scheduledDays: WeekdayCode[] | null;
};

type ScheduleValidation =
  | { ok: true; scheduledDays: WeekdayCode[] | null }
  | { ok: false; message: string };

const weekdayIndex = new Map(WEEKDAYS.map((day, index) => [day.code, index]));

export function validatePrayerSchedule(
  scheduleType: PrayerScheduleType | null,
  scheduledDays: readonly WeekdayCode[],
): ScheduleValidation {
  if (!scheduleType) {
    return { ok: false, message: 'Choose a prayer schedule.' };
  }

  if (scheduleType === 'daily') {
    return scheduledDays.length === 0
      ? { ok: true, scheduledDays: null }
      : { ok: false, message: 'Daily prayers should not have selected weekdays.' };
  }

  if (!areValidUniqueWeekdays(scheduledDays)) {
    return { ok: false, message: 'Choose valid weekdays without duplicates.' };
  }

  const canonicalDays = [...scheduledDays].sort(
    (left, right) => weekdayIndex.get(left)! - weekdayIndex.get(right)!,
  );

  if (scheduleType === 'weekly' && canonicalDays.length !== 1) {
    return { ok: false, message: 'Choose exactly one day for a weekly prayer.' };
  }

  if (scheduleType === 'selectedDays' && canonicalDays.length < 2) {
    return { ok: false, message: 'Choose at least two selected days.' };
  }

  return { ok: true, scheduledDays: canonicalDays };
}

export function parseStoredPrayerSchedule(
  scheduleType: string | null,
  scheduledDaysJson: string | null,
): StoredSchedule {
  if (scheduleType === null) {
    if (scheduledDaysJson !== null) throw new Error('Unscheduled prayer has weekday data.');
    return { scheduleType: null, scheduledDays: null };
  }

  if (!isPrayerScheduleType(scheduleType)) throw new Error('Unsupported prayer schedule type.');

  if (scheduleType === 'daily') {
    if (scheduledDaysJson !== null) throw new Error('Daily prayer has weekday data.');
    return { scheduleType, scheduledDays: null };
  }

  if (scheduledDaysJson === null) throw new Error('Scheduled prayer is missing weekdays.');

  const parsed: unknown = JSON.parse(scheduledDaysJson);
  if (!Array.isArray(parsed) || !parsed.every(isWeekdayCode)) {
    throw new Error('Stored prayer weekdays are invalid.');
  }

  const validation = validatePrayerSchedule(scheduleType, parsed);
  if (!validation.ok || validation.scheduledDays === null) {
    throw new Error(validation.ok ? 'Stored prayer weekdays are invalid.' : validation.message);
  }

  if (JSON.stringify(validation.scheduledDays) !== scheduledDaysJson) {
    throw new Error('Stored prayer weekdays are not canonical.');
  }

  return { scheduleType, scheduledDays: validation.scheduledDays };
}

export function serializeScheduledDays(scheduledDays: readonly WeekdayCode[] | null) {
  return scheduledDays === null ? null : JSON.stringify(scheduledDays);
}

export function weekdayCodeFromDate(date: Date): WeekdayCode {
  return WEEKDAYS[date.getDay()].code;
}

export function isPrayerDueOn(
  schedule: Pick<StoredSchedule, 'scheduleType' | 'scheduledDays'>,
  date: Date,
) {
  if (!schedule.scheduleType) return false;
  if (schedule.scheduleType === 'daily') return true;
  return schedule.scheduledDays?.includes(weekdayCodeFromDate(date)) ?? false;
}

export function formatPrayerSchedule(
  schedule: Pick<StoredSchedule, 'scheduleType' | 'scheduledDays'>,
  compact = false,
) {
  if (!schedule.scheduleType) return 'Not scheduled';
  if (schedule.scheduleType === 'daily') return 'Daily';

  const labels = (schedule.scheduledDays ?? []).map((code) => {
    const day = WEEKDAYS.find((candidate) => candidate.code === code)!;
    return compact ? day.short : day.long;
  });

  if (schedule.scheduleType === 'weekly') {
    return compact ? `Weekly · ${labels[0]}` : `Weekly on ${labels[0]}`;
  }

  return joinLabels(labels);
}

function isPrayerScheduleType(value: string): value is PrayerScheduleType {
  return value === 'daily' || value === 'weekly' || value === 'selectedDays';
}

function isWeekdayCode(value: unknown): value is WeekdayCode {
  return typeof value === 'string' && weekdayIndex.has(value as WeekdayCode);
}

function areValidUniqueWeekdays(values: readonly WeekdayCode[]) {
  return values.every(isWeekdayCode) && new Set(values).size === values.length;
}

function joinLabels(labels: readonly string[]) {
  if (labels.length < 2) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} & ${labels.at(-1)}`;
}
