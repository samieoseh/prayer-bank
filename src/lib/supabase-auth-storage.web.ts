import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SupabaseAuthStorage } from '@/lib/supabase-auth-storage.types';

export const supabaseAuthStorage: SupabaseAuthStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
