import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createPrayerSyncRepository,
  type PendingSyncSnapshot,
  type RemoteAnswerRecord,
  type RemoteCategory,
  type RemotePrayerRequest,
  type RemoteSyncSnapshot,
  type SyncAnswerRecord,
  type SyncCategory,
  type SyncPrayerRequest,
} from '@/features/prayers/data/sync-repository';
import type {
  PrayerRequestStatus,
  PrayerScheduleType,
  WeekdayCode,
} from '@/features/prayers/types/prayer';
import { validatePrayerSchedule } from '@/features/prayers/utils/prayer-schedule';
import {
  getSupabaseClient,
  SupabaseConfigurationError,
} from '@/lib/supabase';

export type PrayerSyncErrorCode = 'configuration' | 'remote' | 'validation' | 'storage';

export type PrayerSyncSummary = {
  pushed: number;
  inserted: number;
  updated: number;
  localConflicts: number;
  unchanged: number;
};

export type PrayerSyncResult =
  | { ok: true; value: PrayerSyncSummary }
  | { ok: false; code: PrayerSyncErrorCode; message: string };

type RunPrayerSyncOptions = {
  db: SQLiteDatabase;
  ownerId: string;
  client?: SupabaseClient;
  now?: () => Date;
};

type RemoteResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: Extract<PrayerSyncErrorCode, 'remote' | 'validation'> };

const inFlightByDatabase = new WeakMap<
  SQLiteDatabase,
  { ownerId: string; promise: Promise<PrayerSyncResult> }
>();

const ANSWER_SELECT =
  'id,prayer_request_id,answered_on,description,created_at,updated_at,owner:prayer_requests!inner(user_id)';

export function runPrayerSync(options: RunPrayerSyncOptions): Promise<PrayerSyncResult> {
  const ownerId = options.ownerId.trim();
  if (!isUuid(ownerId)) return Promise.resolve(syncFailure('validation'));

  const existing = inFlightByDatabase.get(options.db);
  if (existing) {
    if (existing.ownerId === ownerId) return existing.promise;
    return existing.promise.then(
      () => runPrayerSync({ ...options, ownerId }),
      () => runPrayerSync({ ...options, ownerId }),
    );
  }

  const run = executePrayerSync({ ...options, ownerId }).finally(() => {
    if (inFlightByDatabase.get(options.db)?.promise === run) {
      inFlightByDatabase.delete(options.db);
    }
  });
  inFlightByDatabase.set(options.db, { ownerId, promise: run });
  return run;
}

async function executePrayerSync({
  db,
  ownerId,
  client: injectedClient,
  now = () => new Date(),
}: RunPrayerSyncOptions & { ownerId: string }): Promise<PrayerSyncResult> {
  let client: SupabaseClient;
  try {
    client = injectedClient ?? getSupabaseClient();
  } catch (error) {
    return syncFailure(error instanceof SupabaseConfigurationError ? 'configuration' : 'remote');
  }

  const repository = createPrayerSyncRepository(db, ownerId);
  let pending: PendingSyncSnapshot;
  try {
    await repository.recordAttempt(now().toISOString());
    pending = await repository.getPendingSnapshot();
  } catch {
    return syncFailure('storage');
  }

  let pushed = 0;

  const categoryPush = await pushCategories(client, ownerId, pending.categories);
  if (!categoryPush.ok) {
    return markFailedOrReturn(repository.markCategoriesFailed, pending.categories, categoryPush.code);
  }
  try {
    await repository.markCategoriesSynced(pending.categories);
    pushed += pending.categories.length;
  } catch {
    return syncFailure('storage');
  }

  const requestPush = await pushRequests(client, ownerId, pending.requests);
  if (!requestPush.ok) {
    return markFailedOrReturn(repository.markRequestsFailed, pending.requests, requestPush.code);
  }
  try {
    await repository.markRequestsSynced(pending.requests);
    pushed += pending.requests.length;
  } catch {
    return syncFailure('storage');
  }

  const answerPush = await pushAnswers(client, ownerId, pending.answers);
  if (!answerPush.ok) {
    return markFailedOrReturn(repository.markAnswersFailed, pending.answers, answerPush.code);
  }
  try {
    await repository.markAnswersSynced(pending.answers);
    pushed += pending.answers.length;
  } catch {
    return syncFailure('storage');
  }

  const pulled = await pullRemoteSnapshot(client, ownerId);
  if (!pulled.ok) return syncFailure(pulled.code);

  try {
    const applied = await repository.applyRemoteSnapshot(pulled.value, now().toISOString());
    return { ok: true, value: { pushed, ...applied } };
  } catch {
    return syncFailure('storage');
  }
}

