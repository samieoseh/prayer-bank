export type PrayerRequestStatus = 'active' | 'archived';

export type PrayerScheduleType = 'daily' | 'weekly' | 'selectedDays';

export type WeekdayCode = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PrayerRequest = {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  details: string | null;
  scheduleType: PrayerScheduleType | null;
  scheduledDays: WeekdayCode[] | null;
  status: PrayerRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type CategorySelection =
  | { kind: 'existing'; categoryId: string }
  | { kind: 'new'; name: string };

export type PrayerRequestDraft = {
  title: string;
  details: string;
  category: CategorySelection;
  scheduleType: PrayerScheduleType | null;
  scheduledDays: WeekdayCode[];
};

export type PrayerFieldErrors = Partial<Record<'title' | 'category' | 'schedule', string>>;

export type RepositoryErrorCode = 'validation' | 'not-found' | 'storage';

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: RepositoryErrorCode;
      message: string;
      fieldErrors?: PrayerFieldErrors;
    };
