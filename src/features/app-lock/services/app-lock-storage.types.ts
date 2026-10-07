import type { AppLockRecord } from '@/features/app-lock/app-lock-types';

export type AppLockStorage = {
  read: () => Promise<AppLockRecord | null>;
  write: (record: AppLockRecord) => Promise<void>;
  clear: () => Promise<void>;
};

export class AppLockStorageError extends Error {
  constructor() {
    super('App lock storage is unavailable.');
    this.name = 'AppLockStorageError';
  }
}
