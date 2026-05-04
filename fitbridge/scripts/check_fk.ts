import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Query foreign keys for feed_posts
  const { data, error } = await supabase.rpc('get_foreign_keys' as any);
  if (error) {
    // Fallback: try raw query using REST if we can't do RPC
    console.log('RPC failed, trying raw query via pg_catalog (may require service role)...');
  } else {
    console.log('FK Data:', data);
  }
}

checkSchema();
