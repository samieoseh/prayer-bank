export type PrayerRequestStatus = 'active' | 'archived';

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
};

export type PrayerFieldErrors = Partial<Record<'title' | 'category', string>>;

export type RepositoryErrorCode = 'validation' | 'not-found' | 'storage';

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: RepositoryErrorCode;
      message: string;
      fieldErrors?: PrayerFieldErrors;
    };
