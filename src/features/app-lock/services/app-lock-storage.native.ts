import * as SecureStore from 'expo-secure-store';

import {
  APP_LOCK_MAX_FAILED_ATTEMPTS,
  APP_LOCK_RECORD_VERSION,
  type AppLockRecord,
} from '@/features/app-lock/app-lock-types';
import {
  AppLockStorageError,
  type AppLockStorage,
} from '@/features/app-lock/services/app-lock-storage.types';

const APP_LOCK_STORAGE_KEY = 'prayer-bank.app-lock.v1';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const SALT_PATTERN = /^[0-9a-f]{32}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

function parseRecord(value: string): AppLockRecord {
  let candidate: unknown;

  try {
    candidate = JSON.parse(value);
  } catch {
    throw new AppLockStorageError();
  }

  if (!isAppLockRecord(candidate)) {
    throw new AppLockStorageError();
  }

  return candidate;
}

function isAppLockRecord(value: unknown): value is AppLockRecord {
  if (!value || typeof value !== 'object') return false;

  const record = value as Partial<AppLockRecord>;
  const validBlockedUntil =
    record.blockedUntilMs === null ||
    (typeof record.blockedUntilMs === 'number' &&
      Number.isSafeInteger(record.blockedUntilMs) &&
      record.blockedUntilMs > 0);

  if (
    record.version !== APP_LOCK_RECORD_VERSION ||
    typeof record.saltHex !== 'string' ||
    !SALT_PATTERN.test(record.saltHex) ||
    typeof record.pinDigestHex !== 'string' ||
    !DIGEST_PATTERN.test(record.pinDigestHex) ||
    typeof record.biometricEnabled !== 'boolean' ||
    typeof record.failedAttempts !== 'number' ||
    !Number.isInteger(record.failedAttempts) ||
    record.failedAttempts < 0 ||
    record.failedAttempts > APP_LOCK_MAX_FAILED_ATTEMPTS ||
    !validBlockedUntil
  ) {
    return false;
  }

  return record.failedAttempts === APP_LOCK_MAX_FAILED_ATTEMPTS
    ? record.blockedUntilMs !== null
    : record.blockedUntilMs === null;
}

async function ensureAvailable() {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new AppLockStorageError();
  }
}

export const appLockStorage: AppLockStorage = {
  async read() {
    await ensureAvailable();
    const value = await SecureStore.getItemAsync(APP_LOCK_STORAGE_KEY, STORAGE_OPTIONS);
    return value === null ? null : parseRecord(value);
  },

  async write(record) {
    if (!isAppLockRecord(record)) throw new AppLockStorageError();
    await ensureAvailable();
    await SecureStore.setItemAsync(
      APP_LOCK_STORAGE_KEY,
      JSON.stringify(record),
      STORAGE_OPTIONS,
    );
  },

  async clear() {
    await ensureAvailable();
    await SecureStore.deleteItemAsync(APP_LOCK_STORAGE_KEY, STORAGE_OPTIONS);
  },
};
