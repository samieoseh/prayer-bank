import { useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { invalidatePrayerQueries } from '@/features/prayers/hooks/use-prayer-queries';
import {
  PrayerSyncContext,
  type PrayerSyncStatus,
} from '@/features/prayers/prayer-sync-context';
import { runPrayerSync } from '@/features/prayers/services/prayer-sync-service';

const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000] as const;

export function PrayerSyncProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const database = useSQLiteContext();
  const queryClient = useQueryClient();
  const ownerId = auth.status === 'authenticated' ? auth.userId : undefined;
  const [status, setStatus] = useState<PrayerSyncStatus>(
    ownerId ? 'pending' : 'signed-out',
  );
  const activeRef = useRef(AppState.currentState === 'active');
  const generationRef = useRef(0);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const runningRef = useRef(false);
  const rerunRequestedRef = useRef(false);
  const synchronizeRef = useRef<() => void>(() => undefined);

  const cancelRetry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = undefined;
  }, []);

  const scheduleRetry = useCallback(() => {
    cancelRetry();
    if (!activeRef.current || retryAttemptRef.current >= RETRY_DELAYS_MS.length) return;

    const delay = getPrayerSyncRetryDelay(retryAttemptRef.current);
    retryAttemptRef.current += 1;
    retryTimerRef.current = setTimeout(() => synchronizeRef.current(), delay);
  }, [cancelRetry]);

  const synchronize = useCallback(() => {
    if (!ownerId || !activeRef.current) return;
    if (runningRef.current) {
      rerunRequestedRef.current = true;
      return;
    }

    cancelRetry();
    runningRef.current = true;
    const generation = generationRef.current;
    setStatus('syncing');

    void runPrayerSync({ db: database, ownerId }).then(async (result) => {
      if (generationRef.current !== generation) return;

      if (result.ok) {
        retryAttemptRef.current = 0;
        setStatus('synced');
        if (result.value.inserted > 0 || result.value.updated > 0) {
          await invalidatePrayerQueries(queryClient);
        }
      } else {
        setStatus(result.code === 'remote' ? 'pending' : 'failed');
        if (result.code !== 'configuration' && result.code !== 'validation') {
          scheduleRetry();
        }
      }
    }).finally(() => {
      if (generationRef.current !== generation) return;
      runningRef.current = false;
      if (rerunRequestedRef.current) {
        rerunRequestedRef.current = false;
        synchronizeRef.current();
      }
    });
  }, [cancelRetry, database, ownerId, queryClient, scheduleRetry]);

  synchronizeRef.current = synchronize;

  const requestSync = useCallback(() => {
    if (!ownerId) return;
    retryAttemptRef.current = 0;
    setStatus('pending');
    if (runningRef.current) rerunRequestedRef.current = true;
    synchronizeRef.current();
  }, [ownerId]);

  const retry = useCallback(() => {
    retryAttemptRef.current = 0;
    cancelRetry();
    requestSync();
  }, [cancelRetry, requestSync]);

  useEffect(() => {
    generationRef.current += 1;
    runningRef.current = false;
    rerunRequestedRef.current = false;
    retryAttemptRef.current = 0;
    cancelRetry();
    setStatus(ownerId ? 'pending' : 'signed-out');
    if (ownerId) synchronizeRef.current();

    return () => {
      generationRef.current += 1;
      cancelRetry();
    };
  }, [cancelRetry, ownerId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const becameActive = nextState === 'active' && !activeRef.current;
      activeRef.current = nextState === 'active';
      if (!activeRef.current) cancelRetry();
      if (becameActive) {
        retryAttemptRef.current = 0;
        synchronizeRef.current();
      }
    });

    return () => subscription.remove();
  }, [cancelRetry]);

  const value = useMemo(
    () => ({ status, requestSync, retry }),
    [requestSync, retry, status],
  );

  return <PrayerSyncContext.Provider value={value}>{children}</PrayerSyncContext.Provider>;
}

export function getPrayerSyncRetryDelay(attempt: number) {
  return RETRY_DELAYS_MS[Math.min(Math.max(0, attempt), RETRY_DELAYS_MS.length - 1)];
}
