import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { supabaseAuthStorage } from '@/lib/supabase-auth-storage';

const CONFIGURATION_MESSAGE =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in a local environment file.';
const INVALID_CLIENT_KEY_MESSAGE =
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a valid Supabase publishable key or legacy anon key.';
const PUBLISHABLE_KEY_PATTERN =
  /^sb_publishable_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{8}$/;
const JWT_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export class SupabaseConfigurationError extends Error {
  constructor(message = CONFIGURATION_MESSAGE) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

let client: SupabaseClient | undefined;

function assertPublishableKey(key: string) {
  if (PUBLISHABLE_KEY_PATTERN.test(key) || readJwtRole(key) === 'anon') return;

  throw new SupabaseConfigurationError(INVALID_CLIENT_KEY_MESSAGE);
}

function readJwtRole(key: string): string | undefined {
  const segments = key.split('.');

  if (
    segments.length !== 3 ||
    segments.some(
      (segment) =>
        !JWT_SEGMENT_PATTERN.test(segment) || segment.length % 4 === 1,
    ) ||
    typeof globalThis.atob !== 'function'
  ) {
    return undefined;
  }

  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded: unknown = JSON.parse(globalThis.atob(padded));

    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return undefined;
    }

    const role = (decoded as { role?: unknown }).role;
    return typeof role === 'string' ? role : undefined;
  } catch {
    return undefined;
  }
}

function requireConfiguration() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabaseConfigurationError();
  }

  try {
    const parsedUrl = new URL(url);
    const isLocalDevelopment =
      parsedUrl.protocol === 'http:' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1');

    if (parsedUrl.protocol !== 'https:' && !isLocalDevelopment) {
      throw new Error('Unsupported Supabase URL protocol.');
    }
  } catch {
    throw new SupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS URL (or localhost URL for local development).',
    );
  }

  assertPublishableKey(publishableKey);

  return { url, publishableKey };
}

/** Returns the app-wide client, creating it only after public configuration passes validation. */
export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const { url, publishableKey } = requireConfiguration();

  client = createClient(url, publishableKey, {
    auth: {
      storage: supabaseAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
