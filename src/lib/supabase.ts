import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const CONFIGURATION_MESSAGE =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in a local environment file.';

export class SupabaseConfigurationError extends Error {
  constructor(message = CONFIGURATION_MESSAGE) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

export async function getPersistedSupabaseSession(): Promise<Session | null> {
  const { url } = requireConfiguration();
  const projectRef = new URL(url).hostname.split('.')[0];
  const storedValue = await AsyncStorage.getItem(`sb-${projectRef}-auth-token`);

  if (!storedValue) return null;

  try {
    const session: unknown = JSON.parse(storedValue);
    return isPersistedSession(session) ? session : null;
  } catch {
    return null;
  }
}

function isPersistedSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;

  const session = value as Partial<Session>;
  return (
    typeof session.access_token === 'string' &&
    session.access_token.length > 0 &&
    typeof session.refresh_token === 'string' &&
    session.refresh_token.length > 0 &&
    typeof session.expires_at === 'number' &&
    Boolean(session.user) &&
    typeof session.user?.id === 'string' &&
    session.user.id.length > 0
  );
}

let client: SupabaseClient | undefined;

function assertPublishableKey(key: string) {
  if (key.startsWith('sb_secret_') || readJwtRole(key) === 'service_role') {
    throw new SupabaseConfigurationError(
      'A Supabase service-role or secret key cannot be used in this mobile app. Configure the publishable key instead.',
    );
  }
}

function readJwtRole(key: string): string | undefined {
  const payload = key.split('.')[1];

  if (!payload || typeof globalThis.atob !== 'function') {
    return undefined;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return typeof decoded.role === 'string' ? decoded.role : undefined;
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
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
