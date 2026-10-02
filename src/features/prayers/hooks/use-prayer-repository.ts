import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { LOCAL_DEVICE_OWNER_ID } from '@/features/prayers/data/prayer-owner-bootstrap';
import { createPrayerRepository } from '@/features/prayers/data/prayer-repository';
import { usePrayerSync } from '@/features/prayers/hooks/use-prayer-sync';

export function usePrayerRepository() {
  const database = useSQLiteContext();
  const auth = useAuth();
  const { requestSync } = usePrayerSync();
  const ownerId = auth.status === 'authenticated' ? auth.userId : LOCAL_DEVICE_OWNER_ID;
  const repository = useMemo(
    () => createPrayerRepository(database, ownerId),
    [database, ownerId],
  );

  return useMemo(() => ({
    ...repository,
    createRequest: async (...args: Parameters<typeof repository.createRequest>) => {
      const result = await repository.createRequest(...args);
      if (result.ok) requestSync();
      return result;
    },
    updateRequest: async (...args: Parameters<typeof repository.updateRequest>) => {
      const result = await repository.updateRequest(...args);
      if (result.ok) requestSync();
      return result;
    },
    setStatus: async (...args: Parameters<typeof repository.setStatus>) => {
      const result = await repository.setStatus(...args);
      if (result.ok) requestSync();
      return result;
    },
    recordAnswer: async (...args: Parameters<typeof repository.recordAnswer>) => {
      const result = await repository.recordAnswer(...args);
      if (result.ok) requestSync();
      return result;
    },
  }), [repository, requestSync]);
}
