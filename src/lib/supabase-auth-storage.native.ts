import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  SupabaseAuthStorageError,
  type SupabaseAuthStorage,
} from '@/lib/supabase-auth-storage.types';

const STORAGE_VERSION = 1;
const CHUNK_SIZE_BYTES = 1800;
const MAX_CHUNK_COUNT = 256;
const STORAGE_PREFIX = 'prayer-bank.supabase-auth.v1';
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const GENERATION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const storageOperationTails = new Map<string, Promise<void>>();

type StorageManifest = {
  version: typeof STORAGE_VERSION;
  generation: string;
  chunkCount: number;
  sha256: string;
};

type SecureRecord = {
  manifest: StorageManifest;
  value: string;
};

function isStorageManifest(value: unknown): value is StorageManifest {
  if (!value || typeof value !== 'object') return false;

  const manifest = value as Partial<StorageManifest>;
  return (
    manifest.version === STORAGE_VERSION &&
    typeof manifest.generation === 'string' &&
    GENERATION_PATTERN.test(manifest.generation) &&
    typeof manifest.chunkCount === 'number' &&
    Number.isInteger(manifest.chunkCount) &&
    manifest.chunkCount > 0 &&
    manifest.chunkCount <= MAX_CHUNK_COUNT &&
    typeof manifest.sha256 === 'string' &&
    DIGEST_PATTERN.test(manifest.sha256)
  );
}

function parseManifest(value: string): StorageManifest {
  let candidate: unknown;

  try {
    candidate = JSON.parse(value);
  } catch {
    throw new SupabaseAuthStorageError();
  }

  if (!isStorageManifest(candidate)) {
    throw new SupabaseAuthStorageError();
  }

  return candidate;
}

function utf8ByteLength(value: string) {
  const codePoint = value.codePointAt(0);

  if (codePoint === undefined || codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function splitIntoUtf8Chunks(value: string) {
  if (value.length === 0) return [''];

  const chunks: string[] = [];
  let chunk = '';
  let chunkBytes = 0;

  for (const character of value) {
    const characterBytes = utf8ByteLength(character);

    if (chunkBytes + characterBytes > CHUNK_SIZE_BYTES) {
      chunks.push(chunk);
      chunk = '';
      chunkBytes = 0;
    }

    chunk += character;
    chunkBytes += characterBytes;
  }

  chunks.push(chunk);

  if (chunks.length > MAX_CHUNK_COUNT) {
    throw new SupabaseAuthStorageError();
  }

  return chunks;
}

async function sha256(value: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

async function getNamespace(key: string) {
  return `${STORAGE_PREFIX}.${await sha256(key)}`;
}

function getManifestKey(namespace: string) {
  return `${namespace}.manifest`;
}

function getChunkKey(namespace: string, generation: string, index: number) {
  return `${namespace}.chunk.${generation}.${index}`;
}

async function ensureAvailable() {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new SupabaseAuthStorageError();
  }
}

async function readManifest(namespace: string) {
  const value = await SecureStore.getItemAsync(getManifestKey(namespace), STORAGE_OPTIONS);
  return value === null ? null : parseManifest(value);
}

async function readSecureRecord(namespace: string): Promise<SecureRecord | null> {
  const manifest = await readManifest(namespace);
  if (!manifest) return null;

  const chunks: string[] = [];

  for (let index = 0; index < manifest.chunkCount; index += 1) {
    const chunk = await SecureStore.getItemAsync(
      getChunkKey(namespace, manifest.generation, index),
      STORAGE_OPTIONS,
    );

    if (chunk === null) {
      throw new SupabaseAuthStorageError();
    }

    chunks.push(chunk);
  }

  const value = chunks.join('');
  if ((await sha256(value)) !== manifest.sha256) {
    throw new SupabaseAuthStorageError();
  }

  return { manifest, value };
}

async function deleteChunks(namespace: string, manifest: StorageManifest) {
  for (let index = 0; index < manifest.chunkCount; index += 1) {
    await SecureStore.deleteItemAsync(
      getChunkKey(namespace, manifest.generation, index),
      STORAGE_OPTIONS,
    );
  }
}

async function writeSecureValue(key: string, value: string) {
  const namespace = await getNamespace(key);
  const previousManifest = await readManifest(namespace);
  const chunks = splitIntoUtf8Chunks(value);
  const generation = Crypto.randomUUID().toLowerCase();
  const writtenChunkKeys: string[] = [];

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      const chunkKey = getChunkKey(namespace, generation, index);
      await SecureStore.setItemAsync(chunkKey, chunks[index], STORAGE_OPTIONS);
      writtenChunkKeys.push(chunkKey);
    }

    const manifest: StorageManifest = {
      version: STORAGE_VERSION,
      generation,
      chunkCount: chunks.length,
      sha256: await sha256(value),
    };

    await SecureStore.setItemAsync(
      getManifestKey(namespace),
      JSON.stringify(manifest),
      STORAGE_OPTIONS,
    );
  } catch {
    await Promise.allSettled(
      writtenChunkKeys.map((chunkKey) =>
        SecureStore.deleteItemAsync(chunkKey, STORAGE_OPTIONS),
      ),
    );
    throw new SupabaseAuthStorageError();
  }

  await AsyncStorage.removeItem(key);

  if (previousManifest) {
    await deleteChunks(namespace, previousManifest);
  }
}

async function removeSecureValue(key: string) {
  const namespace = await getNamespace(key);
  const manifest = await readManifest(namespace);

  if (manifest) {
    await deleteChunks(namespace, manifest);
    await SecureStore.deleteItemAsync(getManifestKey(namespace), STORAGE_OPTIONS);
  }

  await AsyncStorage.removeItem(key);
}

async function serializeStorageOperation<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previousTail = storageOperationTails.get(key) ?? Promise.resolve();
  let releaseCurrentOperation!: () => void;
  const currentOperation = new Promise<void>((resolve) => {
    releaseCurrentOperation = resolve;
  });
  const currentTail = previousTail.then(() => currentOperation);

  storageOperationTails.set(key, currentTail);
  await previousTail;

  try {
    return await operation();
  } finally {
    releaseCurrentOperation();

    if (storageOperationTails.get(key) === currentTail) {
      storageOperationTails.delete(key);
    }
  }
}

function asStorageOperation<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  return serializeStorageOperation(key, async () => {
    try {
      await ensureAvailable();
      return await operation();
    } catch {
      throw new SupabaseAuthStorageError();
    }
  });
}

export const supabaseAuthStorage: SupabaseAuthStorage = {
  getItem(key) {
    return asStorageOperation(key, async () => {
      const secureRecord = await readSecureRecord(await getNamespace(key));

      if (secureRecord) {
        await AsyncStorage.removeItem(key);
        return secureRecord.value;
      }

      const legacyValue = await AsyncStorage.getItem(key);
      if (legacyValue === null) return null;

      await writeSecureValue(key, legacyValue);
      return legacyValue;
    });
  },

  setItem(key, value) {
    return asStorageOperation(key, () => writeSecureValue(key, value));
  },

  removeItem(key) {
    return asStorageOperation(key, () => removeSecureValue(key));
  },
};
