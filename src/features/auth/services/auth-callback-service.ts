import { getSupabaseClient } from '@/lib/supabase';

export class AuthCallbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthCallbackError';
  }
}

export async function completeAuthCallback(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const read = (key: string) => fragment.get(key) ?? url.searchParams.get(key);
  const providerError = read('error_description') ?? read('error');

  console.log('[auth] Parsed callback payload.', {
    protocol: url.protocol,
    pathname: url.pathname,
    hasProviderError: Boolean(providerError),
    hasCode: Boolean(read('code')),
    hasAccessToken: Boolean(read('access_token')),
    hasRefreshToken: Boolean(read('refresh_token')),
  });

  if (providerError) throw new AuthCallbackError(getSafeCallbackMessage(providerError));

  const supabase = getSupabaseClient();
  const code = read('code');

  if (code) {
    console.log('[auth] Exchanging authorization code for a session.');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new AuthCallbackError(getSafeCallbackMessage(error.message));
    console.log('[auth] Authorization-code exchange succeeded.');
    return;
  }

  const accessToken = read('access_token');
  const refreshToken = read('refresh_token');

  if (!accessToken || !refreshToken) {
    throw new AuthCallbackError('This sign-in link is invalid or incomplete. Request a new link.');
  }

  console.log('[auth] Establishing session from callback tokens.');
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw new AuthCallbackError(getSafeCallbackMessage(error.message));
  console.log('[auth] Callback-token session established.');
}

function getSafeCallbackMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('expired')) {
    return 'This sign-in link has expired. Request a new link.';
  }
  if (normalized.includes('denied') || normalized.includes('access_denied')) {
    return 'Sign-in was cancelled. You can request another link.';
  }
  if (normalized.includes('used') || normalized.includes('invalid')) {
    return 'This sign-in link is invalid or has already been used. Request a new link.';
  }

  return 'We could not complete sign-in. Request a new link and try again.';
}
