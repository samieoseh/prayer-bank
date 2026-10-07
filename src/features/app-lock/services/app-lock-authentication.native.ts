import * as LocalAuthentication from 'expo-local-authentication';

import type {
  BiometricCapability,
  BiometricKind,
} from '@/features/app-lock/app-lock-types';
import type { AppLockAuthentication } from '@/features/app-lock/services/app-lock-authentication.types';

const TYPE_TO_KIND: Partial<
  Record<LocalAuthentication.AuthenticationType, BiometricKind>
> = {
  [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'fingerprint',
  [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'face',
  [LocalAuthentication.AuthenticationType.IRIS]: 'iris',
};

async function getBiometricCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  const kinds = supportedTypes.flatMap((type) => {
    const kind = TYPE_TO_KIND[type];
    return kind ? [kind] : [];
  });

  return {
    available: hasHardware && isEnrolled && kinds.length > 0,
    kinds,
  };
}

export const appLockAuthentication: AppLockAuthentication = {
  getBiometricCapability,

  async authenticateBiometric() {
    const capability = await getBiometricCapability();
    if (!capability.available) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Prayer Bank',
      promptDescription: 'Use your fingerprint or face to view your prayer matters.',
      cancelLabel: 'Use PIN',
      fallbackLabel: '',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    });

    return result.success;
  },

  async authenticateDeviceOwner() {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Reset Prayer Bank PIN',
      promptDescription: 'Confirm that you own this device before setting a new PIN.',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  },
};
