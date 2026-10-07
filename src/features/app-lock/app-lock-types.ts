export const APP_LOCK_RECORD_VERSION = 1 as const;
export const APP_LOCK_PIN_LENGTH = 4;
export const APP_LOCK_MAX_FAILED_ATTEMPTS = 5;
export const APP_LOCK_BLOCK_DURATION_MS = 30_000;

export type AppLockRecord = {
  version: typeof APP_LOCK_RECORD_VERSION;
  saltHex: string;
  pinDigestHex: string;
  biometricEnabled: boolean;
  failedAttempts: number;
  blockedUntilMs: number | null;
};

export type BiometricKind = 'fingerprint' | 'face' | 'iris';

export type BiometricCapability = {
  available: boolean;
  kinds: BiometricKind[];
};

export type AppLockState =
  | { status: 'initializing' }
  | { status: 'disabled' }
  | { status: 'enabled-unlocked'; biometricEnabled: boolean }
  | {
      status: 'locked';
      biometricEnabled: boolean;
      failedAttempts: number;
    }
  | {
      status: 'blocked';
      biometricEnabled: boolean;
      blockedUntilMs: number;
    }
  | { status: 'storage-error' };

export type AppLockActionFailure =
  | { ok: false; reason: 'already-enabled' }
  | { ok: false; reason: 'authentication-failed' }
  | { ok: false; reason: 'biometric-unavailable' }
  | { ok: false; reason: 'busy' }
  | { ok: false; reason: 'invalid-pin' }
  | { ok: false; reason: 'invalid-pin-format' }
  | { ok: false; reason: 'not-enabled' }
  | { ok: false; reason: 'recovery-not-authorized' }
  | { ok: false; reason: 'storage-error' }
  | { ok: false; reason: 'blocked'; blockedUntilMs: number };

export type AppLockActionResult = { ok: true } | AppLockActionFailure;

export type AppLockContextValue = {
  state: AppLockState;
  isBusy: boolean;
  lockEventId: number;
  enable: (pin: string) => Promise<AppLockActionResult>;
  verifyPin: (pin: string) => Promise<AppLockActionResult>;
  unlockWithBiometrics: () => Promise<AppLockActionResult>;
  changePin: (currentPin: string, nextPin: string) => Promise<AppLockActionResult>;
  disable: (pin: string) => Promise<AppLockActionResult>;
  setBiometricEnabled: (
    enabled: boolean,
    pin: string,
  ) => Promise<AppLockActionResult>;
  authorizePinRecovery: () => Promise<AppLockActionResult>;
  recoverPin: (nextPin: string) => Promise<AppLockActionResult>;
  cancelPinRecovery: () => void;
  getBiometricCapability: () => Promise<BiometricCapability>;
  lock: () => void;
  retry: () => Promise<void>;
};
