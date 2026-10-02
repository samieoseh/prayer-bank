import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  AnswerDraft,
  AnsweredPrayer,
  AnswerFieldErrors,
  Category,
  PrayerFieldErrors,
  PrayerRequest,
  PrayerRequestDraft,
  PrayerOpenStatus,
  PrayerRequestStatus,
  RepositoryResult,
} from '@/features/prayers/types/prayer';
import {
  parseStoredPrayerSchedule,
  serializeScheduledDays,
  validatePrayerSchedule,
} from '@/features/prayers/utils/prayer-schedule';

type CategoryRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type PrayerRequestRow = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  details: string | null;
  schedule_type: string | null;
  scheduled_days: string | null;
  status: PrayerRequestStatus;
  answer_id: string | null;
  answered_on: string | null;
  answer_description: string | null;
  answer_created_at: string | null;
  answer_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type ValidatedDraft = {
  title: string;
  details: string | null;
  scheduleType: NonNullable<PrayerRequestDraft['scheduleType']>;
  scheduledDays: PrayerRequest['scheduledDays'];
  category:
    | { kind: 'existing'; categoryId: string }
    | { kind: 'new'; name: string };
};

type ValidatedAnswerDraft = {
  answeredOn: string;
  description: string;
};

const STORAGE_MESSAGE = 'Prayer requests could not be loaded or saved. Try again.';

