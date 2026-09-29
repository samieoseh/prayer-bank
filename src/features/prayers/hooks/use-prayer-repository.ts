import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { createPrayerRepository } from '@/features/prayers/data/prayer-repository';

const LOCAL_DEVICE_OWNER_ID = 'local-device';

export function usePrayerRepository() {
  const database = useSQLiteContext();

  return useMemo(
    () => createPrayerRepository(database, LOCAL_DEVICE_OWNER_ID),
    [database],
  );
}
