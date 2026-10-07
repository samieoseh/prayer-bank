import { useContext } from 'react';

import { AppLockContext } from '@/features/app-lock/app-lock-context';

export function useAppLock() {
  const value = useContext(AppLockContext);

  if (!value) {
    throw new Error('useAppLock must be used inside AppLockProvider.');
  }

  return value;
}
