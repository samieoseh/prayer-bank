import { useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  claimLegacyPrayerOwner,
  LOCAL_DEVICE_OWNER_ID,
} from '@/features/prayers/data/prayer-owner-bootstrap';

export function PrayerOwnerProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const ownerId = auth.status === 'authenticated' ? auth.userId : LOCAL_DEVICE_OWNER_ID;
  const [readyOwnerId, setReadyOwnerId] = useState<string>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let isActive = true;
    setReadyOwnerId(undefined);
    setError(undefined);

    if (auth.status === 'loading') {
      return () => {
        isActive = false;
      };
    }

    async function prepareOwner() {
      if (auth.status === 'authenticated') {
        await claimLegacyPrayerOwner(database, auth.userId);
      }
      if (!isActive) return;

      queryClient.removeQueries({ queryKey: ['prayers'] });
      setReadyOwnerId(ownerId);
    }

    void prepareOwner().catch((reason: unknown) => {
      if (isActive) setError(reason);
    });

    return () => {
      isActive = false;
    };
  }, [auth, database, ownerId, queryClient]);

  if (error) throw error;
  if (readyOwnerId !== ownerId) {
    return (
      <View
        accessibilityLabel="Opening your prayer bank"
        className="flex-1 items-center justify-center bg-[#f8f3e8] dark:bg-[#171812]">
        <ActivityIndicator color="#6f7653" size="small" />
      </View>
    );
  }

  return children;
}
