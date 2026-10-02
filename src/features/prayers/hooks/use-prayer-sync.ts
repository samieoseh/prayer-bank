import { useContext } from 'react';

import { PrayerSyncContext } from '@/features/prayers/prayer-sync-context';

export function usePrayerSync() {
  const value = useContext(PrayerSyncContext);
  if (!value) throw new Error('usePrayerSync must be used inside PrayerSyncProvider.');
  return value;
}
