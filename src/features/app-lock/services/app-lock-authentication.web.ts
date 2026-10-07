import type { AppLockAuthentication } from '@/features/app-lock/services/app-lock-authentication.types';

export const appLockAuthentication: AppLockAuthentication = {
  async getBiometricCapability() {
    return { available: false, kinds: [] };
  },

  async authenticateBiometric() {
    return false;
  },

  async authenticateDeviceOwner() {
    return false;
  },
};
