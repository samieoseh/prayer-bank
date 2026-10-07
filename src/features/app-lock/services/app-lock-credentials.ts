import * as Crypto from 'expo-crypto';

import {
  APP_LOCK_PIN_LENGTH,
  APP_LOCK_RECORD_VERSION,
  type AppLockRecord,
} from '@/features/app-lock/app-lock-types';

const PIN_PATTERN = new RegExp(`^[0-9]{${APP_LOCK_PIN_LENGTH}}$`);

export function isValidAppLockPin(pin: string) {
  return PIN_PATTERN.test(pin);
}

export async function createAppLockRecord(
  pin: string,
  biometricEnabled = false,
): Promise<AppLockRecord> {
  if (!isValidAppLockPin(pin)) {
    throw new TypeError(
      `App lock PIN must contain exactly ${APP_LOCK_PIN_LENGTH} digits.`,
    );
  }

  const saltHex = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const pinDigestHex = await digestPin(saltHex, pin);

  return {
    version: APP_LOCK_RECORD_VERSION,
    saltHex,
    pinDigestHex,
    biometricEnabled,
    failedAttempts: 0,
    blockedUntilMs: null,
  };
}

export async function matchesAppLockPin(record: AppLockRecord, pin: string) {
  if (!isValidAppLockPin(pin)) return false;
  const candidate = await digestPin(record.saltHex, pin);
  return constantTimeEqual(candidate, record.pinDigestHex);
}

async function digestPin(saltHex: string, pin: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `prayer-bank:v1:${saltHex}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}
