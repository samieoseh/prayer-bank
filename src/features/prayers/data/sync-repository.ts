import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  PrayerRequestStatus,
  PrayerScheduleType,
  WeekdayCode,
} from '@/features/prayers/types/prayer';
import {
  parseStoredPrayerSchedule,
  serializeScheduledDays,
} from '@/features/prayers/utils/prayer-schedule';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export type SyncCategory = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type SyncPrayerRequest = {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  details: string | null;
  scheduleType: PrayerScheduleType | null;
  scheduledDays: WeekdayCode[] | null;
  status: PrayerRequestStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type SyncAnswerRecord = {
  id: string;
  prayerRequestId: string;
  answeredOn: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type PendingSyncSnapshot = {
  categories: SyncCategory[];
  requests: SyncPrayerRequest[];
  answers: SyncAnswerRecord[];
};

export type RemoteCategory = Omit<SyncCategory, 'syncStatus'>;
export type RemotePrayerRequest = Omit<SyncPrayerRequest, 'syncStatus'>;
export type RemoteAnswerRecord = Omit<SyncAnswerRecord, 'syncStatus'>;

export type RemoteSyncSnapshot = {
  categories: RemoteCategory[];
  requests: RemotePrayerRequest[];
  answers: RemoteAnswerRecord[];
};

export type RemoteApplySummary = {
  inserted: number;
  updated: number;
  localConflicts: number;
  unchanged: number;
};

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
};

type PrayerRequestRow = {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  details: string | null;
  schedule_type: string | null;
  scheduled_days: string | null;
  status: PrayerRequestStatus;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
};

type AnswerRecordRow = {
  id: string;
  prayer_request_id: string;
  answered_on: string;
  description: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
};

type VersionedRecord = { id: string; updatedAt: string };

export function createPrayerSyncRepository(db: SQLiteDatabase, ownerId: string) {
  async function getPendingSnapshot(): Promise<PendingSyncSnapshot> {
    const [categoryRows, requestRows, answerRows] = await Promise.all([
      db.getAllAsync<CategoryRow>(
        `SELECT id, user_id, name, created_at, updated_at, sync_status
         FROM categories
         WHERE user_id = ? AND sync_status IN ('pending', 'failed')
         ORDER BY created_at, id`,
        ownerId,
      ),
      db.getAllAsync<PrayerRequestRow>(
        `SELECT id, user_id, category_id, title, details, schedule_type, scheduled_days,
                status, created_at, updated_at, sync_status
         FROM prayer_requests
         WHERE user_id = ? AND sync_status IN ('pending', 'failed')
         ORDER BY created_at, id`,
        ownerId,
      ),
      db.getAllAsync<AnswerRecordRow>(
        `SELECT answers.id, answers.prayer_request_id, answers.answered_on,
                answers.description, answers.created_at, answers.updated_at,
                answers.sync_status
         FROM answer_records AS answers
         INNER JOIN prayer_requests AS requests
           ON requests.id = answers.prayer_request_id
         WHERE requests.user_id = ? AND answers.sync_status IN ('pending', 'failed')
         ORDER BY answers.created_at, answers.id`,
        ownerId,
      ),
    ]);

    return {
      categories: categoryRows.map(mapCategory),
      requests: requestRows.map(mapRequest),
      answers: answerRows.map(mapAnswer),
    };
  }

  async function recordAttempt(at: string) {
    await db.runAsync(
      'UPDATE prayer_sync_metadata SET last_attempt_at = ? WHERE singleton = 1',
      at,
    );
  }

  async function markCategoriesSynced(records: readonly VersionedRecord[]) {
    await updateCategoryStatuses(records, 'synced');
  }

  async function markRequestsSynced(records: readonly VersionedRecord[]) {
    await updateRequestStatuses(records, 'synced');
  }

  async function markAnswersSynced(records: readonly VersionedRecord[]) {
    await updateAnswerStatuses(records, 'synced');
  }

  async function markCategoriesFailed(records: readonly VersionedRecord[]) {
    await updateCategoryStatuses(records, 'failed');
  }

  async function markRequestsFailed(records: readonly VersionedRecord[]) {
    await updateRequestStatuses(records, 'failed');
  }

  async function markAnswersFailed(records: readonly VersionedRecord[]) {
    await updateAnswerStatuses(records, 'failed');
  }

  async function updateCategoryStatuses(
    records: readonly VersionedRecord[],
    status: Extract<SyncStatus, 'synced' | 'failed'>,
  ) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const record of records) {
        await transaction.runAsync(
          `UPDATE categories
           SET sync_status = ?
           WHERE id = ? AND user_id = ? AND updated_at = ?
             AND sync_status IN ('pending', 'failed')`,
          status,
          record.id,
          ownerId,
          record.updatedAt,
        );
      }
    });
  }

  async function updateRequestStatuses(
    records: readonly VersionedRecord[],
    status: Extract<SyncStatus, 'synced' | 'failed'>,
  ) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const record of records) {
        await transaction.runAsync(
          `UPDATE prayer_requests
           SET sync_status = ?
           WHERE id = ? AND user_id = ? AND updated_at = ?
             AND sync_status IN ('pending', 'failed')`,
          status,
          record.id,
          ownerId,
          record.updatedAt,
        );
      }
    });
  }

  async function updateAnswerStatuses(
    records: readonly VersionedRecord[],
    status: Extract<SyncStatus, 'synced' | 'failed'>,
  ) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const record of records) {
        await transaction.runAsync(
          `UPDATE answer_records
           SET sync_status = ?
           WHERE id = ? AND updated_at = ?
             AND sync_status IN ('pending', 'failed')
             AND EXISTS (
               SELECT 1 FROM prayer_requests
               WHERE prayer_requests.id = answer_records.prayer_request_id
                 AND prayer_requests.user_id = ?
             )`,
          status,
          record.id,
          record.updatedAt,
          ownerId,
        );
      }
    });
  }

  async function applyRemoteSnapshot(
    snapshot: RemoteSyncSnapshot,
    completedAt: string,
  ): Promise<RemoteApplySummary> {
    const summary: RemoteApplySummary = {
      inserted: 0,
      updated: 0,
      localConflicts: 0,
      unchanged: 0,
    };
    const answerEligibleRequestIds = new Set<string>();

    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const category of snapshot.categories) {
        assertOwner(category.userId);
        const existing = await transaction.getFirstAsync<{
          updated_at: string;
          sync_status: SyncStatus;
        }>('SELECT updated_at, sync_status FROM categories WHERE id = ? AND user_id = ?', category.id, ownerId);

        if (!existing) {
          await transaction.runAsync(
            `INSERT INTO categories
               (id, user_id, name, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, 'synced')`,
            category.id,
            ownerId,
            category.name,
            category.createdAt,
            category.updatedAt,
          );
          summary.inserted += 1;
        } else if (existing.sync_status !== 'synced') {
          summary.localConflicts += 1;
        } else if (isNewer(category.updatedAt, existing.updated_at)) {
          await transaction.runAsync(
            `UPDATE categories
             SET name = ?, created_at = ?, updated_at = ?, sync_status = 'synced'
             WHERE id = ? AND user_id = ?`,
            category.name,
            category.createdAt,
            category.updatedAt,
            category.id,
            ownerId,
          );
          summary.updated += 1;
        } else {
          summary.unchanged += 1;
        }
      }

      for (const request of snapshot.requests) {
        assertOwner(request.userId);
        const existing = await transaction.getFirstAsync<{
          status: PrayerRequestStatus;
          updated_at: string;
          sync_status: SyncStatus;
        }>('SELECT status, updated_at, sync_status FROM prayer_requests WHERE id = ? AND user_id = ?', request.id, ownerId);

        if (!existing) {
          await transaction.runAsync(
            `INSERT INTO prayer_requests
               (id, user_id, category_id, title, details, schedule_type, scheduled_days,
                status, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            request.id,
            ownerId,
            request.categoryId,
            request.title,
            request.details,
            request.scheduleType,
            serializeScheduledDays(request.scheduledDays),
            request.status,
            request.createdAt,
            request.updatedAt,
          );
          summary.inserted += 1;
          if (request.status === 'answered') answerEligibleRequestIds.add(request.id);
        } else if (existing.sync_status !== 'synced') {
          summary.localConflicts += 1;
        } else if (isNewer(request.updatedAt, existing.updated_at)) {
          await transaction.runAsync(
            `UPDATE prayer_requests
             SET category_id = ?, title = ?, details = ?, schedule_type = ?,
                 scheduled_days = ?, status = ?, created_at = ?, updated_at = ?,
                 sync_status = 'synced'
             WHERE id = ? AND user_id = ?`,
            request.categoryId,
            request.title,
            request.details,
            request.scheduleType,
            serializeScheduledDays(request.scheduledDays),
            request.status,
            request.createdAt,
            request.updatedAt,
            request.id,
            ownerId,
          );
          summary.updated += 1;
          if (request.status === 'answered') answerEligibleRequestIds.add(request.id);
        } else {
          summary.unchanged += 1;
          if (existing.status === 'answered') answerEligibleRequestIds.add(request.id);
        }
      }

      for (const answer of snapshot.answers) {
        if (!answerEligibleRequestIds.has(answer.prayerRequestId)) {
          summary.localConflicts += 1;
          continue;
        }

        const existing = await transaction.getFirstAsync<{
          id: string;
          updated_at: string;
          sync_status: SyncStatus;
        }>(
          `SELECT answers.id, answers.updated_at, answers.sync_status
           FROM answer_records AS answers
           INNER JOIN prayer_requests AS requests
             ON requests.id = answers.prayer_request_id
           WHERE (answers.id = ? OR answers.prayer_request_id = ?)
             AND requests.user_id = ?`,
          answer.id,
          answer.prayerRequestId,
          ownerId,
        );

        if (!existing) {
          await transaction.runAsync(
            `INSERT INTO answer_records
               (id, prayer_request_id, answered_on, description, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, 'synced')`,
            answer.id,
            answer.prayerRequestId,
            answer.answeredOn,
            answer.description,
            answer.createdAt,
            answer.updatedAt,
          );
          summary.inserted += 1;
        } else if (existing.id !== answer.id || existing.sync_status !== 'synced') {
          summary.localConflicts += 1;
        } else if (isNewer(answer.updatedAt, existing.updated_at)) {
          await transaction.runAsync(
            `UPDATE answer_records
             SET prayer_request_id = ?, answered_on = ?, description = ?, created_at = ?,
                 updated_at = ?, sync_status = 'synced'
             WHERE id = ?`,
            answer.prayerRequestId,
            answer.answeredOn,
            answer.description,
            answer.createdAt,
            answer.updatedAt,
            answer.id,
          );
          summary.updated += 1;
        } else {
          summary.unchanged += 1;
        }
      }

      await transaction.runAsync(
        'UPDATE prayer_sync_metadata SET last_success_at = ? WHERE singleton = 1',
        completedAt,
      );
    });

    return summary;
  }

  function assertOwner(candidateOwnerId: string) {
    if (candidateOwnerId !== ownerId) {
      throw new Error('Remote prayer record belongs to another owner.');
    }
  }

  return {
    getPendingSnapshot,
    recordAttempt,
    markCategoriesSynced,
    markRequestsSynced,
    markAnswersSynced,
    markCategoriesFailed,
    markRequestsFailed,
    markAnswersFailed,
    applyRemoteSnapshot,
  };
}

function mapCategory(row: CategoryRow): SyncCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

function mapRequest(row: PrayerRequestRow): SyncPrayerRequest {
  const schedule = parseStoredPrayerSchedule(row.schedule_type, row.scheduled_days);
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    details: row.details,
    scheduleType: schedule.scheduleType,
    scheduledDays: schedule.scheduledDays,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

function mapAnswer(row: AnswerRecordRow): SyncAnswerRecord {
  return {
    id: row.id,
    prayerRequestId: row.prayer_request_id,
    answeredOn: row.answered_on,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

function isNewer(candidate: string, current: string) {
  return Date.parse(candidate) > Date.parse(current);
}
