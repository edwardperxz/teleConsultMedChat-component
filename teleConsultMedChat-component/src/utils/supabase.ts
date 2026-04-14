import { createClient } from '@supabase/supabase-js';
import { createDemoClient } from './demoClient';

const appMode = String(import.meta.env.VITE_APP_MODE ?? 'demo').toLowerCase();
const useDemoMode = appMode !== 'live';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const createSupabaseClient = () => {
  if (useDemoMode) {
    return createDemoClient();
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables in live mode.');
  }

  return createClient(supabaseUrl, supabaseKey);
};

export const supabase: ReturnType<typeof createSupabaseClient> = createSupabaseClient();
export const isDemoMode = useDemoMode;