export function createPrayerRepository(db: SQLiteDatabase, ownerId: string) {
  async function listCategories(): Promise<RepositoryResult<Category[]>> {
    try {
      const rows = await db.getAllAsync<CategoryRow>(
        `SELECT id, name, created_at, updated_at
         FROM categories
         WHERE user_id = ?
         ORDER BY updated_at DESC, id`,
        ownerId,
      );
      return { ok: true, value: rows.map(mapCategory) };
    } catch {
      return storageFailure();
    }
  }

  async function listRequests(
    status: PrayerRequestStatus,
  ): Promise<RepositoryResult<PrayerRequest[]>> {
    try {
      const rows = await db.getAllAsync<PrayerRequestRow>(
        `${requestSelect}
         WHERE requests.user_id = ? AND requests.status = ?
         ORDER BY requests.updated_at DESC, requests.id`,
        ownerId,
        status,
      );
      return { ok: true, value: rows.map(mapPrayerRequest) };
    } catch {
      return storageFailure();
    }
  }

  async function listAnsweredPrayers(): Promise<RepositoryResult<AnsweredPrayer[]>> {
    try {
      const rows = await db.getAllAsync<PrayerRequestRow>(
        `${requestSelect}
         WHERE requests.user_id = ?
           AND requests.status = 'answered'
           AND answers.id IS NOT NULL
         ORDER BY answers.answered_on DESC, requests.id`,
        ownerId,
      );
      return { ok: true, value: rows.map(mapAnsweredPrayer) };
    } catch {
      return storageFailure();
    }
  }

  async function getRequest(id: string): Promise<RepositoryResult<PrayerRequest>> {
    if (!id.trim()) return notFound();

    try {
      const row = await db.getFirstAsync<PrayerRequestRow>(
        `${requestSelect}
         WHERE requests.id = ? AND requests.user_id = ?`,
        id,
        ownerId,
      );
      return row ? { ok: true, value: mapPrayerRequest(row) } : notFound();
    } catch {
      return storageFailure();
    }
  }

  async function createRequest(draft: PrayerRequestDraft): Promise<RepositoryResult<PrayerRequest>> {
    const validated = validateDraft(draft);
    if (!validated.ok) return validated;

    const requestId = randomUUID().toLowerCase();
    const now = new Date().toISOString();

    try {
      let categoryId = '';
      await db.withExclusiveTransactionAsync(async (transaction) => {
        categoryId = await resolveCategory(transaction, validated.value.category, now);
        await transaction.runAsync(
          `INSERT INTO prayer_requests
             (id, user_id, category_id, title, details, schedule_type, scheduled_days, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          requestId,
          ownerId,
          categoryId,
          validated.value.title,
          validated.value.details,
          validated.value.scheduleType,
          serializeScheduledDays(validated.value.scheduledDays),
          now,
          now,
        );
      });

      return getRequest(requestId);
    } catch (error) {
      return isCategoryNotFound(error) ? notFound('That category is no longer available.') : storageFailure();
    }
  }

  async function updateRequest(
    id: string,
    draft: PrayerRequestDraft,
  ): Promise<RepositoryResult<PrayerRequest>> {
    const validated = validateDraft(draft);
    if (!validated.ok) return validated;
    if (!id.trim()) return notFound();

    const now = new Date().toISOString();

    try {
      let found = false;
      await db.withExclusiveTransactionAsync(async (transaction) => {
        const existing = await transaction.getFirstAsync<{ id: string }>(
          'SELECT id FROM prayer_requests WHERE id = ? AND user_id = ?',
          id,
          ownerId,
        );
        if (!existing) return;

        found = true;
        const categoryId = await resolveCategory(transaction, validated.value.category, now);
        await transaction.runAsync(
          `UPDATE prayer_requests
           SET category_id = ?, title = ?, details = ?, schedule_type = ?, scheduled_days = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
          categoryId,
          validated.value.title,
          validated.value.details,
          validated.value.scheduleType,
          serializeScheduledDays(validated.value.scheduledDays),
          now,
          id,
          ownerId,
        );
      });

      return found ? getRequest(id) : notFound();
    } catch (error) {
      return isCategoryNotFound(error) ? notFound('That category is no longer available.') : storageFailure();
    }
  }

  async function setStatus(
    id: string,
    status: PrayerOpenStatus,
  ): Promise<RepositoryResult<PrayerRequest>> {
    if (!id.trim()) return notFound();

    try {
      const result = await db.runAsync(
        `UPDATE prayer_requests
         SET status = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
        status,
        new Date().toISOString(),
        id,
        ownerId,
      );
      return result.changes === 0 ? notFound() : getRequest(id);
    } catch {
      return storageFailure();
    }
  }

  async function recordAnswer(
    id: string,
    draft: AnswerDraft,
  ): Promise<RepositoryResult<AnsweredPrayer, AnswerFieldErrors>> {
    const validated = validateAnswerDraft(draft);
    if (!validated.ok) return validated;
    if (!id.trim()) return notFound<AnsweredPrayer, AnswerFieldErrors>();

    const answerId = randomUUID().toLowerCase();
    const now = new Date().toISOString();
    let state: 'missing' | 'already-answered' | 'recorded' = 'missing';

    try {
      await db.withExclusiveTransactionAsync(async (transaction) => {
        const request = await transaction.getFirstAsync<{ status: PrayerRequestStatus }>(
          'SELECT status FROM prayer_requests WHERE id = ? AND user_id = ?',
          id,
          ownerId,
        );
        if (!request) return;

        const existingAnswer = await transaction.getFirstAsync<{ id: string }>(
          'SELECT id FROM answer_records WHERE prayer_request_id = ?',
          id,
        );
        if (request.status === 'answered' || existingAnswer) {
          state = 'already-answered';
          return;
        }

        await transaction.runAsync(
          `INSERT INTO answer_records
             (id, prayer_request_id, answered_on, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          answerId,
          id,
          validated.value.answeredOn,
          validated.value.description,
          now,
          now,
        );
        const updated = await transaction.runAsync(
          `UPDATE prayer_requests
           SET status = 'answered', updated_at = ?
           WHERE id = ? AND user_id = ? AND status IN ('active', 'archived')`,
          now,
          id,
          ownerId,
        );
        if (updated.changes !== 1) throw new Error('Prayer request lifecycle changed.');
        state = 'recorded';
      });

      if (state === 'missing') return notFound<AnsweredPrayer, AnswerFieldErrors>();
      if (state === 'already-answered') {
        return {
          ok: false,
          code: 'validation',
          message: 'This prayer request already has an answer.',
        };
      }

      const result = await getRequest(id);
      if (!result.ok) {
        return { ok: false, code: result.code, message: result.message };
      }
      return result.value.status === 'answered' && result.value.answer
        ? { ok: true, value: result.value as AnsweredPrayer }
        : storageFailure<AnsweredPrayer, AnswerFieldErrors>();
    } catch {
      return storageFailure<AnsweredPrayer, AnswerFieldErrors>();
    }
  }

  async function resolveCategory(
    transaction: SQLiteDatabase,
    category: ValidatedDraft['category'],
    now: string,
  ) {
    if (category.kind === 'existing') {
      const existing = await transaction.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        category.categoryId,
        ownerId,
      );
      if (!existing) throw new CategoryNotFoundError();
      return existing.id;
    }

    const categoryId = randomUUID().toLowerCase();
    await transaction.runAsync(
      `INSERT INTO categories (id, user_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      categoryId,
      ownerId,
      category.name,
      now,
      now,
    );
    return categoryId;
  }

  return {
    listCategories,
    listRequests,
    listAnsweredPrayers,
    getRequest,
    createRequest,
    updateRequest,
    setStatus,
    recordAnswer,
  };
}

function validateDraft(draft: PrayerRequestDraft): RepositoryResult<ValidatedDraft> {
  const fieldErrors: PrayerFieldErrors = {};
  const title = draft.title.trim();
  const details = draft.details.trim() || null;

  if (!title) fieldErrors.title = 'Enter a prayer request title.';

  const category =
    draft.category.kind === 'new'
      ? { kind: 'new' as const, name: draft.category.name.trim() }
      : { kind: 'existing' as const, categoryId: draft.category.categoryId.trim() };

  if (category.kind === 'new' && !category.name) {
    fieldErrors.category = 'Enter a category name.';
  }
  if (category.kind === 'existing' && !category.categoryId) {
    fieldErrors.category = 'Choose a category.';
  }

  const schedule = validatePrayerSchedule(draft.scheduleType, draft.scheduledDays);
  if (!schedule.ok) fieldErrors.schedule = schedule.message;

  return Object.keys(fieldErrors).length > 0 || !schedule.ok || !draft.scheduleType
    ? {
        ok: false,
        code: 'validation',
        message: 'Check the highlighted fields.',
        fieldErrors,
      }
    : {
        ok: true,
        value: {
          title,
          details,
          category,
          scheduleType: draft.scheduleType,
          scheduledDays: schedule.scheduledDays,
        },
      };
}

function validateAnswerDraft(
  draft: AnswerDraft,
): RepositoryResult<ValidatedAnswerDraft, AnswerFieldErrors> {
  const fieldErrors: AnswerFieldErrors = {};
  const answeredOn = draft.answeredOn.trim();
  const description = draft.description.trim();

  if (!isCanonicalDate(answeredOn)) {
    fieldErrors.answeredOn = 'Enter a real date in YYYY-MM-DD format.';
  }
  if (!description) fieldErrors.description = 'Describe how the prayer was answered.';

  return Object.keys(fieldErrors).length > 0
    ? {
        ok: false,
        code: 'validation',
        message: 'Check the highlighted fields.',
        fieldErrors,
      }
    : { ok: true, value: { answeredOn, description } };
}

function isCanonicalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPrayerRequest(row: PrayerRequestRow): PrayerRequest {
  const schedule = parseStoredPrayerSchedule(row.schedule_type, row.scheduled_days);

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    title: row.title,
    details: row.details,
    ...schedule,
    status: row.status,
    answer: row.answer_id
      ? {
          id: row.answer_id,
          prayerRequestId: row.id,
          answeredOn: row.answered_on!,
          description: row.answer_description!,
          createdAt: row.answer_created_at!,
          updatedAt: row.answer_updated_at!,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnsweredPrayer(row: PrayerRequestRow): AnsweredPrayer {
  const request = mapPrayerRequest(row);
  if (request.status !== 'answered' || !request.answer) {
    throw new Error('Answered prayer is missing its answer record.');
  }
  return request as AnsweredPrayer;
}

const requestSelect = `
  SELECT requests.id,
         requests.category_id,
         categories.name AS category_name,
         requests.title,
         requests.details,
         requests.schedule_type,
         requests.scheduled_days,
         requests.status,
         answers.id AS answer_id,
         answers.answered_on,
         answers.description AS answer_description,
         answers.created_at AS answer_created_at,
         answers.updated_at AS answer_updated_at,
         requests.created_at,
         requests.updated_at
  FROM prayer_requests AS requests
  INNER JOIN categories
    ON categories.id = requests.category_id
   AND categories.user_id = requests.user_id
  LEFT JOIN answer_records AS answers
    ON answers.prayer_request_id = requests.id`;

class CategoryNotFoundError extends Error {}

function isCategoryNotFound(error: unknown) {
  return error instanceof CategoryNotFoundError;
}

function notFound<T, FieldErrors = PrayerFieldErrors>(
  message = 'That prayer request is no longer available.',
): RepositoryResult<T, FieldErrors> {
  return { ok: false, code: 'not-found', message };
}

function storageFailure<T, FieldErrors = PrayerFieldErrors>(): RepositoryResult<T, FieldErrors> {
  return { ok: false, code: 'storage', message: STORAGE_MESSAGE };
}
