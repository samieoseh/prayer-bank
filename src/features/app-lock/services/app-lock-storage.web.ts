import {
  AppLockStorageError,
  type AppLockStorage,
} from '@/features/app-lock/services/app-lock-storage.types';

export const appLockStorage: AppLockStorage = {
  async read() {
    return null;
  },

  async write() {
    throw new AppLockStorageError();
  },

  async clear() {
    throw new AppLockStorageError();
  },
};
