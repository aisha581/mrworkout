import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession:   true,
        // Do NOT set flowType: 'pkce' here — OTP mode is configured in the
        // Supabase dashboard under Authentication → Email → "Enable Email OTP".
        // Once enabled, signInWithOtp sends a 6-digit code instead of a magic link.
    },
});