async function markFailedOrReturn(
  markFailed: (records: readonly { id: string; updatedAt: string }[]) => Promise<void>,
  records: readonly { id: string; updatedAt: string }[],
  code: Extract<PrayerSyncErrorCode, 'remote' | 'validation'>,
): Promise<PrayerSyncResult> {
  try {
    await markFailed(records);
    return syncFailure(code);
  } catch {
    return syncFailure('storage');
  }
}

async function pushCategories(
  client: SupabaseClient,
  ownerId: string,
  records: readonly SyncCategory[],
): Promise<RemoteResult<true>> {
  if (records.length === 0) return { ok: true, value: true };

  try {
    const { data, error } = await client
      .from('categories')
      .upsert(
        records.map((record) => ({
          id: record.id,
          user_id: ownerId,
          name: record.name,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
        })),
        { onConflict: 'id' },
      )
      .select('id,user_id,name,created_at,updated_at');

    if (error) return { ok: false, code: 'remote' };
    return confirmReturnedRows(data, records, (row) => decodeCategory(row, ownerId));
  } catch {
    return { ok: false, code: 'remote' };
  }
}

async function pushRequests(
  client: SupabaseClient,
  ownerId: string,
  records: readonly SyncPrayerRequest[],
): Promise<RemoteResult<true>> {
  if (records.length === 0) return { ok: true, value: true };

  try {
    const { data, error } = await client
      .from('prayer_requests')
      .upsert(
        records.map((record) => ({
          id: record.id,
          user_id: ownerId,
          category_id: record.categoryId,
          title: record.title,
          details: record.details,
          schedule_type: record.scheduleType,
          scheduled_days: record.scheduledDays,
          status: record.status,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
        })),
        { onConflict: 'id' },
      )
      .select(
        'id,user_id,category_id,title,details,schedule_type,scheduled_days,status,created_at,updated_at',
      );

    if (error) return { ok: false, code: 'remote' };
    return confirmReturnedRows(data, records, (row) => decodeRequest(row, ownerId));
  } catch {
    return { ok: false, code: 'remote' };
  }
}

async function pushAnswers(
  client: SupabaseClient,
  ownerId: string,
  records: readonly SyncAnswerRecord[],
): Promise<RemoteResult<true>> {
  if (records.length === 0) return { ok: true, value: true };

  try {
    const { data, error } = await client
      .from('answer_records')
      .upsert(
        records.map((record) => ({
          id: record.id,
          prayer_request_id: record.prayerRequestId,
          answered_on: record.answeredOn,
          description: record.description,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
        })),
        { onConflict: 'id' },
      )
      .select(ANSWER_SELECT);

    if (error) return { ok: false, code: 'remote' };
    return confirmReturnedRows(data, records, (row) => decodeAnswer(row, ownerId));
  } catch {
    return { ok: false, code: 'remote' };
  }
}

function confirmReturnedRows<T extends { id: string; updatedAt: string }>(
  payload: unknown,
  expected: readonly { id: string; updatedAt: string }[],
  decode: (row: unknown) => T,
): RemoteResult<true> {
  try {
    if (!Array.isArray(payload) || payload.length !== expected.length) {
      return { ok: false, code: 'validation' };
    }

    const expectedById = new Map(expected.map((record) => [record.id, record.updatedAt]));
    const confirmedIds = new Set<string>();
    for (const rawRow of payload) {
      const row = decode(rawRow);
      const expectedVersion = expectedById.get(row.id);
      if (
        expectedVersion === undefined ||
        confirmedIds.has(row.id) ||
        Date.parse(expectedVersion) !== Date.parse(row.updatedAt)
      ) {
        return { ok: false, code: 'validation' };
      }
      confirmedIds.add(row.id);
    }

    return confirmedIds.size === expected.length
      ? { ok: true, value: true }
      : { ok: false, code: 'validation' };
  } catch {
    return { ok: false, code: 'validation' };
  }
}

