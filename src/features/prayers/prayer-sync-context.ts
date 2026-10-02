import { createContext } from 'react';

export type PrayerSyncStatus = 'signed-out' | 'pending' | 'syncing' | 'synced' | 'failed';

export type PrayerSyncContextValue = {
  status: PrayerSyncStatus;
  requestSync: () => void;
  retry: () => void;
};

export const PrayerSyncContext = createContext<PrayerSyncContextValue | undefined>(undefined);
