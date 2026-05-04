import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export const supabaseAdmin = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper: verify a Supabase JWT and return the user
// Used by auth middleware to validate frontend tokens
export async function verifySupabaseToken(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired token');
  return user;
}

export default supabaseAdmin;
