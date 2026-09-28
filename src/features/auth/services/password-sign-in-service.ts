import { getSupabaseClient } from '@/lib/supabase';

export async function signInWithPassword(email: string, password: string) {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });

  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signUp({ email, password });

  if (error) throw error;

  return { requiresEmailConfirmation: !data.session };
}
