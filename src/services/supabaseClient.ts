import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Clean URL by stripping /rest/v1/ and trailing slashes if present
const cleanUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    cleanUrl &&
    rawKey &&
    cleanUrl.length > 10 &&
    rawKey.trim().length > 20 &&
    !cleanUrl.includes('your-project-id') &&
    !rawKey.includes('your-anon-key')
  );
};

// Use valid placeholder URL if not yet configured to prevent createClient initialization error
const supabaseUrl = isSupabaseConfigured() ? cleanUrl : 'https://placeholder.supabase.co';
const supabaseKey = isSupabaseConfigured() ? rawKey.trim() : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
