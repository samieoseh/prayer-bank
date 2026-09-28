import * as Linking from 'expo-linking';

import { getSupabaseClient } from '@/lib/supabase';

export async function sendMagicLink(email: string) {
  const redirectTo = Linking.createURL('auth/callback', { scheme: 'prayerbank' });
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;
}
