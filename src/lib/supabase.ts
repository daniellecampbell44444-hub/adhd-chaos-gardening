import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';
const hasBrowserStorage = typeof window !== 'undefined';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(hasBrowserStorage ? { storage: AsyncStorage } : {}),
    autoRefreshToken: hasBrowserStorage,
    persistSession: hasBrowserStorage,
    detectSessionInUrl: false,
  },
});
