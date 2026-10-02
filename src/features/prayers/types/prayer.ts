export type PrayerRequestStatus = 'active' | 'archived' | 'answered';
export type PrayerOpenStatus = Exclude<PrayerRequestStatus, 'answered'>;

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
  answer: AnswerRecord | null;
  createdAt: string;
  updatedAt: string;
};

export type AnswerRecord = {
  id: string;
  prayerRequestId: string;
  answeredOn: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type AnsweredPrayer = PrayerRequest & {
  status: 'answered';
  answer: AnswerRecord;
};

export type AnswerDraft = {
  answeredOn: string;
  description: string;
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
export type AnswerFieldErrors = Partial<Record<'answeredOn' | 'description', string>>;

export type RepositoryErrorCode = 'validation' | 'not-found' | 'storage';

export type RepositoryResult<T, FieldErrors = PrayerFieldErrors> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: RepositoryErrorCode;
      message: string;
      fieldErrors?: FieldErrors;
    };
