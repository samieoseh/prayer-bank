import type { BiometricCapability } from '@/features/app-lock/app-lock-types';

export type AppLockAuthentication = {
  getBiometricCapability: () => Promise<BiometricCapability>;
  authenticateBiometric: () => Promise<boolean>;
  authenticateDeviceOwner: () => Promise<boolean>;
};
