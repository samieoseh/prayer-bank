import { SupabaseConfigurationError } from '@/lib/supabase';

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof SupabaseConfigurationError) return error.message;

  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email address before signing in.';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('characters'))) {
    return 'Choose a stronger password and try again.';
  }
  if (message.includes('user already registered')) {
    return 'An account already exists for this email. Sign in instead.';
  }

  if (message.includes('invalid') && message.includes('email')) {
    return 'Enter a valid email address.';
  }
  if (message.includes('rate') || message.includes('too many')) {
    return 'Please wait a moment before trying again.';
  }
  if (
    error instanceof TypeError ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('offline')
  ) {
    return 'Unable to connect. Check your internet connection and try again.';
  }

  return 'We could not sign you in. Please try again.';
}