async function pullRemoteSnapshot(
  client: SupabaseClient,
  ownerId: string,
): Promise<RemoteResult<RemoteSyncSnapshot>> {
  const results = await Promise.all([
    client
      .from('categories')
      .select('id,user_id,name,created_at,updated_at')
      .eq('user_id', ownerId),
    client
      .from('prayer_requests')
      .select(
        'id,user_id,category_id,title,details,schedule_type,scheduled_days,status,created_at,updated_at',
      )
      .eq('user_id', ownerId),
    client
      .from('answer_records')
      .select(ANSWER_SELECT)
      .eq('owner.user_id', ownerId),
  ]).catch(() => null);

  if (!results) return { ok: false, code: 'remote' };
  const [categoryResult, requestResult, answerResult] = results;

  if (categoryResult.error || requestResult.error || answerResult.error) {
    return { ok: false, code: 'remote' };
  }

  try {
    const categories = decodeRows(categoryResult.data, (row) => decodeCategory(row, ownerId));
    const requests = decodeRows(requestResult.data, (row) => decodeRequest(row, ownerId));
    const answers = decodeRows(answerResult.data, (row) => decodeAnswer(row, ownerId));
    assertSnapshotRelationships(categories, requests, answers);

    return { ok: true, value: { categories, requests, answers } };
  } catch {
    return { ok: false, code: 'validation' };
  }
}

function decodeRows<T>(payload: unknown, decode: (row: unknown) => T): T[] {
  if (!Array.isArray(payload)) throw new Error('Remote result is not a row collection.');
  return payload.map(decode);
}

export function decodeCategory(payload: unknown, ownerId: string): RemoteCategory {
  const row = requireObject(payload);
  const timestamps = decodeTimestamps(row);
  return {
    id: requireUuid(row.id),
    userId: requireOwner(row.user_id, ownerId),
    name: requireTrimmedText(row.name),
    ...timestamps,
  };
}

export function decodeRequest(payload: unknown, ownerId: string): RemotePrayerRequest {
  const row = requireObject(payload);
  const schedule = decodeSchedule(row.schedule_type, row.scheduled_days);
  const timestamps = decodeTimestamps(row);
  return {
    id: requireUuid(row.id),
    userId: requireOwner(row.user_id, ownerId),
    categoryId: requireUuid(row.category_id),
    title: requireTrimmedText(row.title),
    details: requireNullableText(row.details),
    ...schedule,
    status: requireRequestStatus(row.status),
    ...timestamps,
  };
}

export function decodeAnswer(payload: unknown, ownerId: string): RemoteAnswerRecord {
  const row = requireObject(payload);
  const ownerRelation = Array.isArray(row.owner) ? row.owner[0] : row.owner;
  const owner = requireObject(ownerRelation);
  requireOwner(owner.user_id, ownerId);
  const timestamps = decodeTimestamps(row);
  return {
    id: requireUuid(row.id),
    prayerRequestId: requireUuid(row.prayer_request_id),
    answeredOn: requireCanonicalDate(row.answered_on),
    description: requireTrimmedText(row.description),
    ...timestamps,
  };
}

function decodeSchedule(
  rawType: unknown,
  rawDays: unknown,
): { scheduleType: PrayerScheduleType | null; scheduledDays: WeekdayCode[] | null } {
  if (rawType === null) {
    if (rawDays !== null) throw new Error('Unscheduled prayer has weekday data.');
    return { scheduleType: null, scheduledDays: null };
  }

  if (rawType !== 'daily' && rawType !== 'weekly' && rawType !== 'selectedDays') {
    throw new Error('Remote schedule type is invalid.');
  }
  const scheduleType = rawType;

  if (scheduleType === 'daily') {
    if (rawDays !== null) throw new Error('Daily prayer has weekday data.');
    return { scheduleType, scheduledDays: null };
  }

  if (!Array.isArray(rawDays) || !rawDays.every(isWeekdayCode)) {
    throw new Error('Remote weekdays are invalid.');
  }
  const validation = validatePrayerSchedule(scheduleType, rawDays);
  if (!validation.ok || validation.scheduledDays === null) {
    throw new Error('Remote schedule is invalid.');
  }
  if (JSON.stringify(validation.scheduledDays) !== JSON.stringify(rawDays)) {
    throw new Error('Remote weekdays are not canonical.');
  }
  return { scheduleType, scheduledDays: validation.scheduledDays };
}

