import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';

import { AppLockContext } from '@/features/app-lock/app-lock-context';
import {
  APP_LOCK_BLOCK_DURATION_MS,
  APP_LOCK_MAX_FAILED_ATTEMPTS,
  type AppLockActionResult,
  type AppLockContextValue,
  type AppLockRecord,
  type AppLockState,
} from '@/features/app-lock/app-lock-types';
import { appLockAuthentication } from '@/features/app-lock/services/app-lock-authentication';
import type { AppLockAuthentication } from '@/features/app-lock/services/app-lock-authentication.types';
import {
  createAppLockRecord,
  isValidAppLockPin,
  matchesAppLockPin,
} from '@/features/app-lock/services/app-lock-credentials';
import { appLockStorage } from '@/features/app-lock/services/app-lock-storage';
import type { AppLockStorage } from '@/features/app-lock/services/app-lock-storage.types';

type AppLockProviderProps = PropsWithChildren<{
  authentication?: AppLockAuthentication;
  now?: () => number;
  storage?: AppLockStorage;
}>;

type PinAttempt =
  | { ok: true; record: AppLockRecord }
  | {
      ok: false;
      record: AppLockRecord;
      result: AppLockActionResult;
    };

export function AppLockProvider({
  authentication = appLockAuthentication,
  children,
  now = Date.now,
  storage = appLockStorage,
}: AppLockProviderProps) {
  const [state, setStateValue] = useState<AppLockState>({ status: 'initializing' });
  const [isBusy, setIsBusy] = useState(false);
  const [lockEventId, setLockEventId] = useState(0);
  const recordRef = useRef<AppLockRecord | null>(null);
  const stateRef = useRef<AppLockState>({ status: 'initializing' });
  const busyRef = useRef(false);
  const recoveryAuthorizedRef = useRef(false);
  const relockAfterActionRef = useRef(false);
  const lockAfterActionRef = useRef<() => void>(() => undefined);
  const systemAuthenticationInProgressRef = useRef(false);

  const setState = useCallback((nextState: AppLockState) => {
    stateRef.current = nextState;
    setStateValue(nextState);
  }, []);

  const setRecordState = useCallback(
    (record: AppLockRecord, unlocked: boolean) => {
      recordRef.current = record;
      if (unlocked && !relockAfterActionRef.current) {
        setState({
          status: 'enabled-unlocked',
          biometricEnabled: record.biometricEnabled,
        });
        return;
      }

      if (record.blockedUntilMs !== null && record.blockedUntilMs > now()) {
        setState({
          status: 'blocked',
          biometricEnabled: record.biometricEnabled,
          blockedUntilMs: record.blockedUntilMs,
        });
        return;
      }

      setState({
        status: 'locked',
        biometricEnabled: record.biometricEnabled,
        failedAttempts: record.failedAttempts,
      });
    },
    [now, setState],
  );

  const load = useCallback(async () => {
    setState({ status: 'initializing' });
    recoveryAuthorizedRef.current = false;

    try {
      let record = await storage.read();
      if (!record) {
        recordRef.current = null;
        setState({ status: 'disabled' });
        return;
      }

      if (record.blockedUntilMs !== null && record.blockedUntilMs <= now()) {
        record = { ...record, failedAttempts: 0, blockedUntilMs: null };
        await storage.write(record);
      }

      setRecordState(record, false);
      setLockEventId((current) => current + 1);
    } catch {
      recordRef.current = null;
      setState({ status: 'storage-error' });
    }
  }, [now, setRecordState, setState, storage]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (action: () => Promise<AppLockActionResult>) => {
      if (busyRef.current) return { ok: false, reason: 'busy' } as const;

      relockAfterActionRef.current =
        Platform.OS !== 'web' && AppState.currentState !== 'active';
      busyRef.current = true;
      setIsBusy(true);
      try {
        return await action();
      } catch {
        setState({ status: 'storage-error' });
        return { ok: false, reason: 'storage-error' } as const;
      } finally {
        busyRef.current = false;
        setIsBusy(false);
        if (relockAfterActionRef.current) {
          relockAfterActionRef.current = false;
          lockAfterActionRef.current();
        }
      }
    },
    [setState],
  );

  const runSystemAuthentication = useCallback(
    async (authenticate: () => Promise<boolean>) => {
      systemAuthenticationInProgressRef.current = true;

      try {
        return await authenticate();
      } finally {
        systemAuthenticationInProgressRef.current = false;
      }
    },
    [],
  );

  const attemptPin = useCallback(
    async (record: AppLockRecord, pin: string): Promise<PinAttempt> => {
      if (!isValidAppLockPin(pin)) {
        return {
          ok: false,
          record,
          result: { ok: false, reason: 'invalid-pin-format' },
        };
      }

      const currentTime = now();
      if (record.blockedUntilMs !== null && record.blockedUntilMs > currentTime) {
        return {
          ok: false,
          record,
          result: {
            ok: false,
            reason: 'blocked',
            blockedUntilMs: record.blockedUntilMs,
          },
        };
      }

      const eligibleRecord =
        record.blockedUntilMs === null
          ? record
          : { ...record, failedAttempts: 0, blockedUntilMs: null };

      if (await matchesAppLockPin(eligibleRecord, pin)) {
        return {
          ok: true,
          record: { ...eligibleRecord, failedAttempts: 0, blockedUntilMs: null },
        };
      }

      const failedAttempts = Math.min(
        eligibleRecord.failedAttempts + 1,
        APP_LOCK_MAX_FAILED_ATTEMPTS,
      );
      const blockedUntilMs =
        failedAttempts === APP_LOCK_MAX_FAILED_ATTEMPTS
          ? currentTime + APP_LOCK_BLOCK_DURATION_MS
          : null;
      const failedRecord = { ...eligibleRecord, failedAttempts, blockedUntilMs };

      return {
        ok: false,
        record: failedRecord,
        result:
          blockedUntilMs === null
            ? { ok: false, reason: 'invalid-pin' }
            : { ok: false, reason: 'blocked', blockedUntilMs },
      };
    },
    [now],
  );

  const requireRecord = useCallback(() => {
    const record = recordRef.current;
    return record ?? ({ ok: false, reason: 'not-enabled' } as const);
  }, []);

  const enable = useCallback(
    (pin: string) =>
      runAction(async () => {
        if (recordRef.current) return { ok: false, reason: 'already-enabled' };
        if (!isValidAppLockPin(pin)) {
          return { ok: false, reason: 'invalid-pin-format' };
        }

        const record = await createAppLockRecord(pin);
        await storage.write(record);
        setRecordState(record, true);
        return { ok: true };
      }),
    [runAction, setRecordState, storage],
  );

  const verifyPin = useCallback(
    (pin: string) =>
      runAction(async () => {
        const current = requireRecord();
        if ('ok' in current) return current;

        const attempt = await attemptPin(current, pin);
        if (!attempt.ok) {
          if (attempt.record !== current) await storage.write(attempt.record);
          setRecordState(attempt.record, false);
          return attempt.result;
        }

        await storage.write(attempt.record);
        setRecordState(attempt.record, true);
        return { ok: true };
      }),
    [attemptPin, requireRecord, runAction, setRecordState, storage],
  );

  const changePin = useCallback(
    (currentPin: string, nextPin: string) =>
      runAction(async () => {
        const current = requireRecord();
        if ('ok' in current) return current;
        if (!isValidAppLockPin(nextPin)) {
          return { ok: false, reason: 'invalid-pin-format' };
        }

        const attempt = await attemptPin(current, currentPin);
        if (!attempt.ok) {
          if (attempt.record !== current) await storage.write(attempt.record);
          setRecordState(attempt.record, false);
          return attempt.result;
        }

        const next = await createAppLockRecord(nextPin, current.biometricEnabled);
        await storage.write(next);
        setRecordState(next, true);
        return { ok: true };
      }),
    [attemptPin, requireRecord, runAction, setRecordState, storage],
  );

  const disable = useCallback(
    (pin: string) =>
      runAction(async () => {
        const current = requireRecord();
        if ('ok' in current) return current;

        const attempt = await attemptPin(current, pin);
        if (!attempt.ok) {
          if (attempt.record !== current) await storage.write(attempt.record);
          setRecordState(attempt.record, false);
          return attempt.result;
        }

        if (relockAfterActionRef.current) {
          setRecordState(attempt.record, false);
          return { ok: false, reason: 'authentication-failed' };
        }

        await storage.clear();
        if (relockAfterActionRef.current) {
          await storage.write(attempt.record);
          setRecordState(attempt.record, false);
          return { ok: false, reason: 'authentication-failed' };
        }

        recordRef.current = null;
        setState({ status: 'disabled' });
        return { ok: true };
      }),
    [attemptPin, requireRecord, runAction, setRecordState, setState, storage],
  );

  const setBiometricEnabled = useCallback(
    (enabled: boolean, pin: string) =>
      runAction(async () => {
        const current = requireRecord();
        if ('ok' in current) return current;

        const attempt = await attemptPin(current, pin);
        if (!attempt.ok) {
          if (attempt.record !== current) await storage.write(attempt.record);
          setRecordState(attempt.record, false);
          return attempt.result;
        }

        if (enabled) {
          const capability = await authentication.getBiometricCapability();
          if (!capability.available) {
            await storage.write(attempt.record);
            setRecordState(attempt.record, true);
            return { ok: false, reason: 'biometric-unavailable' };
          }
          const authenticated = await runSystemAuthentication(
            authentication.authenticateBiometric,
          );
          if (!authenticated || relockAfterActionRef.current) {
            await storage.write(attempt.record);
            setRecordState(attempt.record, true);
            return { ok: false, reason: 'authentication-failed' };
          }
        }

        const next = { ...attempt.record, biometricEnabled: enabled };
        await storage.write(next);
        setRecordState(next, true);
        return { ok: true };
      }),
    [
      attemptPin,
      authentication,
      requireRecord,
      runAction,
      runSystemAuthentication,
      setRecordState,
      storage,
    ],
  );

  const unlockWithBiometrics = useCallback(
    () =>
      runAction(async () => {
        const current = requireRecord();
        if ('ok' in current) return current;
        if (!current.biometricEnabled) {
          return { ok: false, reason: 'biometric-unavailable' };
        }

        const capability = await authentication.getBiometricCapability();
        if (!capability.available) {
          return { ok: false, reason: 'biometric-unavailable' };
        }
        const authenticated = await runSystemAuthentication(
          authentication.authenticateBiometric,
        );
        if (!authenticated || relockAfterActionRef.current) {
          return { ok: false, reason: 'authentication-failed' };
        }

        const next = { ...current, failedAttempts: 0, blockedUntilMs: null };
        await storage.write(next);
        setRecordState(next, true);
        return { ok: true };
      }),
    [
      authentication,
      requireRecord,
      runAction,
      runSystemAuthentication,
      setRecordState,
      storage,
    ],
  );

  const authorizePinRecovery = useCallback(
    () =>
      runAction(async () => {
        const current = recordRef.current;
        if (!current && stateRef.current.status !== 'storage-error') {
          return { ok: false, reason: 'not-enabled' };
        }

        const authenticated = await runSystemAuthentication(
          authentication.authenticateDeviceOwner,
        );
        if (!authenticated || relockAfterActionRef.current) {
          recoveryAuthorizedRef.current = false;
          return { ok: false, reason: 'authentication-failed' };
        }

        recoveryAuthorizedRef.current = true;
        return { ok: true };
      }),
    [authentication, runAction, runSystemAuthentication],
  );

  const recoverPin = useCallback(
    (nextPin: string) =>
      runAction(async () => {
        const current = recordRef.current;
        if (!current && stateRef.current.status !== 'storage-error') {
          return { ok: false, reason: 'not-enabled' };
        }
        if (!recoveryAuthorizedRef.current) {
          return { ok: false, reason: 'recovery-not-authorized' };
        }
        if (!isValidAppLockPin(nextPin)) {
          return { ok: false, reason: 'invalid-pin-format' };
        }

        const next = await createAppLockRecord(
          nextPin,
          current?.biometricEnabled ?? false,
        );
        await storage.write(next);
        recoveryAuthorizedRef.current = false;
        setRecordState(next, true);
        return { ok: true };
      }),
    [runAction, setRecordState, storage],
  );

  const cancelPinRecovery = useCallback(() => {
    recoveryAuthorizedRef.current = false;
  }, []);

  const lock = useCallback(() => {
    recoveryAuthorizedRef.current = false;
    const record = recordRef.current;
    if (record) {
      setRecordState(record, false);
      setLockEventId((current) => current + 1);
    }
  }, [setRecordState]);

  useEffect(() => {
    lockAfterActionRef.current = lock;
  }, [lock]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const leftActiveState =
        previousState === 'active' && nextState !== 'active';
      const movedToBackground =
        previousState !== 'background' && nextState === 'background';
      previousState = nextState;

      if (
        systemAuthenticationInProgressRef.current &&
        leftActiveState &&
        !movedToBackground
      ) {
        return;
      }

      if (leftActiveState || movedToBackground) {
        if (busyRef.current) relockAfterActionRef.current = true;
        lock();
      }
    });

    return () => subscription.remove();
  }, [lock]);

  const value = useMemo<AppLockContextValue>(
    () => ({
      state,
      isBusy,
      lockEventId,
      enable,
      verifyPin,
      unlockWithBiometrics,
      changePin,
      disable,
      setBiometricEnabled,
      authorizePinRecovery,
      recoverPin,
      cancelPinRecovery,
      getBiometricCapability: authentication.getBiometricCapability,
      lock,
      retry: load,
    }),
    [
      authentication.getBiometricCapability,
      authorizePinRecovery,
      cancelPinRecovery,
      changePin,
      disable,
      enable,
      isBusy,
      load,
      lock,
      lockEventId,
      recoverPin,
      setBiometricEnabled,
      state,
      unlockWithBiometrics,
      verifyPin,
    ],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}
