import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Category,
  PrayerFieldErrors,
  PrayerRequest,
  PrayerRequestDraft,
  PrayerRequestStatus,
  RepositoryResult,
} from '@/features/prayers/types/prayer';

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
  status: PrayerRequestStatus;
  created_at: string;
  updated_at: string;
};

type ValidatedDraft = {
  title: string;
  details: string | null;
  category:
    | { kind: 'existing'; categoryId: string }
    | { kind: 'new'; name: string };
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
             (id, user_id, category_id, title, details, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
          requestId,
          ownerId,
          categoryId,
          validated.value.title,
          validated.value.details,
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
           SET category_id = ?, title = ?, details = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
          categoryId,
          validated.value.title,
          validated.value.details,
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
    status: PrayerRequestStatus,
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

  return { listCategories, listRequests, getRequest, createRequest, updateRequest, setStatus };
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

  return Object.keys(fieldErrors).length > 0
    ? {
        ok: false,
        code: 'validation',
        message: 'Check the highlighted fields.',
        fieldErrors,
      }
    : { ok: true, value: { title, details, category } };
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
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    title: row.title,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const requestSelect = `
  SELECT requests.id,
         requests.category_id,
         categories.name AS category_name,
         requests.title,
         requests.details,
         requests.status,
         requests.created_at,
         requests.updated_at
  FROM prayer_requests AS requests
  INNER JOIN categories
    ON categories.id = requests.category_id
   AND categories.user_id = requests.user_id`;

class CategoryNotFoundError extends Error {}

function isCategoryNotFound(error: unknown) {
  return error instanceof CategoryNotFoundError;
}

function notFound<T>(message = 'That prayer request is no longer available.'): RepositoryResult<T> {
  return { ok: false, code: 'not-found', message };
}

function storageFailure<T>(): RepositoryResult<T> {
  return { ok: false, code: 'storage', message: STORAGE_MESSAGE };
}