function assertSnapshotRelationships(
  categories: readonly RemoteCategory[],
  requests: readonly RemotePrayerRequest[],
  answers: readonly RemoteAnswerRecord[],
) {
  assertUniqueIds(categories);
  assertUniqueIds(requests);
  assertUniqueIds(answers);

  const categoryIds = new Set(categories.map((category) => category.id));
  for (const request of requests) {
    if (!categoryIds.has(request.categoryId)) {
      throw new Error('Remote prayer request has an unknown category.');
    }
  }

  const requestIds = new Set(requests.map((request) => request.id));
  const requestById = new Map(requests.map((request) => [request.id, request]));
  const answeredRequestIds = new Set<string>();
  for (const answer of answers) {
    if (
      !requestIds.has(answer.prayerRequestId) ||
      answeredRequestIds.has(answer.prayerRequestId) ||
      requestById.get(answer.prayerRequestId)?.status !== 'answered'
    ) {
      throw new Error('Remote answer relationship is invalid.');
    }
    answeredRequestIds.add(answer.prayerRequestId);
  }

  for (const request of requests) {
    if (request.status === 'answered' && !answeredRequestIds.has(request.id)) {
      throw new Error('Remote answered prayer is missing its answer.');
    }
  }
}

function assertUniqueIds(records: readonly { id: string }[]) {
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    throw new Error('Remote snapshot contains duplicate IDs.');
  }
}

function decodeTimestamps(row: Record<string, unknown>) {
  const createdAt = requireTimestamp(row.created_at);
  const updatedAt = requireTimestamp(row.updated_at);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw new Error('Remote timestamps are out of order.');
  }
  return { createdAt, updatedAt };
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Remote row is invalid.');
  }
  return value as Record<string, unknown>;
}

function requireOwner(value: unknown, ownerId: string) {
  if (value !== ownerId) throw new Error('Remote row belongs to another owner.');
  return ownerId;
}

function requireUuid(value: unknown) {
  if (typeof value !== 'string' || !isUuid(value)) {
    throw new Error('Remote identifier is invalid.');
  }
  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value,
  );
}

function requireTrimmedText(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    throw new Error('Remote text is invalid.');
  }
  return value;
}

function requireNullableText(value: unknown) {
  if (value === null) return null;
  if (typeof value !== 'string' || value !== value.trim() || !value) {
    throw new Error('Remote optional text is invalid.');
  }
  return value;
}

function requireTimestamp(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error('Remote timestamp is invalid.');
  }
  return new Date(value).toISOString();
}

function requireCanonicalDate(value: unknown) {
  if (typeof value !== 'string') throw new Error('Remote date is invalid.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Remote date is invalid.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Remote date is invalid.');
  }
  return value;
}

function requireRequestStatus(value: unknown): PrayerRequestStatus {
  if (value !== 'active' && value !== 'archived' && value !== 'answered') {
    throw new Error('Remote prayer status is invalid.');
  }
  return value;
}

function isWeekdayCode(value: unknown): value is WeekdayCode {
  return (
    value === 'sun' ||
    value === 'mon' ||
    value === 'tue' ||
    value === 'wed' ||
    value === 'thu' ||
    value === 'fri' ||
    value === 'sat'
  );
}

function syncFailure(code: PrayerSyncErrorCode): PrayerSyncResult {
  const messages: Record<PrayerSyncErrorCode, string> = {
    configuration: 'Sync is unavailable until Supabase is configured.',
    remote: 'Changes are saved on this device and will sync when a connection is available.',
    validation: 'Sync stopped because remote prayer data could not be validated.',
    storage: 'Prayer changes are safe, but sync state could not be updated on this device.',
  };
  return { ok: false, code, message: messages[code] };
}
