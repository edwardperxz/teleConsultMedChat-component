export const checkEnvVariables = () => {
  const appMode = String(import.meta.env.VITE_APP_MODE ?? 'demo').toLowerCase();

  if (appMode !== 'live') {
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables.');
  }
};
